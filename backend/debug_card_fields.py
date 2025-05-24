#!/usr/bin/env python3
import sys
import os
sys.path.append('.')
from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)
response = client.get('/api/v1/cards/?deck_id=33')
card = response.json()[0]

print("CAMPOS DE TARJETA CLOZE:")
relevant_fields = {
    'id': card.get('id'),
    'front_content': card.get('front_content'),
    'back_content': card.get('back_content'), 
    'cloze_data': card.get('cloze_data'),
    'raw_cloze_text': card.get('raw_cloze_text')
}

print(json.dumps(relevant_fields, indent=2, ensure_ascii=False)) 