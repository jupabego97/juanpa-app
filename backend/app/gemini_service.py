"""
Servicio de integración con Gemini 2.5-pro para generar tarjetas automáticamente.
"""

import os
import json
import re
import logging
from typing import List, Dict, Any, Optional
from google import genai
from pydantic import BaseModel, Field

# Configurar logging
logger = logging.getLogger(__name__)

class CardGenerationRequest(BaseModel):
    """Modelo para solicitud de generación de tarjetas."""
    topic: str = Field(..., min_length=1, max_length=500, description="Tema sobre el que generar tarjetas")
    num_cards: int = Field(default=10, ge=1, le=50, description="Número de tarjetas a generar")
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$", description="Dificultad de las tarjetas")
    card_type: str = Field(default="standard", pattern="^(standard|cloze|mixed)$", description="Tipo de tarjetas")
    language: str = Field(default="es", pattern="^(es|en)$", description="Idioma de las tarjetas")
    context: Optional[str] = Field(None, max_length=2000, description="Contexto adicional o material de referencia")

class GeneratedCard(BaseModel):
    """Modelo para una tarjeta generada."""
    front_content: Any
    back_content: Any
    tags: List[str]
    explanation: Optional[str] = None
    cloze_text: Optional[str] = None  # Para tarjetas cloze

class CardGenerationResponse(BaseModel):
    """Respuesta de generación de tarjetas."""
    cards: List[GeneratedCard]
    metadata: Dict[str, Any]
    errors: List[str] = Field(default_factory=list, description="Errores ocurridos durante la generación en el servicio Gemini")

class GeminiCardGenerator:
    """Generador de tarjetas usando Gemini 2.5-pro."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Inicializar el generador de Gemini.
        
        Args:
            api_key: API key de Google. Si no se proporciona, se intentará usar la hardcodeada o variables de entorno.
        """
        # Opción 1: API key hardcodeada (para desarrollo/testing)
        hardcoded_api_key = "AIzaSyDS8DZT0UIKjn-A25m22nBS0gWicFDeyNs"
        
        # Opción 2: Variables de entorno como fallback
        env_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        
        # Prioridad: parámetro > hardcodeada > variables de entorno
        self.api_key = api_key or hardcoded_api_key or env_api_key
        
        if not self.api_key:
            raise ValueError("API key de Google/Gemini no configurada. Configura GOOGLE_API_KEY o GEMINI_API_KEY en las variables de entorno.")
        
        # Log para debugging (sin mostrar la key completa por seguridad)
        if self.api_key == hardcoded_api_key:
            logger.info("Usando API key hardcodeada para Gemini")
        elif self.api_key == env_api_key:
            logger.info("Usando API key desde variables de entorno para Gemini")
        else:
            logger.info("Usando API key proporcionada como parámetro para Gemini")
        
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = "gemini-2.5-flash-preview-05-20"
    def _create_system_prompt(self, request: CardGenerationRequest) -> str:
        """Crear el prompt del sistema para Gemini."""
        
        difficulty_descriptions = {
            "easy": "básico, conceptos fundamentales, definiciones simples",
            "medium": "intermedio, relaciones entre conceptos, aplicaciones prácticas",
            "hard": "avanzado, análisis crítico, síntesis compleja"
        }
        
        card_type_instructions = {
            "standard": "Genera tarjetas de tipo pregunta-respuesta estándar.",
            "cloze": "Genera tarjetas con texto de relleno usando formato {{c1::texto}} para las palabras clave.",
            "mixed": "Genera una mezcla de tarjetas estándar y cloze según sea más apropiado para cada concepto."
        }
        
        return f"""Eres un experto educador especializado en crear tarjetas de estudio efectivas para repetición espaciada.

Tu tarea es generar {request.num_cards} tarjetas de estudio de alta calidad sobre el tema: "{request.topic}"

PARÁMETROS:
- Dificultad: {request.difficulty} ({difficulty_descriptions[request.difficulty]})
- Tipo: {request.card_type} - {card_type_instructions[request.card_type]}
- Idioma: {"español" if request.language == "es" else "inglés"}
{f"- Contexto adicional: {request.context}" if request.context else ""}

INSTRUCCIONES ESPECÍFICAS:
1. Cada tarjeta debe ser autocontenida y clara
2. Las preguntas deben ser específicas y no ambiguas
3. Las respuestas deben ser concisas pero completas
4. Incluye etiquetas relevantes para cada tarjeta
5. Para tarjetas cloze, usa el formato {{{{c1::texto}}}} para palabras clave
6. Varía los tipos de preguntas: definiciones, aplicaciones, ejemplos, diferencias, etc.

FORMATO DE RESPUESTA CRÍTICO:
- Responde ÚNICAMENTE con JSON válido
- NO agregues texto antes o después del JSON
- NO uses comillas simples, solo comillas dobles
- NO agregues comas al final de arrays u objetos
- Escapa caracteres especiales en strings (comillas, backslashes)

La respuesta debe ser un array JSON con esta estructura exacta:

Para tarjetas estándar:
{{
  "type": "standard",
  "front_content": [
    {{"type": "text", "content": "Pregunta aquí"}}
  ],
  "back_content": [
    {{"type": "text", "content": "Respuesta aquí"}}
  ],
  "tags": ["tag1", "tag2", "tag3"],
  "explanation": "Explicación adicional si es necesaria"
}}

Para tarjetas cloze:
{{
  "type": "cloze",
  "cloze_text": "Texto con {{{{c1::palabra clave}}}} a completar",
  "tags": ["tag1", "tag2", "tag3"],
  "explanation": "Explicación adicional si es necesaria"
}}

IMPORTANTE: Responde solo con el array JSON, sin explicaciones adicionales."""

    def _create_user_prompt(self, request: CardGenerationRequest) -> str:
        """Crear el prompt del usuario para Gemini."""
        return f"""Genera {request.num_cards} tarjetas de estudio sobre: "{request.topic}"

Nivel de dificultad: {request.difficulty}
Tipo de tarjetas: {request.card_type}
Idioma: {"español" if request.language == "es" else "inglés"}

{"Contexto adicional: " + request.context if request.context else ""}

Responde con el JSON de las tarjetas como se especificó en las instrucciones."""

    async def generate_cards(self, request: CardGenerationRequest) -> CardGenerationResponse:
        """
        Generar tarjetas usando Gemini 2.5-pro.
        
        Args:
            request: Solicitud de generación de tarjetas
            
        Returns:
            Respuesta con las tarjetas generadas
        """
        try:
            logger.info(f"Generando {request.num_cards} tarjetas sobre '{request.topic}' con Gemini")
            
            # Crear prompts
            system_prompt = self._create_system_prompt(request)
            user_prompt = self._create_user_prompt(request)
            
            # Combinar prompts para Gemini
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # Hacer la llamada a Gemini (simplificada para testing)
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_prompt
            )
            
            # Procesar la respuesta
            generated_text = response.text
            if not generated_text:
                raise ValueError("Gemini no retornó contenido")
            logger.debug(f"Respuesta de Gemini: {generated_text[:500]}...")
            
            # Parsear JSON de la respuesta con método robusto
            try:
                cards_data = self._robust_json_parse(generated_text)
                
            except json.JSONDecodeError as e:
                logger.error(f"Error parseando JSON de Gemini: {e}")
                logger.error(f"Texto generado: {generated_text}")
                raise ValueError(f"Error parseando respuesta de Gemini: {e}")
            except Exception as e:
                logger.error(f"Error inesperado en parsing: {e}")
                logger.error(f"Texto generado: {generated_text[:1000]}...")
                raise ValueError(f"Error procesando respuesta de Gemini: {e}")
            
            # Convertir a objetos GeneratedCard
            generated_cards = []
            for i, card_data in enumerate(cards_data):
                try:
                    if card_data.get('type') == 'cloze':
                        # Tarjeta cloze
                        card = GeneratedCard(
                            front_content=None,
                            back_content=None,
                            cloze_text=card_data.get('cloze_text'),
                            tags=card_data.get('tags', []),
                            explanation=card_data.get('explanation')
                        )
                    else:
                        # Tarjeta estándar
                        card = GeneratedCard(
                            front_content=card_data.get('front_content'),
                            back_content=card_data.get('back_content'),
                            tags=card_data.get('tags', []),
                            explanation=card_data.get('explanation')
                        )
                    
                    generated_cards.append(card)
                except Exception as e:
                    logger.warning(f"Error procesando tarjeta {i}: {e}")
                    continue
            
            if not generated_cards:
                raise ValueError("No se pudieron generar tarjetas válidas")
            
            # Crear respuesta
            response = CardGenerationResponse(
                cards=generated_cards,
                metadata={
                    "topic": request.topic,
                    "requested_count": request.num_cards,
                    "generated_count": len(generated_cards),
                    "difficulty": request.difficulty,
                    "card_type": request.card_type,
                    "language": request.language,
                    "model_used": self.model_name
                }
            )
            
            logger.info(f"Generadas exitosamente {len(generated_cards)} tarjetas")
            return response
            
        except Exception as e:
            logger.error(f"Error generando tarjetas con Gemini: {e}")
            raise

    def _robust_json_parse(self, text: str) -> List[Dict]:
        """
        Parsing robusto de JSON que maneja errores comunes de Gemini.
        """
        logger.debug(f"Iniciando parsing robusto de: {text[:200]}...")
        
        # Paso 1: Limpiar texto común no-JSON
        text = text.strip()
        
        # Remover marcadores de código si existen
        if "```json" in text:
            text = re.sub(r'```json\s*', '', text)
            text = re.sub(r'\s*```', '', text)
        
        if "```" in text:
            # Extraer contenido entre ```
            match = re.search(r'```([^`]+)```', text, re.DOTALL)
            if match:
                text = match.group(1).strip()
        
        # Paso 2: Buscar JSON completo usando balance de corchetes/llaves
        json_candidates = []
        
        # Método más robusto: encontrar arrays JSON balanceados
        i = 0
        while i < len(text):
            if text[i] == '[':
                # Encontrar el array completo usando balance de corchetes
                array_candidate = self._extract_balanced_json(text, i, '[', ']')
                if array_candidate:
                    json_candidates.append(array_candidate)
                    logger.debug(f"Candidato array encontrado: {len(array_candidate)} chars")
            elif text[i] == '{':
                # Encontrar el objeto completo usando balance de llaves
                obj_candidate = self._extract_balanced_json(text, i, '{', '}')
                if obj_candidate:
                    json_candidates.append(obj_candidate)
                    logger.debug(f"Candidato objeto encontrado: {len(obj_candidate)} chars")
            i += 1
        
        # Si no hay candidatos, usar texto completo
        if not json_candidates:
            json_candidates = [text]
        
        # Paso 3: Intentar parsear candidatos (priorizar arrays más largos)
        json_candidates.sort(key=len, reverse=True)  # Intentar los más largos primero
        
        for i, candidate in enumerate(json_candidates):
            try:
                logger.debug(f"Intentando candidato {i+1}: {len(candidate)} chars, comienza con: {candidate[:50]}...")
                
                # Limpiar candidato
                cleaned = self._clean_json_candidate(candidate)
                
                # Intentar parsear
                parsed = json.loads(cleaned)
                
                # Validar estructura
                if isinstance(parsed, list):
                    logger.debug(f"✅ Array JSON válido con {len(parsed)} elementos")
                    return parsed
                elif isinstance(parsed, dict):
                    # Buscar array dentro del objeto
                    for key in ['cards', 'data', 'items', 'results']:
                        if key in parsed and isinstance(parsed[key], list):
                            logger.debug(f"✅ Array JSON encontrado en '{key}' con {len(parsed[key])} elementos")
                            return parsed[key]
                    # Si el objeto contiene una sola tarjeta, convertir a array
                    if 'type' in parsed:
                        logger.debug("✅ Objeto JSON convertido a array")
                        return [parsed]
                        
            except json.JSONDecodeError as e:
                logger.debug(f"❌ Candidato {i+1} falló: {e}")
                continue
            except Exception as e:
                logger.debug(f"❌ Candidato {i+1} error inesperado: {e}")
                continue
        
        # Paso 4: Fallback - intentar reparar JSON común
        try:
            repaired = self._repair_common_json_errors(text)
            parsed = json.loads(repaired)
            if isinstance(parsed, (list, dict)):
                logger.debug("✅ JSON reparado exitosamente")
                return parsed if isinstance(parsed, list) else [parsed]
        except:
            pass
        
        # Si todo falla, lanzar error
        raise json.JSONDecodeError("No se pudo parsear JSON válido", text, 0)

    def _extract_balanced_json(self, text: str, start: int, open_char: str, close_char: str) -> str:
        """Extraer JSON balanceado desde una posición de inicio."""
        if start >= len(text) or text[start] != open_char:
            return ""
        
        count = 0
        in_string = False
        escape_next = False
        
        for i in range(start, len(text)):
            char = text[i]
            
            if escape_next:
                escape_next = False
                continue
                
            if char == '\\':
                escape_next = True
                continue
                
            if char == '"' and not escape_next:
                in_string = not in_string
                continue
                
            if not in_string:
                if char == open_char:
                    count += 1
                elif char == close_char:
                    count -= 1
                    if count == 0:
                        return text[start:i+1]
        
        return ""  # No se encontró balance

    def _clean_json_candidate(self, text: str) -> str:
        """Limpiar candidato JSON de problemas comunes."""
        # Remover espacios extra
        text = text.strip()
        
        # Escapar comillas dobles no escapadas dentro de strings
        # Esto es complejo, por ahora solo limpiar casos básicos
        
        # Remover comentarios JS/JSON
        text = re.sub(r'//.*$', '', text, flags=re.MULTILINE)
        text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
        
        # Remover trailing commas
        text = re.sub(r',\s*([}\]])', r'\1', text)
        
        return text

    def _repair_common_json_errors(self, text: str) -> str:
        """Reparar errores comunes de JSON."""
        
        # Reparar comillas simples por dobles
        text = re.sub(r"'([^']*)':", r'"\1":', text)
        text = re.sub(r":\s*'([^']*)'", r': "\1"', text)
        
        # Reparar trailing commas
        text = re.sub(r',(\s*[}\]])', r'\1', text)
        
        # Agregar comillas faltantes a keys
        text = re.sub(r'(\w+):', r'"\1":', text)
        
        # Reparar arrays sin corchetes
        if not text.strip().startswith('[') and not text.strip().startswith('{'):
            text = f'[{text}]'
        
        return text

# Instancia global del generador (se inicializará en main.py)
gemini_generator: Optional[GeminiCardGenerator] = None

def get_gemini_generator() -> GeminiCardGenerator:
    """Obtener la instancia del generador de Gemini."""
    global gemini_generator
    if gemini_generator is None:
        gemini_generator = GeminiCardGenerator()
    return gemini_generator

def is_gemini_available() -> bool:
    """Verificar si Gemini está disponible."""
    try:
        # Opción 1: API key hardcodeada
        hardcoded_api_key = "AIzaSyDS8DZT0UIKjn-A25m22nBS0gWicFDeyNs"
        
        # Opción 2: Variables de entorno
        env_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        
        # Verificar si alguna está disponible
        api_key = hardcoded_api_key or env_api_key
        return api_key is not None and len(api_key.strip()) > 0
    except:
        return False 