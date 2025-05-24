import React from 'react';
import type { ContentBlock } from '../services/api';

interface CardContentViewerProps {
  content: string | ContentBlock[] | null | undefined;
}

// Type guard para verificar si el contenido es un objeto simple con propiedad 'text'
function isSimpleTextContent(c: any): c is { text: string } {
  return typeof c === 'object' && c !== null && 'text' in c && typeof c.text === 'string';
}

const CardContentViewer: React.FC<CardContentViewerProps> = ({ content }) => {
  if (!content) {
    return <p style={{ fontStyle: 'italic' }}>Contenido no disponible.</p>;
  }

  // Si el contenido es un objeto simple con propiedad 'text'
  if (isSimpleTextContent(content)) {
    return <div>{content.text}</div>;
  }

  // Si el contenido es un string simple (compatibilidad con datos antiguos o muy simples)
  if (typeof content === 'string') {
    // Si parece HTML, renderizarlo como HTML. De lo contrario, como texto plano.
    // Esta es una heurĂ­stica simple; podrĂ­a necesitar ser mĂĄs robusta.
    // TambiĂŠn podrĂ­amos usar una biblioteca para sanitizar HTML si es necesario.
    if (content.trim().startsWith('<') && content.trim().endsWith('>')) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    return <div>{content}</div>;
  }

  // Si el contenido es un array de ContentBlock
  if (Array.isArray(content)) {
    return (
      <div>
        {content.map((block, index) => {
          if (!block || typeof block !== 'object') {
            console.warn("Bloque de contenido invĂĄlido encontrado:", block);
            return <p key={index} style={{color: 'red'}}>Bloque de contenido invĂĄlido.</p>;
          }
          
          const { type, content: blockContent, src, alt, textWithPlaceholders } = block;

          switch (type) {
            case 'text':
              return <p key={index}>{blockContent}</p>;
            case 'html': // Usado para Cloze y contenido de Quill
              // Renderizar HTML directamente
              return <div key={index} dangerouslySetInnerHTML={{ __html: blockContent || '' }} />;
            case 'image':
              return (
                <img 
                  key={index} 
                  src={src} 
                  alt={alt || 'imagen de tarjeta'} 
                  style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '10px 0' }} 
                />
              );
            case 'audio':
              return (
                <div key={index} style={{ margin: '10px 0' }}>
                  <audio controls src={src}>
                    Tu navegador no soporta el elemento de audio.
                  </audio>
                </div>
              );
            case 'cloze_text': // Esto es mĂĄs para el editor; la visualizaciĂłn real es HTML
              // En la visualizaciĂłn, el texto cloze ya deberĂ­a estar en el HTML con placeholders/respuestas.
              // Este caso aquĂ­ podrĂ­a ser un fallback o un indicador de un problema.
              // Si llegamos aquĂ­, significa que no se procesĂł a HTML.
              // PodrĂ­amos mostrar el texto con placeholders como texto simple.
              return <p key={index}>{textWithPlaceholders || '(Texto Cloze sin procesar)'}</p>;
            default:
              console.warn("Tipo de bloque de contenido desconocido:", block);
              return <p key={index} style={{color: 'red'}}>Tipo de bloque desconocido: {type}</p>;
          }
        })}
      </div>
    );
  }

  // Fallback si el contenido es un tipo inesperado (ej. nĂşmero, booleano, etc.)
  console.warn("Formato de contenido inesperado (fallback a JSON.stringify):", content);
  try {
    return <pre>{JSON.stringify(content, null, 2)}</pre>;
  } catch (e) {
    return <p style={{color: 'red'}}>Error al mostrar contenido complejo.</p>;
  }
};

export default CardContentViewer;
