"""
Excepciones personalizadas para JuanPA.
Provee un manejo consistente y detallado de errores en toda la aplicación.
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException
from starlette.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_401_UNAUTHORIZED,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_409_CONFLICT,
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR
)


class JuanPAException(Exception):
    """Excepción base para todas las excepciones de JuanPA."""
    
    def __init__(
        self,
        message: str,
        code: str = "JUANPA_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(JuanPAException):
    """Error de validación de datos."""
    
    def __init__(
        self,
        message: str = "Datos de entrada inválidos",
        field: Optional[str] = None,
        value: Optional[Any] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.field = field
        self.value = value
        error_details = details or {}
        if field:
            error_details["field"] = field
        if value is not None:
            error_details["invalid_value"] = str(value)
            
        super().__init__(message, "VALIDATION_ERROR", error_details)


class NotFoundError(JuanPAException):
    """Error cuando un recurso no se encuentra."""
    
    def __init__(
        self,
        resource: str,
        identifier: Any,
        message: Optional[str] = None
    ):
        self.resource = resource
        self.identifier = identifier
        msg = message or f"{resource} con ID '{identifier}' no encontrado"
        details = {
            "resource_type": resource,
            "identifier": str(identifier)
        }
        super().__init__(msg, "NOT_FOUND", details)


class ConflictError(JuanPAException):
    """Error cuando hay un conflicto de recursos."""
    
    def __init__(
        self,
        message: str,
        conflicting_field: Optional[str] = None,
        conflicting_value: Optional[Any] = None
    ):
        details = {}
        if conflicting_field:
            details["conflicting_field"] = conflicting_field
        if conflicting_value is not None:
            details["conflicting_value"] = str(conflicting_value)
            
        super().__init__(message, "CONFLICT_ERROR", details)


class BusinessLogicError(JuanPAException):
    """Error en la lógica de negocio."""
    
    def __init__(self, message: str, operation: Optional[str] = None):
        details = {}
        if operation:
            details["operation"] = operation
        super().__init__(message, "BUSINESS_LOGIC_ERROR", details)


class FSRSError(JuanPAException):
    """Error relacionado con el algoritmo FSRS."""
    
    def __init__(self, message: str, fsrs_details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "FSRS_ERROR", fsrs_details or {})


class FileProcessingError(JuanPAException):
    """Error en el procesamiento de archivos."""
    
    def __init__(
        self,
        message: str,
        filename: Optional[str] = None,
        file_type: Optional[str] = None,
        file_size: Optional[int] = None
    ):
        details = {}
        if filename:
            details["filename"] = filename
        if file_type:
            details["file_type"] = file_type
        if file_size is not None:
            details["file_size"] = file_size
            
        super().__init__(message, "FILE_PROCESSING_ERROR", details)


class SyncError(JuanPAException):
    """Error en operaciones de sincronización."""
    
    def __init__(
        self,
        message: str,
        sync_operation: Optional[str] = None,
        conflicts: Optional[list] = None
    ):
        details = {}
        if sync_operation:
            details["sync_operation"] = sync_operation
        if conflicts:
            details["conflicts_count"] = len(conflicts)
            details["conflicts"] = conflicts
            
        super().__init__(message, "SYNC_ERROR", details)


class SecurityError(JuanPAException):
    """Error de seguridad."""
    
    def __init__(
        self,
        message: str = "Operación no autorizada",
        security_context: Optional[str] = None
    ):
        details = {}
        if security_context:
            details["security_context"] = security_context
            
        super().__init__(message, "SECURITY_ERROR", details)


# Funciones auxiliares para convertir excepciones a HTTPExceptions

def to_http_exception(exc: JuanPAException) -> HTTPException:
    """Convierte una excepción de JuanPA a HTTPException de FastAPI."""
    
    status_code_map = {
        "VALIDATION_ERROR": HTTP_400_BAD_REQUEST,
        "NOT_FOUND": HTTP_404_NOT_FOUND,
        "CONFLICT_ERROR": HTTP_409_CONFLICT,
        "BUSINESS_LOGIC_ERROR": HTTP_422_UNPROCESSABLE_ENTITY,
        "FSRS_ERROR": HTTP_422_UNPROCESSABLE_ENTITY,
        "FILE_PROCESSING_ERROR": HTTP_400_BAD_REQUEST,
        "SYNC_ERROR": HTTP_409_CONFLICT,
        "SECURITY_ERROR": HTTP_403_FORBIDDEN,
        "JUANPA_ERROR": HTTP_500_INTERNAL_SERVER_ERROR
    }
    
    status_code = status_code_map.get(exc.code, HTTP_500_INTERNAL_SERVER_ERROR)
    
    detail = {
        "message": exc.message,
        "error_code": exc.code,
        "details": exc.details
    }
    
    return HTTPException(status_code=status_code, detail=detail)


def handle_database_error(error: Exception, operation: str) -> JuanPAException:
    """Maneja errores de base de datos y los convierte a excepciones apropiadas."""
    
    error_msg = str(error).lower()
    
    # Detectar violaciones de integridad/duplicados
    if "unique" in error_msg or "duplicate" in error_msg:
        if "deck" in error_msg and "name" in error_msg:
            return ConflictError(
                "Ya existe un mazo con ese nombre",
                conflicting_field="name"
            )
        elif "constraint" in error_msg:
            return ConflictError(
                f"Violación de restricción de integridad en {operation}"
            )
    
    # Detectar violaciones de clave foránea
    if "foreign key" in error_msg or "foreign_key" in error_msg:
        return ValidationError(
            f"Referencia inválida en {operation}. Verifica que los IDs existan."
        )
    
    # Error genérico de base de datos
    return JuanPAException(
        f"Error de base de datos en {operation}: {str(error)}",
        "DATABASE_ERROR",
        {"operation": operation, "original_error": str(error)}
    ) 