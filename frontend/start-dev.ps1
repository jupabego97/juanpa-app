# Script para iniciar el entorno de desarrollo de JuanPA
# Ejecuta el backend FastAPI y el frontend React simultáneamente

Write-Host "🚀 Iniciando entorno de desarrollo de JuanPA..." -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Este script debe ejecutarse desde el directorio frontend" -ForegroundColor Red
    exit 1
}

# Función para iniciar el backend
function Start-Backend {
    Write-Host "🔧 Iniciando backend FastAPI..." -ForegroundColor Yellow
    Start-Process PowerShell -ArgumentList @(
        "-Command",
        "cd ..\backend; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
    ) -WindowStyle Normal
}

# Función para iniciar el frontend
function Start-Frontend {
    Write-Host "⚛️  Iniciando frontend React..." -ForegroundColor Yellow
    npm run dev
}

# Verificar que el backend esté disponible
Write-Host "🔍 Verificando backend..." -ForegroundColor Blue
try {
    cd ..\backend
    python -c "from app.main import app; print('✅ Backend verificado')"
    cd ..\frontend
    Write-Host "✅ Backend disponible" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Backend no disponible. Verifica la instalación." -ForegroundColor Red
    exit 1
}

# Iniciar backend en ventana separada
Start-Backend
Start-Sleep -Seconds 3

# Mostrar información de conexión
Write-Host ""
Write-Host "🌐 URLs de la aplicación:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "🔗 El frontend está configurado para conectarse automáticamente al backend local" -ForegroundColor Green
Write-Host ""

# Iniciar frontend (se ejecuta en la ventana actual)
Start-Frontend 