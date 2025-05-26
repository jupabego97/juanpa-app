# Configurar JuanPA para Producción
# PowerShell Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    CONFIGURAR JUANPA PARA PRODUCCION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Este script te ayudará a configurar la URL de Railway en tu frontend." -ForegroundColor Yellow
Write-Host ""

# Solicitar URL de Railway
$railwayUrl = Read-Host "Ingresa la URL completa de tu aplicación en Railway (ej: https://mi-app.railway.app)"

if ([string]::IsNullOrWhiteSpace($railwayUrl)) {
    Write-Host "❌ ERROR: URL requerida" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Validar formato de URL
if (-not $railwayUrl.StartsWith("https://")) {
    Write-Host "⚠️  ADVERTENCIA: La URL debería comenzar con https://" -ForegroundColor Yellow
    $confirm = Read-Host "¿Continuar de todos modos? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        exit 1
    }
}

Write-Host ""
Write-Host "🔧 Configurando frontend para usar: $railwayUrl" -ForegroundColor Green
Write-Host ""

try {
    # Actualizar vercel.json
    Write-Host "📝 Actualizando vercel.json..." -ForegroundColor Blue
    $vercelPath = "frontend/vercel.json"
    if (Test-Path $vercelPath) {
        $content = Get-Content $vercelPath -Raw
        $content = $content -replace 'https://tu-app-name\.railway\.app', $railwayUrl
        Set-Content $vercelPath $content
        Write-Host "✅ vercel.json actualizado" -ForegroundColor Green
    } else {
        Write-Host "⚠️  vercel.json no encontrado" -ForegroundColor Yellow
    }

    # Crear archivo .env.local para desarrollo
    Write-Host "📝 Creando .env.local..." -ForegroundColor Blue
    $envContent = @"
# Configuración para usar Railway en desarrollo local
VITE_API_URL=$railwayUrl/api/v1
VITE_APP_TITLE=JuanPA - Repetición Espaciada
VITE_APP_VERSION=1.1.0
VITE_ENVIRONMENT=development
VITE_DEV_CONSOLE_LOGS=true
"@
    Set-Content "frontend/.env.local" $envContent
    Write-Host "✅ .env.local creado" -ForegroundColor Green

    Write-Host ""
    Write-Host "🎉 ¡Configuración completada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Archivos actualizados:" -ForegroundColor Cyan
    Write-Host "  - frontend/vercel.json (para deployment en Vercel)" -ForegroundColor White
    Write-Host "  - frontend/.env.local (para desarrollo local con Railway)" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "  1. Hacer commit y push de los cambios:" -ForegroundColor White
    Write-Host "     git add . && git commit -m 'Configure production URLs'" -ForegroundColor Gray
    Write-Host "  2. Desplegar frontend a Vercel:" -ForegroundColor White
    Write-Host "     cd frontend && vercel --prod" -ForegroundColor Gray
    Write-Host "  3. O ejecutar localmente con Railway:" -ForegroundColor White
    Write-Host "     cd frontend && npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔗 Tu aplicación estará disponible en:" -ForegroundColor Cyan
    Write-Host "  Backend:  $railwayUrl" -ForegroundColor White
    Write-Host "  Frontend: https://tu-app.vercel.app (después del deploy)" -ForegroundColor White

} catch {
    Write-Host "❌ Error durante la configuración: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Read-Host "Presiona Enter para continuar" 