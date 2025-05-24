import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSync, type LocalDeck } from '../contexts/SyncContext';

interface DeckUpdateLocalPayload {
  name?: string;
  description?: string | null;
}

const EditDeckPage: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { getDeckById, updateDeck } = useSync();

  const [currentDeck, setCurrentDeck] = useState<LocalDeck | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);

  console.log('[EditDeckPage] Render - deckId param:', deckId);

  useEffect(() => {
    console.log('[EditDeckPage] useEffect triggered - deckId:', deckId);
    if (deckId) {
      console.log('[EditDeckPage] Attempting to get deck with ID:', deckId);
      const deckToEdit = getDeckById(deckId);
      console.log('[EditDeckPage] Deck found by getDeckById:', deckToEdit);
      if (deckToEdit) {
        setCurrentDeck(deckToEdit);
        setName(deckToEdit.name);
        setDescription(deckToEdit.description || '');
        setInitialLoadError(null);
        console.log('[EditDeckPage] State updated with deck:', deckToEdit);
      } else {
        setInitialLoadError(`Mazo con ID '${deckId}' no encontrado. Puede que necesites sincronizar o el ID sea incorrecto.`);
        setCurrentDeck(null);
        console.warn('[EditDeckPage] Deck not found for ID:', deckId);
      }
    } else {
      console.warn('[EditDeckPage] deckId is undefined in useEffect');
      setInitialLoadError('No se proporcionó un ID de mazo para editar.');
    }
  }, [deckId, getDeckById]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    console.log('[EditDeckPage] handleSubmit currentDeck:', currentDeck);

    if (!currentDeck) {
      setError("No hay un mazo cargado para editar.");
      return;
    }
    if (!name.trim()) {
      setError('El nombre del mazo es obligatorio.');
      return;
    }

    setIsLoading(true);

    const updatedFields: DeckUpdateLocalPayload = {
      name: name.trim(),
      description: description.trim() || null,
    };
    console.log('[EditDeckPage] Submitting updatedFields:', updatedFields);

    try {
      const idToUpdate = currentDeck.id && currentDeck.id !== 0 ? currentDeck.id : currentDeck._tempId;
      if (!idToUpdate) {
        console.error('[EditDeckPage] idToUpdate is null or undefined', currentDeck);
        throw new Error("No se pudo determinar el ID del mazo para actualizar.");
      }
      console.log('[EditDeckPage] Calling updateDeck with idToUpdate:', idToUpdate);
      await updateDeck(idToUpdate, updatedFields);

      alert('Mazo actualizado localmente. Sincroniza para guardar los cambios en el servidor.');
      navigate(`/decks/${idToUpdate}`);
    } catch (err) {
      console.error("Error al actualizar el mazo:", err);
      setError(err instanceof Error ? err.message : "Ocurrió un error desconocido al actualizar.");
    } finally {
      setIsLoading(false);
    }
  };

  console.log('[EditDeckPage] Before render - currentDeck:', currentDeck, 'initialLoadError:', initialLoadError, 'isLoading:', isLoading);

  if (initialLoadError) {
    console.log('[EditDeckPage] Rendering with initialLoadError:', initialLoadError);
    return (
      <div className="page-container" style={{ padding: '20px', color: 'red' }}>
        <p>{initialLoadError}</p>
        <button onClick={() => navigate('/decks')} className="button-secondary">Volver a la lista de mazos</button>
      </div>
    );
  }
  
  if (!currentDeck && !initialLoadError && deckId) {
    console.log('[EditDeckPage] Rendering: Cargando datos del mazo...');
    return <div className="page-container" style={{ padding: '20px' }}>Cargando datos del mazo...</div>;
  }

  if (!currentDeck) {
    console.warn('[EditDeckPage] Rendering null because currentDeck is null and no initialLoadError and no deckId (or finished loading but no deck)');
    if (!deckId) return <div className="page-container"><p>No se especificó un ID de mazo.</p></div>;
    // Si deckId existía pero currentDeck es null y no hay error, podría significar que el mazo no se encontró
    // pero el error no se seteó, o el estado de carga no se manejó completamente.
    // O simplemente aún está cargando y la condición anterior no capturó esto.
    // Devolver null aquí podría ser la causa de la página en blanco si otras condiciones no se cumplen.
    return <div className="page-container"><p>No se pudo cargar el mazo. Intenta volver y seleccionar el mazo de nuevo.</p></div>;
  }

  console.log('[EditDeckPage] Rendering form for deck:', currentDeck.name);
  return (
    <div className="page-container" style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h2>Editar Mazo: {currentDeck.name}</h2>
      <form onSubmit={handleSubmit} className="form-layout" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="form-field" style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="deck-name" style={{ marginBottom: '5px', fontWeight: 'bold' }}>Nombre del Mazo:</label>
          <input
            id="deck-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            rows={3}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
          />
        </div>
        
        {error && <p className="error-message" style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        
        <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={isLoading} className="button-primary" style={{ padding: '10px 15px', borderRadius: '4px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}>
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
          <button 
            type="button" 
            onClick={() => navigate(`/decks/${currentDeck._tempId || currentDeck.id}`)} 
            disabled={isLoading} 
            className="button-secondary" 
            style={{ 
              padding: '10px 15px', 
              borderRadius: '4px', 
              border: '1px solid #ccc', 
              backgroundColor: '#f0f0f0',
              color: '#333',
              cursor: 'pointer' 
            }}
          >
          Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditDeckPage;
