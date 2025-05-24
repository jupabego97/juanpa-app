import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import type { Deck, Card as CardType, CardReviewPayload, ContentBlock } from '../services/api'; 
import CardContentViewer from '../components/CardContentViewer';
import { getClozeText, isClozeCard, processClozeForDisplay } from '../utils/clozeHelpers';

const ReviewPage: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null); // string para el valor del select, o null para "Todos"
  const [currentCard, setCurrentCard] = useState<CardType | null>(null);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Carga inicial de mazos y primera tarjeta
  const [isLoadingCard, setIsLoadingCard] = useState<boolean>(false); // Carga específica para siguientes tarjetas
  const [error, setError] = useState<string | null>(null);
  const [isSessionFinished, setIsSessionFinished] = useState<boolean>(false);
  const [reviewStarted, setReviewStarted] = useState<boolean>(false); // Para controlar si se ha iniciado la sesión de repaso

  // Cargar lista de mazos al montar
  useEffect(() => {
    const loadDecks = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<Deck[]>('/decks/');
        setDecks(response.data);
      } catch (err) {
        console.error("Error fetching decks for review selection:", err);
        setError("No se pudieron cargar los mazos para la selección.");
      } finally {
        setIsLoading(false); // Termina la carga inicial de mazos
      }
    };
    loadDecks();
  }, []);

  const fetchNextCard = useCallback(async (deckIdToReview: string | null) => {
    setIsLoadingCard(true); // Usar isLoadingCard para las siguientes tarjetas
    setError(null);
    setShowAnswer(false);
    try {
      const params: { deck_id?: number } = {};
      if (deckIdToReview && deckIdToReview !== "all") {
        params.deck_id = parseInt(deckIdToReview, 10);
      }
      const response = await apiClient.get<CardType | null>('/review/next-card', { params });
      
      if (response.data) {
        const cardFromApi: CardType = response.data;

        let finalFrontContent: string | ContentBlock[] | null | undefined;
        let finalBackContent: string | ContentBlock[] | null | undefined;

        // MANEJO ESPECIAL PARA TARJETAS CLOZE
        if (isClozeCard(cardFromApi)) {
          const clozeText = getClozeText(cardFromApi);
          if (clozeText) {
            // Para tarjetas cloze, crear contenido dinámico
            const frontText = processClozeForDisplay(clozeText, 'question'); // Mostrar con [...]
            const backText = processClozeForDisplay(clozeText, 'answer');   // Mostrar respuestas
            
            finalFrontContent = [{ type: 'html', content: frontText }] as ContentBlock[];
            finalBackContent = [{ type: 'html', content: backText }] as ContentBlock[];
          } else {
            // Fallback si no se puede extraer texto cloze
            finalFrontContent = [{ type: 'text', content: 'Error: No se pudo cargar el contenido cloze' }] as ContentBlock[];
            finalBackContent = [{ type: 'text', content: 'Error: No se pudo cargar el contenido cloze' }] as ContentBlock[];
          }
        } else {
          // PROCESAMIENTO NORMAL PARA TARJETAS ESTÁNDAR
          // Process front_content
          if (typeof cardFromApi.front_content === 'string') {
            if (cardFromApi.front_content.trim().startsWith('[')) {
              try {
                finalFrontContent = JSON.parse(cardFromApi.front_content) as ContentBlock[];
              } catch (e) {
                console.error("Failed to parse front_content JSON array:", e, "Raw content:", cardFromApi.front_content);
                finalFrontContent = [{ type: 'text', content: `Error parsing content: ${cardFromApi.front_content}` }] as ContentBlock[];
              }
            } else {
              try {
                const singleObject = JSON.parse(cardFromApi.front_content);
                if (typeof singleObject === 'object' && singleObject !== null && singleObject.hasOwnProperty('text') && !singleObject.hasOwnProperty('type')) {
                  finalFrontContent = [{ type: 'text', content: singleObject.text }] as ContentBlock[];
                } else {
                  finalFrontContent = [{ type: 'text', content: cardFromApi.front_content }] as ContentBlock[];
                }
              } catch(e) {
                finalFrontContent = [{ type: 'text', content: cardFromApi.front_content }] as ContentBlock[];
              }
            }
          } else {
            finalFrontContent = cardFromApi.front_content; // It's already ContentBlock[] or null/undefined
          }

          // Process back_content
          if (typeof cardFromApi.back_content === 'string') {
            if (cardFromApi.back_content.trim().startsWith('[')) {
              try {
                finalBackContent = JSON.parse(cardFromApi.back_content) as ContentBlock[];
              } catch (e) {
                console.error("Failed to parse back_content JSON array:", e, "Raw content:", cardFromApi.back_content);
                finalBackContent = [{ type: 'text', content: `Error parsing content: ${cardFromApi.back_content}` }] as ContentBlock[];
              }
            } else {
              try {
                const singleObject = JSON.parse(cardFromApi.back_content);
                if (typeof singleObject === 'object' && singleObject !== null && singleObject.hasOwnProperty('text') && !singleObject.hasOwnProperty('type')) {
                  finalBackContent = [{ type: 'text', content: singleObject.text }] as ContentBlock[];
                } else {
                  finalBackContent = [{ type: 'text', content: cardFromApi.back_content }] as ContentBlock[];
                }
              } catch(e) {
                finalBackContent = [{ type: 'text', content: cardFromApi.back_content }] as ContentBlock[];
              }
            }
          } else {
            finalBackContent = cardFromApi.back_content; // It's already ContentBlock[] or null/undefined
          }
        }

        setCurrentCard({
          ...cardFromApi,
          front_content: finalFrontContent, // Use the fully processed variable
          back_content: finalBackContent,  // Use the fully processed variable
        });
        setIsSessionFinished(false);
      } else {
        setCurrentCard(null);
        setIsSessionFinished(true);
      }
    } catch (err: any) {
      console.error("Error fetching next card:", err);
      setError(err.message || 'Error al cargar la siguiente tarjeta.');
      setCurrentCard(null);
      setIsSessionFinished(true); // Considerar la sesión terminada si hay error cargando
    } finally {
      setIsLoading(false); // Termina la carga inicial si es la primera tarjeta
      setIsLoadingCard(false); // Termina la carga de tarjeta específica
    }
  }, []); // No añadir selectedDeckId aquí para evitar llamadas múltiples al cambiar el select

  // No llamar a fetchNextCard automáticamente al montar, esperar a que el usuario seleccione un mazo e inicie.
  // useEffect(() => {
  //   if (reviewStarted) { // Solo buscar tarjeta si la sesión ha comenzado
  //     fetchNextCard(selectedDeckId);
  //   }
  // }, [fetchNextCard, selectedDeckId, reviewStarted]);

  const handleShowAnswer = useCallback(() => { // Envolver en useCallback si se usa en dependencias o por consistencia
    setShowAnswer(true);
  }, []); // No tiene dependencias externas directas más allá de setShowAnswer

  const handleRateCard = useCallback(async (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return;

    setIsLoading(true);
    setError(null);
    const payload: CardReviewPayload = { rating };

    try {
      await apiClient.post(`/cards/${currentCard.id}/review`, payload);
      fetchNextCard(selectedDeckId); // Pasar el deckId seleccionado
    } catch (err: any) {
      console.error("Error rating card:", err);
      setError(err.message || 'Error al calificar la tarjeta.');
      setIsLoadingCard(false); 
    }
  }, [currentCard, fetchNextCard, selectedDeckId]);

  // Efecto para manejar atajos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentCard || isLoading) return;

      if (event.code === 'Space') {
        event.preventDefault(); 
        if (!showAnswer) {
          handleShowAnswer();
        }
      } else if (showAnswer) { 
        if (event.key === '1') {
          handleRateCard(1);
        } else if (event.key === '2') {
          handleRateCard(2);
        } else if (event.key === '3') {
          handleRateCard(3);
        } else if (event.key === '4') {
          handleRateCard(4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAnswer, currentCard, isLoading, handleShowAnswer, handleRateCard]); // Añadir handleShowAnswer si se llama directamente

  const handleStartReview = () => {
    if (selectedDeckId === null && decks.length > 0) { // Si "Selecciona un mazo" está elegido pero hay mazos
      setError("Por favor, selecciona un mazo para repasar o 'Todos los Mazos'.");
      return;
    }
    setError(null);
    setReviewStarted(true);
    fetchNextCard(selectedDeckId);
  };

  if (!reviewStarted || isLoading) { // isLoading es para la carga inicial de mazos
    return (
      <div className="page-container review-setup-container">
        <h2>Iniciar Sesión de Repaso</h2>
        {isLoading && <p className="loading-message">Cargando lista de mazos...</p>}
        {error && <p className="error-message">{error}</p>}
        {!isLoading && decks.length > 0 && (
          <div className="deck-selection-container">
            <p className="deck-selection-label">Selecciona un Mazo para Repasar:</p>
            <div className="deck-buttons-grid">
              <button
                key="all-decks"
                onClick={() => setSelectedDeckId("all")} 
                className={`deck-select-button ${selectedDeckId === "all" ? 'active' : ''}`}
            >
                Todos los Mazos
              </button>
              {decks.map(deck => (
                <button 
                  key={deck.id} 
                  onClick={() => setSelectedDeckId(String(deck.id))} 
                  className={`deck-select-button ${selectedDeckId === String(deck.id) ? 'active' : ''}`}
                >
                  {deck.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isLoading && decks.length === 0 && (
          <p>No hay mazos disponibles. <Link to="/decks/new">Crea un mazo primero.</Link></p>
        )}

        {decks.length > 0 && (
          <button onClick={handleStartReview} className="button-start-review" disabled={isLoading || selectedDeckId === null}>
            Iniciar Repaso
          </button>
        )}
      </div>
    );
  }
  
  // A partir de aquí, la lógica de cuando la sesión de repaso ha comenzado
  if (isLoadingCard) { // Usar isLoadingCard para las siguientes tarjetas
    return <div className="page-container"><p>Cargando siguiente tarjeta...</p></div>;
  }

  if (error) { // Error durante el repaso (ej. al calificar o cargar siguiente tarjeta)
    return (
      <div className="page-container">
        <p className="error-message">Error: {error}</p>
        <button onClick={() => fetchNextCard(selectedDeckId)} disabled={isLoadingCard} className="button-link" style={{marginRight: '10px'}}>Reintentar</button>
        <Link to="/" className="button-link button-secondary-link">Salir del Repaso</Link>
      </div>
    );
  }

  if (isSessionFinished || !currentCard) {
    return (
      <div className="page-container">
        <h2>Sesión de Repaso Completada</h2>
        <p>¡Buen trabajo! No hay más tarjetas para repasar {selectedDeckId && selectedDeckId !== "all" ? `en este mazo` : ''} por ahora.</p>
        <button onClick={() => { setReviewStarted(false); setSelectedDeckId(null); }} className="button-link" style={{marginRight: '10px'}}>Repasar Otro Mazo</button>
        <Link to="/" className="button-link button-secondary-link">Volver a Inicio</Link>
      </div>
    );
  }

  return (
    <div className="page-container review-page-container">
      <h2>Repasar Tarjeta {selectedDeckId && selectedDeckId !== "all" && decks.find(d => d.id.toString() === selectedDeckId) ? `(Mazo: ${decks.find(d => d.id.toString() === selectedDeckId)?.name})` : '(Todos los Mazos)'}</h2>
      <div className="review-card">
        <div className="review-card-section">
          <h3>Anverso:</h3>
          {/* Usar CardContentViewer para mostrar el contenido */}
          <CardContentViewer content={currentCard.front_content} />
        </div>

        {showAnswer && (
          <div className="review-card-section review-card-answer">
            <h3>Reverso:</h3>
            <CardContentViewer content={currentCard.back_content} />
          </div>
        )}

        <div className="review-actions">
          {!showAnswer ? (
            <button onClick={handleShowAnswer} className="button-show-answer">
              Mostrar Respuesta
            </button>
          ) : (
            <div className="rating-buttons">
              <p>¿Qué tal te fue?</p>
              <button onClick={() => handleRateCard(1)} className="button-rating rating-again" disabled={isLoading}>Otra Vez (1)</button>
              <button onClick={() => handleRateCard(2)} className="button-rating rating-hard" disabled={isLoading}>Difícil (2)</button>
              <button onClick={() => handleRateCard(3)} className="button-rating rating-good" disabled={isLoading}>Bien (3)</button>
              <button onClick={() => handleRateCard(4)} className="button-rating rating-easy" disabled={isLoading}>Fácil (4)</button>
            </div>
          )}
        </div>
        {isLoading && <p className="loading-message">Procesando...</p>}
      </div>
      <div className="review-page-footer">
        <Link to="/" className="button-link button-secondary-link">Salir de la Sesión de Repaso</Link>
      </div>
    </div>
  );
};

export default ReviewPage;
