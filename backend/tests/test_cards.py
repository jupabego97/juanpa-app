"""
Tests para endpoints de tarjetas.
"""

import pytest
from fastapi.testclient import TestClient


def test_create_card_normal(client: TestClient, sample_deck_data, sample_card_data):
    """Test crear una tarjeta normal."""
    # Crear un mazo primero
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    # Crear la tarjeta
    card_data = {**sample_card_data, "deck_id": deck["id"]}
    response = client.post("/api/v1/cards/", json=card_data)
    assert response.status_code == 200
    
    cards = response.json()
    assert len(cards) == 1
    
    card = cards[0]
    assert card["deck_id"] == deck["id"]
    assert card["front_content"] == sample_card_data["front_content"]
    assert card["back_content"] == sample_card_data["back_content"]
    assert card["tags"] == sample_card_data["tags"]


def test_create_card_cloze(client: TestClient, sample_deck_data, sample_cloze_data):
    """Test crear tarjetas cloze."""
    # Crear un mazo primero
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    # Crear las tarjetas cloze
    card_data = {**sample_cloze_data, "deck_id": deck["id"]}
    response = client.post("/api/v1/cards/", json=card_data)
    assert response.status_code == 200
    
    cards = response.json()
    assert len(cards) == 2  # Dos clozes: c1 y c2
    
    # Verificar que cada tarjeta tiene datos de cloze
    for card in cards:
        assert card["deck_id"] == deck["id"]
        assert card["cloze_data"] is not None
        assert "cloze_index" in card["cloze_data"]
        assert "total_clozes" in card["cloze_data"]
        assert "original_text" in card["cloze_data"]


def test_create_card_invalid_deck(client: TestClient, sample_card_data):
    """Test crear tarjeta con deck_id inválido."""
    card_data = {**sample_card_data, "deck_id": 999}
    response = client.post("/api/v1/cards/", json=card_data)
    assert response.status_code == 404


def test_create_card_no_content(client: TestClient, sample_deck_data):
    """Test crear tarjeta sin contenido válido."""
    # Crear un mazo primero
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    # Intentar crear tarjeta sin contenido
    card_data = {"deck_id": deck["id"]}
    response = client.post("/api/v1/cards/", json=card_data)
    assert response.status_code == 400


def test_get_cards_empty(client: TestClient):
    """Test obtener tarjetas cuando no hay ninguna."""
    response = client.get("/api/v1/cards/")
    assert response.status_code == 200
    assert response.json() == []


def test_get_cards_by_deck(client: TestClient, sample_deck_data, sample_card_data):
    """Test obtener tarjetas filtradas por mazo."""
    # Crear un mazo y una tarjeta
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    card_data = {**sample_card_data, "deck_id": deck["id"]}
    client.post("/api/v1/cards/", json=card_data)
    
    # Obtener tarjetas del mazo
    response = client.get(f"/api/v1/cards/?deck_id={deck['id']}")
    assert response.status_code == 200
    
    cards = response.json()
    assert len(cards) == 1
    assert cards[0]["deck_id"] == deck["id"]


def test_get_card_by_id(client: TestClient, sample_deck_data, sample_card_data):
    """Test obtener tarjeta por ID."""
    # Crear un mazo y una tarjeta
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    card_data = {**sample_card_data, "deck_id": deck["id"]}
    create_response = client.post("/api/v1/cards/", json=card_data)
    created_card = create_response.json()[0]
    
    # Obtener tarjeta por ID
    response = client.get(f"/api/v1/cards/{created_card['id']}")
    assert response.status_code == 200
    
    card = response.json()
    assert card["id"] == created_card["id"]
    assert "deck" in card  # CardReadWithDeck incluye info del mazo


def test_get_card_not_found(client: TestClient):
    """Test obtener tarjeta que no existe."""
    response = client.get("/api/v1/cards/999")
    assert response.status_code == 404


def test_update_card(client: TestClient, sample_deck_data, sample_card_data):
    """Test actualizar una tarjeta."""
    # Crear un mazo y una tarjeta
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    card_data = {**sample_card_data, "deck_id": deck["id"]}
    create_response = client.post("/api/v1/cards/", json=card_data)
    created_card = create_response.json()[0]
    
    # Actualizar la tarjeta
    update_data = {
        "front_content": [{"type": "text", "content": "Pregunta actualizada"}],
        "tags": ["nueva-etiqueta"]
    }
    response = client.put(f"/api/v1/cards/{created_card['id']}", json=update_data)
    assert response.status_code == 200
    
    updated_card = response.json()
    assert updated_card["front_content"] == update_data["front_content"]
    assert updated_card["tags"] == update_data["tags"]


def test_delete_card(client: TestClient, sample_deck_data, sample_card_data):
    """Test eliminar una tarjeta."""
    # Crear un mazo y una tarjeta
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    card_data = {**sample_card_data, "deck_id": deck["id"]}
    create_response = client.post("/api/v1/cards/", json=card_data)
    created_card = create_response.json()[0]
    
    # Eliminar la tarjeta
    response = client.delete(f"/api/v1/cards/{created_card['id']}")
    assert response.status_code == 200
    
    # Verificar que ya no existe
    get_response = client.get(f"/api/v1/cards/{created_card['id']}")
    assert get_response.status_code == 404


def test_review_card(client: TestClient, sample_deck_data, sample_card_data):
    """Test repasar una tarjeta."""
    # Crear un mazo y una tarjeta
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    card_data = {**sample_card_data, "deck_id": deck["id"]}
    create_response = client.post("/api/v1/cards/", json=card_data)
    created_card = create_response.json()[0]
    
    # Repasar la tarjeta
    review_data = {"rating": 3}  # Good
    response = client.post(f"/api/v1/cards/{created_card['id']}/review", json=review_data)
    assert response.status_code == 200
    
    reviewed_card = response.json()
    assert reviewed_card["fsrs_stability"] is not None
    assert reviewed_card["next_review_at"] is not None
    assert reviewed_card["fsrs_state"] != "new"


def test_review_card_invalid_rating(client: TestClient, sample_deck_data, sample_card_data):
    """Test repasar tarjeta con rating inválido."""
    # Crear un mazo y una tarjeta
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    card_data = {**sample_card_data, "deck_id": deck["id"]}
    create_response = client.post("/api/v1/cards/", json=card_data)
    created_card = create_response.json()[0]
    
    # Intentar repasar con rating inválido
    review_data = {"rating": 5}  # Inválido
    response = client.post(f"/api/v1/cards/{created_card['id']}/review", json=review_data)
    assert response.status_code == 400


def test_get_next_review_card_empty(client: TestClient):
    """Test obtener siguiente tarjeta cuando no hay ninguna."""
    response = client.get("/api/v1/review/next-card")
    assert response.status_code == 200
    assert response.json() is None


def test_get_next_review_card(client: TestClient, sample_deck_data, sample_card_data):
    """Test obtener siguiente tarjeta para repasar."""
    # Crear un mazo y una tarjeta
    deck_response = client.post("/api/v1/decks/", json=sample_deck_data)
    deck = deck_response.json()
    
    card_data = {**sample_card_data, "deck_id": deck["id"]}
    create_response = client.post("/api/v1/cards/", json=card_data)
    created_card = create_response.json()[0]
    
    # Obtener siguiente tarjeta (debería ser la nueva)
    response = client.get("/api/v1/review/next-card")
    assert response.status_code == 200
    
    next_card = response.json()
    assert next_card is not None
    assert next_card["id"] == created_card["id"]
    assert next_card["fsrs_state"] == "new" 