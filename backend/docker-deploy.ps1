# JuanPA - Script de Despliegue a Docker Hub
# PowerShell Script

param(
    [string]$DockerUsername = "",
    [string]$ImageTag = "latest",
    [string]$Version = "v1.0.0"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    JUANPA - DESPLIEGUE A DOCKER HUB" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Función para mostrar errores
function Show-Error {
    param([string]$Message)
    Write-Host "❌ ERROR: $Message" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Función para mostrar éxito
function Show-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# Función para mostrar información
function Show-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Yellow
}

# [1/6] Verificar Docker
Write-Host "[1/6] Verificando Docker..." -ForegroundColor Blue
try {
    $dockerInfo = docker info 2>$null
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Docker Desktop no está ejecutándose. Por favor, inicia Docker Desktop y espera a que se cargue completamente."
    }
    Show-Success "Docker está ejecutándose"
} catch {
    Show-Error "Docker no está instalado o no está disponible en PATH"
}

# [2/6] Obtener nombre de usuario
Write-Host ""
Write-Host "[2/6] Configuración de Docker Hub" -ForegroundColor Blue
if ([string]::IsNullOrEmpty($DockerUsername)) {
    $DockerUsername = Read-Host "Ingresa tu nombre de usuario de Docker Hub"
    if ([string]::IsNullOrEmpty($DockerUsername)) {
        Show-Error "Nombre de usuario requerido"
    }
}
Show-Info "Usando usuario: $DockerUsername"

# [3/6] Construir imagen
Write-Host ""
Write-Host "[3/6] Construyendo imagen Docker..." -ForegroundColor Blue
Show-Info "Esto puede tomar varios minutos..."

$imageName = "$DockerUsername/juanpa-backend"
Write-Host "Construyendo: $imageName`:$ImageTag" -ForegroundColor Gray

try {
    docker build -t "$imageName`:$ImageTag" .
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Falló la construcción de la imagen"
    }
    Show-Success "Imagen construida exitosamente"
} catch {
    Show-Error "Error durante la construcción: $_"
}

# [4/6] Crear tags adicionales
Write-Host ""
Write-Host "[4/6] Creando tags adicionales..." -ForegroundColor Blue
try {
    docker tag "$imageName`:$ImageTag" "$imageName`:$Version"
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Falló la creación de tags"
    }
    Show-Success "Tags creados: $ImageTag, $Version"
} catch {
    Show-Error "Error creando tags: $_"
}

# [5/6] Login a Docker Hub
Write-Host ""
Write-Host "[5/6] Iniciando sesión en Docker Hub..." -ForegroundColor Blue
Show-Info "Se abrirá el navegador para autenticación o ingresa tus credenciales:"

try {
    docker login
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Falló el login a Docker Hub"
    }
    Show-Success "Sesión iniciada en Docker Hub"
} catch {
    Show-Error "Error durante el login: $_"
}

# [6/6] Subir imágenes
Write-Host ""
Write-Host "[6/6] Subiendo imágenes a Docker Hub..." -ForegroundColor Blue

# Subir latest
Write-Host "Subiendo $imageName`:$ImageTag..." -ForegroundColor Gray
try {
    docker push "$imageName`:$ImageTag"
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Falló la subida de la imagen $ImageTag"
    }
    Show-Success "Imagen $ImageTag subida exitosamente"
} catch {
    Show-Error "Error subiendo $ImageTag`: $_"
}

# Subir versión
Write-Host "Subiendo $imageName`:$Version..." -ForegroundColor Gray
try {
    docker push "$imageName`:$Version"
    if ($LASTEXITCODE -ne 0) {
        Show-Error "Falló la subida de la imagen $Version"
    }
    Show-Success "Imagen $Version subida exitosamente"
} catch {
    Show-Error "Error subiendo $Version`: $_"
}

# Mostrar información final
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "           ¡DESPLIEGUE EXITOSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🐳 Tu imagen está disponible en:" -ForegroundColor Cyan
Write-Host "   https://hub.docker.com/r/$DockerUsername/juanpa-backend" -ForegroundColor White
Write-Host ""
Write-Host "📦 Para usar la imagen:" -ForegroundColor Cyan
Write-Host "   docker pull $imageName`:$ImageTag" -ForegroundColor White
Write-Host "   docker run -p 8000:8000 $imageName`:$ImageTag" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Para Railway, usa esta imagen:" -ForegroundColor Cyan
Write-Host "   $imageName`:$ImageTag" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Con variables de entorno:" -ForegroundColor Cyan
Write-Host "   docker run -p 8000:8000 -e GOOGLE_API_KEY=tu_key $imageName`:$ImageTag" -ForegroundColor White
Write-Host ""

# Mostrar información de la imagen
Write-Host "📊 Información de la imagen:" -ForegroundColor Cyan
try {
    $imageInfo = docker images "$imageName`:$ImageTag" --format "table {{.Repository}}:{{.Tag}}`t{{.Size}}`t{{.CreatedAt}}"
    Write-Host $imageInfo -ForegroundColor White
} catch {
    Write-Host "No se pudo obtener información de la imagen" -ForegroundColor Yellow
}

Read-Host "`nPresiona Enter para salir" 