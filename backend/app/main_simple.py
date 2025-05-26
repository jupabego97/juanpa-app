from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timezone
import os
import json

# Importaciones locales básicas
from .database import engine, create_db_and_tables
from . import db_models as db
from . import models as m

# Configurar logging básico
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("juanpa.main")

app = FastAPI(
    title="Juanpa Spaced Repetition App API",
    description="API para la aplicación de repetición espaciada Juanpa.",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_session():
    with Session(engine) as session:
        yield session

@app.on_event("startup")
async def startup_event():
    logger.info("Aplicación iniciando...")
    create_db_and_tables()
    logger.info("Base de datos y tablas verificadas/creadas.")

@app.get("/")
async def read_root():
    return {"message": "Welcome to Juanpa API!"}

@app.get("/api/v1/status")
async def get_status():
    return {"id": 0, "name": "API Status", "description": "API is running"}

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
    decks = session.exec(
        select(db.Deck)
        .where(db.Deck.is_deleted == False)
        .offset(skip)
        .limit(limit)
    ).all()
    return decks

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
    logger.info(f"Payload recibido: new_decks={len(payload.new_decks) if payload.new_decks else 0}")
    
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
                    conflicts.append(m.ConflictInfo(
                        type="deck",
                        id=existing_deck.id or 0,
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
                    id=db_deck.id or 0,
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
                conflicts.append(m.ConflictInfo(
                    type="deck",
                    id=0,
                    message=f"Error creando mazo '{new_deck_data.name}': {str(e)}"
                ))
    else:
        logger.info("No hay mazos nuevos en el payload")
    
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