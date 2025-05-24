import React from 'react';
import { Link } from 'react-router-dom';
import type { Deck } from '../services/api'; // Importa el tipo Deck

interface DeckItemProps {
  deck: Deck;
  onDelete: (deckId: number) => void; // Callback para manejar la eliminaciĂłn
}

const DeckItem: React.FC<DeckItemProps> = ({ deck, onDelete }) => {
  const handleDelete = () => {
    if (window.confirm(`Â¿EstĂĄs seguro de que quieres eliminar el mazo "${deck.name}"? Esta acciĂłn tambiĂŠn eliminarĂĄ todas sus tarjetas y es irreversible.`)) {
      onDelete(deck.id);
    }
  };

  return (
    <div className="deck-item"> {/* Usar clase CSS */}
      <div className="deck-header"> {/* Usar clase CSS */}
        <h3>{deck.name}</h3>
        <button 
          onClick={handleDelete}
          className="button-danger" // Usar clase CSS
        >
          Eliminar
        </button>
      </div>
      <p>{deck.description || 'Este mazo no tiene descripciĂłn.'}</p>
      <small className="deck-dates"> {/* Usar clase CSS */}
        Creado: {new Date(deck.created_at).toLocaleDateString()} | 
        Actualizado: {new Date(deck.updated_at).toLocaleDateString()}
      </small>
      <div className="deck-actions"> {/* Contenedor para botones/enlaces */}
        <Link to={`/decks/${deck.id}`} className="button-link"> {/* Usar clase CSS */}
          Ver Mazo
        </Link>
        <Link to={`/decks/${deck.id}/edit`} className="button-link button-secondary-link" style={{ marginLeft: '10px' }}> {/* AĂąadir enlace de ediciĂłn */}
          Editar
        </Link>
      </div>
    </div>
  );
};

export default DeckItem;
