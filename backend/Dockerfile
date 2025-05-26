# Usar imagen oficial de Python slim para optimizar tamaño
FROM python:3.11-slim

# Configurar variables de entorno
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (para aprovechar el cache de Docker)
COPY requirements.txt .

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r requirements.txt

# Copiar el código de la aplicación
COPY . .

# Crear directorio para archivos estáticos y base de datos
RUN mkdir -p static/uploads/images && \
    mkdir -p logs

# Exponer el puerto que usa FastAPI
EXPOSE 8000

# Configurar variables de entorno por defecto para producción
ENV JUANPA_ENVIRONMENT=production \
    JUANPA_HOST=0.0.0.0 \
    JUANPA_PORT=8000 \
    JUANPA_DEBUG=false \
    JUANPA_LOG_LEVEL=INFO \
    JUANPA_CORS_ORIGINS='["https://*.vercel.app","https://*.railway.app"]'

# Comando para ejecutar la aplicación
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 