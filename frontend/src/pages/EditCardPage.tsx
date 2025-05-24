import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSync } from '../contexts/SyncContext';
import type { DeckSyncRead, ContentBlock } from '../services/api';
import CardEditor from '../components/CardEditor';
import { getClozeText, isClozeCard } from '../utils/clozeHelpers';

// Interface personalizada para actualización que coincide con lo que el contexto espera
interface CardUpdateData {
  deck_id?: number;
  front_content?: ContentBlock[] | null;
  back_content?: ContentBlock[] | null;
  raw_cloze_text?: string | null;
  tags?: string[];
}

const EditCardPage: React.FC = () => {
  const { cardId: cardIdParam } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { decks, cards, updateCard } = useSync();

  const [currentCard, setCurrentCard] = useState<any>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [frontContent, setFrontContent] = useState<string>('');
  const [backContent, setBackContent] = useState<string>('');
  const [frontAudio, setFrontAudio] = useState<string>('');
  const [backAudio, setBackAudio] = useState<string>('');
  const [rawClozeText, setRawClozeText] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [cardType, setCardType] = useState<'basic' | 'cloze'>('basic');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (cardIdParam && cards.length > 0) {
      const cardToEdit = cards.find(c => 
        c.id.toString() === cardIdParam || 
        (c as any)._tempId === cardIdParam
      );
      
      if (cardToEdit) {
        setCurrentCard(cardToEdit);
        setSelectedDeckId(cardToEdit.deck_id.toString());
        setTags(cardToEdit.tags ? cardToEdit.tags.join(', ') : '');

        // Determinar el tipo de tarjeta y cargar contenido
        const clozeText = getClozeText(cardToEdit);
        if (clozeText) {
          setCardType('cloze');
          setRawClozeText(clozeText);
          setFrontContent('');
          setBackContent('');
        } else if (cardToEdit.front_content || cardToEdit.back_content) {
          setCardType('basic');
          
          // Extraer contenido HTML de ContentBlock[]
          const extractHtml = (content: ContentBlock[] | string | null | undefined) => {
            if (!content) return '';
            if (typeof content === 'string') return content;
            if (Array.isArray(content)) {
              return content.map(block => block.content || '').join('');
            }
            return '';
          };
          
          setFrontContent(extractHtml(cardToEdit.front_content));
          setBackContent(extractHtml(cardToEdit.back_content));
          setRawClozeText('');
        }

        // TODO: Cargar audio si está disponible
        setFrontAudio('');
        setBackAudio('');
        
        setInitialLoadError(null);
      } else {
        setInitialLoadError(`Tarjeta con ID ${cardIdParam} no encontrada.`);
        setCurrentCard(null);
      }
    } else if (cards.length === 0 && cardIdParam) {
      setInitialLoadError("Cargando tarjetas... Si el error persiste, sincroniza.");
    }
  }, [cardIdParam, cards]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!currentCard) {
      setError("No hay una tarjeta cargada para editar.");
      return;
    }

    if (!selectedDeckId) {
      setError('Debes seleccionar un mazo.');
      return;
    }

    if (cardType === 'cloze') {
      if (!rawClozeText.trim()) {
        setError('Debes escribir el texto Cloze.');
        return;
      }
    } else {
      if (!frontContent.trim() || !backContent.trim()) {
        setError('Debes completar tanto el anverso como el reverso para una tarjeta básica.');
        return;
      }
    }

    setIsLoading(true);

    const processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    
    const payload: any = {
      tags: processedTags.length > 0 ? processedTags : undefined,
    };

    if (cardType === 'cloze') {
      payload.raw_cloze_text = rawClozeText.trim();
      // Limpiar contenido básico
      payload.front_content = undefined;
      payload.back_content = undefined;
    } else {
      payload.front_content = [{ type: 'html', content: frontContent.trim() }];
      payload.back_content = [{ type: 'html', content: backContent.trim() }];
      // Limpiar contenido cloze
      payload.raw_cloze_text = undefined;
    }

    try {
      if (!updateCard) {
        throw new Error("La función updateCard no está disponible en SyncContext.");
      }

      const idToUpdate = currentCard.id !== 0 ? currentCard.id : (currentCard as any)._tempId;
      if (!idToUpdate) {
        throw new Error("No se pudo determinar el ID de la tarjeta para actualizar.");
      }

      await updateCard(idToUpdate, payload);
      
      alert('Tarjeta actualizada localmente. Sincroniza para guardar los cambios en el servidor.');
      navigate(`/decks/${selectedDeckId}`);
    } catch (err) {
      console.error("Error al actualizar la tarjeta:", err);
      setError(err instanceof Error ? err.message : "Ocurrió un error desconocido al actualizar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFrontAudioChange = (audioBlob: Blob, audioUrl: string) => {
    setFrontAudio(audioUrl);
    // TODO: Aquí podríamos subir el audio al servidor cuando se implemente
  };

  const handleBackAudioChange = (audioBlob: Blob, audioUrl: string) => {
    setBackAudio(audioUrl);
    // TODO: Aquí podríamos subir el audio al servidor cuando se implemente
  };

  if (initialLoadError) {
    return (
      <div className="page-container" style={{ 
        maxWidth: '600px', 
        margin: 'auto', 
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <p style={{ color: '#dc2626', margin: 0 }}>❌ {initialLoadError}</p>
        </div>
        <button 
          onClick={() => navigate('/decks')} 
          style={{
            padding: '10px 20px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Volver a Mazos
        </button>
      </div>
    );
  }
  
  if (!currentCard && !initialLoadError) {
    return (
      <div className="page-container" style={{ 
        maxWidth: '600px', 
        margin: 'auto', 
        padding: '20px',
        textAlign: 'center'
      }}>
        <p>Cargando datos de la tarjeta...</p>
      </div>
    );
  }
  
  if (!currentCard) return null;

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: 'auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '24px', color: '#1f2937' }}>
        Editar Tarjeta
        {currentCard && (
          <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '400', marginLeft: '8px' }}>
            (ID: {currentCard.id !== 0 ? currentCard.id : (currentCard as any)._tempId})
          </span>
        )}
      </h2>
      
      <form onSubmit={handleSubmit} className="form-layout" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Selección de mazo y tipo de tarjeta */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px'
        }}>
          <div className="form-field" style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="deck-select" style={{ marginBottom: '8px', fontWeight: '600', color: '#1f2937' }}>
              📚 Mazo:
            </label>
            <select
              id="deck-select"
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              required
              style={{ 
                padding: '12px', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="" disabled>Selecciona un mazo</option>
              {decks.map((deck: DeckSyncRead) => (
                <option key={deck.id} value={deck.id.toString()}>
                  {deck.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field" style={{ display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="card-type" style={{ marginBottom: '8px', fontWeight: '600', color: '#1f2937' }}>
              🃏 Tipo de Tarjeta:
            </label>
            <select
              id="card-type"
              value={cardType}
              onChange={(e) => setCardType(e.target.value as 'basic' | 'cloze')}
              style={{ 
                padding: '12px', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="basic">Básica (Anverso/Reverso)</option>
              <option value="cloze">Cloze (Completar huecos)</option>
            </select>
          </div>
        </div>

        {/* Editor de contenido */}
        {cardType === 'basic' ? (
          <div>
            <h3 style={{ marginBottom: '16px', color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
              ✏️ Contenido de la Tarjeta
            </h3>
            <CardEditor
              frontContent={frontContent}
              backContent={backContent}
              frontAudio={frontAudio}
              backAudio={backAudio}
              onFrontChange={setFrontContent}
              onBackChange={setBackContent}
              onFrontAudioChange={handleFrontAudioChange}
              onBackAudioChange={handleBackAudioChange}
              showPreview={true}
            />
          </div>
        ) : (
          <div>
            <h3 style={{ marginBottom: '16px', color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
              🧩 Texto Cloze
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                marginBottom: '8px',
                backgroundColor: '#f3f4f6',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                💡 <strong>¿Cómo funciona Cloze?</strong><br />
                Escribe tu texto y usa <code>{'{{c1::palabra}}'}</code> para crear huecos. 
                Ejemplo: "La capital de España es {'{{c1::Madrid}}'}."
              </p>
            </div>
            <textarea
              value={rawClozeText}
              onChange={(e) => setRawClozeText(e.target.value)}
              placeholder="Ej: El proceso de fotosíntesis ocurre en los {{c1::cloroplastos}} de las células vegetales."
              rows={6}
              style={{ 
                width: '100%',
                padding: '16px', 
                borderRadius: '6px', 
                border: '1px solid #d1d5db', 
                resize: 'vertical',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
          />
        </div>
        )}

        {/* Etiquetas */}
        <div className="form-field" style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="card-tags" style={{ marginBottom: '8px', fontWeight: '600', color: '#1f2937' }}>
            🏷️ Etiquetas (opcional):
          </label>
          <input
            id="card-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            style={{ 
              padding: '12px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db',
              fontSize: '14px'
            }}
            placeholder="medicina, anatomía, importante (separadas por coma)"
          />
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Las etiquetas te ayudan a organizar y filtrar tus tarjetas
          </p>
        </div>
        
        {error && (
          <div style={{ 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '12px'
          }}>
            <p style={{ color: '#dc2626', margin: 0, fontSize: '14px' }}>
              ❌ {error}
            </p>
          </div>
        )}
        
        {/* Botones de acción */}
        <div className="form-actions" style={{ 
          display: 'flex', 
          gap: '12px', 
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button 
            type="submit" 
            disabled={isLoading} 
            style={{ 
              flex: 1,
              padding: '14px 20px', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: isLoading ? '#9ca3af' : '#3b82f6', 
              color: 'white', 
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
        </button>
          <button 
            type="button" 
            onClick={() => navigate(selectedDeckId ? `/decks/${selectedDeckId}` : '/decks')} 
            disabled={isLoading} 
            style={{ 
              padding: '14px 20px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db', 
              backgroundColor: 'white', 
              color: '#374151',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
          Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCardPage;
