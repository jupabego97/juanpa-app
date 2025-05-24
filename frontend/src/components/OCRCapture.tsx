import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Tesseract from 'tesseract.js';

interface OCRCaptureProps {
  onTextExtracted: (text: string, confidence: number) => void;
  onImageCaptured?: (imageUrl: string) => void;
  className?: string;
  language?: string;
}

interface OCRResult {
  text: string;
  confidence: number;
  processing: boolean;
  error?: string;
}

const OCRCapture: React.FC<OCRCaptureProps> = ({
  onTextExtracted,
  onImageCaptured,
  className = "",
  language = 'spa+eng' // Español + Inglés por defecto
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<OCRResult>({
    text: '',
    confidence: 0,
    processing: false
  });
  const [progress, setProgress] = useState<number>(0);
  const [showCamera, setShowCamera] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Procesar imagen con OCR
  const processImageWithOCR = useCallback(async (imageFile: File | string | Blob) => {
    setOcrResult(prev => ({ ...prev, processing: true, error: undefined }));
    setProgress(0);

    try {
      const result = await Tesseract.recognize(
        imageFile,
        language,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const extractedText = result.data.text.trim();
      const confidence = Math.round(result.data.confidence);

      setOcrResult({
        text: extractedText,
        confidence,
        processing: false
      });

      onTextExtracted(extractedText, confidence);

    } catch (error) {
      console.error('Error en OCR:', error);
      setOcrResult({
        text: '',
        confidence: 0,
        processing: false,
        error: 'Error al procesar la imagen. Inténtalo de nuevo.'
      });
    }
  }, [language, onTextExtracted]);

  // Manejar archivos subidos con drag & drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      if (onImageCaptured) onImageCaptured(url);
      processImageWithOCR(file);
    }
  }, [processImageWithOCR, onImageCaptured]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp']
    },
    multiple: false
  });

  // Inicializar cámara
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Usar cámara trasera si está disponible
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accediendo a la cámara:', error);
      alert('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  // Capturar foto desde cámara
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
            if (onImageCaptured) onImageCaptured(url);
            processImageWithOCR(blob);
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Limpiar imagen actual
  const clearImage = () => {
    setImageUrl('');
    setOcrResult({ text: '', confidence: 0, processing: false });
    setProgress(0);
  };

  return (
    <div className={`ocr-capture ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controles principales */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb'
      }}>
        <button
          onClick={startCamera}
          disabled={ocrResult.processing}
          style={{
            padding: '8px 16px',
            backgroundColor: '#059669',
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
          📸 Tomar Foto
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrResult.processing}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
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
          📁 Subir Imagen
        </button>

        {imageUrl && (
          <button
            onClick={clearImage}
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
            🗑️ Limpiar
          </button>
        )}
      </div>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            setImageUrl(url);
            if (onImageCaptured) onImageCaptured(url);
            processImageWithOCR(file);
          }
        }}
        style={{ display: 'none' }}
      />

      {/* Cámara */}
      {showCamera && (
        <div style={{
          position: 'relative',
          backgroundColor: '#000',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={capturePhoto}
              style={{
                padding: '12px 24px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              📸 Capturar
            </button>
            <button
              onClick={stopCamera}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              ❌ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Canvas oculto para captura */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Área de drop si no hay imagen */}
      {!imageUrl && !showCamera && (
        <div
          {...getRootProps()}
          style={{
            border: '2px dashed #d1d5db',
            borderRadius: '6px',
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: isDragActive ? '#f0f9ff' : '#f9fafb',
            borderColor: isDragActive ? '#3b82f6' : '#d1d5db',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
            Arrastra una imagen aquí
          </h3>
          <p style={{ margin: 0, color: '#6b7280' }}>
            O haz clic para seleccionar una imagen desde tu dispositivo
          </p>
        </div>
      )}

      {/* Imagen capturada */}
      {imageUrl && !showCamera && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: 'white'
        }}>
          <img
            src={imageUrl}
            alt="Imagen para OCR"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '400px',
              objectFit: 'contain'
            }}
          />
        </div>
      )}

      {/* Estado del procesamiento OCR */}
      {ocrResult.processing && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', color: '#1e40af' }}>
            🔍 Procesando imagen con OCR... {progress}%
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Error de OCR */}
      {ocrResult.error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px'
        }}>
          <p style={{ color: '#dc2626', margin: 0, fontSize: '14px' }}>
            ❌ {ocrResult.error}
          </p>
        </div>
      )}

      {/* Resultado del OCR */}
      {ocrResult.text && !ocrResult.processing && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '6px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <h4 style={{ margin: 0, color: '#166534', fontSize: '14px', fontWeight: '600' }}>
              ✅ Texto Extraído
            </h4>
            <span style={{
              padding: '2px 8px',
              backgroundColor: ocrResult.confidence > 80 ? '#059669' : ocrResult.confidence > 60 ? '#f59e0b' : '#dc2626',
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {ocrResult.confidence}% confianza
            </span>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid #d1fae5',
            maxHeight: '150px',
            overflowY: 'auto',
            fontSize: '14px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap'
          }}>
            {ocrResult.text || 'No se pudo extraer texto de la imagen.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRCapture; 