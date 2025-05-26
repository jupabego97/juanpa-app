"""
Configuración de la aplicación JuanPA.
Maneja configuraciones por entorno y variables de entorno.
"""

import os
from typing import Optional, List
from pydantic import Field, validator
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    """Configuración principal de la aplicación."""
    
    # Información de la aplicación
    app_name: str = Field("JuanPA API", description="Nombre de la aplicación")
    app_version: str = Field("1.0.0", description="Versión de la aplicación")
    app_description: str = Field("API para aplicación de repetición espaciada", description="Descripción de la aplicación")
    
    # Entorno
    environment: str = Field("development", description="Entorno de ejecución")
    debug: bool = Field(True, description="Modo debug")
    
    # Base de datos
    database_url: str = Field("sqlite:///./juanpa.db", description="URL de conexión a la base de datos")
    database_echo: bool = Field(False, description="Mostrar queries SQL en logs")
    
    # Servidor
    host: str = Field("0.0.0.0", description="Host del servidor")
    port: int = Field(8000, ge=1, le=65535, description="Puerto del servidor")
    reload: bool = Field(True, description="Recarga automática en desarrollo")
    workers: int = Field(1, ge=1, le=8, description="Número de workers")
    
    # CORS
    cors_origins: List[str] = Field([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ], description="Orígenes permitidos para CORS")
    cors_credentials: bool = Field(True, description="Permitir credenciales en CORS")
    
    # Archivos estáticos
    static_dir: str = Field("static", description="Directorio de archivos estáticos")
    uploads_dir: str = Field("static/uploads", description="Directorio de uploads")
    max_file_size: int = Field(100 * 1024 * 1024, description="Tamaño máximo de archivo en bytes")
    
    # Logging
    log_level: str = Field("INFO", description="Nivel de logging")
    log_format: str = Field("colored", description="Formato de logging")
    enable_file_logging: bool = Field(True, description="Habilitar logging a archivo")
    log_file_max_size: int = Field(10 * 1024 * 1024, description="Tamaño máximo de archivo de log")
    log_backup_count: int = Field(5, description="Número de backups de logs")
    
    # Seguridad
    secret_key: Optional[str] = Field(None, description="Clave secreta para JWT y otros")
    access_token_expire_minutes: int = Field(30, description="Minutos de expiración del token")
    
    # Rate limiting
    rate_limit_requests: int = Field(100, description="Requests por minuto por IP")
    rate_limit_window: int = Field(60, description="Ventana de tiempo para rate limiting en segundos")
    
    # FSRS
    fsrs_default_retention: float = Field(0.9, ge=0.5, le=0.99, description="Retención por defecto de FSRS")
    fsrs_max_interval: int = Field(36500, ge=1, description="Intervalo máximo de FSRS en días")
    
    # Performance
    max_workers: int = Field(4, description="Máximo número de workers para tareas")
    request_timeout: int = Field(30, description="Timeout de requests en segundos")
    
    # Funcionalidades
    enable_ai_features: bool = Field(False, description="Habilitar funcionalidades de IA")
    enable_ocr: bool = Field(True, description="Habilitar OCR")
    enable_sync: bool = Field(True, description="Habilitar sincronización")
    
    # APIs externas
    google_api_key: Optional[str] = Field(None, description="Clave API de Google")
    openai_api_key: Optional[str] = Field(None, description="Clave API de OpenAI")
    
    @validator('environment')
    def validate_environment(cls, v):
        allowed_environments = ['development', 'testing', 'staging', 'production']
        if v not in allowed_environments:
            raise ValueError(f'Environment must be one of {allowed_environments}')
        return v
    
    @validator('log_level')
    def validate_log_level(cls, v):
        allowed_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in allowed_levels:
            raise ValueError(f'Log level must be one of {allowed_levels}')
        return v.upper()
    
    @validator('log_format')
    def validate_log_format(cls, v):
        allowed_formats = ['colored', 'json', 'simple']
        if v not in allowed_formats:
            raise ValueError(f'Log format must be one of {allowed_formats}')
        return v
    
    @validator('secret_key')
    def validate_secret_key(cls, v, values):
        if values.get('environment') == 'production' and not v:
            raise ValueError('Secret key is required for production environment')
        return v
    
    @property
    def is_development(self) -> bool:
        """Verifica si está en modo desarrollo."""
        return self.environment == 'development'
    
    @property
    def is_production(self) -> bool:
        """Verifica si está en modo producción."""
        return self.environment == 'production'
    
    @property
    def is_testing(self) -> bool:
        """Verifica si está en modo testing."""
        return self.environment == 'testing'
    
    def get_database_url(self) -> str:
        """Obtiene la URL de la base de datos con configuraciones específicas."""
        if self.is_testing:
            return "sqlite:///./test_juanpa.db"
        return self.database_url
    
    def get_static_path(self) -> Path:
        """Obtiene la ruta absoluta del directorio estático."""
        return Path(self.static_dir).resolve()
    
    def get_uploads_path(self) -> Path:
        """Obtiene la ruta absoluta del directorio de uploads."""
        return Path(self.uploads_dir).resolve()
    
    model_config = {
        "env_prefix": "JUANPA_",
        "env_file": ".env",
        "env_file_encoding": "utf-8"
    }


class DevelopmentSettings(Settings):
    """Configuración para desarrollo."""
    environment: str = "development"
    debug: bool = True
    database_echo: bool = True
    reload: bool = True
    log_level: str = "DEBUG"
    log_format: str = "colored"


class ProductionSettings(Settings):
    """Configuración para producción."""
    environment: str = "production"
    debug: bool = False
    database_echo: bool = False
    reload: bool = False
    log_level: str = "INFO"
    log_format: str = "json"
    workers: int = 4
    
    # Seguridad más estricta en producción
    cors_origins: List[str] = []  # Debe configurarse explícitamente
    rate_limit_requests: int = 60
    
    # Performance
    max_workers: int = 8


class TestingSettings(Settings):
    """Configuración para testing."""
    environment: str = "testing"
    debug: bool = False
    database_url: str = "sqlite:///./test_juanpa.db"
    database_echo: bool = False
    log_level: str = "WARNING"
    enable_file_logging: bool = False
    
    # Deshabilitar funcionalidades externas en tests
    enable_ai_features: bool = False
    enable_ocr: bool = False


def get_settings() -> Settings:
    """
    Factory function para obtener la configuración según el entorno.
    
    Returns:
        Settings: Instancia de configuración apropiada
    """
    environment = os.getenv("JUANPA_ENVIRONMENT", "development").lower()
    
    if environment == "production":
        return ProductionSettings()
    elif environment == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()


# Instancia global de configuración
settings = get_settings()


def create_directories():
    """Crea los directorios necesarios para la aplicación."""
    directories = [
        settings.get_static_path(),
        settings.get_uploads_path(),
        settings.get_uploads_path() / "images",
        settings.get_uploads_path() / "audio",
        settings.get_uploads_path() / "documents",
        Path("logs"),
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)


def validate_production_config():
    """Valida la configuración para producción."""
    if not settings.is_production:
        return
    
    issues = []
    
    # Verificar configuraciones críticas
    if not settings.secret_key:
        issues.append("SECRET_KEY is required for production")
    
    if settings.debug:
        issues.append("DEBUG should be False in production")
    
    if not settings.cors_origins:
        issues.append("CORS_ORIGINS should be explicitly configured in production")
    
    if settings.database_url.startswith("sqlite://"):
        issues.append("Consider using a production database (PostgreSQL, MySQL) instead of SQLite")
    
    if issues:
        raise ValueError(f"Production configuration issues: {'; '.join(issues)}")


# Validar configuración al importar
if settings.is_production:
    try:
        validate_production_config()
    except ValueError as e:
        print(f"WARNING: {e}")


# Crear directorios necesarios
create_directories() 