from datetime import datetime, timezone
from typing import List, Optional, Any
from sqlmodel import Field, SQLModel, Relationship, JSON, Column
import json

# Clase base para timestamps
class TimestampModel(SQLModel):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False, sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)})
    is_deleted: bool = Field(default=False, index=True) # Nuevo campo para soft delete
    deleted_at: Optional[datetime] = Field(default=None, index=True) # Timestamp de la soft delete

# Modelo para Tarjeta (Card)
class Card(TimestampModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    deck_id: int = Field(foreign_key="deck.id", index=True)
    
    front_content: Any = Field(sa_column=Column(JSON)) # Permite estructuras complejas: texto, img_url, audio_url
    back_content: Any = Field(sa_column=Column(JSON))  # Similar a front_content
    cloze_data: Optional[Any] = Field(default=None, sa_column=Column(JSON)) # Para tarjetas cloze
    
    tags: Optional[List[str]] = Field(default=None, sa_column=Column(JSON)) # Lista de strings para tags

    next_review_at: Optional[datetime] = Field(default=None, index=True)
    # FSRS parameters
    fsrs_stability: Optional[float] = Field(default=None)
    fsrs_difficulty: Optional[float] = Field(default=None)
    fsrs_lapses: Optional[int] = Field(default=0)
    fsrs_state: Optional[str] = Field(default="new") # new, learning, review, relearning

    deck: "Deck" = Relationship(back_populates="cards")
    # review_logs: List["ReviewLog"] = Relationship(back_populates="card") # Si Card necesita acceder a sus logs

# Modelo para Mazo (Deck)
class Deck(TimestampModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    name: str = Field(index=True, unique=True) # Nombre del mazo debe ser Ăşnico
    description: Optional[str] = Field(default=None)

    cards: List["Card"] = Relationship(back_populates="deck", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    # review_logs: List["ReviewLog"] = Relationship(back_populates="deck") # Si Deck necesita acceder a sus logs

# Modelo para ReviewLog (Historial de Repasos)
class ReviewLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    card_id: int = Field(foreign_key="card.id", index=True)
    # deck_id: int = Field(foreign_key="deck.id", index=True) # Opcional, se puede obtener a travĂŠs de card.deck_id

    rating_given: int # 1:Again, 2:Hard, 3:Good, 4:Easy
    review_timestamp: datetime = Field(index=True, default_factory=lambda: datetime.now(timezone.utc))
    
    # Estado FSRS antes del repaso (snapshot)
    previous_stability: Optional[float] = Field(default=None)
    previous_difficulty: Optional[float] = Field(default=None)
    previous_lapses: Optional[int] = Field(default=None)
    previous_state: Optional[str] = Field(default=None)
    previous_due_date: Optional[datetime] = Field(default=None) # 'due' date antes de este repaso

    # Estado FSRS despuĂŠs del repaso (snapshot)
    new_stability: float
    new_difficulty: float
    new_lapses: int
    new_state: str 
    new_due_date: datetime # Corresponde a card.next_review_at despuĂŠs de este repaso

    time_taken_ms: Optional[int] = Field(default=None) # Tiempo que tardĂł el usuario (opcional)

    # Relaciones (opcionales, si se necesita navegar desde el log)
    # card: "Card" = Relationship(back_populates="review_logs")
    # deck: "Deck" = Relationship(back_populates="review_logs")

class UserSettings(SQLModel, table=True):
    """Modelo para configuraciones de usuario."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(default="default", unique=True, index=True)  # Para futuro soporte multi-usuario
    
    # Configuraciones de estudio
    default_cards_per_session: int = Field(default=20)
    enable_audio: bool = Field(default=True)
    auto_play_audio: bool = Field(default=False)
    show_answer_time: bool = Field(default=True)
    
    # Configuraciones de UI
    theme: str = Field(default="light")  # "light", "dark", "auto"
    language: str = Field(default="es")  # "es", "en"
    compact_mode: bool = Field(default=False)
    enable_animations: bool = Field(default=True)
    
    # Configuraciones de notificaciones
    enable_notifications: bool = Field(default=False)
    study_reminders: bool = Field(default=False)
    reminder_time: str = Field(default="20:00")
    
    # Configuraciones de datos
    auto_sync: bool = Field(default=True)
    offline_mode: bool = Field(default=False)
    
    # Configuraciones avanzadas
    enable_debug_mode: bool = Field(default=False)
    fsrs_request_retention: float = Field(default=0.9)
    fsrs_maximum_interval: int = Field(default=36500)
    
    # Metadatos
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    def update_timestamp(self):
        """Actualiza el timestamp de modificación."""
        self.updated_at = datetime.now(timezone.utc)
