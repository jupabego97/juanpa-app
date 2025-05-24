import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { DeckSyncRead } from '../services/api';
import { useSync, type LocalCard, type LocalDeck } from '../contexts/SyncContext';
import { getClozePreview, isClozeCard } from '../utils/clozeHelpers';

const CardItem: React.FC<{ 
  card: LocalCard;
  onDelete: (id: number | string) => void;
  onEdit: (id: number | string) => void;
}> = ({ card, onDelete, onEdit }) => {

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`¿Seguro que quieres eliminar esta tarjeta?`)) {
      onDelete(card.id && card.id !== 0 ? card.id : card._tempId!); 
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(card.id && card.id !== 0 ? card.id : card._tempId!);
  };

  const getFrontPreview = (card: LocalCard): string => {
    // Primero verificar si es tarjeta cloze
    if (isClozeCard(card)) {
      return getClozePreview(card, 100);
    }
    
    // Si no es cloze, procesar front_content normal
    const frontContent = card.front_content;
    if (Array.isArray(frontContent) && frontContent.length > 0) {
      const firstBlock = frontContent[0];
      if (firstBlock.type === 'html' && typeof firstBlock.content === 'string') {
        const text = firstBlock.content.replace(/<[^>]+>/g, '');
        return text.length > 100 ? text.substring(0, 97) + "..." : text;
      }
      if (firstBlock.type === 'text' && typeof firstBlock.content === 'string') {
        return firstBlock.content.length > 100 ? firstBlock.content.substring(0, 97) + "..." : firstBlock.content;
      }
    }
    if (typeof frontContent === 'string') {
      const text = frontContent.replace(/<[^>]+>/g, '');
      return text.length > 100 ? text.substring(0, 97) + "..." : text;
    }
    return "Vista previa no disponible";
  };

  const frontPreview = getFrontPreview(card);
  const isDue = card.next_review_at ? new Date(card.next_review_at) <= new Date() : false;
  const isNewFsrs = card.fsrs_state === 0;

  return (
    <div 
        className="card-item"
        style={{ 
            backgroundColor: card._isDirty ? '#fff9e6' : (isDue && !isNewFsrs ? '#ffebee' : 'white'),
        }}
        title={card._isDirty ? "Tarjeta con cambios locales" : (isDue && !isNewFsrs ? "Esta tarjeta está para repasar" : (isNewFsrs ? "Tarjeta nueva en FSRS" : ""))}
    >
      <div className="card-content-area">
        <p style={{ margin: '0 0 5px 0', fontWeight: '500' }}>
          {frontPreview}
          {card._isNew && <span style={{fontSize: '0.8em', color: 'green', marginLeft: '8px'}}>(Nueva Local)</span>}
        </p>
        <p style={{ fontSize: '0.8em', color: '#666', margin: 0 }}>
          Tags: {card.tags && card.tags.length > 0 ? card.tags.join(', ') : 'Ninguna'} <br/>
          A repasar: {card.next_review_at ? new Date(card.next_review_at).toLocaleDateString() : 'N/A'}
          {isNewFsrs && " (Nueva en FSRS)"}
        </p>
      </div>
      <div className="card-actions">
        <button onClick={handleEditClick} className="button-link button-secondary-link">Editar</button>
        <button onClick={handleDeleteClick} className="button-danger">Eliminar</button>
      </div>
    </div>
  );
};

const DeckDetailPage: React.FC = () => {
  const { deckId: deckIdParam } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { 
    decks, 
    cards, 
    markCardAsDeleted, 
    initiateSync, 
    isSyncing, 
    isInitialized,
    getDeckById
  } = useSync();

  const [currentDeck, setCurrentDeck] = useState<LocalDeck | null>(null);
  const [deckCards, setDeckCards] = useState<LocalCard[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitialized) {
      setLoading(true);
      return;
    }
    setLoading(true);
    setError(null);

    console.log(`DeckDetailPage: Buscando mazo con ID/tempID: ${deckIdParam} en ${decks.length} mazos.`);
    
    const foundDeck = getDeckById(deckIdParam!);

    if (foundDeck) {
      setCurrentDeck(foundDeck);
      
      const targetDeckId = foundDeck.id && foundDeck.id !== 0 ? foundDeck.id : foundDeck._tempId;

      const cardsForThisDeck = cards.filter(card => 
        !card.is_deleted && 
        (card.deck_id === targetDeckId || (typeof card.deck_id === 'string' && card.deck_id === foundDeck._tempId)) 
      );
      
      setDeckCards(cardsForThisDeck.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      setError(null);
    } else {
      setError("Mazo no encontrado. Puede haber sido eliminado o necesitas sincronizar.");
      setCurrentDeck(null);
      setDeckCards([]);
    }
    setLoading(false);
  }, [deckIdParam, decks, cards, isInitialized, getDeckById]);

  const handleExportToMarkdown = async () => {
    if (!currentDeck || (currentDeck.id === 0 && !currentDeck._tempId)) {
        setExportError("El mazo debe existir en el servidor para exportar (necesita un ID real).");
        return;
    }
    setIsExporting(true);
    setExportError(null);
    try {
      const deckIdForExport = currentDeck.id && currentDeck.id !== 0 ? currentDeck.id : null;
      if (!deckIdForExport) {
        setExportError("El mazo necesita un ID de servidor para ser exportado. Sincroniza primero.");
        setIsExporting(false);
        return;
      }
      const apiClient = (await import('../services/api')).default;
      const response = await apiClient.get(`/decks/${deckIdForExport}/export/markdown`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      let filename = `deck_${currentDeck?.name || deckIdForExport}_export.md`;
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=\"?([^\"]+)\"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error exporting deck to markdown:", err);
      setExportError(err.message || "Error desconocido durante la exportación.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteCard = async (cardIdOrTempId: number | string) => {
    try {
      await markCardAsDeleted(cardIdOrTempId);
    } catch (err: any) {
        console.error(`Error marking card ${cardIdOrTempId} as deleted:`, err);
        alert(err.message || "Error al marcar la tarjeta como eliminada.");
    }
  };

  const handleEditCard = (cardIdOrTempId: number | string) => {
    navigate(`/cards/edit/${cardIdOrTempId}`);
  };
  
  const handleStudyDeck = () => {
    if (!currentDeck) return;
    const studyId = currentDeck.id && currentDeck.id !== 0 ? currentDeck.id : currentDeck._tempId;
    if (!studyId) {
        alert("No se puede identificar el mazo para estudiar.");
        return;
    }
    navigate(`/study/${studyId}`);
  };

  const handleAddNewCard = () => {
    if (!currentDeck) return;
    const deckRefId = currentDeck.id && currentDeck.id !== 0 ? currentDeck.id : currentDeck._tempId;
     if (!deckRefId) {
        alert("No se puede identificar el mazo para añadir la tarjeta.");
        return;
    }
    navigate(`/cards/create?deckId=${deckRefId}`);
  };

  const handleQuickCapture = () => {
    if (!currentDeck) return;
    const deckRefId = currentDeck.id && currentDeck.id !== 0 ? currentDeck.id : currentDeck._tempId;
    if (!deckRefId) {
        alert("No se puede identificar el mazo para la captura OCR.");
        return;
    }
    navigate(`/quick-capture?deckId=${deckRefId}`);
  };

  if (loading && !currentDeck && isInitialized) {
    return <div className="page-container"><p>Cargando detalles del mazo...</p></div>;
  }

  if (error) {
    return <div className="page-container"><p className="error-message">{error} <Link to="/decks">Volver</Link></p></div>;
  }

  if (!currentDeck) {
    return <div className="page-container"><p>Mazo no encontrado. <Link to="/decks">Volver a la lista</Link>.</p></div>;
  }

  const now = new Date();
  const dueCardsCount = deckCards.filter(c => c.next_review_at && new Date(c.next_review_at) <= now && c.fsrs_state !== 0).length;
  const newFSRSCardsCount = deckCards.filter(c => c.fsrs_state === 0).length;

  return (
    <div className="page-container">
      <Link to="/" className="button-link button-secondary-link" style={{ marginBottom: '20px', display: 'inline-block' }}>&larr; Volver a Mis Mazos</Link>
      
      <div className="deck-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>
            {currentDeck.name} 
            {currentDeck._isNew && <span style={{fontSize: '0.7em', color: 'green', marginLeft: '10px'}}>(Nuevo Local)</span>}
            {currentDeck._isDirty && !currentDeck._isNew && <span style={{fontSize: '0.7em', color: 'orange', marginLeft: '10px'}}>(Modificado)</span>}
          </h2>
          <p>{currentDeck.description || 'Este mazo no tiene descripción.'}</p>
        </div>
        <Link 
          to={`/decks/${currentDeck.id && currentDeck.id !== 0 ? currentDeck.id : currentDeck._tempId!}/edit`}
          className="button-link button-secondary-link"
        >
          Editar Mazo
        </Link>
      </div>

      <div className="deck-actions" style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <button 
            onClick={handleStudyDeck} 
            className="button-primary" 
            disabled={deckCards.length === 0 && !isSyncing}
        >
            Estudiar ({dueCardsCount} para hoy, {newFSRSCardsCount} nuevas)
        </button>
        <button 
          onClick={handleAddNewCard}
          className="button-success"
        >
          + Añadir Tarjeta
        </button>
        <button 
          onClick={handleQuickCapture}
          className="button-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📸 Captura OCR
        </button>
        <button 
          onClick={handleExportToMarkdown} 
          disabled={isExporting || (currentDeck.id === 0 && !currentDeck._tempId)}
          className="button-secondary"
          title={(currentDeck.id === 0 && !currentDeck._tempId) ? "El mazo debe sincronizarse primero para exportar" : ""}
        >
          {isExporting ? 'Exportando...' : 'Exportar (MD)'}
        </button>
         <button onClick={() => initiateSync()} disabled={isSyncing} className="button-secondary" style={{marginLeft: 'auto'}}>
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Cambios'}
        </button>
      </div>
      {exportError && <p className="error-message" style={{marginTop: '5px'}}>{exportError}</p>}
      
      <h3 style={{ marginTop: '30px' }}>Tarjetas en este Mazo ({deckCards.length})</h3>
      {deckCards.length === 0 ? (
        <p>Este mazo aún no tiene tarjetas. ¡Añade algunas!</p>
      ) : (
        <ul className="card-list" style={{listStyleType: 'none', paddingLeft: 0}}>
          {deckCards.map((card: LocalCard) => (
            <li key={card.id && card.id !== 0 ? `card-${card.id}` : `card-${card._tempId!}`}>
              <CardItem 
                card={card}
                onDelete={handleDeleteCard}
                onEdit={handleEditCard}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DeckDetailPage;
