# 🚀 Guía de Desarrollo Local - JuanPA Frontend

Esta guía te ayudará a configurar y ejecutar el frontend de JuanPA en tu entorno de desarrollo local.

## 📋 Prerrequisitos

- Node.js (versión 18 o superior)
- npm (viene con Node.js)
- Python 3.11+ (para el backend)
- Backend de JuanPA funcionando

## ⚙️ Configuración

### 1. Variables de Entorno

El archivo `.env` ya está configurado con los valores por defecto para desarrollo local:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_TITLE=JuanPA - Repeticion Espaciada
VITE_DEV_CONSOLE_LOGS=true
```

### 2. Instalación de Dependencias

```bash
npm install
```

## 🏃 Ejecutar la Aplicación

### Opción 1: Usar el Script Automático (Recomendado)

Ejecuta este comando desde el directorio `frontend`:

```powershell
.\start-dev.ps1
```

Este script:
- ✅ Verifica que el backend esté disponible
- 🔧 Inicia el backend FastAPI en una ventana separada
- ⚛️ Inicia el frontend React en la ventana actual
- 🌐 Muestra las URLs de acceso

### Opción 2: Manual

1. **Iniciar el Backend** (en una terminal separada):
```bash
cd ../backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

2. **Iniciar el Frontend** (en otra terminal):
```bash
npm run dev
```

## 🌐 URLs de Acceso

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs
- **Redoc API**: http://localhost:8000/redoc

## 🔧 Configuración de Desarrollo

### Proxy de API

Vite está configurado para hacer proxy de las peticiones `/api/*` al backend:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

### Hot Reload

- ⚛️ **Frontend**: Vite proporciona hot reload automático
- 🔧 **Backend**: FastAPI se reinicia automáticamente con `--reload`

## 🛠️ Scripts Disponibles

```bash
npm run dev       # Iniciar servidor de desarrollo
npm run build     # Construir para producción
npm run preview   # Vista previa de la build
npm run lint      # Ejecutar linter
```

## 🧪 Verificación de Conexión

El frontend incluye logging automático en desarrollo. Abre las DevTools (F12) y verás:

```
🔗 API Base URL: http://localhost:8000/api/v1
📤 API Request: GET /decks
📥 API Response: 200 /decks
```

## ❗ Solución de Problemas

### Error de Conexión CORS

Si ves errores CORS, verifica que el backend esté configurado correctamente:

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Error de Puerto en Uso

Si el puerto 5173 está ocupado:

```bash
npm run dev -- --port 3000
```

### Backend No Disponible

Verifica que el backend esté ejecutándose:

```bash
curl http://localhost:8000/
# Debería devolver: {"message": "Welcome to Juanpa API!"}
```

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/     # Componentes React
│   ├── pages/          # Páginas/rutas
│   ├── services/       # Servicios API
│   ├── stores/         # Estados globales
│   ├── utils/          # Utilidades
│   └── main.tsx        # Punto de entrada
├── public/             # Archivos estáticos
├── .env                # Variables de entorno
├── vite.config.ts      # Configuración Vite
└── start-dev.ps1       # Script de inicio
```

## 🔗 API Endpoints Principales

- `GET /api/v1/decks/` - Listar mazos
- `POST /api/v1/decks/` - Crear mazo
- `GET /api/v1/cards/` - Listar tarjetas
- `POST /api/v1/cards/` - Crear tarjeta
- `GET /api/v1/gemini/status` - Estado de Gemini
- `POST /api/v1/gemini/generate-cards` - Generar tarjetas con IA

¡Ya tienes todo configurado para desarrollar! 🎉 