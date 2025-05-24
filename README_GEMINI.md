# 🧠 JuanPA - Integración con Gemini 2.5-pro

## 📋 Descripción

JuanPA ahora incluye integración con **Gemini 2.5-pro** de Google para generar tarjetas de estudio automáticamente usando inteligencia artificial. Esta funcionalidad permite crear tarjetas educativas de alta calidad sobre cualquier tema de manera rápida y eficiente.

## ✨ Características

- **Generación automática** de tarjetas sobre cualquier tema
- **Múltiples tipos de tarjetas**: Estándar (pregunta/respuesta) y Cloze (texto con huecos)
- **Configuración flexible**: Dificultad, idioma, número de tarjetas
- **Contexto personalizable** para mejorar la relevancia
- **Integración completa** con el sistema FSRS de repetición espaciada
- **Interfaz web intuitiva** para configurar y generar tarjetas

## 🛠️ Configuración

### 1. Obtener API Key de Google

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Copia la API key generada

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en el directorio `juanpa/backend/` con:

```bash
GOOGLE_GEMINI_API_KEY=tu_api_key_aquí
```

O configura la variable de entorno directamente:

```bash
export GOOGLE_GEMINI_API_KEY="tu_api_key_aquí"
```

### 3. Instalar Dependencias

```bash
cd juanpa/backend
pip install google-genai==1.12.1
```

## 🚀 Uso

### 1. API Endpoints

#### Verificar Estado de Gemini
```bash
GET /api/v1/gemini/status
```

**Respuesta:**
```json
{
  "available": true,
  "model": "gemini-2.5-pro-exp-03-25",
  "api_key_configured": true,
  "last_error": null
}
```

#### Generar Tarjetas
```bash
POST /api/v1/gemini/generate-cards
Content-Type: application/json

{
  "topic": "Fotosíntesis en plantas",
  "num_cards": 10,
  "difficulty": "medium",
  "card_type": "standard",
  "language": "es",
  "context": "Enfocado en nivel universitario",
  "deck_id": 1
}
```

**Respuesta:**
```json
{
  "success": true,
  "cards_created": [
    {
      "id": 1,
      "front_content": [{"type": "text", "content": "¿Cuál es la ecuación de la fotosíntesis?"}],
      "back_content": [{"type": "text", "content": "6CO2 + 6H2O + luz → C6H12O6 + 6O2"}],
      "tags": ["biología", "fotosíntesis"],
      "deck_id": 1
    }
  ],
  "metadata": {
    "topic": "Fotosíntesis en plantas",
    "model_used": "gemini-2.5-pro-exp-03-25",
    "generation_time_seconds": 3.45
  },
  "errors": [],
  "warnings": []
}
```

### 2. Interfaz Web

Abre `juanpa/frontend/test-gemini-generation.html` en tu navegador:

1. **Verificar estado**: La página automáticamente verifica si Gemini está disponible
2. **Seleccionar mazo**: Elige el mazo donde crear las tarjetas
3. **Configurar generación**:
   - **Tema**: Describe el tema de estudio
   - **Número de tarjetas**: 1-50 tarjetas
   - **Dificultad**: Fácil, Medio, Difícil
   - **Tipo**: Estándar, Cloze, o Mixto
   - **Idioma**: Español o Inglés
   - **Contexto**: Información adicional opcional
4. **Generar**: Haz clic en "🚀 Generar Tarjetas"
5. **Revisar resultados**: Ve las tarjetas generadas y metadatos

### 3. Programáticamente

```python
from app.gemini_service import GeminiCardGenerator, CardGenerationRequest

# Configurar API key
os.environ["GOOGLE_GEMINI_API_KEY"] = "tu_api_key"

# Crear generador
generator = GeminiCardGenerator()

# Crear solicitud
request = CardGenerationRequest(
    topic="Sistema solar",
    num_cards=5,
    difficulty="medium",
    card_type="standard",
    language="es"
)

# Generar tarjetas
response = await generator.generate_cards(request)
print(f"Generadas {len(response.cards)} tarjetas")
```

## ⚙️ Parámetros de Configuración

### Dificultad
- **`easy`**: Conceptos básicos, definiciones simples
- **`medium`**: Aplicaciones prácticas, relaciones entre conceptos
- **`hard`**: Análisis crítico, síntesis compleja

### Tipo de Tarjetas
- **`standard`**: Pregunta/respuesta tradicional
- **`cloze`**: Texto con huecos usando `{{c1::palabra}}`
- **`mixed`**: Combinación automática según el contenido

### Idiomas Soportados
- **`es`**: Español
- **`en`**: Inglés

## 🧪 Pruebas

### Script de Prueba Rápida

```bash
cd juanpa/backend
python test_gemini.py
```

Este script ejecuta:
- Prueba básica de conectividad con Gemini
- Prueba de generación de prompt específico
- Prueba completa del servicio de generación

### Ejemplo de Uso Manual

```python
from google import genai

client = genai.Client(api_key="tu_api_key")

response = client.models.generate_content(
    model="gemini-2.5-pro-exp-03-25",
    contents="Genera 3 tarjetas sobre matemáticas básicas",
    config=genai.types.GenerateContentConfig(
        thinking_config=genai.types.ThinkingConfig(
            thinking_budget=1024
        )
    )
)

print(response.text)
```

## 🔧 Solución de Problemas

### Error: API key no configurada
```
Servicio de Gemini no disponible. Verifica que GOOGLE_GEMINI_API_KEY esté configurada.
```
**Solución**: Configura la variable de entorno `GOOGLE_GEMINI_API_KEY`

### Error: Importación de google.genai
```
ImportError: No module named 'google.genai'
```
**Solución**: Instala la dependencia: `pip install google-genai==1.12.1`

### Error: JSON inválido en respuesta
```
Error parseando respuesta de Gemini: Expecting ',' delimiter
```
**Solución**: El prompt está diseñado para ser robusto, pero ocasionalmente Gemini puede generar JSON mal formado. El sistema automáticamente intenta múltiples estrategias de parsing.

### Error: Límites de cuota de API
```
Error 429: Quota exceeded
```
**Solución**: 
- Verifica los límites de tu API key en Google AI Studio
- Reduce el número de tarjetas por solicitud
- Implementa delays entre solicitudes

## 📊 Rendimiento

- **Tiempo promedio**: 2-5 segundos para 10 tarjetas
- **Precisión**: ~95% de tarjetas bien formadas
- **Costo**: Depende de tu plan de Google AI Studio
- **Límites**: Hasta 50 tarjetas por solicitud

## 🔮 Características Futuras

- [ ] Generación de imágenes con tarjetas
- [ ] Soporte para audio/pronunciación
- [ ] Templates personalizados de tarjetas
- [ ] Generación basada en documentos PDF
- [ ] Integración con más modelos de IA
- [ ] Generación colaborativa con múltiples usuarios

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature: `git checkout -b feature/mejora-gemini`
3. Commit tus cambios: `git commit -m 'Añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feature/mejora-gemini`
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Si tienes problemas o preguntas:

1. Revisa este README y la documentación
2. Ejecuta el script de pruebas: `python test_gemini.py`
3. Verifica los logs del servidor
4. Abre un issue en GitHub con detalles del problema

---

¡Disfruta generando tarjetas inteligentes con JuanPA y Gemini! 🧠✨ 