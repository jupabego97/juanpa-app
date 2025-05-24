# 🧠 JuanPA - Aplicación de Repetición Espaciada

Una aplicación moderna de repetición espaciada para aprender de forma eficiente, inspirada en Anki pero con tecnología moderna.

## ✨ Características Principales

- 🚀 **Backend FastAPI** con arquitectura robusta
- ⚛️ **Frontend React + Vite** con diseño moderno  
- 🧠 **Algoritmo FSRS** para repetición espaciada optimizada
- 🤖 **Generación con IA** usando Google Gemini
- 📱 **Responsive Design** - funciona en móvil y escritorio
- 🔄 **Sincronización** entre dispositivos
- 📊 **Estadísticas avanzadas** de progreso
- 🌙 **Modo oscuro** y configuraciones personalizables

## 🛠️ Tecnologías Utilizadas

### Backend
- FastAPI + SQLModel
- PostgreSQL (producción) / SQLite (desarrollo)
- FSRS (Free Spaced Repetition Scheduler)
- Google Gemini AI API
- Alembic para migraciones

### Frontend  
- React 18 + TypeScript
- Vite para bundling
- Tailwind CSS para estilos
- React Router para navegación
- Context API para estado global

## 🚀 Despliegue

La aplicación está configurada para despliegue automático en:
- **Backend**: Railway.app
- **Frontend**: Vercel
- **Base de datos**: PostgreSQL en Railway

## 📱 Uso Personal

Esta aplicación está diseñada para uso personal de repetición espaciada. Permite:

- Crear mazos de tarjetas organizados por tema
- Generar tarjetas automáticamente con IA
- Estudiar con algoritmo de repetición espaciada
- Seguir progreso con estadísticas detalladas
- Sincronizar entre dispositivos

## 🔧 Desarrollo Local

### Prerrequisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL (opcional, usa SQLite por defecto)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📄 Licencia

Proyecto personal para aprendizaje con repetición espaciada.

---

¡Desarrollado con ❤️ para el aprendizaje eficiente! 