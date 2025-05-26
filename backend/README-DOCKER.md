# JuanPA Backend - Docker Image

![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)

## 📖 Descripción

JuanPA es una aplicación de repetición espaciada (spaced repetition) construida con FastAPI. Esta imagen Docker contiene el backend completo de la aplicación, incluyendo:

- ✅ API REST completa con FastAPI
- ✅ Sistema de repetición espaciada con FSRS
- ✅ Integración con Gemini AI para generación de tarjetas
- ✅ Sistema de sincronización
- ✅ Upload de imágenes
- ✅ Base de datos SQLite integrada
- ✅ Logging y middleware de seguridad

## 🚀 Uso Rápido

### Ejecutar la aplicación

```bash
docker run -p 8000:8000 tu-usuario/juanpa-backend:latest
```

La aplicación estará disponible en: http://localhost:8000

### Con variables de entorno

```bash
docker run -p 8000:8000 \
  -e GOOGLE_API_KEY=tu_api_key_de_gemini \
  -e JUANPA_ENVIRONMENT=production \
  -e JUANPA_LOG_LEVEL=INFO \
  tu-usuario/juanpa-backend:latest
```

### Con volumen para persistencia

```bash
docker run -p 8000:8000 \
  -v juanpa-data:/app/data \
  -e GOOGLE_API_KEY=tu_api_key_de_gemini \
  tu-usuario/juanpa-backend:latest
```

## 🔧 Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `GOOGLE_API_KEY` | API Key de Google Gemini | - |
| `JUANPA_ENVIRONMENT` | Entorno de ejecución | `production` |
| `JUANPA_HOST` | Host del servidor | `0.0.0.0` |
| `JUANPA_PORT` | Puerto del servidor | `8000` |
| `JUANPA_DEBUG` | Modo debug | `false` |
| `JUANPA_LOG_LEVEL` | Nivel de logging | `INFO` |
| `JUANPA_CORS_ORIGINS` | Orígenes CORS permitidos | `["https://*.vercel.app","https://*.railway.app"]` |

## 📋 Endpoints Principales

- `GET /` - Página de bienvenida
- `GET /docs` - Documentación interactiva de la API
- `GET /api/v1/decks/` - Listar mazos
- `POST /api/v1/decks/` - Crear mazo
- `GET /api/v1/cards/` - Listar tarjetas
- `POST /api/v1/cards/` - Crear tarjeta
- `POST /api/v1/gemini/generate-cards` - Generar tarjetas con IA
- `GET /api/v1/sync/pull` - Sincronización (pull)
- `POST /api/v1/sync/push` - Sincronización (push)

## 🏗️ Despliegue en Servicios Cloud

### Railway

```toml
# railway.toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

### Render

```yaml
# render.yaml
services:
  - type: web
    name: juanpa-backend
    env: docker
    dockerfilePath: ./Dockerfile
    envVars:
      - key: GOOGLE_API_KEY
        sync: false
```

### Fly.io

```toml
# fly.toml
app = "juanpa-backend"

[build]
  image = "tu-usuario/juanpa-backend:latest"

[[services]]
  http_checks = []
  internal_port = 8000
  processes = ["app"]
  protocol = "tcp"
  script_checks = []
```

## 🔒 Seguridad

La imagen incluye:
- Middleware de seguridad
- Validación de archivos subidos
- Manejo robusto de errores
- Logging de seguridad
- CORS configurado

## 📊 Monitoreo

- Logs estructurados en JSON
- Métricas de rendimiento
- Health checks en `/`
- Diagnósticos en `/api/v1/status`

## 🛠️ Desarrollo

Para desarrollo local:

```bash
# Clonar el repositorio
git clone <tu-repo>
cd juanpa/backend

# Construir imagen local
docker build -t juanpa-backend:dev .

# Ejecutar en modo desarrollo
docker run -p 8000:8000 \
  -v $(pwd):/app \
  -e JUANPA_DEBUG=true \
  juanpa-backend:dev
```

## 📝 Licencia

Este proyecto está bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para reportar bugs o solicitar features, por favor abre un issue en el repositorio de GitHub.

---

**Versión de la imagen:** v1.0.0  
**Última actualización:** $(date)  
**Tamaño de la imagen:** ~200MB  
**Base:** python:3.11-slim 