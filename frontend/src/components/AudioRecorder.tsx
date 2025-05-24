import React, { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onAudioRecord: (audioBlob: Blob, audioUrl: string) => void;
  existingAudioUrl?: string;
  className?: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioRecord,
  existingAudioUrl,
  className = ""
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl || '');
  const [hasPermission, setHasPermission] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Solicitar permisos de micrófono al montar el componente
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));

    return () => {
      // Limpiar timer al desmontar
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (existingAudioUrl) {
      setAudioUrl(existingAudioUrl);
    }
  }, [existingAudioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        onAudioRecord(audioBlob, audioUrl);
        
        // Limpiar el stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error: No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteAudio = () => {
    setAudioUrl('');
    setIsPlaying(false);
    onAudioRecord(new Blob(), '');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!hasPermission) {
    return (
      <div className={`audio-recorder ${className}`} style={{ 
        padding: '16px', 
        border: '1px solid #e5e7eb', 
        borderRadius: '6px',
        backgroundColor: '#fef3c7',
        textAlign: 'center'
      }}>
        <p style={{ margin: '0 0 8px 0', color: '#92400e' }}>
          🎤 Se necesitan permisos de micrófono para grabar audio
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '6px 12px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className={`audio-recorder ${className}`} style={{ 
      padding: '12px', 
      border: '1px solid #e5e7eb', 
      borderRadius: '6px',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {!audioUrl ? (
          // Estado inicial - sin audio grabado
          <>
            {!isRecording ? (
              <button
                onClick={startRecording}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px'
                }}
              >
                🎤 Grabar audio
              </button>
            ) : (
              <>
                <button
                  onClick={stopRecording}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    animation: 'pulse 1s infinite'
                  }}
                >
                  ⏹️ Parar ({formatTime(recordingTime)})
                </button>
                <div style={{ 
                  color: '#dc2626', 
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  🔴 Grabando...
                </div>
              </>
            )}
          </>
        ) : (
          // Estado con audio grabado
          <>
            <button
              onClick={playAudio}
              style={{
                padding: '8px 16px',
                backgroundColor: isPlaying ? '#f59e0b' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px'
              }}
            >
              {isPlaying ? '⏸️ Pausar' : '▶️ Reproducir'}
            </button>
            
            <button
              onClick={startRecording}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px'
              }}
            >
              🎤 Regrabar
            </button>

            <button
              onClick={deleteAudio}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px'
              }}
            >
              🗑️ Eliminar
            </button>

            <div style={{ 
              color: '#059669', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ✓ Audio grabado
            </div>
          </>
        )}
      </div>

      {/* Elemento de audio para reproducción */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />
      )}

      {/* Estilos CSS para la animación de pulso */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AudioRecorder; 