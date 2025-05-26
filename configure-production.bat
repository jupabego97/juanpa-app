@echo off
echo ========================================
echo    CONFIGURAR JUANPA PARA PRODUCCION
echo ========================================
echo.

echo Este script te ayudara a configurar la URL de Railway en tu frontend.
echo.

set /p RAILWAY_URL="Ingresa la URL completa de tu aplicacion en Railway (ej: https://mi-app.railway.app): "

if "%RAILWAY_URL%"=="" (
    echo ERROR: URL requerida
    pause
    exit /b 1
)

echo.
echo Configurando frontend para usar: %RAILWAY_URL%
echo.

REM Actualizar vercel.json
powershell -Command "(Get-Content frontend/vercel.json) -replace 'https://tu-app-name.railway.app', '%RAILWAY_URL%' | Set-Content frontend/vercel.json"

REM Crear archivo .env.local para desarrollo local con Railway
echo # Configuracion para usar Railway en desarrollo local > frontend/.env.local
echo VITE_API_URL=%RAILWAY_URL%/api/v1 >> frontend/.env.local
echo VITE_APP_TITLE=JuanPA - Repeticion Espaciada >> frontend/.env.local
echo VITE_APP_VERSION=1.1.0 >> frontend/.env.local
echo VITE_ENVIRONMENT=development >> frontend/.env.local
echo VITE_DEV_CONSOLE_LOGS=true >> frontend/.env.local

echo.
echo ✅ Configuracion completada!
echo.
echo Archivos actualizados:
echo - frontend/vercel.json (para deployment en Vercel)
echo - frontend/.env.local (para desarrollo local con Railway)
echo.
echo Proximos pasos:
echo 1. Hacer commit y push de los cambios
echo 2. Desplegar frontend a Vercel: cd frontend && vercel --prod
echo 3. O ejecutar localmente: cd frontend && npm run dev
echo.
pause 