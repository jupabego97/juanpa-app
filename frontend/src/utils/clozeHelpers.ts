/**
 * Utilidades para manejar tarjetas cloze
 */

/**
 * Extrae el texto cloze de una tarjeta, ya sea de raw_cloze_text o de cloze_data.cloze_text
 */
export function getClozeText(card: any): string | null {
  // Prioridad 1: raw_cloze_text (para tarjetas creadas/editadas localmente)
  if (card.raw_cloze_text && typeof card.raw_cloze_text === 'string') {
    return card.raw_cloze_text;
  }
  
  // Prioridad 2: cloze_data.cloze_text (para tarjetas generadas por IA)
  if (card.cloze_data && typeof card.cloze_data === 'object' && card.cloze_data.cloze_text) {
    return card.cloze_data.cloze_text;
  }
  
  return null;
}

/**
 * Determina si una tarjeta es de tipo cloze
 */
export function isClozeCard(card: any): boolean {
  return getClozeText(card) !== null;
}

/**
 * Obtiene una vista previa del texto cloze (truncado si es muy largo)
 */
export function getClozePreview(card: any, maxLength: number = 100): string {
  const clozeText = getClozeText(card);
  if (!clozeText) return "Vista previa no disponible";
  
  return clozeText.length > maxLength 
    ? clozeText.substring(0, maxLength - 3) + "..." 
    : clozeText;
}

/**
 * Procesa texto cloze para mostrar en la interfaz
 * Reemplaza {{c1::texto}} por [...] o por el texto según el modo
 */
export function processClozeForDisplay(
  clozeText: string, 
  mode: 'question' | 'answer'
): string {
  if (mode === 'question') {
    // Modo pregunta: reemplazar con [...]
    return clozeText.replace(/\{\{c\d+::(.*?)\}\}/g, '[...]');
  } else {
    // Modo respuesta: mostrar el texto
    return clozeText.replace(/\{\{c\d+::(.*?)\}\}/g, '$1');
  }
} 