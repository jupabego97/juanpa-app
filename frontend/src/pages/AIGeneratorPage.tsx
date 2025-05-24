import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSync } from '../contexts/SyncContext';
import { getGeminiStatus, generateCardsWithGemini } from '../services/api';
import type { GeminiStatusResponse, CardGenerationRequest, CardGenerationResult } from '../services/api';
import { getClozeText, processClozeForDisplay } from '../utils/clozeHelpers';

interface AIGenerationConfig {
  cardType: 'standard' | 'cloze' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  numCards: number;
  language: 'es' | 'en';
  context: string;
}

interface GeneratedCard {
  id: number;
  front_content: any;
  back_content: any;
  cloze_data?: any;
  type: 'standard' | 'cloze';
  tags: string[];
  deck_id: number;
}

const AIGeneratorPage: React.FC = () => {
  const navigate = useNavigate();
  const { decks, addDeck } = useSync();

  // Estado principal
  const [topic, setTopic] = useState<string>('');
  const [targetDeckId, setTargetDeckId] = useState<string>('');
  const [newDeckName, setNewDeckName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [geminiStatus, setGeminiStatus] = useState<GeminiStatusResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [config, setConfig] = useState<AIGenerationConfig>({
    cardType: 'mixed',
    difficulty: 'medium',
    numCards: 10,
    language: 'es',
    context: ''
  });

  // Verificar estado de Gemini al cargar
  useEffect(() => {
    checkGeminiStatus();
  }, []);

  const checkGeminiStatus = async () => {
    try {
      const status = await getGeminiStatus();
      setGeminiStatus(status);
      if (!status.available) {
        setError('Servicio de Gemini no disponible. Verifica la configuración de la API key.');
      }
    } catch (err: any) {
      setError('Error al verificar el estado de Gemini: ' + (err.message || 'Error desconocido'));
      setGeminiStatus({ available: false, api_key_configured: false });
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Por favor ingresa un tema de estudio');
      return;
    }

    if (!targetDeckId && !newDeckName.trim()) {
      setError('Selecciona un mazo existente o crea uno nuevo');
      return;
    }

    if (!geminiStatus?.available) {
      setError('El servicio de Gemini no está disponible');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);
    setGeneratedCards([]);

    try {
      // Simular progreso durante la generación
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);

      // Determinar deck_id y preparar solicitud para Gemini
      let deckId: number;
      let deckName: string | undefined;
      let deckDescription: string | undefined;
      
      if (newDeckName.trim()) {
        // Usar deck_id = -1 para crear nuevo mazo
        deckId = -1;
        deckName = newDeckName.trim();
        deckDescription = `Mazo generado con IA sobre: ${topic}`;
      } else {
        deckId = parseInt(targetDeckId);
      }

      // Crear solicitud para Gemini
      const request: CardGenerationRequest = {
        topic: topic.trim(),
        num_cards: config.numCards,
        difficulty: config.difficulty,
        card_type: config.cardType,
        language: config.language,
        context: config.context.trim() || undefined,
        deck_id: deckId,
        deck_name: deckName,
        deck_description: deckDescription
      };

      // Generar tarjetas con Gemini
      const result = await generateCardsWithGemini(request);

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (result.success && result.cards_created.length > 0) {
        const cards: GeneratedCard[] = result.cards_created.map(card => ({
          id: card.id,
          front_content: card.front_content,
          back_content: card.back_content,
          cloze_data: card.cloze_data,
          type: card.cloze_data ? 'cloze' : 'standard',
          tags: card.tags || [],
          deck_id: card.deck_id
        }));

        setGeneratedCards(cards);
        setSelectedCards(new Set(cards.map(c => c.id)));

        // Limpiar el nombre del nuevo mazo si se creó uno
        if (deckId === -1) {
          setNewDeckName('');
          // Actualizar targetDeckId con el ID del mazo creado
          setTargetDeckId(cards[0].deck_id.toString());
        }

        if (result.warnings && result.warnings.length > 0) {
          console.warn('Advertencias durante la generación:', result.warnings);
        }
      } else {
        throw new Error(result.errors?.join(', ') || 'No se pudieron generar tarjetas');
      }

    } catch (err: any) {
      console.error('Error generando tarjetas:', err);
      setError(err.message || 'Error al generar tarjetas con IA');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleSaveCards = async () => {
    const cardsToSave = generatedCards.filter(card => selectedCards.has(card.id));
    
    if (cardsToSave.length === 0) {
      setError('Selecciona al menos una tarjeta para guardar');
      return;
    }

    setIsSaving(true);
    try {
      // Las tarjetas ya están guardadas en el servidor desde la generación
      // Solo necesitamos navegar al mazo
      const deckId = cardsToSave[0].deck_id;
      navigate(`/decks/${deckId}`);
    } catch (err: any) {
      setError('Error al guardar las tarjetas: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCardSelection = (cardId: number) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  const selectAllCards = () => {
    setSelectedCards(new Set(generatedCards.map(c => c.id)));
  };

  const deselectAllCards = () => {
    setSelectedCards(new Set());
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatCardContent = (content: any): string => {
    if (!content) return '';
    
    if (Array.isArray(content)) {
      return content.map(block => {
        if (typeof block === 'object' && block.content) {
          return block.content;
        }
        return String(block);
      }).join(' ');
    }
    
    return String(content);
  };

  const formatClozeContent = (card: GeneratedCard): string => {
    const clozeText = getClozeText(card);
    if (!clozeText) return 'Sin contenido cloze';
    
    // Mostrar el texto con [...] para los huecos
    return processClozeForDisplay(clozeText, 'question');
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: 'auto', padding: '20px' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '800', color: '#1f2937' }}>
          🧠 Generador de Tarjetas con IA
        </h1>
        <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
          Genera tarjetas de estudio sobre cualquier tema usando Gemini 2.5-pro
        </p>
      </div>

      {/* Estado de Gemini */}
      <div style={{
        backgroundColor: geminiStatus?.available ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${geminiStatus?.available ? '#10b981' : '#ef4444'}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '24px' }}>
          {geminiStatus?.available ? '✅' : '❌'}
        </span>
        <div>
          <strong>
            {geminiStatus?.available ? 'Gemini disponible' : 'Gemini no disponible'}
          </strong>
          {geminiStatus?.model && (
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Modelo: {geminiStatus.model}
            </div>
          )}
          {geminiStatus?.last_error && (
            <div style={{ fontSize: '12px', color: '#dc2626' }}>
              Error: {geminiStatus.last_error}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: generatedCards.length > 0 ? '1fr 2fr' : '1fr', gap: '24px' }}>
        {/* Panel de configuración */}
        <div>
          {/* Tema de estudio */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              📚 Tema de Estudio
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                ¿Sobre qué tema quieres generar tarjetas?
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej: Fotosíntesis, Historia de Roma, Programación en Python..."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Contexto adicional (opcional):
              </label>
              <textarea
                value={config.context}
                onChange={(e) => setConfig(prev => ({ ...prev, context: e.target.value }))}
                placeholder="Ej: Enfócate en nivel universitario, incluye ejemplos prácticos..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Configuración de generación */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              ⚙️ Configuración
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Número de tarjetas: {config.numCards}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={config.numCards}
                onChange={(e) => setConfig(prev => ({ ...prev, numCards: parseInt(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Tipo de tarjetas:
              </label>
              <select
                value={config.cardType}
                onChange={(e) => setConfig(prev => ({ ...prev, cardType: e.target.value as any }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="standard">Estándar (Pregunta/Respuesta)</option>
                <option value="cloze">Cloze (Texto con huecos)</option>
                <option value="mixed">Mixto (Ambos tipos)</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Nivel de dificultad:
              </label>
              <select
                value={config.difficulty}
                onChange={(e) => setConfig(prev => ({ ...prev, difficulty: e.target.value as any }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="easy">Fácil (Conceptos básicos)</option>
                <option value="medium">Medio (Aplicaciones prácticas)</option>
                <option value="hard">Difícil (Análisis avanzado)</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Idioma:
              </label>
              <select
                value={config.language}
                onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value as any }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Destino */}
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              📚 Mazo destino
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Seleccionar mazo existente:
              </label>
              <select
                value={targetDeckId}
                onChange={(e) => {
                  setTargetDeckId(e.target.value);
                  if (e.target.value) setNewDeckName('');
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">-- Seleccionar mazo --</option>
                {decks.filter(d => !d.is_deleted).map(deck => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ textAlign: 'center', margin: '16px 0', color: '#6b7280' }}>
              o
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Crear nuevo mazo:
              </label>
              <input
                type="text"
                value={newDeckName}
                onChange={(e) => {
                  setNewDeckName(e.target.value);
                  if (e.target.value) setTargetDeckId('');
                }}
                placeholder="Nombre del nuevo mazo"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Botón de generar */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !geminiStatus?.available || !topic.trim()}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: (isGenerating || !geminiStatus?.available || !topic.trim()) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (isGenerating || !geminiStatus?.available || !topic.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isGenerating ? (
              <>
                <span>⏳</span>
                Generando... {generationProgress.toFixed(0)}%
              </>
            ) : (
              <>
                <span>🧠</span>
                Generar Tarjetas con IA
              </>
            )}
          </button>

          {/* Barra de progreso */}
          {isGenerating && (
            <div style={{
              marginTop: '8px',
              width: '100%',
              height: '6px',
              backgroundColor: '#e5e7eb',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${generationProgress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Panel de resultados */}
        {generatedCards.length > 0 && (
          <div>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                  ✨ Tarjetas generadas ({generatedCards.length})
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={selectAllCards}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: 'white',
                      color: '#3b82f6',
                      border: '1px solid #3b82f6',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Seleccionar todas
                  </button>
                  <button
                    onClick={deselectAllCards}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: 'white',
                      color: '#6b7280',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Deseleccionar todas
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: '600px', overflowY: 'auto', marginBottom: '20px' }}>
                {generatedCards.map(card => (
                  <div
                    key={card.id}
                    style={{
                      border: `2px solid ${selectedCards.has(card.id) ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '12px',
                      backgroundColor: selectedCards.has(card.id) ? '#f0f9ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => toggleCardSelection(card.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: card.type === 'cloze' ? '#e0f2fe' : '#f3f4f6',
                          color: card.type === 'cloze' ? '#0891b2' : '#6b7280',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {card.type === 'cloze' ? '🔍 Cloze' : '📝 Estándar'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        ID: {card.id}
                      </div>
                    </div>

                    {/* Contenido específico por tipo de tarjeta */}
                    {card.type === 'cloze' ? (
                      // Tarjeta Cloze
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ fontSize: '14px', color: '#1f2937' }}>Texto Cloze:</strong>
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#374151', 
                          marginTop: '4px',
                          lineHeight: '1.5',
                          backgroundColor: '#f8fafc',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px dashed #cbd5e1'
                        }}>
                          {formatClozeContent(card)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          💡 Los espacios {`{{c1::...}}`} se rellenarán durante el estudio
                        </div>
                      </div>
                    ) : (
                      // Tarjeta Estándar
                      <>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ fontSize: '14px', color: '#1f2937' }}>Anverso:</strong>
                          <div style={{ 
                            fontSize: '14px', 
                            color: '#374151', 
                            marginTop: '4px',
                            lineHeight: '1.5'
                          }}>
                            {formatCardContent(card.front_content)}
                          </div>
                        </div>

                        {card.back_content && (
                          <div style={{ marginBottom: '8px' }}>
                            <strong style={{ fontSize: '14px', color: '#1f2937' }}>Reverso:</strong>
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#374151', 
                              marginTop: '4px',
                              lineHeight: '1.5'
                            }}>
                              {formatCardContent(card.back_content)}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {card.tags && card.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                        {card.tags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: '2px 6px',
                              backgroundColor: '#e5e7eb',
                              color: '#374151',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {selectedCards.size} de {generatedCards.length} tarjetas seleccionadas
                  </div>
                  <button
                    onClick={handleSaveCards}
                    disabled={selectedCards.size === 0 || isSaving}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: (selectedCards.size > 0 && !isSaving) ? '#10b981' : '#d1d5db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (selectedCards.size > 0 && !isSaving) ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSaving ? '⏳' : '✅'} Ver Tarjetas en el Mazo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div style={{
        marginTop: '32px',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1e40af'
      }}>
        <strong>🧠 ¿Cómo funciona?</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Describe el tema sobre el que quieres estudiar</li>
          <li>Configura el tipo de tarjetas, dificultad y cantidad</li>
          <li>Gemini 2.5-pro analiza tu solicitud y genera tarjetas inteligentes</li>
          <li>Revisa y selecciona las tarjetas que quieras usar</li>
          <li>Las tarjetas se guardan automáticamente y están listas para estudiar</li>
        </ul>
      </div>
    </div>
  );
};

export default AIGeneratorPage; 