#!/usr/bin/env python3
"""
Script para investigar el problema con las tarjetas cloze
"""

import sys
import os
sys.path.append('.')
from fastapi.testclient import TestClient
from app.main import app

def investigate_cloze_problem():
    """Investigar el problema con las tarjetas cloze"""
    client = TestClient(app)
    
    print("🔍 INVESTIGACIÓN: PROBLEMA CON TARJETAS CLOZE")
    print("=" * 60)
    print()
    
    # Buscar el mazo 'roma'
    response = client.get('/api/v1/decks/')
    decks = response.json()
    roma_deck = next((d for d in decks if 'roma' in d['name'].lower()), None)
    
    if not roma_deck:
        print("❌ Mazo 'roma' no encontrado")
        return
    
    print(f"🔍 MAZO ENCONTRADO: {roma_deck['name']} (ID: {roma_deck['id']})")
    print()
    
    # Obtener las tarjetas del mazo
    response = client.get(f'/api/v1/cards/?deck_id={roma_deck["id"]}')
    cards = response.json()
    
    print(f"📋 TOTAL TARJETAS: {len(cards)}")
    print()
    
    # Analizar cada tarjeta
    cloze_count = 0
    standard_count = 0
    malformed_count = 0
    
    for i, card in enumerate(cards, 1):
        print(f"🏷️  TARJETA {i}:")
        print(f"   ID: {card.get('id')}")
        
        front = card.get('front_content')
        back = card.get('back_content')
        cloze = card.get('cloze_data')
        
        # Determinar tipo de tarjeta
        has_cloze = cloze is not None
        has_front_back = front is not None and back is not None
        
        if has_cloze:
            cloze_count += 1
            print(f"   🔍 TIPO: CLOZE")
            print(f"   📝 Cloze data: {str(cloze)[:200]}...")
            
            # Verificar estructura del cloze_data
            if isinstance(cloze, dict):
                cloze_text = cloze.get('cloze_text', 'N/A')
                print(f"   📄 Cloze text: {str(cloze_text)[:150]}...")
                
                # Verificar formato cloze válido
                if '{{c1::' in str(cloze_text) or '{{c2::' in str(cloze_text):
                    print(f"   ✅ Formato cloze válido")
                else:
                    print(f"   ⚠️  Formato cloze inválido")
            else:
                print(f"   ❌ cloze_data no es diccionario")
                
        elif has_front_back:
            standard_count += 1
            print(f"   📖 TIPO: ESTÁNDAR")
            print(f"   ❓ Front: {str(front)[:100]}...")
            print(f"   💡 Back: {str(back)[:100]}...")
        else:
            malformed_count += 1
            print(f"   ❌ TIPO: MALFORMADA")
            print(f"   ⚠️  Sin contenido válido")
        
        tags = card.get('tags', [])
        if tags:
            print(f"   🏷️  Tags: {', '.join(tags[:3])}...")
        
        print()
        
        if i >= 5:  # Mostrar solo las primeras 5
            print(f"   ... (mostrando solo las primeras 5 de {len(cards)} tarjetas)")
            break
    
    print("=" * 60)
    print("📊 RESUMEN DEL ANÁLISIS:")
    print(f"   🔍 Tarjetas cloze: {cloze_count}")
    print(f"   📖 Tarjetas estándar: {standard_count}")
    print(f"   ❌ Tarjetas malformadas: {malformed_count}")
    print()
    
    if cloze_count == 0:
        print("❌ PROBLEMA: No se generaron tarjetas cloze")
    elif malformed_count > 0:
        print(f"⚠️  PROBLEMA: {malformed_count} tarjetas malformadas")
    else:
        print("✅ ESTRUCTURA: Tarjetas tienen estructura correcta")

if __name__ == "__main__":
    investigate_cloze_problem() 