import React, { useState, useEffect } from 'react';
import AdvancedEditor from './AdvancedEditor';
import AudioRecorder from './AudioRecorder';

interface CardEditorProps {
  frontContent: string;
  backContent: string;
  frontAudio?: string;
  backAudio?: string;
  onFrontChange: (content: string) => void;
  onBackChange: (content: string) => void;
  onFrontAudioChange?: (audioBlob: Blob, audioUrl: string) => void;
  onBackAudioChange?: (audioBlob: Blob, audioUrl: string) => void;
  showPreview?: boolean;
  className?: string;
}

const CardEditor: React.FC<CardEditorProps> = ({
  frontContent,
  backContent,
  frontAudio,
  backAudio,
  onFrontChange,
  onBackChange,
  onFrontAudioChange,
  onBackAudioChange,
  showPreview = true,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [editingFront, setEditingFront] = useState(true);

  const renderPreview = (content: string, audioUrl?: string) => (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      padding: '16px',
      backgroundColor: 'white',
      minHeight: '120px'
    }}>
      <div dangerouslySetInnerHTML={{ __html: content || '<p style="color: #9ca3af;">Sin contenido</p>' }} />
      {audioUrl && (
        <div style={{ marginTop: '12px' }}>
          <audio controls style={{ width: '100%' }}>
            <source src={audioUrl} type="audio/wav" />
            Tu navegador no soporta audio.
          </audio>
        </div>
      )}
    </div>
  );

  return (
    <div className={`card-editor ${className}`}>
      {/* Pestañas de navegación */}
      {showPreview && (
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '16px'
        }}>
          <button
            onClick={() => setActiveTab('edit')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'edit' ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'edit' ? '600' : '400',
              color: activeTab === 'edit' ? '#3b82f6' : '#6b7280'
            }}
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'preview' ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'preview' ? '600' : '400',
              color: activeTab === 'preview' ? '#3b82f6' : '#6b7280'
            }}
          >
            👁️ Vista Previa
          </button>
        </div>
      )}

      {activeTab === 'edit' ? (
        // Modo de edición
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selector de cara */}
          <div style={{
            display: 'flex',
            gap: '8px',
            backgroundColor: '#f3f4f6',
            padding: '4px',
            borderRadius: '6px'
          }}>
            <button
              onClick={() => setEditingFront(true)}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: editingFront ? 'white' : 'transparent',
                color: editingFront ? '#1f2937' : '#6b7280',
                fontWeight: editingFront ? '600' : '400',
                cursor: 'pointer',
                boxShadow: editingFront ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📖 Anverso
            </button>
            <button
              onClick={() => setEditingFront(false)}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: !editingFront ? 'white' : 'transparent',
                color: !editingFront ? '#1f2937' : '#6b7280',
                fontWeight: !editingFront ? '600' : '400',
                cursor: 'pointer',
                boxShadow: !editingFront ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              📝 Reverso
            </button>
          </div>

          {/* Editor para la cara activa */}
          <div>
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {editingFront ? '📖 Contenido del Anverso' : '📝 Contenido del Reverso'}
            </h3>
            <AdvancedEditor
              content={editingFront ? frontContent : backContent}
              onChange={editingFront ? onFrontChange : onBackChange}
              placeholder={editingFront ? 'Escribe la pregunta o concepto...' : 'Escribe la respuesta o definición...'}
              height="300px"
            />
          </div>

          {/* Grabador de audio para la cara activa */}
          {(editingFront ? onFrontAudioChange : onBackAudioChange) && (
            <div>
              <h4 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '14px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                🎤 Audio {editingFront ? 'del Anverso' : 'del Reverso'} (opcional)
              </h4>
              <AudioRecorder
                onAudioRecord={editingFront ? onFrontAudioChange! : onBackAudioChange!}
                existingAudioUrl={editingFront ? frontAudio : backAudio}
              />
            </div>
          )}
        </div>
      ) : (
        // Modo de vista previa
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📖 Anverso
              {frontAudio && <span style={{ fontSize: '12px', color: '#059669' }}>🎤 Con audio</span>}
            </h3>
            {renderPreview(frontContent, frontAudio)}
          </div>

          <div>
            <h3 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📝 Reverso
              {backAudio && <span style={{ fontSize: '12px', color: '#059669' }}>🎤 Con audio</span>}
            </h3>
            {renderPreview(backContent, backAudio)}
          </div>

          {/* Botón para volver a editar */}
          <button
            onClick={() => setActiveTab('edit')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center',
              marginTop: '8px'
            }}
          >
            ✏️ Continuar Editando
          </button>
        </div>
      )}
    </div>
  );
};

export default CardEditor; 