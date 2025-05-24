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
    decks = session.exec(select(db.Deck).offset(skip).limit(limit)).all()
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
    session.delete(deck)
    session.commit()
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
    session.delete(card)
    session.commit()
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
            id=deck.id,
            name=deck.name,
            description=deck.description,
            created_at=deck.created_at,
            updated_at=deck.updated_at,
            is_deleted=False,  # Por ahora no manejamos soft delete
            deleted_at=None
        ))
    
    card_sync_reads = []
    for card in cards:
        card_sync_reads.append(m.CardSyncRead(
            id=card.id,
            deck_id=card.deck_id,
            front_content=card.front_content,
            back_content=card.back_content,
            raw_cloze_text=None,  # No tenemos este campo en la DB, usar None
            cloze_data=card.cloze_data,
            tags=card.tags,
            next_review_at=card.next_review_at,
            fsrs_stability=card.fsrs_stability,
            fsrs_difficulty=card.fsrs_difficulty,
            fsrs_lapses=card.fsrs_lapses,
            fsrs_state=card.fsrs_state,
            created_at=card.created_at,
            updated_at=card.updated_at,
            is_deleted=False,  # Por ahora no manejamos soft delete
            deleted_at=None
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
    Procesa cambios del cliente y retorna conflictos si los hay.
    """
    logger.info(f"=== SYNC PUSH INICIADO ===")
    logger.info(f"Payload recibido: new_decks={payload.new_decks}, new_cards={payload.new_cards}")
    
    # Asegurar que client_timestamp tenga timezone
    if payload.client_timestamp.tzinfo is None:
        client_timestamp = payload.client_timestamp.replace(tzinfo=timezone.utc)
    else:
        client_timestamp = payload.client_timestamp
    
    conflicts = []
    created_decks = []
    created_cards = []
    
    # Procesar nuevos mazos del cliente
    if payload.new_decks:
        logger.info(f"Procesando {len(payload.new_decks)} mazos nuevos")
        for i, new_deck_data in enumerate(payload.new_decks):
            logger.info(f"Procesando mazo {i+1}: {new_deck_data}")
            try:
                # Verificar si ya existe un mazo con ese nombre
                existing_deck = session.exec(
                    select(db.Deck).where(db.Deck.name == new_deck_data.name)
                ).first()
                
                if existing_deck:
                    logger.warning(f"Conflicto: Ya existe mazo con nombre '{new_deck_data.name}' (ID: {existing_deck.id})")
                    # Conflicto: ya existe un mazo con ese nombre
                    conflicts.append(m.ConflictInfo(
                        type="deck",
                        id=existing_deck.id,
                        message=f"Ya existe un mazo con el nombre '{new_deck_data.name}' (ID: {existing_deck.id})"
                    ))
                    continue

                logger.info(f"Creando nuevo mazo: {new_deck_data.name}")
                # Crear el nuevo mazo
                db_deck = db.Deck(
                    name=new_deck_data.name,
                    description=new_deck_data.description,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                session.add(db_deck)
                session.flush()  # Para obtener el ID
                
                logger.info(f"Mazo creado con ID: {db_deck.id}")
                
                # Convertir a DeckSyncRead para la respuesta
                created_deck = m.DeckSyncRead(
                    id=db_deck.id,
                    name=db_deck.name,
                    description=db_deck.description,
                    created_at=db_deck.created_at,
                    updated_at=db_deck.updated_at,
                    is_deleted=False,
                    deleted_at=None
                )
                created_decks.append(created_deck)
                logger.info(f"Mazo añadido a created_decks: {created_deck}")
                
            except Exception as e:
                logger.error(f"Error creando mazo '{new_deck_data.name}': {e}")
                # Para errores genéricos durante la creación de un mazo nuevo,
                # ConflictInfo podría no ser el adecuado si no hay un ID > 0.
                # Por ahora, lo mantenemos simple, pero esto podría necesitar revisión.
                # Si no tenemos un existing_deck.id, este error persistirá para el 'id'.
                # Una alternativa sería omitir 'id' o usar un tipo de error diferente.
                conflicts.append(m.ConflictInfo(
                    type="deck",
                    id= getattr(new_deck_data, 'id', 1) if not hasattr(existing_deck, 'id') else existing_deck.id if existing_deck else 1,
                    message=f"Error creando mazo '{new_deck_data.name}': {str(e)}"
                ))
    else:
        logger.info("No hay mazos nuevos en el payload")
    
    # Procesar nuevas tarjetas del cliente
    if payload.new_cards:
        for new_card_data in payload.new_cards:
            try:
                # Verificar que el deck existe
                deck = session.get(db.Deck, new_card_data.deck_id)
                if not deck:
                    # Si el mazo no existe, el conflicto es sobre la tarjeta nueva
                    # que no se puede crear.
                    conflicts.append(m.ConflictInfo(
                        type="card",
                        id=getattr(new_card_data, 'id', 1),
                        message=f"Mazo con ID {new_card_data.deck_id} no encontrado al intentar crear tarjeta"
                    ))
                    continue
                
                # Crear la nueva tarjeta (simplificado)
                db_card = db.Card(
                    deck_id=new_card_data.deck_id,
                    front_content=new_card_data.front_content,
                    back_content=new_card_data.back_content,
                    cloze_data=new_card_data.cloze_data,
                    tags=new_card_data.tags,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                
                session.add(db_card)
                session.flush()  # Para obtener el ID
                
                # Convertir a CardSyncRead para la respuesta
                created_card = m.CardSyncRead(
                    id=db_card.id,
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
                    updated_at=db_card.updated_at,
                    is_deleted=False,
                    deleted_at=None
                )
                created_cards.append(created_card)
                
            except Exception as e:
                # Error genérico creando una tarjeta
                conflicts.append(m.ConflictInfo(
                    type="card",
                    id=getattr(new_card_data, 'id', 1),
                    message=f"Error creando tarjeta en mazo ID {new_card_data.deck_id}: {str(e)}"
                ))
    
    # Commit cambios
    try:
        session.commit()
        message = "Sincronización completada exitosamente"
        if conflicts:
            message += f" con {len(conflicts)} conflictos"
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Error guardando cambios: {str(e)}")
    
    return m.PushResponse(
        message=message,
        created_decks=created_decks if created_decks else None,
        created_cards=created_cards if created_cards else None,
        conflicts=conflicts
    ) 

# === ENDPOINTS PARA GENERACIÓN DE TARJETAS CON GEMINI ===

@app.post("/api/v1/gemini/generate-cards", response_model=m.CardGenerationResult, status_code=201)
async def generate_cards_with_gemini(
    *,
    session: Session = Depends(get_session),
    request_data: m.CardGenerationRequest # Usa el modelo Pydantic para el cuerpo del request
):
    """
    Genera tarjetas usando Gemini y las guarda en la base de datos.
    """
    logger.info(f"Solicitud de generación de tarjetas para el tema: {request_data.topic}, Mazo ID: {request_data.deck_id}")

    if not GEMINI_AVAILABLE:
        logger.error("Servicio Gemini no disponible para generar tarjetas.")
        raise HTTPException(status_code=503, detail="Servicio Gemini no disponible")

    # 1. Verificar/crear el mazo según sea necesario
    actual_deck_id: int  # Declarar tipo explícitamente
    
    if request_data.deck_id == -1:
        # Crear un mazo nuevo
        logger.info(f"Creando nuevo mazo: '{request_data.deck_name}'")
        try:
            # Verificar si ya existe un mazo con ese nombre
            existing_deck = session.exec(
                select(db.Deck).where(db.Deck.name == request_data.deck_name)
            ).first()
            
            if existing_deck:
                logger.warning(f"Ya existe un mazo con el nombre '{request_data.deck_name}' (ID: {existing_deck.id})")
                raise HTTPException(
                    status_code=409, 
                    detail=f"Ya existe un mazo con el nombre '{request_data.deck_name}'. Usa un nombre diferente o selecciona el mazo existente."
                )
            
            # Crear el nuevo mazo - asegurar que deck_name no es None
            deck_name = request_data.deck_name
            if not deck_name:  # This should not happen due to validation, but just in case
                raise HTTPException(status_code=400, detail="deck_name es requerido para crear un mazo nuevo")
                
            new_deck = db.Deck(
                name=deck_name,
                description=request_data.deck_description or f"Mazo generado con IA sobre: {request_data.topic}",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            session.add(new_deck)
            session.flush()  # Para obtener el ID
            
            deck = new_deck
            actual_deck_id = new_deck.id
            if actual_deck_id is None:
                raise HTTPException(status_code=500, detail="Error obteniendo ID del mazo creado")
                
            logger.info(f"Mazo creado exitosamente con ID: {actual_deck_id}")
            
        except HTTPException:
            raise  # Re-lanzar HTTPExceptions
        except Exception as e:
            logger.error(f"Error creando nuevo mazo '{request_data.deck_name}': {e}")
            raise HTTPException(status_code=500, detail=f"Error creando el mazo: {e}")
    else:
        # Verificar que el mazo existente exista
        deck = session.get(db.Deck, request_data.deck_id)
        if not deck:
            logger.warning(f"Mazo con ID {request_data.deck_id} no encontrado para generación de tarjetas.")
            raise HTTPException(status_code=404, detail=f"Mazo con ID {request_data.deck_id} no encontrado")
        
        actual_deck_id = request_data.deck_id
        logger.info(f"Usando mazo existente: '{deck.name}' (ID: {actual_deck_id})")

    gemini_generator = get_gemini_generator()
    cards_created_in_db = []
    generation_errors = []
    generation_warnings = []

    try:
        # 2. Llamar al servicio Gemini para generar el contenido de las tarjetas
        logger.info(f"Llamando a Gemini para generar {request_data.num_cards} tarjetas sobre '{request_data.topic}' en mazo '{deck.name}'")
        
        # Crear un request compatible con gemini_service usando un diccionario
        gemini_request_dict = {
            "topic": request_data.topic,
            "num_cards": request_data.num_cards,
            "difficulty": request_data.difficulty,
            "card_type": request_data.card_type,
            "language": request_data.language,
            "context": request_data.context
        }
        
        # Crear la instancia del tipo correcto para gemini_service
        from .gemini_service import CardGenerationRequest as GeminiCardGenerationRequest
        gemini_request = GeminiCardGenerationRequest(**gemini_request_dict)
        
        generated_card_contents_response = await gemini_generator.generate_cards(gemini_request)
        
        logger.info(f"Gemini procesó la solicitud. Tarjetas propuestas: {len(generated_card_contents_response.cards) if generated_card_contents_response else 'Error en respuesta'}")

        # 3. Procesar la respuesta y crear tarjetas en la BD
        # Asegurarnos que generated_card_contents_response sea del tipo CardGenerationResponse
        if not isinstance(generated_card_contents_response, GeminiServiceCardGenerationResponse):
             logger.error(f"Respuesta inesperada de Gemini: {type(generated_card_contents_response)}")
             generation_errors.append("Respuesta inesperada del servicio Gemini.")
        else:
            logger.info(f"Respuesta de Gemini válida. Procesando {len(generated_card_contents_response.cards)} tarjetas...")
            
            if generated_card_contents_response.cards:
                for i, card_data in enumerate(generated_card_contents_response.cards): # card_data es ahora un objeto GeminiServiceGeneratedCard
                    try:
                        logger.info(f"=== PROCESANDO TARJETA {i+1}/{len(generated_card_contents_response.cards)} ===")
                        # LOGGING DETALLADO PARA DEBUGGING
                        logger.info(f"Procesando tarjeta de Gemini:")
                        logger.info(f"  - front_content: {card_data.front_content}")
                        logger.info(f"  - back_content: {card_data.back_content}")
                        logger.info(f"  - cloze_text: {card_data.cloze_text}")
                        logger.info(f"  - tags: {card_data.tags}")
                        
                        # Convertir el contenido a la estructura JSON esperada por db.Card
                        front_content_json = card_data.front_content 
                        back_content_json = card_data.back_content   
                        cloze_text_for_db = card_data.cloze_text     

                        # Asegurar que el contenido sea una lista de bloques como espera db.Card.front_content/back_content
                        if isinstance(front_content_json, str):
                            logger.info(f"Convirtiendo front_content de string a lista de bloques: {front_content_json}")
                            front_content_json = [{"type": "text", "content": front_content_json}]
                        elif front_content_json is None and cloze_text_for_db:
                            logger.info("front_content es None, usando lista vacía para tarjeta cloze")
                            front_content_json = [] 
                        
                        if isinstance(back_content_json, str):
                            logger.info(f"Convirtiendo back_content de string a lista de bloques: {back_content_json}")
                            back_content_json = [{"type": "text", "content": back_content_json}]
                        elif back_content_json is None and cloze_text_for_db:
                            logger.info("back_content es None, usando lista vacía para tarjeta cloze")
                            back_content_json = [] 

                        logger.info(f"Contenido procesado:")
                        logger.info(f"  - front_content_json: {front_content_json}")
                        logger.info(f"  - back_content_json: {back_content_json}")

                        db_card_payload = {
                            "deck_id": actual_deck_id,  # Usar el deck_id real (puede ser nuevo o existente)
                            "created_at": datetime.now(timezone.utc),
                            "updated_at": datetime.now(timezone.utc),
                            "tags": card_data.tags if card_data.tags else []
                        }
                        
                        if cloze_text_for_db:
                            logger.info(f"Creando tarjeta CLOZE con cloze_text: {cloze_text_for_db}")
                            db_card_payload["cloze_data"] = {"text": cloze_text_for_db} 
                            db_card_payload["front_content"] = front_content_json 
                            db_card_payload["back_content"] = back_content_json 
                        else:
                            logger.info("Creando tarjeta ESTÁNDAR")
                            db_card_payload["front_content"] = front_content_json if front_content_json else [{"type": "text", "content": ""}]
                            db_card_payload["back_content"] = back_content_json if back_content_json else [{"type": "text", "content": ""}]

                        logger.info(f"Payload final para DB: {json.dumps(db_card_payload, indent=2, default=str)}")

                        logger.info("Creando objeto db.Card...")
                        new_db_card = db.Card(**db_card_payload)
                        
                        logger.info("Añadiendo a sesión...")
                        session.add(new_db_card)
                        
                        logger.info("Haciendo flush para obtener ID...")
                        session.flush()  # Cambiado de commit a flush
                        
                        logger.info(f"Tarjeta creada con ID temporal: {new_db_card.id}")
                        cards_created_in_db.append(new_db_card)
                        
                    except Exception as e_card_creation:
                        logger.error(f"ERROR procesando tarjeta {i+1}: {e_card_creation}", exc_info=True)
                        # Acceder a los atributos directamente si existen, o usar un default
                        front_preview = card_data.front_content if hasattr(card_data, 'front_content') and card_data.front_content else '{desconocido}'
                        if isinstance(front_preview, list) and front_preview: # Si es lista de bloques, tomar el primero
                            front_preview = front_preview[0].get('content', '{desconocido}')
                        elif not isinstance(front_preview, str):
                            front_preview = str(front_preview) # Convertir a string si no lo es

                        generation_errors.append(f"Error al guardar tarjeta: {front_preview[:30]}... - {e_card_creation}")
                        # Continuar con la siguiente tarjeta en lugar de hacer rollback completo
                        session.rollback()
                        continue
                
                # Commit final solo si hay tarjetas creadas
                if cards_created_in_db:
                    logger.info(f"Committing {len(cards_created_in_db)} tarjetas a la base de datos...")
                    session.commit()
                    logger.info("Commit exitoso!")
                    
                    # Refresh cards después del commit
                    for card in cards_created_in_db:
                        session.refresh(card)
                        logger.info(f"Tarjeta {card.id} guardada exitosamente en DB")
                else:
                    logger.warning("No hay tarjetas para commitear, haciendo rollback...")
                    session.rollback()
            else:
                logger.warning("Gemini no devolvió contenido de tarjetas.")
                generation_warnings.append("Gemini no generó ninguna tarjeta para el tema proporcionado.")

            if generated_card_contents_response.errors: # Ahora el modelo tiene este campo
                generation_errors.extend(generated_card_contents_response.errors)
        
        if not cards_created_in_db and not generation_errors and not generation_warnings:
            generation_warnings.append("No se crearon tarjetas, pero Gemini no reportó errores.")

    except HTTPException as http_exc: # Re-lanzar HTTPExceptions
        logger.error(f"HTTPException durante generación: {http_exc}", exc_info=True)
        session.rollback()
        raise http_exc
    except Exception as e_main:
        logger.error(f"Error mayor durante la generación de tarjetas con Gemini: {e_main}", exc_info=True)
        session.rollback()
        generation_errors.append(f"Error inesperado en el servidor: {e_main}")
        # No devolvemos 500 directamente para que el cliente pueda ver los errores parciales si los hay

    # 4. Devolver el resultado
    success_status = len(cards_created_in_db) > 0 and not generation_errors
    
    # Convertir db.Card a m.CardRead para la respuesta
    response_cards = [m.CardRead.model_validate(card) for card in cards_created_in_db]

    return m.CardGenerationResult(
        success=success_status,
        cards_created=response_cards,
        metadata={"topic": request_data.topic, "num_requested": request_data.num_cards, "num_created": len(response_cards)},
        errors=generation_errors,
        warnings=generation_warnings
    ) 