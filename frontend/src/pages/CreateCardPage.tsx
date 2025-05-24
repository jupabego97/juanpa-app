import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSync } from '../contexts/SyncContext';
import type { DeckSyncRead, CardCreatePayload } from '../services/api'; // Importar el tipo correcto
import CardEditor from '../components/CardEditor';

const CreateCardPage: React.FC = () => {
  const { decks, addCard } = useSync(); // Corregido: usar addCard en vez de addCardLocal
  const navigate = useNavigate();
  
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [frontContent, setFrontContent] = useState<string>('');
  const [backContent, setBackContent] = useState<string>('');
  const [frontAudio, setFrontAudio] = useState<string>('');
  const [backAudio, setBackAudio] = useState<string>('');
  const [rawClozeText, setRawClozeText] = useState<string>('');
  const [tags, setTags] = useState<string>(''); // Input como string, se procesará a array
  const [cardType, setCardType] = useState<'basic' | 'cloze'>('basic');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-seleccionar el primer mazo si existe
  useEffect(() => {
    if (decks && decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(decks[0].id.toString());
    }
  }, [decks, selectedDeckId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

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

    const payload: CardCreatePayload = {
      deck_id: parseInt(selectedDeckId, 10),
      tags: processedTags.length > 0 ? processedTags : undefined,
    };

    if (cardType === 'cloze') {
      payload.raw_cloze_text = rawClozeText.trim();
    } else {
      payload.front_content = [{ type: 'html', content: frontContent.trim() }];
      payload.back_content = [{ type: 'html', content: backContent.trim() }];
    }

    try {
      if (!addCard) {
        throw new Error("La función addCard no está disponible en SyncContext.");
      }
      await addCard(payload);
      
      alert('Tarjeta creada localmente. Sincroniza para guardarla en el servidor.');
      // Podríamos navegar a la lista de tarjetas del mazo o a la página del mazo
      navigate(`/decks/${selectedDeckId}`); 
    } catch (err) {
      console.error("Error al crear la tarjeta:", err);
      setError(err instanceof Error ? err.message : "Ocurrió un error desconocido al crear la tarjeta.");
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

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: 'auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '24px', color: '#1f2937' }}>Crear Nueva Tarjeta</h2>
      
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
              backgroundColor: isLoading ? '#9ca3af' : '#059669', 
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
            {isLoading ? '⏳ Creando...' : '✅ Crear Tarjeta'}
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

export default CreateCardPage;
