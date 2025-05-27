#!/usr/bin/env python3
"""
Script de prueba para la funcionalidad de Gemini 2.5-pro
Basado en el ejemplo proporcionado por el usuario
"""

import os
import asyncio
import json
from google import genai

def test_basic_gemini():
    """Prueba básica usando el ejemplo del usuario."""
    try:
        # Usar la API key del ejemplo (puedes cambiarla por la tuya)
        client = genai.Client(api_key="AIzaSyDS8DZT0UIKjn-A25m22nBS0gWicFDeyNs")
        
        response = client.models.generate_content(
            model="gemini-2.5-pro-exp-03-25",
            contents="You roll two dice. What's the probability they add up to 7?",
            config=genai.types.GenerateContentConfig(
                thinking_config=genai.types.ThinkingConfig(
                    thinking_budget=1024
                )
            )
        )
        
        print("=== PRUEBA BÁSICA DE GEMINI ===")
        print("Pregunta: You roll two dice. What's the probability they add up to 7?")
        print("Respuesta:", response.text)
        print("\n" + "="*50 + "\n")
        
    except Exception as e:
        print(f"Error en prueba básica: {e}")

async def test_card_generation():
    """Prueba de generación de tarjetas usando nuestro servicio."""
    try:
        from app.gemini_service import GeminiCardGenerator, CardGenerationRequest
        
        # Configurar API key
        os.environ["GOOGLE_GEMINI_API_KEY"] = "AIzaSyDS8DZT0UIKjn-A25m22nBS0gWicFDeyNs"
        
        # Crear generador
        generator = GeminiCardGenerator()
        
        # Crear solicitud de prueba
        request = CardGenerationRequest(
            topic="Sistema solar",
            num_cards=5,
            difficulty="medium",
            card_type="standard",
            language="es",
            context="Enfocado en planetas y sus características principales"
        )
        
        print("=== PRUEBA DE GENERACIÓN DE TARJETAS ===")
        print(f"Tema: {request.topic}")
        print(f"Número de tarjetas: {request.num_cards}")
        print(f"Dificultad: {request.difficulty}")
        print(f"Tipo: {request.card_type}")
        print("Generando tarjetas...\n")
        
        # Generar tarjetas
        response = await generator.generate_cards(request)
        
        print(f"✅ Generadas {len(response.cards)} tarjetas")
        print("\n--- TARJETAS GENERADAS ---")
        
        for i, card in enumerate(response.cards, 1):
            print(f"\n🃏 Tarjeta {i}:")
            
            if card.cloze_text:
                print(f"Tipo: Cloze")
                print(f"Texto: {card.cloze_text}")
            else:
                print(f"Tipo: Estándar")
                print(f"Pregunta: {card.front_content}")
                print(f"Respuesta: {card.back_content}")
            
            if card.tags:
                print(f"Etiquetas: {', '.join(card.tags)}")
            
            if card.explanation:
                print(f"Explicación: {card.explanation}")
        
        print("\n--- METADATOS ---")
        print(json.dumps(response.metadata, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error en generación de tarjetas: {e}")
        import traceback
        traceback.print_exc()

def test_prompt_generation():
    """Prueba específica para generación de tarjetas en español."""
    try:
        client = genai.Client(api_key="AIzaSyDS8DZT0UIKjn-A25m22nBS0gWicFDeyNs")
        
        prompt = """Eres un experto educador especializado en crear tarjetas de estudio efectivas para repetición espaciada.

Tu tarea es generar 3 tarjetas de estudio de alta calidad sobre el tema: "Fotosíntesis"

PARÁMETROS:
- Dificultad: medium (intermedio, relaciones entre conceptos, aplicaciones prácticas)
- Tipo: standard - Genera tarjetas de tipo pregunta-respuesta estándar.
- Idioma: español

INSTRUCCIONES ESPECÍFICAS:
1. Cada tarjeta debe ser autocontenida y clara
2. Las preguntas deben ser específicas y no ambiguas
3. Las respuestas deben ser concisas pero completas
4. Incluye etiquetas relevantes para cada tarjeta
5. Varía los tipos de preguntas: definiciones, aplicaciones, ejemplos, diferencias, etc.

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido que contenga un array de tarjetas. Cada tarjeta debe tener esta estructura:

[
  {
    "type": "standard",
    "front_content": [
      {"type": "text", "content": "¿Cuál es la ecuación química de la fotosíntesis?"}
    ],
    "back_content": [
      {"type": "text", "content": "6CO2 + 6H2O + energía luminosa → C6H12O6 + 6O2"}
    ],
    "tags": ["biología", "fotosíntesis", "química"],
    "explanation": "Esta es la ecuación básica que resume todo el proceso"
  }
]

Asegúrate de que el JSON sea válido y que todas las tarjetas sean educativamente valiosas."""

        response = client.models.generate_content(
            model="gemini-2.5-pro-exp-03-25",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                thinking_config=genai.types.ThinkingConfig(
                    thinking_budget=2048
                ),
                temperature=0.7,
                max_output_tokens=2048
            )
        )
        
        print("=== PRUEBA DE PROMPT ESPECÍFICO ===")
        print("Respuesta de Gemini:")
        print(response.text)
        
        # Intentar parsear JSON
        try:
            # Buscar JSON en la respuesta
            text = response.text
            json_start = text.find('[')
            json_end = text.rfind(']') + 1
            
            if json_start != -1 and json_end > json_start:
                json_text = text[json_start:json_end]
                cards = json.loads(json_text)
                
                print("\n--- JSON PARSEADO EXITOSAMENTE ---")
                print(f"Número de tarjetas: {len(cards)}")
                
                for i, card in enumerate(cards, 1):
                    print(f"\nTarjeta {i}:")
                    print(f"Pregunta: {card.get('front_content', [{}])[0].get('content', 'N/A')}")
                    print(f"Respuesta: {card.get('back_content', [{}])[0].get('content', 'N/A')}")
                    print(f"Etiquetas: {', '.join(card.get('tags', []))}")
            else:
                print("❌ No se encontró JSON válido en la respuesta")
                
        except json.JSONDecodeError as e:
            print(f"❌ Error parseando JSON: {e}")
        
    except Exception as e:
        print(f"Error en prueba de prompt: {e}")

if __name__ == "__main__":
    print("🧠 PRUEBAS DE GEMINI 2.5-PRO PARA JUANPA")
    print("="*50)
    
    # Prueba básica
    test_basic_gemini()
    
    # Prueba de prompt específico
    test_prompt_generation()
    
    # Prueba de generación de tarjetas (requiere módulos del backend)
    try:
        asyncio.run(test_card_generation())
    except ImportError:
        print("⚠️ No se pudo importar el servicio de Gemini. Ejecuta desde el directorio backend.")
    except Exception as e:
        print(f"⚠️ Error en prueba de generación: {e}")
    
    print("\n✅ Pruebas completadas!") 