/**
 * localStorageUtils.ts
 * 
 * Utilidades para interactuar con localStorage de forma segura y tipada.
 */

/**
 * Guarda un valor en localStorage.
 * El valor se serializa a JSON.
 * 
 * @param key La clave bajo la cual guardar el valor.
 * @param value El valor a guardar. Puede ser cualquier tipo serializable a JSON.
 */
export const saveToLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const serializedValue = JSON.stringify(value);
      window.localStorage.setItem(key, serializedValue);
      // console.log(`localStorageUtils: Valor guardado para la clave "${key}"`);
    } catch (error) {
      console.error(`localStorageUtils: Error al guardar en localStorage para la clave "${key}":`, error);
      // Podríamos decidir lanzar el error o manejarlo de otra forma si es crítico.
    }
  } else {
    console.warn(`localStorageUtils: localStorage no está disponible. No se guardó la clave "${key}".`);
  }
};

/**
 * Carga un valor desde localStorage.
 * El valor se deserializa desde JSON.
 * 
 * @param key La clave desde la cual cargar el valor.
 * @param defaultValue El valor a devolver si la clave no existe o hay un error al parsear.
 * @returns El valor cargado y parseado, o el defaultValue.
 */
export const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const serializedValue = window.localStorage.getItem(key);
      if (serializedValue === null) {
        // console.log(`localStorageUtils: No se encontró valor para la clave "${key}", devolviendo defaultValue.`);
        return defaultValue;
      }
      // console.log(`localStorageUtils: Valor encontrado para la clave "${key}", intentando parsear.`);
      return JSON.parse(serializedValue) as T;
    } catch (error) {
      console.error(`localStorageUtils: Error al cargar o parsear desde localStorage para la clave "${key}":`, error);
      return defaultValue; // Devolver defaultValue en caso de error de parseo.
    }
  } else {
    console.warn(`localStorageUtils: localStorage no está disponible. Devolviendo defaultValue para la clave "${key}".`);
    return defaultValue;
  }
};

/**
 * Elimina un valor de localStorage.
 * 
 * @param key La clave del ítem a eliminar.
 */
export const removeFromLocalStorage = (key: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(key);
      // console.log(`localStorageUtils: Valor eliminado para la clave "${key}"`);
    } catch (error) {
      console.error(`localStorageUtils: Error al eliminar de localStorage para la clave "${key}":`, error);
    }
  } else {
    console.warn(`localStorageUtils: localStorage no está disponible. No se eliminó la clave "${key}".`);
  }
};

/**
 * Limpia todo el localStorage.
 * Usar con precaución.
 */
export const clearLocalStorage = (): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.clear();
      // console.log("localStorageUtils: localStorage limpiado completamente.");
    } catch (error) {
      console.error("localStorageUtils: Error al limpiar localStorage:", error);
    }
  } else {
    console.warn("localStorageUtils: localStorage no está disponible. No se pudo limpiar.");
  }
}; 