"""
Tests para endpoints de mazos.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session


def test_create_deck(client: TestClient, sample_deck_data):
    """Test crear un mazo."""
    response = client.post("/api/v1/decks/", json=sample_deck_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["name"] == sample_deck_data["name"]
    assert data["description"] == sample_deck_data["description"]
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_deck_duplicate_name(client: TestClient, sample_deck_data):
    """Test crear mazo con nombre duplicado."""
    # Crear primer mazo
    client.post("/api/v1/decks/", json=sample_deck_data)
    
    # Intentar crear segundo mazo con mismo nombre
    response = client.post("/api/v1/decks/", json=sample_deck_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_create_deck_invalid_name(client: TestClient):
    """Test crear mazo con nombre inválido."""
    invalid_data = {"name": "", "description": "Descripción válida"}
    response = client.post("/api/v1/decks/", json=invalid_data)
    assert response.status_code == 422


def test_get_decks_empty(client: TestClient):
    """Test obtener mazos cuando no hay ninguno."""
    response = client.get("/api/v1/decks/")
    assert response.status_code == 200
    assert response.json() == []


def test_get_decks(client: TestClient, sample_deck_data):
    """Test obtener lista de mazos."""
    # Crear un mazo
    create_response = client.post("/api/v1/decks/", json=sample_deck_data)
    created_deck = create_response.json()
    
    # Obtener lista de mazos
    response = client.get("/api/v1/decks/")
    assert response.status_code == 200
    
    decks = response.json()
    assert len(decks) == 1
    assert decks[0]["id"] == created_deck["id"]


def test_get_deck_by_id(client: TestClient, sample_deck_data):
    """Test obtener mazo por ID."""
    # Crear un mazo
    create_response = client.post("/api/v1/decks/", json=sample_deck_data)
    created_deck = create_response.json()
    
    # Obtener mazo por ID
    response = client.get(f"/api/v1/decks/{created_deck['id']}")
    assert response.status_code == 200
    
    deck = response.json()
    assert deck["id"] == created_deck["id"]
    assert deck["name"] == sample_deck_data["name"]
    assert "cards" in deck  # DeckReadWithCards incluye las tarjetas


def test_get_deck_not_found(client: TestClient):
    """Test obtener mazo que no existe."""
    response = client.get("/api/v1/decks/999")
    assert response.status_code == 404


def test_update_deck(client: TestClient, sample_deck_data):
    """Test actualizar un mazo."""
    # Crear un mazo
    create_response = client.post("/api/v1/decks/", json=sample_deck_data)
    created_deck = create_response.json()
    
    # Actualizar el mazo
    update_data = {
        "name": "Mazo Actualizado",
        "description": "Descripción actualizada"
    }
    response = client.put(f"/api/v1/decks/{created_deck['id']}", json=update_data)
    assert response.status_code == 200
    
    updated_deck = response.json()
    assert updated_deck["name"] == update_data["name"]
    assert updated_deck["description"] == update_data["description"]


def test_update_deck_duplicate_name(client: TestClient, sample_deck_data):
    """Test actualizar mazo con nombre que ya existe."""
    # Crear dos mazos
    deck1_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck1 = deck1_response.json()
    
    deck2_data = {"name": "Segundo Mazo", "description": "Descripción"}
    deck2_response = client.post("/api/v1/decks/", json=deck2_data)
    deck2 = deck2_response.json()
    
    # Intentar actualizar deck2 con el nombre de deck1
    update_data = {"name": sample_deck_data["name"]}
    response = client.put(f"/api/v1/decks/{deck2['id']}", json=update_data)
    assert response.status_code == 400


def test_delete_deck(client: TestClient, sample_deck_data):
    """Test eliminar un mazo."""
    # Crear un mazo
    create_response = client.post("/api/v1/decks/", json=sample_deck_data)
    created_deck = create_response.json()
    
    # Eliminar el mazo
    response = client.delete(f"/api/v1/decks/{created_deck['id']}")
    assert response.status_code == 200
    
    # Verificar que ya no existe
    get_response = client.get(f"/api/v1/decks/{created_deck['id']}")
    assert get_response.status_code == 404


def test_export_deck_markdown(client: TestClient, sample_deck_data):
    """Test exportar mazo a Markdown."""
    # Crear un mazo
    create_response = client.post("/api/v1/decks/", json=sample_deck_data)
    created_deck = create_response.json()
    
    # Exportar a Markdown
    response = client.get(f"/api/v1/decks/{created_deck['id']}/export/markdown")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    
    content = response.text
    assert sample_deck_data["name"] in content
    assert "Este mazo no tiene tarjetas" in content  # Mazo vacío 