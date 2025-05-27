# 🚀 Guía de Despliegue en Railway - JuanPA Backend

Esta guía te ayudará a desplegar el backend de JuanPA en Railway con la configuración de CORS adecuada para conectar con el frontend.

## 📋 Prerrequisitos

- Cuenta en [Railway](https://railway.app/)
- Código del backend listo y funcional
- API Key de Google Gemini
- Frontend desplegado (para configurar CORS)

## 🔧 Pasos de Despliegue

### 1. Preparar el Repositorio

Asegúrate de que tienes estos archivos en tu backend:

```
backend/
├── app/                    # Código de la aplicación
├── Dockerfile             # ✅ Configurado
├── railway.toml           # ✅ Configurado
├── requirements.txt       # ✅ Configurado
├── env.example           # ✅ Configurado
└── RAILWAY_DEPLOY.md     # Este archivo
```

### 2. Conectar con Railway

1. **Iniciar sesión en Railway**: https://railway.app/
2. **Crear nuevo proyecto**: "New Project" → "Deploy from GitHub repo"
3. **Seleccionar repositorio**: Elegir tu repositorio de JuanPA
4. **Configurar directorio**: Establecer como directorio root: `backend/`

### 3. Configurar Variables de Entorno

En el dashboard de Railway, ve a **Variables** y configura:

#### 🔐 Variables Obligatorias

```env
# API de Google Gemini (OBLIGATORIO)
GOOGLE_API_KEY=tu_google_api_key_aqui

# CORS - URL de tu frontend (CRÍTICO)
JUANPA_CORS_ORIGINS=["https://tu-frontend.vercel.app","https://tu-dominio.com"]

# Base de datos (Railway la proporcionará automáticamente)
# DATABASE_URL=(se configura automáticamente)
```

#### ⚙️ Variables Opcionales (ya configuradas en railway.toml)

```env
JUANPA_ENVIRONMENT=production
JUANPA_DEBUG=false
JUANPA_LOG_LEVEL=INFO
JUANPA_HOST=0.0.0.0
JUANPA_ENABLE_FILE_LOGGING=true
JUANPA_LOG_FORMAT=json
```

### 4. Configurar Base de Datos

Railway puede proporcionar automáticamente una base de datos PostgreSQL:

1. **Añadir PostgreSQL**: En tu proyecto, click "+ New" → "Database" → "Add PostgreSQL"
2. **Variable automática**: Railway creará automáticamente `DATABASE_URL`
3. **Verificar conexión**: La app se conectará automáticamente

### 5. Configuración de CORS Específica

#### Para Frontend en Vercel:
```env
JUANPA_CORS_ORIGINS=["https://tu-app.vercel.app"]
```

#### Para múltiples dominios:
```env
JUANPA_CORS_ORIGINS=["https://tu-app.vercel.app","https://otro-dominio.com","https://www.tu-dominio.com"]
```

#### Formato alternativo (separado por comas):
```env
JUANPA_CORS_ORIGINS=https://tu-app.vercel.app,https://otro-dominio.com
```

### 6. Despliegue

1. **Push al repositorio**: Railway desplegará automáticamente
2. **Monitorear logs**: Ver el progreso en la pestaña "Deploy"
3. **Verificar salud**: Railway verificará `/` como health check

### 7. Verificar Despliegue

Una vez desplegado, verifica:

```bash
# URL de tu backend en Railway
curl https://tu-backend.railway.app/

# Debería devolver:
{"message": "Welcome to Juanpa API!"}

# Verificar status de la API
curl https://tu-backend.railway.app/api/v1/status

# Verificar Gemini
curl https://tu-backend.railway.app/api/v1/gemini/status
```

## 🌐 Configuración de CORS

### Características de la Configuración Actual

✅ **Desarrollo automático**: Detecta entorno local y permite localhost
✅ **Producción robusta**: Requiere configuración específica de dominios
✅ **Múltiples formatos**: Acepta JSON o separado por comas
✅ **Logging**: Registra la configuración aplicada
✅ **Headers específicos**: Solo permite headers necesarios
✅ **Métodos específicos**: GET, POST, PUT, DELETE, OPTIONS, PATCH

### Ejemplo de Configuración para Diferentes Scenarios

#### Desarrollo + Producción:
```env
JUANPA_CORS_ORIGINS=["http://localhost:5173","https://juanpa-frontend.vercel.app"]
```

#### Solo Producción:
```env
JUANPA_CORS_ORIGINS=["https://juanpa-frontend.vercel.app"]
```

#### Múltiples entornos:
```env
JUANPA_CORS_ORIGINS=["https://juanpa-staging.vercel.app","https://juanpa-prod.vercel.app"]
```

## 🔗 Conexión con el Frontend

### Configurar Frontend para Railway

En tu frontend, configura la URL del backend:

```env
# .env del frontend
VITE_API_URL=https://tu-backend.railway.app/api/v1
```

### URLs Importantes

- **API Base**: `https://tu-backend.railway.app/api/v1`
- **Documentación**: `https://tu-backend.railway.app/docs`
- **Redoc**: `https://tu-backend.railway.app/redoc`
- **Health Check**: `https://tu-backend.railway.app/`

## 🐛 Solución de Problemas

### Error de CORS

Si ves errores como `Access to fetch at 'https://...' has been blocked by CORS policy`:

1. **Verificar variable**: Revisa que `JUANPA_CORS_ORIGINS` esté configurada
2. **Formato correcto**: Usa el formato JSON o separado por comas
3. **HTTPS vs HTTP**: En producción, usa solo HTTPS
4. **Wildcards**: Evita `*` en producción, especifica dominios exactos

### Logs de CORS

En los logs de Railway verás:

```
INFO:juanpa.main:CORS: Orígenes configurados desde env: ['https://tu-frontend.vercel.app']
```

### Variables de Entorno

```bash
# Ver variables configuradas en Railway Dashboard
# o en los logs al iniciar:
INFO:juanpa.main:CORS: Usando orígenes de desarrollo: [...]
```

## 📊 Monitoreo

### Health Checks

Railway verificará automáticamente:
- **Endpoint**: `/`
- **Timeout**: 100s
- **Intervalo**: 100s

### Logs Importantes

Busca estos logs al iniciar:

```
INFO:juanpa.main:Aplicación iniciando...
INFO:juanpa.main:Base de datos y tablas verificadas/creadas.
INFO:juanpa.main:CORS: Orígenes configurados desde env: [...]
```

## 🔄 CI/CD Automático

Railway redesplegará automáticamente cuando:
- ✅ Hagas push a la rama principal
- ✅ Modifiques archivos en la carpeta `backend/`
- ✅ Cambies variables de entorno

## 🎯 Checklist Final

Antes de ir a producción:

- [ ] ✅ CORS configurado con dominios correctos
- [ ] ✅ `GOOGLE_API_KEY` configurada
- [ ] ✅ Base de datos PostgreSQL conectada
- [ ] ✅ Health check respondiendo
- [ ] ✅ Frontend conectándose correctamente
- [ ] ✅ Endpoints críticos funcionando
- [ ] ✅ Logs sin errores críticos

¡Tu backend JuanPA estará listo para producción! 🎉 