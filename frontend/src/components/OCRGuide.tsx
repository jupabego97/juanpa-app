import React, { useState } from 'react';

interface OCRGuideProps {
  className?: string;
  compact?: boolean;
}

const OCRGuide: React.FC<OCRGuideProps> = ({ className = "", compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (compact) {
    return (
      <div className={`ocr-guide-compact ${className}`} style={{
        margin: '16px 0',
        padding: '12px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '6px'
      }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#1e40af',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            justifyContent: 'space-between'
          }}
        >
          💡 ¿Cómo usar la Captura OCR eficientemente?
          <span>{isExpanded ? '▲' : '▼'}</span>
        </button>
        
        {isExpanded && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#374151' }}>
            <div style={{ marginBottom: '12px' }}>
              <strong>🎯 Tipos de contenido ideales:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                <li>Definiciones de libros de texto</li>
                <li>Fórmulas con explicaciones</li>
                <li>Preguntas de examen con respuestas</li>
                <li>Conceptos de artículos científicos</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <strong>📷 Para mejores resultados:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                <li>Texto nítido y bien iluminado</li>
                <li>Evita sombras y reflejos</li>
                <li>Mantén la imagen recta</li>
                <li>Contraste alto (texto negro sobre fondo blanco)</li>
              </ul>
            </div>
            
            <div>
              <strong>✂️ División inteligente:</strong>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>
                El sistema detecta automáticamente preguntas/respuestas, términos/definiciones, 
                y conceptos, pero siempre puedes editar manualmente la división.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`ocr-guide ${className}`} style={{
      padding: '20px',
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      marginBottom: '24px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '18px' }}>
        📚 Guía de Captura OCR
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px' 
      }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '14px' }}>
            🎯 Contenido Ideal para OCR
          </h4>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px', color: '#64748b' }}>
            <li>Definiciones de libros de texto</li>
            <li>Fórmulas matemáticas con explicaciones</li>
            <li>Preguntas de examen con respuestas</li>
            <li>Conceptos de artículos científicos</li>
            <li>Vocabulario en idiomas extranjeros</li>
            <li>Diagramas con etiquetas</li>
          </ul>
        </div>
        
        <div>
          <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '14px' }}>
            📷 Consejos de Fotografía
          </h4>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px', color: '#64748b' }}>
            <li>Iluminación uniforme y brillante</li>
            <li>Texto nítido y enfocado</li>
            <li>Evitar sombras y reflejos</li>
            <li>Mantener la cámara perpendicular</li>
            <li>Alto contraste (preferible texto negro/fondo blanco)</li>
            <li>Imagen estable (sin movimiento)</li>
          </ul>
        </div>
        
        <div>
          <h4 style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '14px' }}>
            🤖 División Inteligente
          </h4>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              El sistema detecta automáticamente:
            </p>
            <ul style={{ margin: 0, paddingLeft: '16px' }}>
              <li><strong>Pregunta/Respuesta:</strong> texto con "?"</li>
              <li><strong>Término/Definición:</strong> formato "concepto:"</li>
              <li><strong>Concepto/Explicación:</strong> por puntos/párrafos</li>
            </ul>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', fontStyle: 'italic' }}>
              Siempre puedes editar manualmente la división antes de crear la tarjeta.
            </p>
          </div>
        </div>
      </div>
      
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#ecfdf5',
        border: '1px solid #bbf7d0',
        borderRadius: '6px'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#166534' }}>
          <strong>💡 Tip:</strong> Para textos largos, divide el contenido en secciones más pequeñas 
          antes de fotografiar. Esto mejora la precisión del OCR y facilita la creación de tarjetas específicas.
        </p>
      </div>
    </div>
  );
};

export default OCRGuide; 