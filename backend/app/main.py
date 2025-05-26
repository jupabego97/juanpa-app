from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select, func, or_, asc, desc
from typing import List, Optional, Dict, Any 
from datetime import datetime, timezone, timedelta, date as DateObject 
import logging
import re 
import shutil 
import uuid   
import os     
import json
import time

# Importar FSRS con manejo de errores
try:
    from fsrs import Scheduler, Card as FSRSCard, Rating as FSRSRating, State
    
    FSRS_AVAILABLE = True
    # --- DIAGNOSTIC PRINT FOR FSRS STATE ENUM ---
    print(f"DEBUG: FSRS State Enum Members available: {State.__members__}")
    # --- END DIAGNOSTIC --- 
except ImportError:
    print("WARNING: FSRS library not available. Review functionality will be limited.")
    FSRS_AVAILABLE = False
    # Crear stubs para evitar errores
    class FSRSCard:
        def __init__(self):
            self.due = None
            self.lapses = 0
            self.state = None
            self.stability = 0.0
            self.difficulty = 0.0
            self.last_review = None
    
    class FSRSRating:
        Again = 1
        Hard = 2
        Good = 3
        Easy = 4
    
    class State:
        Learning = "learning"
        Review = "review"
        Relearning = "relearning"
    
    class Scheduler:
        def review_card(self, card, rating):
            return card, None

# Importar Gemini con manejo de errores
try:
    from .gemini_service import (
        get_gemini_generator, is_gemini_available, 
        CardGenerationRequest as GeminiServiceCardGenerationRequest,
        CardGenerationResponse as GeminiServiceCardGenerationResponse,
        GeneratedCard as GeminiServiceGeneratedCard
    )
    GEMINI_AVAILABLE = True
except ImportError as e:
    print(f"WARNING: Gemini service not available: {e}")
    GEMINI_AVAILABLE = False

from contextlib import asynccontextmanager
from .database import engine, create_db_and_tables
from . import db_models as db
from . import models as m

# Importar sistemas de seguridad y logging
from .logging_config import get_logger, setup_logging
from .exceptions import (
    JuanPAException, NotFoundError, ConflictError, ValidationError as JuanPAValidationError,
    FileProcessingError, to_http_exception
)
from .validators import ContentValidator, FileValidator
from .middleware import (
    ErrorHandlingMiddleware, LoggingMiddleware, PerformanceMiddleware,
    SecurityMiddleware, RequestValidationMiddleware
)

# Configurar logging
setup_logging(level="INFO", enable_console=True, enable_file=True)
logger = get_logger("juanpa.main")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads", "images")
os.makedirs(UPLOADS_DIR, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI): 
    logger.info("Aplicación iniciando...")
    create_db_and_tables()
    logger.info("Base de datos y tablas verificadas/creadas.")
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    logger.info(f"Sirviendo archivos estáticos desde: {STATIC_DIR}")
    yield
    logger.info("Aplicación apagándose...")

app = FastAPI(
    title="Juanpa Spaced Repetition App API",
    description="API para la aplicación de repetición espaciada Juanpa.",
    version="1.0.0",
    lifespan=lifespan
)

# Añadir middleware en orden correcto (el último añadido se ejecuta primero)
app.add_middleware(ErrorHandlingMiddleware)  # Manejo de errores (más externo)
app.add_middleware(PerformanceMiddleware)   # Monitoreo de rendimiento
app.add_middleware(SecurityMiddleware)      # Seguridad básica
app.add_middleware(RequestValidationMiddleware)  # Validación de requests
app.add_middleware(LoggingMiddleware)       # Logging (más interno)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_session():
    with Session(engine) as session:
        yield session

@app.get("/")
async def read_root():
    return {"message": "Welcome to Juanpa API!"}

@app.get("/api/v1/status", response_model=m.DeckReadBasic)
async def get_status():
    return {"id": 0, "name": "API Status", "description": "API is running"}

@app.post("/api/v1/upload/image/")
async def upload_image(file: UploadFile = File(...)):
    """Sube una imagen y la valida usando el sistema de validación robusto."""
    start_time = time.time()
    logger.operation_start("upload_image", filename=file.filename)
    
    try:
        # Validar archivo usando el nuevo validador
        if not file.filename:
            raise FileProcessingError("Nombre de archivo requerido")
        
        # Obtener tamaño del archivo
        file_content = await file.read()
        file_size = len(file_content)
        
        # Validar usando FileValidator
        FileValidator.validate_uploaded_file(
            filename=file.filename,
            content_type=file.content_type,
            file_size=file_size,
            file_category="image"
        )
        
        # Generar nombre único
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".png"
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOADS_DIR, unique_filename)
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        image_url = f"/static/uploads/images/{unique_filename}"
        
        execution_time = time.time() - start_time
        logger.operation_success(
            "upload_image",
            execution_time=execution_time,
            filename=file.filename,
            file_size=file_size,
            saved_path=image_url
        )
        
        return {"imageUrl": image_url}
        
    except JuanPAException as exc:
        execution_time = time.time() - start_time
        logger.operation_error("upload_image", exc, execution_time)
        raise to_http_exception(exc)
        
    except Exception as exc:
        execution_time = time.time() - start_time
        logger.operation_error("upload_image", exc, execution_time)
        raise HTTPException(status_code=500, detail=f"Error al guardar el archivo: {exc}")
    
    finally:
        # Asegurar que el archivo se cierre
        if hasattr(file, 'file') and file.file:
            file.file.close()

@app.post("/api/v1/decks/", response_model=m.DeckRead)
def create_deck(*, session: Session = Depends(get_session), deck_in: m.DeckCreate):
    existing_deck = session.exec(select(db.Deck).where(db.Deck.name == deck_in.name)).first()
    if existing_deck:
        raise HTTPException(status_code=400, detail=f"Deck with name '{deck_in.name}' already exists.")
    db_deck = db.Deck.model_validate(deck_in)
    session.add(db_deck)
    session.commit()
    session.refresh(db_deck)
    return db_deck

@app.get("/api/v1/decks/", response_model=List[m.DeckRead])
def read_decks(*, session: Session = Depends(get_session), skip: int = 0, limit: int = 100):
    # Filtrar mazos no eliminados
    decks = session.exec(
        select(db.Deck)
        .where(db.Deck.is_deleted == False)
        .offset(skip)
        .limit(limit)
    ).all()
    return decks

@app.get("/api/v1/decks/{deck_id}", response_model=m.DeckReadWithCards)
def read_deck(*, session: Session = Depends(get_session), deck_id: int):
    deck = session.get(db.Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck

@app.put("/api/v1/decks/{deck_id}", response_model=m.DeckRead)
def update_deck(*, session: Session = Depends(get_session), deck_id: int, deck_in: m.DeckUpdate ):
    db_deck = session.get(db.Deck, deck_id)
    if not db_deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    if deck_in.name and deck_in.name != db_deck.name:
        existing_deck_with_new_name = session.exec(select(db.Deck).where(db.Deck.name == deck_in.name)).first()
        if existing_deck_with_new_name:
            raise HTTPException(status_code=400, detail=f"Another deck with name '{deck_in.name}' already exists.")
    deck_data = deck_in.model_dump(exclude_unset=True)
    for key, value in deck_data.items():
        setattr(db_deck, key, value)
    session.add(db_deck)
    session.commit()
    session.refresh(db_deck)
    return db_deck

@app.delete("/api/v1/decks/{deck_id}", response_model=m.DeckRead)
def delete_deck(*, session: Session = Depends(get_session), deck_id: int):
    deck = session.get(db.Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Soft delete: marcar como eliminado en lugar de eliminar físicamente
    deck.is_deleted = True
    deck.deleted_at = datetime.now(timezone.utc)
    deck.updated_at = datetime.now(timezone.utc)  # Actualizar timestamp para sincronización
    
    session.add(deck)
    session.commit()
    session.refresh(deck)
    return deck

@app.post("/api/v1/cards/", response_model=List[m.CardRead])
def create_card(*, session: Session = Depends(get_session), card_in: m.CardCreate):
    deck = session.get(db.Deck, card_in.deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Procesar tarjeta estándar por simplicidad
    db_card = db.Card.model_validate(card_in)
    session.add(db_card)
    session.commit()
    session.refresh(db_card)
    return [db_card]

@app.get("/api/v1/cards/", response_model=List[m.CardRead])
def read_cards(*, session: Session = Depends(get_session), skip: int = 0, limit: int = 100, deck_id: Optional[int] = None):
    query = select(db.Card)
    if deck_id:
        query = query.where(db.Card.deck_id == deck_id)
    cards = session.exec(query.offset(skip).limit(limit)).all()
    return cards

@app.get("/api/v1/cards/{card_id}", response_model=m.CardReadWithDeck)
def read_card(*, session: Session = Depends(get_session), card_id: int):
    card = session.get(db.Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    return card

@app.put("/api/v1/cards/{card_id}", response_model=m.CardRead)
def update_card(*, session: Session = Depends(get_session), card_id: int, card_in: m.CardUpdate):
    db_card = session.get(db.Card, card_id)
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")
    card_data = card_in.model_dump(exclude_unset=True)
    for key, value in card_data.items():
        setattr(db_card, key, value)
    session.add(db_card)
    session.commit()
    session.refresh(db_card)
    return db_card

@app.delete("/api/v1/cards/{card_id}", response_model=m.CardRead)
def delete_card(*, session: Session = Depends(get_session), card_id: int):
    card = session.get(db.Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Soft delete: marcar como eliminado en lugar de eliminar físicamente
    card.is_deleted = True
    card.deleted_at = datetime.now(timezone.utc)
    card.updated_at = datetime.now(timezone.utc)  # Actualizar timestamp para sincronización
    
    session.add(card)
    session.commit()
    session.refresh(card)
    return card

@app.post("/api/v1/cards/{card_id}/review", response_model=m.CardRead)
def review_card(*, session: Session = Depends(get_session), card_id: int, review_input: m.CardReviewPayload):
    card = session.get(db.Card, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Fallback simple sin FSRS por ahora
    next_review = datetime.now(timezone.utc) + timedelta(days=1)
    card.next_review_at = next_review
    session.add(card)
    session.commit() 
    session.refresh(card)
    return card

@app.get("/api/v1/review/next-card", response_model=Optional[m.CardReadWithDeck])
def get_next_review_card(
    *,
    session: Session = Depends(get_session),
    deck_id: Optional[int] = Query(None, description="ID del mazo para filtrar las tarjetas a repasar")
):
    """Obtiene la próxima tarjeta que necesita repaso."""
    now = datetime.now(timezone.utc)
    
    # Query simplificada
    query = select(db.Card).where(
        or_(
            db.Card.next_review_at == None,  # Nunca repasadas
            db.Card.next_review_at <= now    # Vencidas
        )
    )
    
    if deck_id:
        query = query.where(db.Card.deck_id == deck_id)
    
    query = query.order_by(asc(db.Card.id))
    
    card = session.exec(query).first()
    return card

@app.get("/api/v1/gemini/status", response_model=m.GeminiStatusResponse)
async def get_gemini_status():
    """Verifica el estado y disponibilidad del servicio Gemini."""
    
    if not GEMINI_AVAILABLE:
        return m.GeminiStatusResponse(
            available=False,
            model=None,
            api_key_configured=False,
            last_error="Gemini service module not available"
        )
    
    try:
        # Verificar si Gemini está disponible y configurado
        is_available = is_gemini_available()
        
        if is_available:
            # Obtener información del generador
            generator = get_gemini_generator()
            model_name = getattr(generator, 'model_name', 'gemini-2.0-flash-exp') if generator else None
            
            return m.GeminiStatusResponse(
                available=True,
                model=model_name,
                api_key_configured=True,
                last_error=None
            )
        else:
            return m.GeminiStatusResponse(
                available=False,
                model=None,
                api_key_configured=False,
                last_error="API key not configured or invalid"
            )
            
    except Exception as e:
        return m.GeminiStatusResponse(
            available=False,
            model=None,
            api_key_configured=False,
            last_error=str(e)
        ) 

@app.post("/api/v1/gemini/generate-cards", response_model=m.CardGenerationResult)
async def generate_cards_with_gemini(
    *,
    session: Session = Depends(get_session),
    request: m.CardGenerationRequest
):
    """Genera tarjetas usando Gemini AI."""
    start_time = time.time()
    logger.info(f"=== GENERACIÓN DE TARJETAS CON GEMINI INICIADA ===")
    logger.info(f"Request: topic='{request.topic}', num_cards={request.num_cards}, deck_id={request.deck_id}")
    
    try:
        # Verificar que Gemini esté disponible
        if not GEMINI_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Servicio Gemini no disponible. Verifica la configuración."
            )
        
        if not is_gemini_available():
            raise HTTPException(
                status_code=503,
                detail="Gemini no está configurado correctamente. Verifica la API key."
            )
        
        # Manejar creación de mazo si es necesario
        target_deck = None
        if request.deck_id == -1:
            # Crear nuevo mazo
            if not request.deck_name:
                raise HTTPException(
                    status_code=400,
                    detail="deck_name es requerido cuando deck_id = -1"
                )
            
            # Verificar si ya existe un mazo con ese nombre
            existing_deck = session.exec(
                select(db.Deck).where(db.Deck.name == request.deck_name)
            ).first()
            
            if existing_deck:
                raise HTTPException(
                    status_code=409,
                    detail=f"Ya existe un mazo con el nombre '{request.deck_name}'"
                )
            
            # Crear el nuevo mazo
            target_deck = db.Deck(
                name=request.deck_name,
                description=request.deck_description or f"Mazo generado por IA sobre: {request.topic}",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            session.add(target_deck)
            session.flush()  # Para obtener el ID
            logger.info(f"Nuevo mazo creado: '{target_deck.name}' (ID: {target_deck.id})")
        else:
            # Usar mazo existente
            target_deck = session.get(db.Deck, request.deck_id)
            if not target_deck:
                raise HTTPException(
                    status_code=404,
                    detail=f"Mazo con ID {request.deck_id} no encontrado"
                )
            logger.info(f"Usando mazo existente: '{target_deck.name}' (ID: {target_deck.id})")
        
        # Generar tarjetas con Gemini
        logger.info("Llamando al servicio Gemini...")
        generator = get_gemini_generator()
        
        # Crear request para el servicio Gemini (usando el modelo del servicio)
        gemini_request = GeminiServiceCardGenerationRequest(
            topic=request.topic,
            num_cards=request.num_cards,
            difficulty=request.difficulty,
            card_type=request.card_type,
            language=request.language,
            context=request.context
        )
        
        # Generar las tarjetas
        gemini_response = await generator.generate_cards(gemini_request)
        
        # El servicio Gemini no tiene campo 'success', verificar si hay tarjetas
        if not gemini_response.cards:
            raise HTTPException(
                status_code=500,
                detail=f"Error generando tarjetas: No se generaron tarjetas válidas"
            )
        
        logger.info(f"Gemini generó {len(gemini_response.cards)} tarjetas")
        
        # Crear las tarjetas en la base de datos
        created_cards = []
        warnings = []
        errors = []
        
        for i, generated_card in enumerate(gemini_response.cards):
            try:
                # Determinar contenido basado en el tipo de tarjeta
                front_content = None
                back_content = None
                cloze_data = None
                
                if hasattr(generated_card, 'cloze_text') and generated_card.cloze_text:
                    # Tarjeta cloze
                    cloze_data = {"cloze_text": generated_card.cloze_text}
                else:
                    # Tarjeta estándar
                    front_content = generated_card.front_content
                    back_content = generated_card.back_content
                
                # Crear la tarjeta en la DB
                db_card = db.Card(
                    deck_id=target_deck.id or 0,  # Asegurar que no sea None
                    front_content=front_content,
                    back_content=back_content,
                    cloze_data=cloze_data,
                    tags=generated_card.tags or [],
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                    # Inicializar campos FSRS
                    next_review_at=datetime.now(timezone.utc),
                    fsrs_state="new",
                    fsrs_stability=2.5,
                    fsrs_difficulty=6.0,
                    fsrs_lapses=0
                )
                
                session.add(db_card)
                session.flush()  # Para obtener el ID
                
                # Convertir a CardRead para la respuesta
                card_read = m.CardRead(
                    id=db_card.id or 0,
                    deck_id=db_card.deck_id,
                    front_content=db_card.front_content,
                    back_content=db_card.back_content,
                    cloze_data=db_card.cloze_data,
                    tags=db_card.tags,
                    next_review_at=db_card.next_review_at,
                    fsrs_stability=db_card.fsrs_stability,
                    fsrs_difficulty=db_card.fsrs_difficulty,
                    fsrs_lapses=db_card.fsrs_lapses,
                    fsrs_state=db_card.fsrs_state,
                    created_at=db_card.created_at,
                    updated_at=db_card.updated_at
                )
                
                created_cards.append(card_read)
                logger.info(f"Tarjeta {i+1} creada con ID: {db_card.id}")
                
            except Exception as e:
                error_msg = f"Error creando tarjeta {i+1}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
        
        # Guardar cambios
        session.commit()
        
        execution_time = time.time() - start_time
        logger.info(f"Generación completada: {len(created_cards)} tarjetas creadas en {execution_time:.2f}s")
        
        # Preparar metadatos
        metadata = {
            "generation_time": execution_time,
            "gemini_model": getattr(generator, 'model_name', 'unknown'),
            "deck_id": target_deck.id,
            "deck_name": target_deck.name,
            "request_params": {
                "topic": request.topic,
                "num_cards": request.num_cards,
                "difficulty": request.difficulty,
                "card_type": request.card_type,
                "language": request.language
            },
            "gemini_metadata": gemini_response.metadata
        }
        
        return m.CardGenerationResult(
            success=True,
            cards_created=created_cards,
            metadata=metadata,
            errors=errors,
            warnings=warnings
        )
        
    except HTTPException:
        # Re-lanzar HTTPExceptions tal como están
        raise
    except Exception as e:
        execution_time = time.time() - start_time
        error_msg = f"Error inesperado generando tarjetas: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Tiempo transcurrido antes del error: {execution_time:.2f}s")
        
        return m.CardGenerationResult(
            success=False,
            cards_created=[],
            metadata={"generation_time": execution_time},
            errors=[error_msg],
            warnings=[]
        )

@app.get("/api/v1/sync/pull", response_model=m.PullResponse)
def sync_pull(
    *,
    session: Session = Depends(get_session),
    last_sync_timestamp_param: Optional[datetime] = Query(None, alias="lastSyncTimestamp")
):
    """
    Endpoint para pull de sincronización. 
    Devuelve todos los cambios desde el último timestamp proporcionado por el cliente.
    """
    server_timestamp = datetime.now(timezone.utc)
    
    if last_sync_timestamp_param:
        # Asegurar que el parámetro tenga timezone
        if last_sync_timestamp_param.tzinfo is None:
            last_sync_timestamp = last_sync_timestamp_param.replace(tzinfo=timezone.utc)
        else:
            last_sync_timestamp = last_sync_timestamp_param
        
        # Obtener mazos modificados desde el último sync
        decks_query = select(db.Deck).where(db.Deck.updated_at > last_sync_timestamp)
        cards_query = select(db.Card).where(db.Card.updated_at > last_sync_timestamp)
    else:
        # Primer sync, obtener todo
        decks_query = select(db.Deck)
        cards_query = select(db.Card)
    
    decks = session.exec(decks_query).all()
    cards = session.exec(cards_query).all()
    
    # Convertir a modelos de sincronización (que incluyen campos como is_deleted)
    deck_sync_reads = []
    for deck in decks:
        deck_sync_reads.append(m.DeckSyncRead(
            id=deck.id or 0,
            name=deck.name,
            description=deck.description,
            created_at=deck.created_at,
            updated_at=deck.updated_at,
            is_deleted=deck.is_deleted,  # Usar valor real de la base de datos
            deleted_at=deck.deleted_at
        ))
    
    card_sync_reads = []
    for card in cards:
        card_sync_reads.append(m.CardSyncRead(
            id=card.id or 0,
            deck_id=card.deck_id,
            front_content=card.front_content,
            back_content=card.back_content,
            cloze_data=card.cloze_data,
            tags=card.tags,
            next_review_at=card.next_review_at,
            fsrs_stability=card.fsrs_stability,
            fsrs_difficulty=card.fsrs_difficulty,
            fsrs_lapses=card.fsrs_lapses,
            fsrs_state=card.fsrs_state,
            created_at=card.created_at,
            updated_at=card.updated_at,
            is_deleted=card.is_deleted,  # Usar valor real de la base de datos
            deleted_at=card.deleted_at,
            raw_cloze_text=None  # Corregido: usar None en lugar de card.raw_cloze_text
        ))
    
    return m.PullResponse(
        server_timestamp=server_timestamp,
        decks=deck_sync_reads,
        cards=card_sync_reads
    )

@app.post("/api/v1/sync/push", response_model=m.PushResponse)
def sync_push(
    *,
    session: Session = Depends(get_session),
    payload: m.PushRequest
):
    """
    Endpoint para push de sincronización.
    Recibe cambios del cliente y los aplica al servidor.
    """
    conflicts = []
    
    # Procesar mazos
    for deck_data in payload.decks:
        try:
            if deck_data.id and deck_data.id > 0:
                # Actualizar mazo existente
                existing_deck = session.get(db.Deck, deck_data.id)
                if existing_deck:
                    # Verificar conflictos de timestamp
                    if existing_deck.updated_at > deck_data.updated_at:
                        conflicts.append(m.ConflictInfo(
                            type="deck",
                            id=existing_deck.id or 1,  # Usar ID existente
                            client_timestamp=deck_data.updated_at,
                            server_timestamp=existing_deck.updated_at
                        ))
                        continue
                    
                    # Actualizar campos
                    existing_deck.name = deck_data.name
                    existing_deck.description = deck_data.description
                    existing_deck.updated_at = deck_data.updated_at
                    existing_deck.is_deleted = deck_data.is_deleted
                    existing_deck.deleted_at = deck_data.deleted_at
                    session.add(existing_deck)
                else:
                    # Crear nuevo mazo con ID específico (puede causar conflictos)
                    new_deck = db.Deck(
                        id=deck_data.id,
                        name=deck_data.name,
                        description=deck_data.description,
                        created_at=deck_data.created_at,
                        updated_at=deck_data.updated_at,
                        is_deleted=deck_data.is_deleted,
                        deleted_at=deck_data.deleted_at
                    )
                    session.add(new_deck)
            else:
                # Crear nuevo mazo (sin ID específico)
                new_deck = db.Deck(
                    name=deck_data.name,
                    description=deck_data.description,
                    created_at=deck_data.created_at,
                    updated_at=deck_data.updated_at,
                    is_deleted=deck_data.is_deleted,
                    deleted_at=deck_data.deleted_at
                )
                session.add(new_deck)
        except Exception as e:
            conflicts.append(m.ConflictInfo(
                type="deck",
                id=1,  # Placeholder para errores genéricos
                client_timestamp=deck_data.updated_at,
                server_timestamp=datetime.now(timezone.utc)
            ))
    
    # Procesar tarjetas
    for card_data in payload.cards:
        try:
            if card_data.id and card_data.id > 0:
                # Actualizar tarjeta existente
                existing_card = session.get(db.Card, card_data.id)
                if existing_card:
                    # Verificar conflictos de timestamp
                    if existing_card.updated_at > card_data.updated_at:
                        conflicts.append(m.ConflictInfo(
                            type="card",
                            id=existing_card.id or 1,  # Usar ID existente
                            client_timestamp=card_data.updated_at,
                            server_timestamp=existing_card.updated_at
                        ))
                        continue
                    
                    # Actualizar campos
                    existing_card.deck_id = card_data.deck_id
                    existing_card.front_content = card_data.front_content
                    existing_card.back_content = card_data.back_content
                    existing_card.cloze_data = card_data.cloze_data
                    existing_card.tags = card_data.tags
                    existing_card.next_review_at = card_data.next_review_at
                    existing_card.fsrs_stability = card_data.fsrs_stability
                    existing_card.fsrs_difficulty = card_data.fsrs_difficulty
                    existing_card.fsrs_lapses = card_data.fsrs_lapses
                    existing_card.fsrs_state = card_data.fsrs_state
                    existing_card.updated_at = card_data.updated_at
                    existing_card.is_deleted = card_data.is_deleted
                    existing_card.deleted_at = card_data.deleted_at
                    session.add(existing_card)
                else:
                    # Crear nueva tarjeta con ID específico
                    new_card = db.Card(
                        id=card_data.id,
                        deck_id=card_data.deck_id,
                        front_content=card_data.front_content,
                        back_content=card_data.back_content,
                        cloze_data=card_data.cloze_data,  # Corregido: usar cloze_data en lugar de raw_cloze_text
                        tags=card_data.tags,
                        next_review_at=card_data.next_review_at,
                        fsrs_stability=card_data.fsrs_stability,
                        fsrs_difficulty=card_data.fsrs_difficulty,
                        fsrs_lapses=card_data.fsrs_lapses,
                        fsrs_state=card_data.fsrs_state,
                        created_at=card_data.created_at,
                        updated_at=card_data.updated_at,
                        is_deleted=card_data.is_deleted,
                        deleted_at=card_data.deleted_at
                    )
                    session.add(new_card)
            else:
                # Crear nueva tarjeta (sin ID específico)
                new_card = db.Card(
                    deck_id=card_data.deck_id,
                    front_content=card_data.front_content,
                    back_content=card_data.back_content,
                    cloze_data=card_data.cloze_data,  # Corregido: usar cloze_data en lugar de raw_cloze_text
                    tags=card_data.tags,
                    next_review_at=card_data.next_review_at,
                    fsrs_stability=card_data.fsrs_stability,
                    fsrs_difficulty=card_data.fsrs_difficulty,
                    fsrs_lapses=card_data.fsrs_lapses,
                    fsrs_state=card_data.fsrs_state,
                    created_at=card_data.created_at,
                    updated_at=card_data.updated_at,
                    is_deleted=card_data.is_deleted,
                    deleted_at=card_data.deleted_at
                )
                session.add(new_card)
        except Exception as e:
            conflicts.append(m.ConflictInfo(
                type="card",
                id=1,  # Placeholder para errores genéricos
                client_timestamp=card_data.updated_at,
                server_timestamp=datetime.now(timezone.utc)
            ))
    
    # Guardar cambios
    session.commit()
    
    return m.PushResponse(
        success=True,
        conflicts=conflicts  # Corregido: pasar la lista directamente
    ) 