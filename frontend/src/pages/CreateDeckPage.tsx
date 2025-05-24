import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import apiClient from '../services/api'; // Ya no se usa directamente para crear
import type { DeckCreatePayload } from '../services/api';
import { useSync } from '../contexts/SyncContext'; // Importar useSync

const CreateDeckPage: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Podría usarse para indicar "añadiendo localmente"
  const navigate = useNavigate();
  const { addDeck } = useSync(); // Corregido: usar addDeck en vez de addDeckLocal

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre del mazo es obligatorio.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: DeckCreatePayload = {
        name: name.trim(),
        description: description.trim() || null,
      };

      const newDeck = await addDeck(payload); // Corregido: usar addDeck
      
      if (newDeck) {
        const deckNavigationId = newDeck.id && newDeck.id !== 0 ? newDeck.id : newDeck._tempId;
        if (deckNavigationId) {
          navigate(`/decks/${deckNavigationId}`);
        } else {
          throw new Error("No se pudo crear el mazo localmente (no se obtuvo un ID válido).");
        }
      } else {
        throw new Error("No se pudo crear el mazo localmente (addDeck no devolvió un mazo).");
      }
    } catch (err: any) {
      console.error('Error creando el mazo:', err);
      setError(err.message || 'Error desconocido al crear el mazo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h2>Crear Nuevo Mazo</h2>
      <form onSubmit={handleSubmit} className="form-layout" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="form-field" style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="deck-name" style={{ marginBottom: '5px', fontWeight: 'bold' }}>Nombre del Mazo:</label>
          <input
            id="deck-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Vocabulario de Alemán"
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div className="form-field" style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="deck-description" style={{ marginBottom: '5px', fontWeight: 'bold' }}>Descripción (Opcional):</label>
          <textarea
            id="deck-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Palabras y frases básicas para el día a día"
            rows={3}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
          />
        </div>
        
        {error && <p className="error-message" style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        
        <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={isLoading} className="button-primary" style={{ padding: '10px 15px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}>
          {isLoading ? 'Creando...' : 'Crear Mazo'}
        </button>
          <button type="button" onClick={() => navigate('/decks')} disabled={isLoading} className="button-secondary" style={{ padding: '10px 15px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateDeckPage;
