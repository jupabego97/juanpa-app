import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSync } from '../contexts/SyncContext';
import OCRCapture from '../components/OCRCapture';
import OCRTextEditor from '../components/OCRTextEditor';
import OCRGuide from '../components/OCRGuide';
import type { DeckSyncRead, CardCreatePayload } from '../services/api';

interface CaptureStep {
  step: 'capture' | 'review' | 'create';
  extractedText?: string;
  confidence?: number;
  imageUrl?: string;
}

const QuickCapturePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { decks, addCard } = useSync();
  
  const [currentStep, setCurrentStep] = useState<CaptureStep>({ step: 'capture' });
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Pre-seleccionar mazo desde parámetros URL si existe
  useEffect(() => {
    const deckId = searchParams.get('deckId');
    if (deckId && decks.find(d => d.id.toString() === deckId)) {
      setSelectedDeckId(deckId);
    } else if (decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(decks[0].id.toString());
    }
  }, [decks, searchParams, selectedDeckId]);

  const handleTextExtracted = (text: string, confidence: number) => {
    if (text.trim()) {
      setCurrentStep({
        step: 'review',
        extractedText: text,
        confidence
      });
    }
  };

  const handleImageCaptured = (imageUrl: string) => {
    setCurrentStep(prev => ({ ...prev, imageUrl }));
  };

  const handleTextPrepared = async (frontText: string, backText: string) => {
    if (!selectedDeckId) {
      alert('Selecciona un mazo antes de crear la tarjeta.');
      return;
    }

    setCurrentStep(prev => ({ ...prev, step: 'create' }));
    setIsCreating(true);

    try {
      const payload: CardCreatePayload = {
        deck_id: parseInt(selectedDeckId, 10),
        front_content: [{ type: 'html', content: frontText }],
        back_content: [{ type: 'html', content: backText }],
        tags: ['ocr', 'captura-rapida'] // Etiquetas automáticas para capturas OCR
      };

      if (!addCard) {
        throw new Error("La función addCard no está disponible.");
      }

      await addCard(payload);
      
      // Mostrar mensaje de éxito y opciones
      alert('¡Tarjeta creada exitosamente desde captura OCR! Sincroniza para guardarla en el servidor.');
      
      // Opciones para continuar
      const continueCapturing = confirm('¿Quieres capturar otra imagen para crear más tarjetas?');
      
      if (continueCapturing) {
        setCurrentStep({ step: 'capture' });
      } else {
        navigate(`/decks/${selectedDeckId}`);
      }
      
    } catch (error) {
      console.error('Error creando tarjeta:', error);
      alert('Error al crear la tarjeta. Inténtalo de nuevo.');
      setCurrentStep(prev => ({ ...prev, step: 'review' }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelReview = () => {
    setCurrentStep({ step: 'capture' });
  };

  const handleStartOver = () => {
    setCurrentStep({ step: 'capture' });
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: 'auto', padding: '20px' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
          📸 Captura Rápida con OCR
        </h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
          Toma fotos de libros, apuntes o documentos para crear tarjetas automáticamente
        </p>
      </div>

      {/* Progreso visual */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '32px',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderRadius: '20px',
          backgroundColor: currentStep.step === 'capture' ? '#3b82f6' : '#e5e7eb',
          color: currentStep.step === 'capture' ? 'white' : '#6b7280',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span>1. 📷 Capturar</span>
        </div>
        
        <div style={{ width: '20px', height: '2px', backgroundColor: '#e5e7eb' }} />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderRadius: '20px',
          backgroundColor: currentStep.step === 'review' ? '#3b82f6' : '#e5e7eb',
          color: currentStep.step === 'review' ? 'white' : '#6b7280',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span>2. ✏️ Revisar</span>
        </div>
        
        <div style={{ width: '20px', height: '2px', backgroundColor: '#e5e7eb' }} />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 16px',
          borderRadius: '20px',
          backgroundColor: currentStep.step === 'create' ? '#3b82f6' : '#e5e7eb',
          color: currentStep.step === 'create' ? 'white' : '#6b7280',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <span>3. ✅ Crear</span>
        </div>
      </div>

      {/* Selección de mazo */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="deck-select" style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600', 
          color: '#1f2937' 
        }}>
          📚 Mazo de destino:
        </label>
        <select
          id="deck-select"
          value={selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value)}
          disabled={isCreating}
          style={{ 
            width: '100%',
            maxWidth: '400px',
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

      {/* Contenido dinámico según el paso */}
      {currentStep.step === 'capture' && (
        <div>
          <h3 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '18px' }}>
            📷 Paso 1: Capturar Imagen
          </h3>
          <OCRCapture
            onTextExtracted={handleTextExtracted}
            onImageCaptured={handleImageCaptured}
            language="spa+eng"
          />
          <OCRGuide compact={true} />
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: '14px' }}>
              💡 Consejos para mejores resultados:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#374151' }}>
              <li>Asegúrate de que el texto esté bien iluminado</li>
              <li>Mantén la imagen lo más recta posible</li>
              <li>Evita sombras sobre el texto</li>
              <li>El texto debe ser claro y legible</li>
            </ul>
          </div>
        </div>
      )}

      {currentStep.step === 'review' && currentStep.extractedText && (
        <div>
          <h3 style={{ margin: '0 0 16px 0', color: '#1f2937', fontSize: '18px' }}>
            ✏️ Paso 2: Revisar y Editar Texto
          </h3>
          <OCRTextEditor
            extractedText={currentStep.extractedText}
            confidence={currentStep.confidence || 0}
            onTextPrepared={handleTextPrepared}
            onCancel={handleCancelReview}
          />
        </div>
      )}

      {currentStep.step === 'create' && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ marginBottom: '20px', fontSize: '48px' }}>
            {isCreating ? '⏳' : '✅'}
          </div>
          <h3 style={{ margin: '0 0 12px 0', color: '#1f2937' }}>
            {isCreating ? 'Creando Tarjeta...' : '¡Tarjeta Creada!'}
          </h3>
          <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>
            {isCreating 
              ? 'Procesando el texto extraído y creando la tarjeta.'
              : 'La tarjeta se ha creado exitosamente desde la captura OCR.'
            }
          </p>
          {!isCreating && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleStartOver}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📷 Capturar Otra
              </button>
              <button
                onClick={() => navigate(`/decks/${selectedDeckId}`)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Ver Mazo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Botón de navegación inferior */}
      {currentStep.step === 'capture' && (
        <div style={{
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <button
            onClick={() => navigate('/cards/create')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              marginRight: '12px'
            }}
          >
            ✏️ Crear Tarjeta Manual
          </button>
          <button
            onClick={() => navigate('/decks')}
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📚 Ver Mazos
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickCapturePage; 