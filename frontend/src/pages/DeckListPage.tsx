import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSync, type LocalDeck, type LocalCard } from '../contexts/SyncContext';

// Un componente simple para mostrar cada mazo
const DeckItem: React.FC<{ 
  deck: LocalDeck; 
  onDelete: (id: number | string) => void; 
  cardCounts: { due: number; new: number; total: number };
}> = ({ deck, onDelete, cardCounts }) => {
  const navigate = useNavigate();

  if (deck.is_deleted) {
    return null; // No mostrar mazos eliminados
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que el clic en el botón propague al div del mazo
    if (window.confirm(`¿Estás seguro de que quieres eliminar el mazo "${deck.name}"? Esta acción no se puede deshacer.`)) {
      onDelete(deck.id && deck.id !== 0 ? deck.id : deck._tempId!);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const deckIdForNav = deck.id && deck.id !== 0 ? deck.id : deck._tempId!;
    navigate(`/decks/${deckIdForNav}/edit`);
  };
  
  const handleDeckClick = () => {
    const deckIdForNav = deck.id && deck.id !== 0 ? deck.id : deck._tempId!;
    navigate(`/decks/${deckIdForNav}`); // Navegar a la vista detallada del mazo
  };

  return (
    <div 
      onClick={handleDeckClick}
      style={{ 
        border: '1px solid #ccc', borderRadius: '8px', padding: '15px', marginBottom: '10px', 
        cursor: 'pointer', backgroundColor: deck._isDirty ? '#fff3cd' : 'white', // Indicar si está modificado
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}
      title={deck._isDirty ? "Este mazo tiene cambios locales pendientes de sincronización." : deck.description || ""}
    >
      <div>
        <h3 style={{ marginTop: 0, marginBottom: '5px' }}>
          {deck.name} {deck._isNew && <span style={{fontSize: '0.8em', color: 'green'}}>(Nuevo local)</span>}
        </h3>
        <p style={{ fontSize: '0.9em', color: '#555', margin: '0 0 5px 0' }}>
          {deck.description ? (deck.description.length > 100 ? `${deck.description.substring(0, 97)}...` : deck.description) : <i>Sin descripción</i>}
        </p>
        <p style={{ fontSize: '0.8em', color: '#777', margin: 0 }}>
          Tarjetas: {cardCounts.total} (Nuevas FSRS: {cardCounts.new}, Para hoy: {cardCounts.due})
        </p>
        <p style={{ fontSize: '0.7em', color: '#999', margin: '5px 0 0 0' }}>
            Última mod.: {new Date(deck.updated_at).toLocaleString()}
        </p>
      </div>
      <div style={{display: 'flex', gap: '10px'}}>
        <button onClick={handleEditClick} className="button-secondary-small">Editar</button>
        <button onClick={handleDeleteClick} className="button-danger-small">Eliminar</button>
      </div>
    </div>
  );
};


const DeckListPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    decks, 
    cards, // Necesitamos las tarjetas para los contadores
    initiateSync, 
    isSyncing, 
    syncError, 
    lastSyncTimestamp, 
    isInitialized,
    markDeckAsDeleted 
  } = useSync();

  // Estado para forzar re-renderizado si es necesario, o manejar errores de página
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    // Intento de sincronización inicial si no hay timestamp y el contexto está inicializado
    // Esto podría moverse a un useEffect en App.tsx o un nivel superior para que ocurra una vez
    // al cargar la app, en lugar de en cada carga de DeckListPage.
    if (isInitialized && !lastSyncTimestamp && !isSyncing) {
      console.log("DeckListPage: Disparando sincronización inicial.");
      initiateSync().catch(err => {
        console.error("Error en la sincronización inicial desde DeckListPage:", err);
        setPageError("Fallo la sincronización inicial. Revisa tu conexión o intenta más tarde.");
      });
    }
  }, [isInitialized, lastSyncTimestamp, initiateSync, isSyncing]);

  const handleDeleteDeck = async (deckIdOrTempId: number | string) => {
    try {
      await markDeckAsDeleted(deckIdOrTempId);
      // La UI se actualizará automáticamente porque `decks` cambiará en el contexto
    } catch (err) {
      console.error("Error al marcar mazo como eliminado:", err);
      setPageError(err instanceof Error ? err.message : "Error al eliminar el mazo.");
    }
  };
  
  const getCardCountsForDeck = useCallback((deck: LocalDeck): { due: number; new: number; total: number } => {
    const now = new Date();
    // El ID a usar para filtrar tarjetas puede ser el ID numérico o el _tempId si el mazo es nuevo.
    const deckIdToMatch = deck.id && deck.id !== 0 ? deck.id : deck._tempId;

    const currentDeckCards = cards.filter((card: LocalCard) => 
        !card.is_deleted && card.deck_id === deckIdToMatch
    );

    return {
      due: currentDeckCards.filter(c => c.next_review_at && new Date(c.next_review_at) <= now && c.fsrs_state !== 0).length,
      new: currentDeckCards.filter(c => c.fsrs_state === 0).length,
      total: currentDeckCards.length,
    };
  }, [cards]); // Dependencia de `cards`


  if (!isInitialized && !decks.length) {
      return <div className="page-container" style={{padding: '20px'}}>Cargando datos de la aplicación...</div>;
  }

  const visibleDecks = decks.filter(deck => !deck.is_deleted);

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h2>Mis Mazos</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/quick-capture')} className="button-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            📸 Captura OCR
          </button>
          <button onClick={() => navigate('/decks/new')} className="button-primary">
            Crear Mazo
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
        <button onClick={() => initiateSync()} disabled={isSyncing} className="button-secondary" style={{minWidth: '120px'}}>
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
        {syncError && <p style={{ color: 'red', fontSize: '0.9em', marginTop: '5px' }}>Error: {syncError}</p>}
        {lastSyncTimestamp && !syncError && (
          <p style={{ fontSize: '0.8em', color: 'green', marginTop: '5px' }}>
            Última sincronización: {new Date(lastSyncTimestamp).toLocaleString()}
          </p>
        )}
        {!lastSyncTimestamp && !syncError && isInitialized && (
            <p style={{ fontSize: '0.8em', color: 'orange', marginTop: '5px' }}>
                Aún no se ha sincronizado.
            </p>
        )}
    </div>
      
      {pageError && <p style={{ color: 'red' }}>{pageError}</p>}

      {visibleDecks.length === 0 && !isSyncing && (
        <p>No tienes mazos todavía. ¡Crea uno!</p>
      )}

    <div>
        {visibleDecks.map(deck => (
          <DeckItem 
            key={deck.id && deck.id !== 0 ? deck.id : deck._tempId!} 
            deck={deck} 
            onDelete={handleDeleteDeck}
            cardCounts={getCardCountsForDeck(deck)} // Pasar el objeto deck completo
          />
        ))}
      </div>
    </div>
  );
};

export default DeckListPage;
