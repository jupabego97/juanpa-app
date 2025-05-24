"""
Configuración de logging para JuanPA.
Provee logging estructurado con diferentes niveles y destinos.
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from typing import Any, Dict, Optional
import json
from pathlib import Path

# Crear directorio de logs
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)


class JSONFormatter(logging.Formatter):
    """Formateador JSON para logs estructurados."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Formatea el log record como JSON."""
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Agregar información adicional si está disponible
        user_id = getattr(record, 'user_id', None)
        if user_id:
            log_entry['user_id'] = user_id
        
        request_id = getattr(record, 'request_id', None)
        if request_id:
            log_entry['request_id'] = request_id
        
        operation = getattr(record, 'operation', None)
        if operation:
            log_entry['operation'] = operation
        
        execution_time = getattr(record, 'execution_time', None)
        if execution_time is not None:
            log_entry['execution_time'] = execution_time
        
        extra_data = getattr(record, 'extra_data', None)
        if extra_data:
            log_entry['extra_data'] = extra_data
        
        # Agregar información de excepción si está presente
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': self.formatException(record.exc_info)
            }
        
        return json.dumps(log_entry, ensure_ascii=False)


class ColoredFormatter(logging.Formatter):
    """Formateador con colores para desarrollo."""
    
    # Códigos de color ANSI
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Verde
        'WARNING': '\033[33m',    # Amarillo
        'ERROR': '\033[31m',      # Rojo
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m'        # Reset
    }
    
    def format(self, record: logging.LogRecord) -> str:
        """Formatea el log record con colores."""
        log_color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset_color = self.COLORS['RESET']
        
        # Formato: [TIMESTAMP] LEVEL - logger_name - message
        formatted_time = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        message = f"{log_color}[{formatted_time}] {record.levelname} - {record.name} - {record.getMessage()}{reset_color}"
        
        # Agregar información de excepción si está presente
        if record.exc_info:
            message += f"\n{self.formatException(record.exc_info)}"
        
        return message


class JuanPALogger:
    """Logger principal de JuanPA con métodos de conveniencia."""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self._request_id: Optional[str] = None
        self._user_id: Optional[str] = None
    
    def set_context(self, request_id: Optional[str] = None, user_id: Optional[str] = None):
        """Establece contexto para los logs."""
        self._request_id = request_id
        self._user_id = user_id
    
    def _add_context(self, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Agrega contexto a los logs."""
        context = extra or {}
        
        if self._request_id:
            context['request_id'] = self._request_id
        
        if self._user_id:
            context['user_id'] = self._user_id
        
        return context
    
    def debug(self, message: str, **kwargs):
        """Log de debug."""
        extra = self._add_context(kwargs)
        self.logger.debug(message, extra=extra)
    
    def info(self, message: str, **kwargs):
        """Log de información."""
        extra = self._add_context(kwargs)
        self.logger.info(message, extra=extra)
    
    def warning(self, message: str, **kwargs):
        """Log de advertencia."""
        extra = self._add_context(kwargs)
        self.logger.warning(message, extra=extra)
    
    def error(self, message: str, exc_info: bool = False, **kwargs):
        """Log de error."""
        extra = self._add_context(kwargs)
        self.logger.error(message, exc_info=exc_info, extra=extra)
    
    def critical(self, message: str, exc_info: bool = False, **kwargs):
        """Log crítico."""
        extra = self._add_context(kwargs)
        self.logger.critical(message, exc_info=exc_info, extra=extra)
    
    def operation_start(self, operation: str, **kwargs):
        """Log de inicio de operación."""
        extra = self._add_context(kwargs)
        extra['operation'] = operation
        self.logger.info(f"Iniciando operación: {operation}", extra=extra)
    
    def operation_success(self, operation: str, execution_time: Optional[float] = None, **kwargs):
        """Log de operación exitosa."""
        extra = self._add_context(kwargs)
        extra['operation'] = operation
        if execution_time is not None:
            extra['execution_time'] = execution_time
        
        message = f"Operación exitosa: {operation}"
        if execution_time:
            message += f" (tiempo: {execution_time:.3f}s)"
        
        self.logger.info(message, extra=extra)
    
    def operation_error(self, operation: str, error: Exception, execution_time: Optional[float] = None, **kwargs):
        """Log de error en operación."""
        extra = self._add_context(kwargs)
        extra['operation'] = operation
        if execution_time is not None:
            extra['execution_time'] = execution_time
        
        message = f"Error en operación: {operation} - {str(error)}"
        if execution_time:
            message += f" (tiempo: {execution_time:.3f}s)"
        
        self.logger.error(message, exc_info=True, extra=extra)
    
    def security_event(self, event_type: str, details: Dict[str, Any], severity: str = "warning"):
        """Log de evento de seguridad."""
        extra = self._add_context()
        extra['security_event'] = event_type
        extra['extra_data'] = details
        
        message = f"Evento de seguridad: {event_type}"
        
        if severity == "critical":
            self.logger.critical(message, extra=extra)
        elif severity == "error":
            self.logger.error(message, extra=extra)
        else:
            self.logger.warning(message, extra=extra)
    
    def database_operation(self, operation: str, table: str, record_id: Optional[Any] = None, **kwargs):
        """Log de operación de base de datos."""
        extra = self._add_context(kwargs)
        extra['db_operation'] = operation
        extra['db_table'] = table
        if record_id is not None:
            extra['record_id'] = str(record_id)
        
        message = f"DB {operation}: {table}"
        if record_id:
            message += f" (ID: {record_id})"
        
        self.logger.debug(message, extra=extra)
    
    def api_request(self, method: str, endpoint: str, status_code: int, execution_time: float, **kwargs):
        """Log de request API."""
        extra = self._add_context(kwargs)
        extra['api_method'] = method
        extra['api_endpoint'] = endpoint
        extra['status_code'] = status_code
        extra['execution_time'] = execution_time
        
        message = f"API {method} {endpoint} - {status_code} ({execution_time:.3f}s)"
        
        if status_code >= 500:
            self.logger.error(message, extra=extra)
        elif status_code >= 400:
            self.logger.warning(message, extra=extra)
        else:
            self.logger.info(message, extra=extra)


def setup_logging(
    level: str = "INFO",
    enable_console: bool = True,
    enable_file: bool = True,
    enable_json: bool = False,
    max_file_size: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
):
    """
    Configura el sistema de logging.
    
    Args:
        level: Nivel de logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        enable_console: Habilitar logging a consola
        enable_file: Habilitar logging a archivo
        enable_json: Usar formato JSON para archivos
        max_file_size: Tamaño máximo de archivo de log en bytes
        backup_count: Número de archivos de backup a mantener
    """
    
    # Nivel de logging
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Configurar logger raíz
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Limpiar handlers existentes
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Handler para consola (desarrollo)
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        
        # Usar formato con colores si es un terminal
        if sys.stdout.isatty():
            console_formatter = ColoredFormatter()
        else:
            console_formatter = logging.Formatter(
                '[%(asctime)s] %(levelname)s - %(name)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
        
        console_handler.setFormatter(console_formatter)
        root_logger.addHandler(console_handler)
    
    # Handler para archivo (producción)
    if enable_file:
        # Archivo principal
        main_log_file = LOG_DIR / "juanpa.log"
        file_handler = logging.handlers.RotatingFileHandler(
            main_log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(log_level)
        
        if enable_json:
            file_formatter = JSONFormatter()
        else:
            file_formatter = logging.Formatter(
                '[%(asctime)s] %(levelname)s - %(name)s - %(funcName)s:%(lineno)d - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
        
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)
        
        # Archivo separado para errores
        error_log_file = LOG_DIR / "errors.log"
        error_handler = logging.handlers.RotatingFileHandler(
            error_log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(file_formatter)
        root_logger.addHandler(error_handler)
        
        # Archivo separado para eventos de seguridad
        security_log_file = LOG_DIR / "security.log"
        security_handler = logging.handlers.RotatingFileHandler(
            security_log_file,
            maxBytes=max_file_size,
            backupCount=backup_count,
            encoding='utf-8'
        )
        security_handler.setLevel(logging.WARNING)
        
        # Filtro para eventos de seguridad
        class SecurityFilter(logging.Filter):
            def filter(self, record):
                return hasattr(record, 'security_event')
        
        security_handler.addFilter(SecurityFilter())
        security_handler.setFormatter(file_formatter)
        root_logger.addHandler(security_handler)
    
    # Configurar loggers de librerías externas
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    # Logger inicial
    logger = JuanPALogger("juanpa.startup")
    logger.info(f"Sistema de logging configurado - Nivel: {level}, Consola: {enable_console}, Archivo: {enable_file}")


def get_logger(name: str) -> JuanPALogger:
    """Obtiene un logger de JuanPA."""
    return JuanPALogger(name)


# Configurar logging por defecto
def configure_default_logging():
    """Configura logging por defecto basado en variables de entorno."""
    log_level = os.getenv("LOG_LEVEL", "INFO")
    log_format = os.getenv("LOG_FORMAT", "colored")  # colored, json, simple
    enable_file_logging = os.getenv("ENABLE_FILE_LOGGING", "true").lower() == "true"
    
    enable_json = log_format == "json"
    enable_console = True  # Siempre habilitado en desarrollo
    
    setup_logging(
        level=log_level,
        enable_console=enable_console,
        enable_file=enable_file_logging,
        enable_json=enable_json
    )


# Configuración automática al importar
if __name__ != "__main__":
    configure_default_logging() 