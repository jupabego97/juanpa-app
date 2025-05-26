@echo off
echo ========================================
echo    JUANPA - DESPLIEGUE A DOCKER HUB
echo ========================================
echo.

REM Verificar que Docker esté ejecutándose
echo [1/6] Verificando Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Desktop no está ejecutándose.
    echo Por favor, inicia Docker Desktop y espera a que se cargue completamente.
    echo Luego ejecuta este script nuevamente.
    pause
    exit /b 1
)
echo ✓ Docker está ejecutándose

REM Solicitar nombre de usuario de Docker Hub
echo.
echo [2/6] Configuración de Docker Hub
set /p DOCKER_USERNAME="Ingresa tu nombre de usuario de Docker Hub: "
if "%DOCKER_USERNAME%"=="" (
    echo ERROR: Nombre de usuario requerido
    pause
    exit /b 1
)

REM Construir la imagen
echo.
echo [3/6] Construyendo imagen Docker...
echo Esto puede tomar varios minutos...
docker build -t %DOCKER_USERNAME%/juanpa-backend:latest .
if %errorlevel% neq 0 (
    echo ERROR: Falló la construcción de la imagen
    pause
    exit /b 1
)
echo ✓ Imagen construida exitosamente

REM También crear tag con versión
echo.
echo [4/6] Creando tags adicionales...
docker tag %DOCKER_USERNAME%/juanpa-backend:latest %DOCKER_USERNAME%/juanpa-backend:v1.0.0
echo ✓ Tags creados

REM Login a Docker Hub
echo.
echo [5/6] Iniciando sesión en Docker Hub...
echo Se abrirá el navegador para autenticación o ingresa tus credenciales:
docker login
if %errorlevel% neq 0 (
    echo ERROR: Falló el login a Docker Hub
    pause
    exit /b 1
)
echo ✓ Sesión iniciada en Docker Hub

REM Subir la imagen
echo.
echo [6/6] Subiendo imagen a Docker Hub...
echo Subiendo latest...
docker push %DOCKER_USERNAME%/juanpa-backend:latest
if %errorlevel% neq 0 (
    echo ERROR: Falló la subida de la imagen latest
    pause
    exit /b 1
)

echo Subiendo v1.0.0...
docker push %DOCKER_USERNAME%/juanpa-backend:v1.0.0
if %errorlevel% neq 0 (
    echo ERROR: Falló la subida de la imagen v1.0.0
    pause
    exit /b 1
)

echo.
echo ========================================
echo           ¡DESPLIEGUE EXITOSO!
echo ========================================
echo.
echo Tu imagen está disponible en:
echo https://hub.docker.com/r/%DOCKER_USERNAME%/juanpa-backend
echo.
echo Para usar la imagen:
echo docker pull %DOCKER_USERNAME%/juanpa-backend:latest
echo docker run -p 8000:8000 %DOCKER_USERNAME%/juanpa-backend:latest
echo.
echo Para Railway, usa esta imagen:
echo %DOCKER_USERNAME%/juanpa-backend:latest
echo.
pause 