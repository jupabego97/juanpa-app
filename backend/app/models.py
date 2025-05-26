from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, model_validator, validator # Agregar validator
from .validators import ContentValidator # Importar validadores personalizados

# --- Schemas para Mazo (Deck) ---

class DeckBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del mazo")
    description: Optional[str] = Field(None, max_length=1000, description="Descripción del mazo")
    
    @validator('name')
    def validate_deck_name(cls, v):
        return ContentValidator.validate_deck_name(v)
    
    @validator('description')
    def validate_deck_description(cls, v):
        return ContentValidator.validate_deck_description(v)

class DeckCreate(DeckBase):
    pass

class DeckUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Nombre del mazo")
    description: Optional[str] = Field(None, max_length=1000, description="Descripción del mazo")
    
    @validator('name')
    def validate_deck_name(cls, v):
        if v is not None:
            return ContentValidator.validate_deck_name(v)
        return v
    
    @validator('description')
    def validate_deck_description(cls, v):
        return ContentValidator.validate_deck_description(v)

class DeckRead(DeckBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # Pydantic v2

# --- Schemas para Tarjeta (Card) ---

class CardBase(BaseModel):
    front_content: Optional[Any] = Field(None, description="Contenido del anverso de la tarjeta")
    back_content: Optional[Any] = Field(None, description="Contenido del reverso de la tarjeta")
    cloze_data: Optional[Any] = Field(None, description="Datos de tarjeta cloze")
    tags: Optional[List[str]] = Field(None, description="Etiquetas de la tarjeta")
    
    # FSRS parameters - opcionales en la creación/actualización, manejados por el sistema
    next_review_at: Optional[datetime] = Field(None, description="Próxima fecha de repaso")
    fsrs_stability: Optional[float] = Field(None, ge=0.0, description="Estabilidad FSRS")
    fsrs_difficulty: Optional[float] = Field(None, ge=0.0, le=10.0, description="Dificultad FSRS")
    fsrs_lapses: Optional[int] = Field(None, ge=0, description="Número de lapsos FSRS")
    fsrs_state: Optional[str] = Field(None, pattern="^(new|learning|review|relearning)$", description="Estado FSRS")
    
    @validator('front_content')
    def validate_front_content(cls, v):
        return ContentValidator.validate_card_content(v, "front_content")
    
    @validator('back_content')
    def validate_back_content(cls, v):
        return ContentValidator.validate_card_content(v, "back_content")
    
    @validator('tags')
    def validate_tags(cls, v):
        return ContentValidator.validate_tags(v)


class CardCreate(CardBase):
    deck_id: int = Field(..., gt=0, description="ID del mazo al que pertenece la tarjeta")
    raw_cloze_text: Optional[str] = Field(None, max_length=10000, description="Texto cloze con formato {{c1::...}}")

    @model_validator(mode='before')
    @classmethod
    def check_content_or_cloze(cls, data: Any) -> Any:
        if isinstance(data, dict): # Asegurarse de que data sea un diccionario (viene de JSON)
            raw_cloze_value = data.get('raw_cloze_text')
            # Considerar raw_cloze_text como presente si es un string y no está vacío después de strip
            has_raw_cloze = isinstance(raw_cloze_value, str) and raw_cloze_value.strip()
            
            has_front_content = data.get('front_content') is not None
            has_back_content = data.get('back_content') is not None

            if has_raw_cloze and (has_front_content or has_back_content):
                raise ValueError('Si se proporciona "raw_cloze_text", "front_content" y "back_content" no deben proporcionarse.')
            if not has_raw_cloze and not (has_front_content and has_back_content):
                raise ValueError('Se debe proporcionar "raw_cloze_text" o ambos "front_content" y "back_content".')
        return data

    @validator('raw_cloze_text')
    def validate_raw_cloze_text(cls, v):
        if v is not None:
            return ContentValidator.validate_cloze_text(v)
        return v

class CardUpdate(BaseModel): # Actualización parcial
    front_content: Optional[Any] = Field(None, description="Contenido del anverso de la tarjeta")
    back_content: Optional[Any] = Field(None, description="Contenido del reverso de la tarjeta")
    cloze_data: Optional[Any] = Field(None, description="Datos de tarjeta cloze")
    tags: Optional[List[str]] = Field(None, description="Etiquetas de la tarjeta")
    next_review_at: Optional[datetime] = Field(None, description="Próxima fecha de repaso")
    fsrs_stability: Optional[float] = Field(None, ge=0.0, description="Estabilidad FSRS")
    fsrs_difficulty: Optional[float] = Field(None, ge=0.0, le=10.0, description="Dificultad FSRS")
    fsrs_lapses: Optional[int] = Field(None, ge=0, description="Número de lapsos FSRS")
    fsrs_state: Optional[str] = Field(None, pattern="^(new|learning|review|relearning)$", description="Estado FSRS")
    
    @validator('front_content')
    def validate_front_content(cls, v):
        if v is not None:
            return ContentValidator.validate_card_content(v, "front_content")
        return v
    
    @validator('back_content')
    def validate_back_content(cls, v):
        if v is not None:
            return ContentValidator.validate_card_content(v, "back_content")
        return v
    
    @validator('tags')
    def validate_tags(cls, v):
        return ContentValidator.validate_tags(v)

class CardRead(CardBase):
    id: int
    deck_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True # Pydantic v2

# Para leer un Mazo con sus tarjetas
class DeckReadWithCards(DeckRead):
    cards: List[CardRead] = []

# Para leer una Tarjeta con información básica de su Mazo
class DeckReadBasic(DeckBase): # Solo lo básico para no anidar demasiado
    id: int

class CardReadWithDeck(CardRead):
    deck: DeckReadBasic

# --- Schema para Repaso de Tarjeta (Card Review) ---

class CardReviewPayload(BaseModel):
    rating: int = Field(..., ge=1, le=4, description="Calificación del repaso: 1=Again, 2=Hard, 3=Good, 4=Easy")
    
    @validator('rating')
    def validate_rating(cls, v):
        return ContentValidator.validate_fsrs_rating(v)

# --- Schema para Resumen de Importación ---

class ImportSummary(BaseModel):
    message: str = Field(..., description="Mensaje del resultado de la importación")
    decks_created: int = Field(0, ge=0, description="Número de mazos creados")
    cards_created: int = Field(0, ge=0, description="Número de tarjetas creadas")
    warnings: List[str] = Field([], description="Lista de advertencias durante la importación")
    errors: List[str] = Field([], description="Lista de errores durante la importación")

# --- Schemas para Sincronización ---

class ConflictInfo(BaseModel):
    type: str = Field(..., pattern="^(deck|card)$", description="Tipo de conflicto")
    id: int = Field(..., gt=0, description="ID del objeto en conflicto")
    message: str = Field(..., min_length=1, description="Descripción del conflicto")

# Primero los modelos de lectura para Sync, ya que PushRequest los usa
class DeckSyncRead(DeckRead): # Hereda de DeckRead y añade campos de sync
    is_deleted: bool = Field(False, description="Indica si el mazo está eliminado")
    deleted_at: Optional[datetime] = Field(None, description="Fecha de eliminación")

class CardSyncRead(CardRead): # Hereda de CardRead y añade campos de sync
    is_deleted: bool = Field(False, description="Indica si la tarjeta está eliminada")
    deleted_at: Optional[datetime] = Field(None, description="Fecha de eliminación")

# Luego PushRequest
class PushRequest(BaseModel):
    client_timestamp: datetime = Field(..., description="Timestamp del último pull exitoso del cliente")
    
    new_decks: Optional[List[DeckCreate]] = Field(None, description="Nuevos mazos a crear")
    new_cards: Optional[List[CardCreate]] = Field(None, description="Nuevas tarjetas a crear")
    
    updated_decks: Optional[List[DeckSyncRead]] = Field(None, description="Mazos actualizados")
    updated_cards: Optional[List[CardSyncRead]] = Field(None, description="Tarjetas actualizadas")

# Finalmente PushResponse y PullResponse
class PushResponse(BaseModel):
    message: str = Field(..., description="Mensaje del resultado de la sincronización")
    created_decks: Optional[List[DeckRead]] = Field(None, description="Mazos creados en el servidor")
    created_cards: Optional[List[CardRead]] = Field(None, description="Tarjetas creadas en el servidor")
    conflicts: List[ConflictInfo] = Field([], description="Lista de conflictos encontrados")

class PullResponse(BaseModel):
    server_timestamp: datetime = Field(..., description="Timestamp actual del servidor")
    decks: List[DeckSyncRead] = Field([], description="Mazos sincronizados")
    cards: List[CardSyncRead] = Field([], description="Tarjetas sincronizadas")

# === MODELOS PARA CONFIGURACIONES DE USUARIO ===

class UserSettingsBase(BaseModel):
    """Modelo base para configuraciones de usuario."""
    # Configuraciones de estudio
    default_cards_per_session: int = Field(default=20, ge=1, le=100, description="Tarjetas por sesión (1-100)")
    enable_audio: bool = Field(default=True, description="Habilitar reproducción de audio")
    auto_play_audio: bool = Field(default=False, description="Reproducir audio automáticamente")
    show_answer_time: bool = Field(default=True, description="Mostrar tiempo de respuesta")
    
    # Configuraciones de UI
    theme: str = Field(default="light", pattern="^(light|dark|auto)$", description="Tema de la interfaz")
    language: str = Field(default="es", pattern="^(es|en)$", description="Idioma de la interfaz")
    compact_mode: bool = Field(default=False, description="Modo compacto de la interfaz")
    enable_animations: bool = Field(default=True, description="Habilitar animaciones")
    
    # Configuraciones de notificaciones
    enable_notifications: bool = Field(default=False, description="Habilitar notificaciones")
    study_reminders: bool = Field(default=False, description="Recordatorios de estudio")
    reminder_time: str = Field(default="20:00", pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="Hora de recordatorio (HH:MM)")
    
    # Configuraciones de datos
    auto_sync: bool = Field(default=True, description="Sincronización automática")
    offline_mode: bool = Field(default=False, description="Modo offline preferido")
    
    # Configuraciones avanzadas
    enable_debug_mode: bool = Field(default=False, description="Modo de depuración")
    fsrs_request_retention: float = Field(default=0.9, ge=0.7, le=0.98, description="Retención deseada FSRS (0.7-0.98)")
    fsrs_maximum_interval: int = Field(default=36500, ge=30, le=36500, description="Intervalo máximo FSRS en días")

class UserSettingsCreate(UserSettingsBase):
    """Modelo para crear configuraciones de usuario."""
    user_id: str = Field(default="default", description="ID del usuario")

class UserSettingsUpdate(BaseModel):
    """Modelo para actualizar configuraciones de usuario."""
    # Configuraciones de estudio
    default_cards_per_session: Optional[int] = Field(None, ge=1, le=100)
    enable_audio: Optional[bool] = None
    auto_play_audio: Optional[bool] = None
    show_answer_time: Optional[bool] = None
    
    # Configuraciones de UI
    theme: Optional[str] = Field(None, pattern="^(light|dark|auto)$")
    language: Optional[str] = Field(None, pattern="^(es|en)$")
    compact_mode: Optional[bool] = None
    enable_animations: Optional[bool] = None
    
    # Configuraciones de notificaciones
    enable_notifications: Optional[bool] = None
    study_reminders: Optional[bool] = None
    reminder_time: Optional[str] = Field(None, pattern="^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    
    # Configuraciones de datos
    auto_sync: Optional[bool] = None
    offline_mode: Optional[bool] = None
    
    # Configuraciones avanzadas
    enable_debug_mode: Optional[bool] = None
    fsrs_request_retention: Optional[float] = Field(None, ge=0.7, le=0.98)
    fsrs_maximum_interval: Optional[int] = Field(None, ge=30, le=36500)

class UserSettingsRead(UserSettingsBase):
    """Modelo para leer configuraciones de usuario."""
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserSettingsResetResponse(BaseModel):
    """Respuesta para reset de configuraciones."""
    message: str
    settings: UserSettingsRead

# === MODELOS PARA GENERACIÓN DE TARJETAS CON GEMINI ===

class CardGenerationRequest(BaseModel):
    """Modelo para solicitud de generación de tarjetas con Gemini."""
    topic: str = Field(..., min_length=1, max_length=500, description="Tema sobre el que generar tarjetas")
    num_cards: int = Field(default=10, ge=1, le=50, description="Número de tarjetas a generar")
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$", description="Dificultad de las tarjetas")
    card_type: str = Field(default="standard", pattern="^(standard|cloze|mixed)$", description="Tipo de tarjetas")
    language: str = Field(default="es", pattern="^(es|en)$", description="Idioma de las tarjetas")
    context: Optional[str] = Field(None, max_length=2000, description="Contexto adicional o material de referencia")
    deck_id: int = Field(..., ge=-1, description="ID del mazo donde crear las tarjetas. Usar -1 para crear un mazo nuevo")
    deck_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Nombre del nuevo mazo (requerido si deck_id = -1)")
    deck_description: Optional[str] = Field(None, max_length=1000, description="Descripción del nuevo mazo (opcional si deck_id = -1)")

    @model_validator(mode='after')
    def validate_deck_creation(self):
        if self.deck_id == -1:
            if not self.deck_name or not self.deck_name.strip():
                raise ValueError("deck_name es requerido cuando deck_id = -1 (crear mazo nuevo)")
        elif self.deck_id <= 0:
            raise ValueError("deck_id debe ser mayor que 0 o -1 para crear mazo nuevo")
        return self

class CardGenerationProgress(BaseModel):
    """Modelo para mostrar progreso de generación."""
    status: str = Field(..., pattern="^(generating|processing|completed|error)$", description="Estado de la generación")
    progress: int = Field(default=0, ge=0, le=100, description="Porcentaje de progreso")
    message: str = Field(default="", description="Mensaje descriptivo del progreso")
    cards_generated: int = Field(default=0, ge=0, description="Número de tarjetas generadas hasta ahora")

class CardGenerationResult(BaseModel):
    """Resultado de la generación de tarjetas."""
    success: bool = Field(..., description="Si la generación fue exitosa")
    cards_created: List[CardRead] = Field(default=[], description="Tarjetas creadas en la base de datos")
    metadata: Dict[str, Any] = Field(default={}, description="Metadatos de la generación")
    errors: List[str] = Field(default=[], description="Errores encontrados durante la generación")
    warnings: List[str] = Field(default=[], description="Advertencias durante la generación")

class GeminiStatusResponse(BaseModel):
    """Estado del servicio de Gemini."""
    available: bool = Field(..., description="Si Gemini está disponible")
    model: Optional[str] = Field(None, description="Modelo de Gemini en uso")
    api_key_configured: bool = Field(..., description="Si la API key está configurada")
    last_error: Optional[str] = Field(None, description="Último error reportado")
