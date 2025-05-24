"""
Middleware para JuanPA.
Incluye manejo de errores, logging automático, monitoreo de rendimiento y seguridad.
"""

import time
import uuid
from typing import Callable, Any
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .exceptions import JuanPAException, to_http_exception, handle_database_error
from .logging_config import get_logger
from .validators import SyncValidator
import sqlalchemy.exc


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware para manejo centralizado de errores."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = get_logger("juanpa.middleware.error")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
        
        except JuanPAException as exc:
            # Errores de dominio de JuanPA
            self.logger.warning(
                f"Error de aplicación: {exc.message}",
                operation=request.url.path,
                error_code=exc.code,
                extra_data=exc.details
            )
            
            http_exc = to_http_exception(exc)
            return JSONResponse(
                status_code=http_exc.status_code,
                content=http_exc.detail
            )
        
        except sqlalchemy.exc.SQLAlchemyError as exc:
            # Errores de base de datos
            operation = f"{request.method} {request.url.path}"
            juanpa_exc = handle_database_error(exc, operation)
            
            self.logger.error(
                f"Error de base de datos: {str(exc)}",
                exc_info=True,
                operation=operation
            )
            
            http_exc = to_http_exception(juanpa_exc)
            return JSONResponse(
                status_code=http_exc.status_code,
                content=http_exc.detail
            )
        
        except ValueError as exc:
            # Errores de validación básicos
            self.logger.warning(
                f"Error de validación: {str(exc)}",
                operation=request.url.path
            )
            
            return JSONResponse(
                status_code=400,
                content={
                    "message": "Error de validación",
                    "error_code": "VALIDATION_ERROR",
                    "details": {"validation_error": str(exc)}
                }
            )
        
        except Exception as exc:
            # Errores no manejados
            self.logger.error(
                f"Error no manejado: {str(exc)}",
                exc_info=True,
                operation=request.url.path
            )
            
            return JSONResponse(
                status_code=500,
                content={
                    "message": "Error interno del servidor",
                    "error_code": "INTERNAL_SERVER_ERROR",
                    "details": {}
                }
            )


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware para logging automático de requests."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = get_logger("juanpa.middleware.requests")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generar ID único para el request
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Configurar contexto del logger
        self.logger.set_context(request_id=request_id)
        
        # Información del request
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "unknown")
        
        start_time = time.time()
        
        self.logger.info(
            f"Request iniciado: {request.method} {request.url.path}",
            api_method=request.method,
            api_endpoint=str(request.url.path),
            client_ip=client_ip,
            user_agent=user_agent,
            query_params=str(request.query_params) if request.query_params else None
        )
        
        try:
            response = await call_next(request)
            execution_time = time.time() - start_time
            
            # Log del response
            self.logger.api_request(
                method=request.method,
                endpoint=str(request.url.path),
                status_code=response.status_code,
                execution_time=execution_time,
                client_ip=client_ip,
                response_size=response.headers.get("content-length", "unknown")
            )
            
            return response
        
        except Exception as exc:
            execution_time = time.time() - start_time
            
            self.logger.error(
                f"Request falló: {request.method} {request.url.path} - {str(exc)}",
                exc_info=True,
                api_method=request.method,
                api_endpoint=str(request.url.path),
                execution_time=execution_time,
                client_ip=client_ip
            )
            
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """Obtiene la IP del cliente considerando proxies."""
        # Verificar headers de proxy
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Tomar la primera IP (cliente original)
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # IP directa del cliente
        return request.client.host if request.client else "unknown"


class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware para monitoreo de rendimiento."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = get_logger("juanpa.middleware.performance")
        
        # Umbrales de alerta (en segundos)
        self.slow_request_threshold = 5.0
        self.very_slow_request_threshold = 10.0
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        start_cpu_time = time.process_time()
        
        response = await call_next(request)
        
        execution_time = time.time() - start_time
        cpu_time = time.process_time() - start_cpu_time
        
        # Métricas de rendimiento
        metrics = {
            "execution_time": execution_time,
            "cpu_time": cpu_time,
            "method": request.method,
            "endpoint": str(request.url.path),
            "status_code": response.status_code
        }
        
        # Alertas de rendimiento
        if execution_time > self.very_slow_request_threshold:
            self.logger.warning(
                f"Request muy lento: {request.method} {request.url.path} ({execution_time:.3f}s)",
                **metrics
            )
        elif execution_time > self.slow_request_threshold:
            self.logger.info(
                f"Request lento: {request.method} {request.url.path} ({execution_time:.3f}s)",
                **metrics
            )
        
        # Agregar headers de rendimiento
        response.headers["X-Response-Time"] = f"{execution_time:.3f}s"
        response.headers["X-CPU-Time"] = f"{cpu_time:.3f}s"
        
        return response


class SecurityMiddleware(BaseHTTPMiddleware):
    """Middleware para seguridad básica."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = get_logger("juanpa.middleware.security")
        
        # Límites de seguridad
        self.max_request_size = 100 * 1024 * 1024  # 100MB
        self.max_requests_per_minute = 100
        self.blocked_user_agents = [
            "curl",  # Bloquear curl básico (permitir curl con user-agent específico)
        ]
        
        # Cache simple para rate limiting (en producción usar Redis)
        self.request_cache = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Verificar tamaño del request
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_request_size:
                    self.logger.security_event(
                        "request_too_large",
                        {
                            "size": size,
                            "max_size": self.max_request_size,
                            "client_ip": self._get_client_ip(request),
                            "endpoint": str(request.url.path)
                        },
                        severity="warning"
                    )
                    
                    return JSONResponse(
                        status_code=413,
                        content={
                            "message": "Request demasiado grande",
                            "error_code": "REQUEST_TOO_LARGE"
                        }
                    )
            except ValueError:
                pass
        
        # Verificar User-Agent sospechoso
        user_agent = request.headers.get("user-agent", "").lower()
        for blocked_agent in self.blocked_user_agents:
            if blocked_agent in user_agent:
                self.logger.security_event(
                    "blocked_user_agent",
                    {
                        "user_agent": user_agent,
                        "client_ip": self._get_client_ip(request),
                        "endpoint": str(request.url.path)
                    },
                    severity="warning"
                )
                
                return JSONResponse(
                    status_code=403,
                    content={
                        "message": "User-Agent no permitido",
                        "error_code": "FORBIDDEN_USER_AGENT"
                    }
                )
        
        # Rate limiting básico (simple, en producción usar algo más robusto)
        client_ip = self._get_client_ip(request)
        current_time = int(time.time() / 60)  # Minuto actual
        
        if client_ip in self.request_cache:
            minute, count = self.request_cache[client_ip]
            if minute == current_time:
                if count >= self.max_requests_per_minute:
                    self.logger.security_event(
                        "rate_limit_exceeded",
                        {
                            "client_ip": client_ip,
                            "requests_count": count,
                            "limit": self.max_requests_per_minute,
                            "endpoint": str(request.url.path)
                        },
                        severity="warning"
                    )
                    
                    return JSONResponse(
                        status_code=429,
                        content={
                            "message": "Demasiadas requests. Intenta más tarde.",
                            "error_code": "RATE_LIMIT_EXCEEDED"
                        }
                    )
                else:
                    self.request_cache[client_ip] = (minute, count + 1)
            else:
                self.request_cache[client_ip] = (current_time, 1)
        else:
            self.request_cache[client_ip] = (current_time, 1)
        
        # Limpiar cache viejo
        self._cleanup_cache(current_time)
        
        response = await call_next(request)
        
        # Agregar headers de seguridad
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Obtiene la IP del cliente considerando proxies."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _cleanup_cache(self, current_minute: int):
        """Limpia entradas viejas del cache."""
        to_remove = []
        for ip, (minute, count) in self.request_cache.items():
            if minute < current_minute - 5:  # Mantener últimos 5 minutos
                to_remove.append(ip)
        
        for ip in to_remove:
            del self.request_cache[ip]


class RequestValidationMiddleware(BaseHTTPMiddleware):
    """Middleware para validación de requests."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = get_logger("juanpa.middleware.validation")
        
        # Endpoints que requieren validación especial
        self.sync_endpoints = ["/api/v1/sync/push", "/api/v1/sync/pull"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Validación específica para endpoints de sincronización
        if request.url.path in self.sync_endpoints:
            await self._validate_sync_request(request)
        
        return await call_next(request)
    
    async def _validate_sync_request(self, request: Request):
        """Valida requests de sincronización."""
        # Verificar Content-Type para requests POST
        if request.method == "POST":
            content_type = request.headers.get("content-type", "")
            if not content_type.startswith("application/json"):
                self.logger.security_event(
                    "invalid_content_type_sync",
                    {
                        "content_type": content_type,
                        "endpoint": str(request.url.path),
                        "client_ip": self._get_client_ip(request)
                    },
                    severity="warning"
                )
                
                raise ValueError("Content-Type debe ser application/json para endpoints de sincronización")
    
    def _get_client_ip(self, request: Request) -> str:
        """Obtiene la IP del cliente considerando proxies."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown" 