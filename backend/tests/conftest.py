"""
Configuración de tests para JuanPA.
"""

import pytest
import tempfile
import os
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
from app.config import TestingSettings


@pytest.fixture(name="session")
def session_fixture():
    """Fixture para crear una sesión de base de datos en memoria para tests."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Fixture para crear un cliente de test de FastAPI."""
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture(name="temp_uploads_dir")
def temp_uploads_dir_fixture():
    """Fixture para crear un directorio temporal para uploads en tests."""
    with tempfile.TemporaryDirectory() as temp_dir:
        original_uploads_dir = app.state.uploads_dir if hasattr(app.state, 'uploads_dir') else None
        app.state.uploads_dir = temp_dir
        yield temp_dir
        if original_uploads_dir:
            app.state.uploads_dir = original_uploads_dir


@pytest.fixture(autouse=True)
def setup_test_environment():
    """Configuración automática del entorno de testing."""
    # Establecer variables de entorno para testing
    os.environ["JUANPA_ENVIRONMENT"] = "testing"
    os.environ["JUANPA_LOG_LEVEL"] = "WARNING"
    os.environ["JUANPA_ENABLE_FILE_LOGGING"] = "false"
    
    yield
    
    # Limpiar variables de entorno después del test
    test_vars = [
        "JUANPA_ENVIRONMENT",
        "JUANPA_LOG_LEVEL", 
        "JUANPA_ENABLE_FILE_LOGGING"
    ]
    for var in test_vars:
        if var in os.environ:
            del os.environ[var]


# Datos de ejemplo para tests
@pytest.fixture
def sample_deck_data():
    """Datos de ejemplo para crear un mazo."""
    return {
        "name": "Mazo de Prueba",
        "description": "Descripción de prueba para el mazo"
    }


@pytest.fixture  
def sample_card_data():
    """Datos de ejemplo para crear una tarjeta."""
    return {
        "front_content": [{"type": "text", "content": "¿Cuál es la capital de Francia?"}],
        "back_content": [{"type": "text", "content": "París"}],
        "tags": ["geografía", "europa"]
    }


@pytest.fixture
def sample_cloze_data():
    """Datos de ejemplo para crear tarjetas cloze."""
    return {
        "raw_cloze_text": "La capital de {{c1::Francia}} es {{c2::París}}."
    } 