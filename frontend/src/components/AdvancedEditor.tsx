import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { useDropzone } from 'react-dropzone';

interface AdvancedEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  height?: string;
  className?: string;
}

const AdvancedEditor: React.FC<AdvancedEditorProps> = ({
  content,
  onChange,
  placeholder = "Escribe aquí...",
  height = "200px",
  className = ""
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'custom-bullet-list',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'custom-ordered-list',
        },
      }),
      ListItem,
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full p-4',
        style: `min-height: ${height}`,
      },
    },
  });

  // Manejo de subida de imágenes con drag and drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        editor?.chain().focus().setImage({ src: url }).run();
      };
      reader.readAsDataURL(file);
    });
  }, [editor]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true,
    noClick: true, // Solo permitir drop, no click
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('URL de la imagen:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del enlace:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`advanced-editor ${className}`}>
      {/* Barra de herramientas */}
      <div className="editor-toolbar" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '8px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        {/* Formateo básico */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
          title="Negrita"
        >
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
          title="Cursiva"
        >
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
          title="Tachado"
        >
          <s>S</s>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
          title="Código"
        >
          {'</>'}
        </button>

        <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Encabezados */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
          title="Encabezado 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
          title="Encabezado 2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
          title="Encabezado 3"
        >
          H3
        </button>

        <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Listas */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          title="Lista con viñetas"
        >
          •
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          title="Lista numerada"
        >
          1.
        </button>

        <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Alineación */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
          title="Alinear izquierda"
        >
          ⇤
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
          title="Centrar"
        >
          ⇥
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
          title="Alinear derecha"
        >
          ⇥
        </button>

        <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Colores */}
        <input
          type="color"
          onInput={(event) => {
            const target = event.target as HTMLInputElement;
            editor.chain().focus().setColor(target.value).run();
          }}
          value={editor.getAttributes('textStyle').color || '#000000'}
          title="Color de texto"
          style={{ width: '30px', height: '30px', border: 'none', cursor: 'pointer' }}
        />
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}
          title="Resaltado"
          style={{ backgroundColor: editor.isActive('highlight') ? '#fef3c7' : 'transparent' }}
        >
          ✏️
        </button>

        <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Multimedia */}
        <button
          onClick={addImage}
          className="toolbar-btn"
          title="Insertar imagen"
        >
          🖼️
        </button>
        <button
          onClick={setLink}
          className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
          title="Insertar enlace"
        >
          🔗
        </button>

        <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Utilidades */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="toolbar-btn"
          title="Deshacer"
        >
          ↶
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="toolbar-btn"
          title="Rehacer"
        >
          ↷
        </button>
      </div>

      {/* Área del editor con soporte para drag and drop */}
      <div
        {...getRootProps()}
        className={`editor-content ${isDragActive ? 'drag-active' : ''}`}
        style={{
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          backgroundColor: isDragActive ? '#f0f9ff' : 'white',
          position: 'relative'
        }}
      >
        <input {...getInputProps()} />
        <EditorContent editor={editor} />
        {isDragActive && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#3b82f6',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📷 Suelta las imágenes aquí
          </div>
        )}
      </div>

      {/* Estilos CSS */}
      <style>{`
        .toolbar-btn {
          padding: 6px 8px;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
          min-width: 32px;
          transition: all 0.2s;
        }

        .toolbar-btn:hover {
          background: #f3f4f6;
        }

        .toolbar-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toolbar-btn.active {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #1d4ed8;
        }

        .editor-content .ProseMirror {
          outline: none;
        }

        .editor-content .editor-image {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 8px 0;
        }

        .editor-content .editor-link {
          color: #3b82f6;
          text-decoration: underline;
        }

        .editor-content .custom-bullet-list,
        .editor-content .custom-ordered-list {
          padding-left: 20px;
        }

        .drag-active {
          border-color: #3b82f6 !important;
          border-style: dashed !important;
        }

        .editor-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 16px;
          margin: 16px 0;
          font-style: italic;
        }

        .editor-content code {
          background: #f3f4f6;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
        }

        .editor-content pre {
          background: #1f2937;
          color: white;
          padding: 16px;
          border-radius: 6px;
          overflow-x: auto;
        }

        .editor-content pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
      `}</style>
    </div>
  );
};

export default AdvancedEditor; 