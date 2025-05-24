FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primero para aprovechar el cache de Docker
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código de la aplicación
COPY . .

# Crear directorio para archivos estáticos
RUN mkdir -p static/uploads/images

# Exponer el puerto
EXPOSE $PORT

# Comando para ejecutar la aplicación
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT 