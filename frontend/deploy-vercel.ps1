# Script para desplegar en Vercel
# Ejecutar desde: juanpa/frontend/

Write-Host "🚀 Iniciando despliegue en Vercel..." -ForegroundColor Green

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Ejecuta este script desde el directorio frontend/" -ForegroundColor Red
    exit 1
}

# Verificar que existe el archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado. Creándolo..." -ForegroundColor Yellow
    
    @"
VITE_API_URL=https://juanpa-backend.railway.app/api/v1
VITE_APP_TITLE=JuanPA - Repetición Espaciada
VITE_APP_VERSION=1.0.0
VITE_DEV_CONSOLE_LOGS=false
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "✅ Archivo .env creado" -ForegroundColor Green
}

# Mostrar variables de entorno
Write-Host "📋 Variables de entorno configuradas:" -ForegroundColor Cyan
Get-Content ".env" | ForEach-Object { Write-Host "   $_" -ForegroundColor White }

# Verificar build local
Write-Host "🔍 Verificando build local..." -ForegroundColor Cyan
try {
    npm run build | Out-Null
    Write-Host "✅ Build local exitoso" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en build local. Revisa los errores antes de continuar." -ForegroundColor Red
    exit 1
}

# Verificar si Vercel CLI está instalado
$vercelInstalled = $false
try {
    vercel --version | Out-Null
    $vercelInstalled = $true
    Write-Host "✅ Vercel CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Vercel CLI no encontrado" -ForegroundColor Yellow
}

Write-Host "`n🎯 Opciones de despliegue:" -ForegroundColor Cyan
Write-Host "1. Despliegue automático via web (recomendado)" -ForegroundColor White
Write-Host "2. Despliegue manual via CLI" -ForegroundColor White

if (-not $vercelInstalled) {
    Write-Host "   (Opción 2 requiere instalar Vercel CLI)" -ForegroundColor Yellow
}

$choice = Read-Host "`nSelecciona una opción (1-2)"

switch ($choice) {
    "1" {
        Write-Host "`n📋 Pasos para despliegue web:" -ForegroundColor Cyan
        Write-Host "1. Ve a: https://vercel.com/new" -ForegroundColor White
        Write-Host "2. Conecta tu repositorio GitHub 'juanpa'" -ForegroundColor White
        Write-Host "3. Configuración:" -ForegroundColor White
        Write-Host "   - Framework: Vite" -ForegroundColor Gray
        Write-Host "   - Root Directory: frontend" -ForegroundColor Gray
        Write-Host "   - Build Command: npm run build" -ForegroundColor Gray
        Write-Host "   - Output Directory: dist" -ForegroundColor Gray
        Write-Host "4. Agregar variables de entorno:" -ForegroundColor White
        Write-Host "   VITE_API_URL = https://juanpa-backend.railway.app/api/v1" -ForegroundColor Gray
        Write-Host "   VITE_APP_TITLE = JuanPA - Repetición Espaciada" -ForegroundColor Gray
        Write-Host "   VITE_APP_VERSION = 1.0.0" -ForegroundColor Gray
        Write-Host "   VITE_DEV_CONSOLE_LOGS = false" -ForegroundColor Gray
        Write-Host "5. Hacer clic en 'Deploy'" -ForegroundColor White
        
        Write-Host "`n🔗 Abriendo Vercel..." -ForegroundColor Green
        Start-Process "https://vercel.com/new"
    }
    "2" {
        if (-not $vercelInstalled) {
            Write-Host "🔧 Instalando Vercel CLI..." -ForegroundColor Cyan
            try {
                npm install -g vercel
                Write-Host "✅ Vercel CLI instalado" -ForegroundColor Green
            } catch {
                Write-Host "❌ Error instalando Vercel CLI" -ForegroundColor Red
                exit 1
            }
        }
        
        Write-Host "🔐 Iniciando sesión en Vercel..." -ForegroundColor Cyan
        vercel login
        
        Write-Host "🚀 Desplegando..." -ForegroundColor Cyan
        vercel --prod
    }
    default {
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✅ Proceso completado!" -ForegroundColor Green
Write-Host "📍 Recuerda:" -ForegroundColor Cyan
Write-Host "- Configurar CORS en Railway con tu dominio de Vercel" -ForegroundColor White
Write-Host "- Probar la aplicación después del despliegue" -ForegroundColor White 