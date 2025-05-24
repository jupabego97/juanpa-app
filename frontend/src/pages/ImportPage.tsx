import React, { useState } from 'react'; 
import apiClient from '../services/api';
import type { ImportSummary } from '../services/api'; 

const ImportPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null); 
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setImportResult(null); 
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setError("Por favor, selecciona un archivo Markdown (.md) para importar.");
      return;
    }

    if (!selectedFile.name.endsWith('.md')) {
      setError("El archivo seleccionado no es un archivo Markdown (.md).");
      return;
    }

    setIsLoading(true);
    setError(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await apiClient.post<ImportSummary>('/import/markdown', formData, { 
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setImportResult(response.data);
    } catch (err: any) {
      console.error("Error importing markdown file:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`Error al importar: ${err.response.data.detail}`);
      } else {
        setError(err.message || 'OcurriĂł un error desconocido durante la importaciĂłn.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container import-page-container"> {/* Usar clases CSS */}
      <h2>Importar Mazo desde Markdown</h2>
      <p>
        Selecciona un archivo .md para importar. El formato esperado es:
      </p>
      <pre className="code-block-example"> {/* Usar clase CSS */}
        <code>
          # Nombre del Mazo 1<br />
          ## DescripciĂłn del Mazo 1 (opcional)<br />
          <br />
          --- (Separador de tarjeta)<br />
          **Anverso:** Contenido del anverso de la tarjeta 1.1<br />
          **Reverso:** Contenido del reverso de la tarjeta 1.1<br />
          **Etiquetas:** etiqueta1, etiqueta2 (opcional)<br />
          <br />
          --- (Separador de tarjeta)<br />
          **Anverso:** Contenido del anverso de la tarjeta 1.2<br />
          **Reverso:** Contenido del reverso de la tarjeta 1.2<br />
          <br />
          # Nombre del Mazo 2<br />
          ...
        </code>
      </pre>

      <form onSubmit={handleSubmit} className="app-form"> {/* Usar clase CSS */}
        <div className="form-group"> {/* Usar clase CSS */}
          <label htmlFor="markdown-file">Selecciona un archivo Markdown (.md):</label>
          <input
            id="markdown-file"
            type="file"
            accept=".md,text/markdown"
            onChange={handleFileChange}
            // style={{ display: 'block', margin: '10px 0 20px' }} // Eliminar estilos en lĂ­nea
          />
        </div>
        {error && <p className="error-message">{error}</p>} {/* Usar clase CSS */}
        <button type="submit" disabled={isLoading || !selectedFile}>
          {isLoading ? 'Importando...' : 'Importar Archivo'}
        </button>
      </form>

      {importResult && (
        <div className="import-summary"> {/* Usar clase CSS */}
          <h3>Resultado de la ImportaciĂłn:</h3>
          <p>{importResult.message}</p>
          {importResult.decks_created > 0 && <p>Mazos creados: {importResult.decks_created}</p>}
          {importResult.cards_created > 0 && <p>Tarjetas creadas: {importResult.cards_created}</p>}
          
          {importResult.warnings && importResult.warnings.length > 0 && (
            <div>
              <h4>Advertencias:</h4>
              <ul className="warning-list"> {/* Usar clase CSS */}
                {importResult.warnings.map((warn, index) => (
                  <li key={`warn-${index}`}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {importResult.errors && importResult.errors.length > 0 && (
            <div>
              <h4>Errores:</h4>
              <ul className="error-list"> {/* Usar clase CSS */}
                {importResult.errors.map((err, index) => (
                  <li key={`err-${index}`}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportPage;
