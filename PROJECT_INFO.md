# JuanPA - Información del Proyecto

## 📋 Resumen del Proyecto

**JuanPA** es una aplicación completa de repetición espaciada desarrollada con tecnologías modernas. El proyecto incluye tanto frontend como backend, con integración de IA y deployment automatizado.

## 🏗️ Arquitectura Técnica

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Base de Datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **ORM**: SQLModel + Alembic
- **IA**: Google Gemini API
- **Algoritmo**: FSRS v5 para repetición espaciada
- **Containerización**: Docker

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Estado**: Zustand
- **Estilos**: Tailwind CSS
- **Testing**: Jest + React Testing Library

## 🚀 Deployment

### Backend (Docker Hub)
- **Imagen**: `jupabego97/mi-backend-fastapi:latest`
- **Registry**: Docker Hub
- **Tamaño**: ~645MB
- **Base**: python:3.11-slim

### Frontend (Vercel)
- **Plataforma**: Vercel
- **Build**: Automático desde GitHub
- **CDN**: Global

### CI/CD
- **GitHub Actions**: Automatización completa
- **Docker**: Build y push automático
- **Tests**: Ejecutados en cada PR

## 🔧 Variables de Entorno

### Backend
```env
GOOGLE_API_KEY=tu_api_key_de_gemini
JUANPA_ENVIRONMENT=production
JUANPA_HOST=0.0.0.0
JUANPA_PORT=8000
JUANPA_DEBUG=false
JUANPA_LOG_LEVEL=INFO
JUANPA_CORS_ORIGINS=["https://tu-frontend.vercel.app"]
```

### Frontend
```env
VITE_API_BASE_URL=https://tu-backend.railway.app
VITE_ENVIRONMENT=production
```

## 📦 Comandos Útiles

### Desarrollo Local
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Docker
```bash
# Construir imagen
docker build -t juanpa-backend ./backend

# Ejecutar contenedor
docker run -p 8000:8000 -e GOOGLE_API_KEY=tu_key juanpa-backend

# Usar imagen de Docker Hub
docker run -p 8000:8000 -e GOOGLE_API_KEY=tu_key jupabego97/mi-backend-fastapi:latest
```

### Deployment
```bash
# Backend a Railway
railway up --image jupabego97/mi-backend-fastapi:latest

# Frontend a Vercel
cd frontend
vercel --prod
```

## 🧪 Testing

### Backend
```bash
cd backend
python -m pytest tests/ -v --cov=app
```

### Frontend
```bash
cd frontend
npm test
npm run test:coverage
```

## 📊 Métricas del Proyecto

- **Líneas de Código**: ~12,000
- **Archivos**: 150+
- **Commits**: 50+
- **Tecnologías**: 15+
- **APIs**: 20+ endpoints

## 🔒 Seguridad

### Características Implementadas
- Validación de entrada robusta
- Middleware de seguridad
- CORS configurado
- Rate limiting
- Logging de seguridad
- Sanitización de archivos

### Configuración de Producción
- Variables de entorno seguras
- HTTPS obligatorio
- Headers de seguridad
- Validación de tipos estricta

## 📚 Documentación

### APIs
- **Swagger UI**: `/docs` (desarrollo)
- **ReDoc**: `/redoc` (desarrollo)
- **OpenAPI**: Especificación completa

### Código
- **Docstrings**: Python (Google style)
- **JSDoc**: TypeScript/React
- **Type Hints**: 100% coverage

## 🤝 Contribución

### Flujo de Trabajo
1. Fork del repositorio
2. Crear rama: `git checkout -b feature/nueva-funcionalidad`
3. Desarrollar y testear
4. Commit: `git commit -m "feat: descripción"`
5. Push: `git push origin feature/nueva-funcionalidad`
6. Pull Request

### Estándares
- **Python**: PEP 8, Black, isort
- **TypeScript**: ESLint, Prettier
- **Commits**: Conventional Commits
- **Tests**: Cobertura mínima 80%

## 🐛 Troubleshooting

### Problemas Comunes

#### Backend no inicia
```bash
# Verificar Python y dependencias
python --version
pip list

# Verificar variables de entorno
cat .env

# Logs detallados
uvicorn app.main:app --log-level debug
```

#### Frontend no conecta al backend
```bash
# Verificar URL del API
echo $VITE_API_BASE_URL

# Verificar CORS
curl -H "Origin: http://localhost:5173" http://localhost:8000/
```

#### Docker no funciona
```bash
# Verificar Docker
docker --version
docker info

# Logs del contenedor
docker logs container_name

# Reconstruir imagen
docker build --no-cache -t juanpa-backend ./backend
```

## 📞 Contacto y Soporte

- **GitHub Issues**: Para bugs y features
- **GitHub Discussions**: Para preguntas generales
- **Email**: [tu-email@ejemplo.com]

## 📄 Licencias

- **Código**: MIT License
- **Dependencias**: Ver package.json y requirements.txt
- **Assets**: Creative Commons (donde aplique)

---

**Última actualización**: $(date)  
**Versión**: v1.0.1  
**Mantenedor**: [Tu Nombre] 