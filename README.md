# JuanPA - Aplicación de Repetición Espaciada

![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)

**JuanPA** es una aplicación moderna de repetición espaciada inspirada en Anki, diseñada para maximizar la retención de memoria a través del aprendizaje inteligente. Implementa el algoritmo FSRS (Free Spaced Repetition Scheduler) para programar repasos óptimos.

## 🌟 Características Principales

### ✨ Core Features
- **Algoritmo FSRS**: Programación inteligente de repasos basada en el algoritmo FSRS v5
- **Funcionalidad Offline-First**: Trabaja sin conexión con sincronización automática
- **Editor de Tarjetas Avanzado**: Soporte para texto, imágenes, audio y HTML
- **Tarjetas Cloze**: Creación automática de tarjetas con formato `{{c1::texto::pista}}`
- **Estadísticas Detalladas**: Heatmap de actividad, racha de días, gráficos de rendimiento
- **Generación con IA**: Integración con Google Gemini para crear tarjetas automáticamente

### 🚀 Características Avanzadas
- **Importar/Exportar**: Soporte para Markdown y CSV
- **Captura Rápida**: OCR y image-occlusion para crear tarjetas desde imágenes
- **Generación con IA**: Creación automática de tarjetas desde PDFs (opcional)
- **Sincronización**: Multi-dispositivo con resolución de conflictos
- **Seguridad**: Cifrado local y validación robusta

### 🎨 UI/UX
- **Interfaz en Español**: Completamente localizada
- **Diseño Minimalista**: UI moderna y responsive
- **Modo Oscuro**: Soporte para tema oscuro/claro
- **Atajos de Teclado**: Navegación rápida y eficiente

## 🏗️ Arquitectura

### Backend (FastAPI + Python)
```
juanpa/backend/
├── app/
│   ├── main.py           # API principal
│   ├── models.py         # Modelos Pydantic
│   ├── db_models.py      # Modelos SQLModel
│   ├── database.py       # Configuración de BD
│   ├── config.py         # Configuración por entornos
│   ├── validators.py     # Validadores personalizados
│   ├── exceptions.py     # Manejo de errores
│   ├── middleware.py     # Middleware de seguridad
│   ├── gemini_service.py # Integración con Gemini AI
│   └── logging_config.py # Sistema de logging
├── tests/                # Tests unitarios
├── scripts/              # Scripts de deployment
├── static/               # Archivos estáticos
├── alembic/             # Migraciones de BD
├── Dockerfile           # Imagen Docker
└── requirements.txt      # Dependencias
```

### Frontend (React + TypeScript + Vite)
```
juanpa/frontend/
├── src/
│   ├── components/       # Componentes reutilizables
│   ├── pages/           # Páginas de la aplicación
│   ├── hooks/           # React hooks personalizados
│   ├── services/        # APIs y servicios
│   ├── stores/          # Estado global (Zustand)
│   ├── utils/           # Utilidades
│   └── styles/          # Estilos globales
├── public/              # Archivos públicos
└── package.json         # Dependencias
```

### Base de Datos
- **SQLite**: Base de datos local para desarrollo
- **PostgreSQL**: Recomendado para producción
- **Migraciones**: Gestionadas con Alembic

## 🚀 Instalación y Configuración

### Opción 1: Docker (Recomendado)

#### Usar imagen pre-construida
```bash
# Ejecutar backend
docker run -p 8000:8000 -e GOOGLE_API_KEY=tu_api_key jupabego97/mi-backend-fastapi:latest

# La aplicación estará disponible en http://localhost:8000
```

#### Construir localmente
```bash
# Clonar repositorio
git clone https://github.com/jupabego97/juanpa-app.git
cd juanpa

# Construir y ejecutar con Docker Compose
docker-compose up --build
```

### Opción 2: Instalación Manual

#### Prerrequisitos
- Python 3.8+
- Node.js 16+
- Git

#### 1. Clonar el Repositorio
```bash
git clone https://github.com/jupabego97/juanpa-app.git
cd juanpa
```

#### 2. Configurar Backend
```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp env.example .env
# Editar .env con tu configuración

# Ejecutar migraciones
alembic upgrade head

# Iniciar servidor de desarrollo
uvicorn app.main:app --reload
```

#### 3. Configurar Frontend
```bash
cd ../frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

#### 4. Acceder a la Aplicación
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest tests/ -v
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Tests de Integración
```bash
# Desde la raíz del proyecto
npm run test:e2e
```

## 📦 Deployment

### Docker Hub
La imagen del backend está disponible en Docker Hub:
- **Repositorio**: `jupabego97/mi-backend-fastapi`
- **Tags**: `latest`, `v1.0.1`

```bash
# Descargar y ejecutar
docker pull jupabego97/mi-backend-fastapi:latest
docker run -p 8000:8000 -e GOOGLE_API_KEY=tu_key jupabego97/mi-backend-fastapi:latest
```

### Railway
```bash
# Usar imagen de Docker Hub
railway up --image jupabego97/mi-backend-fastapi:latest
```

### Render
```yaml
# render.yaml
services:
  - type: web
    name: juanpa-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    envVars:
      - key: GOOGLE_API_KEY
        sync: false
```

### Vercel (Frontend)
```bash
cd frontend
vercel --prod
```

### Variables de Entorno Importantes

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | API Key de Google Gemini | `AIzaSy...` |
| `JUANPA_ENVIRONMENT` | Entorno de ejecución | `development`, `production` |
| `JUANPA_SECRET_KEY` | Clave secreta (⚠️ cambiar en producción) | `tu-clave-super-secreta` |
| `JUANPA_DATABASE_URL` | URL de base de datos | `sqlite:///./juanpa.db` |
| `JUANPA_CORS_ORIGINS` | Orígenes permitidos para CORS | `["http://localhost:5173"]` |
| `JUANPA_LOG_LEVEL` | Nivel de logging | `DEBUG`, `INFO`, `WARNING` |

## 📖 Uso de la API

### Endpoints Principales

#### Mazos
```bash
# Crear mazo
POST /api/v1/decks/
{
  "name": "Vocabulario Francés",
  "description": "Palabras básicas en francés"
}

# Listar mazos
GET /api/v1/decks/

# Obtener mazo
GET /api/v1/decks/{id}
```

#### Tarjetas
```bash
# Crear tarjeta
POST /api/v1/cards/
{
  "deck_id": 1,
  "front_content": "Bonjour",
  "back_content": "Hola"
}

# Generar tarjetas con IA
POST /api/v1/gemini/generate-cards
{
  "topic": "Vocabulario básico francés",
  "num_cards": 10,
  "deck_id": 1
}
```

#### Sincronización
```bash
# Pull (obtener cambios del servidor)
GET /api/v1/sync/pull?lastSyncTimestamp=2024-01-01T00:00:00Z

# Push (enviar cambios al servidor)
POST /api/v1/sync/push
{
  "client_timestamp": "2024-01-01T12:00:00Z",
  "new_decks": [...],
  "new_cards": [...]
}
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🙏 Agradecimientos

- [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) - Algoritmo de repetición espaciada
- [FastAPI](https://fastapi.tiangolo.com/) - Framework web moderno para Python
- [React](https://reactjs.org/) - Biblioteca para interfaces de usuario
- [Vite](https://vitejs.dev/) - Herramienta de construcción rápida

## 📞 Soporte

Para reportar bugs o solicitar features:
- Abre un [issue](https://github.com/jupabego97/juanpa-app/issues)
- Contacta: [tu-email@ejemplo.com]

---

**Desarrollado con ❤️ por [Tu Nombre]** 