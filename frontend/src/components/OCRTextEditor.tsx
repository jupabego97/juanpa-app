import React, { useState, useEffect } from 'react';
import AdvancedEditor from './AdvancedEditor';

interface OCRTextEditorProps {
  extractedText: string;
  confidence: number;
  onTextPrepared: (frontText: string, backText: string) => void;
  onCancel: () => void;
  className?: string;
}

interface TextSplit {
  front: string;
  back: string;
  splitMethod: 'manual' | 'question' | 'definition' | 'custom';
}

const OCRTextEditor: React.FC<OCRTextEditorProps> = ({
  extractedText,
  confidence,
  onTextPrepared,
  onCancel,
  className = ""
}) => {
  const [originalText, setOriginalText] = useState(extractedText);
  const [textSplit, setTextSplit] = useState<TextSplit>({
    front: '',
    back: '',
    splitMethod: 'manual'
  });
  const [selectedSplit, setSelectedSplit] = useState(0);
  const [suggestedSplits, setSuggestedSplits] = useState<Array<{ front: string; back: string; type: string }>>([]);

  useEffect(() => {
    setOriginalText(extractedText);
    generateSuggestedSplits(extractedText);
  }, [extractedText]);

  // Generar sugerencias de división del texto
  const generateSuggestedSplits = (text: string) => {
    const suggestions: Array<{ front: string; back: string; type: string }> = [];
    
    // Método 1: Dividir por signos de pregunta
    const questionMatch = text.match(/^(.+\?)\s*(.+)$/);
    if (questionMatch) {
      suggestions.push({
        front: questionMatch[1].trim(),
        back: questionMatch[2].trim(),
        type: 'Pregunta/Respuesta'
      });
    }

    // Método 2: Dividir por puntos o saltos de línea (primer concepto/resto)
    const lines = text.split(/[.\n]/).filter(line => line.trim().length > 0);
    if (lines.length >= 2) {
      suggestions.push({
        front: lines[0].trim(),
        back: lines.slice(1).join('. ').trim(),
        type: 'Concepto/Definición'
      });
    }

    // Método 3: Dividir por dos puntos (término: definición)
    const colonMatch = text.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch) {
      suggestions.push({
        front: colonMatch[1].trim(),
        back: colonMatch[2].trim(),
        type: 'Término/Definición'
      });
    }

    // Método 4: Dividir por la mitad
    const halfLength = Math.floor(text.length / 2);
    const lastSpaceIndex = text.lastIndexOf(' ', halfLength);
    if (lastSpaceIndex > 0) {
      suggestions.push({
        front: text.substring(0, lastSpaceIndex).trim(),
        back: text.substring(lastSpaceIndex + 1).trim(),
        type: 'División por mitad'
      });
    }

    setSuggestedSplits(suggestions);
    
    // Seleccionar la primera sugerencia por defecto
    if (suggestions.length > 0) {
      setTextSplit({
        front: suggestions[0].front,
        back: suggestions[0].back,
        splitMethod: 'question'
      });
      setSelectedSplit(0);
    }
  };

  const handleSplitSelection = (index: number) => {
    setSelectedSplit(index);
    const suggestion = suggestedSplits[index];
    setTextSplit({
      front: suggestion.front,
      back: suggestion.back,
      splitMethod: 'question'
    });
  };

  const handleManualSplit = () => {
    setTextSplit({
      front: '',
      back: '',
      splitMethod: 'manual'
    });
    setSelectedSplit(-1);
  };

  const handleSubmit = () => {
    if (textSplit.front.trim() && textSplit.back.trim()) {
      onTextPrepared(textSplit.front.trim(), textSplit.back.trim());
    }
  };

  const isValid = textSplit.front.trim().length > 0 && textSplit.back.trim().length > 0;

  return (
    <div className={`ocr-text-editor ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encabezado con información de confianza */}
      <div style={{
        padding: '16px',
        backgroundColor: confidence > 80 ? '#f0fdf4' : confidence > 60 ? '#fffbeb' : '#fef2f2',
        border: `1px solid ${confidence > 80 ? '#bbf7d0' : confidence > 60 ? '#fed7aa' : '#fecaca'}`,
        borderRadius: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, color: '#1f2937', fontSize: '16px' }}>
            🔍 Revisar Texto Extraído
          </h3>
          <span style={{
            padding: '4px 8px',
            backgroundColor: confidence > 80 ? '#059669' : confidence > 60 ? '#f59e0b' : '#dc2626',
            color: 'white',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {confidence}% confianza
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
          Revisa el texto extraído y selecciona cómo dividirlo en anverso y reverso de la tarjeta.
        </p>
      </div>

      {/* Texto original extraído */}
      <div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
          📄 Texto Original Extraído:
        </h4>
        <div style={{
          padding: '12px',
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '14px',
          lineHeight: '1.5',
          maxHeight: '120px',
          overflowY: 'auto'
        }}>
          <textarea
            value={originalText}
            onChange={(e) => {
              setOriginalText(e.target.value);
              generateSuggestedSplits(e.target.value);
            }}
            style={{
              width: '100%',
              minHeight: '80px',
              border: 'none',
              background: 'transparent',
              resize: 'vertical',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
            placeholder="Puedes editar el texto extraído aquí..."
          />
        </div>
      </div>

      {/* Sugerencias de división */}
      {suggestedSplits.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
            🤖 Sugerencias de División:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {suggestedSplits.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSplitSelection(index)}
                style={{
                  padding: '12px',
                  border: '2px solid',
                  borderColor: selectedSplit === index ? '#3b82f6' : '#e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: selectedSplit === index ? '#f0f9ff' : 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>
                  {suggestion.type}
                </div>
                <div style={{ fontSize: '14px', color: '#1f2937' }}>
                  <strong>Anverso:</strong> {suggestion.front.substring(0, 60)}
                  {suggestion.front.length > 60 && '...'}
                </div>
                <div style={{ fontSize: '14px', color: '#1f2937', marginTop: '4px' }}>
                  <strong>Reverso:</strong> {suggestion.back.substring(0, 60)}
                  {suggestion.back.length > 60 && '...'}
                </div>
              </button>
            ))}
            
            <button
              onClick={handleManualSplit}
              style={{
                padding: '12px',
                border: '2px solid',
                borderColor: selectedSplit === -1 ? '#3b82f6' : '#e5e7eb',
                borderRadius: '6px',
                backgroundColor: selectedSplit === -1 ? '#f0f9ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>
                División Manual
              </div>
              <div style={{ fontSize: '14px', color: '#1f2937' }}>
                Dividir manualmente el contenido en anverso y reverso
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Editores para anverso y reverso */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
            📖 Anverso (Pregunta/Concepto):
          </h4>
          <AdvancedEditor
            content={textSplit.front}
            onChange={(content) => setTextSplit(prev => ({ ...prev, front: content }))}
            placeholder="Escribe la pregunta o concepto..."
            height="150px"
          />
        </div>

        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
            📝 Reverso (Respuesta/Definición):
          </h4>
          <AdvancedEditor
            content={textSplit.back}
            onChange={(content) => setTextSplit(prev => ({ ...prev, back: content }))}
            placeholder="Escribe la respuesta o definición..."
            height="150px"
          />
        </div>
      </div>

      {/* Vista previa de la tarjeta */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
          👁️ Vista Previa de la Tarjeta:
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            backgroundColor: '#f9fafb',
            minHeight: '100px'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
              ANVERSO
            </div>
            <div dangerouslySetInnerHTML={{ 
              __html: textSplit.front || '<p style="color: #9ca3af; font-style: italic;">Sin contenido</p>' 
            }} />
          </div>
          
          <div style={{
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            backgroundColor: '#f9fafb',
            minHeight: '100px'
          }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>
              REVERSO
            </div>
            <div dangerouslySetInnerHTML={{ 
              __html: textSplit.back || '<p style="color: #9ca3af; font-style: italic;">Sin contenido</p>' 
            }} />
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div style={{
        display: 'flex',
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          style={{
            flex: 1,
            padding: '12px 20px',
            backgroundColor: isValid ? '#059669' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isValid ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          ✅ Crear Tarjeta con Este Texto
        </button>
        
        <button
          onClick={onCancel}
          style={{
            padding: '12px 20px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default OCRTextEditor; 