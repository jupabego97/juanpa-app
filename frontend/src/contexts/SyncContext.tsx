import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import type { ReactNode } from 'react';
import apiClient, { syncPull, syncPush } from '../services/api';
import type { 
  DeckSyncRead as ApiDeck, // Renombrar para evitar confusión con el tipo local
  CardSyncRead as ApiCard, // Renombrar para evitar confusión con el tipo local
  PullResponse, 
  PushRequest, 
  CardCreatePayload, 
  DeckCreatePayload,
  DeckUpdatePayload,
  CardUpdatePayload,
  PushResponse,
  ContentBlock
} from '../services/api';
import { v4 as uuidv4 } from 'uuid'; // Para IDs temporales

// 1. Definición de Tipos para el Contexto

// Tipos locales que extienden los tipos de la API con estado de UI/sincronización
export interface LocalDeck extends ApiDeck {
  _tempId?: string; // ID temporal para elementos nuevos no sincronizados
  _isNew?: boolean;   // True si es nuevo y no sincronizado
  _isDirty?: boolean; // True si ha sido modificado localmente
  // is_deleted ya está en ApiDeck y se usará para soft deletes
}

export interface LocalCard extends ApiCard {
  _tempId?: string;
  _isNew?: boolean;
  _isDirty?: boolean;
  // is_deleted ya está en ApiCard
}

interface SyncState {
  decks: LocalDeck[];
  cards: LocalCard[];
  isSyncing: boolean;
  syncError: string | null;
  lastSyncTimestamp: string | null;
  isInitialized: boolean; // Para saber si el pull inicial (si existe) ha terminado
}

interface SyncContextType extends SyncState {
  initiateSync: () => Promise<void>;
  addDeck: (deckData: DeckCreatePayload) => Promise<LocalDeck | null>; // Devuelve el mazo local creado
  addCard: (cardData: CardCreatePayload) => Promise<LocalCard | null>;   // Devuelve la tarjeta local creada
  updateDeck: (idOrTempId: number | string, deckData: DeckUpdatePayload) => Promise<void>;
  updateCard: (idOrTempId: number | string, cardData: CardUpdatePayload) => Promise<void>;
  markDeckAsDeleted: (idOrTempId: number | string) => Promise<void>;
  markCardAsDeleted: (idOrTempId: number | string) => Promise<void>;
  getDeckById: (idOrTempId: number | string) => LocalDeck | undefined;
  getCardById: (idOrTempId: number | string) => LocalCard | undefined;
}

// 2. Creación del Contexto
const SyncContext = createContext<SyncContextType | undefined>(undefined);

// 3. Creación del Proveedor (SyncProvider)
interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [decks, setDecks] = useState<LocalDeck[]>([]);
  const [cards, setCards] = useState<LocalCard[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(localStorage.getItem('lastSyncTimestamp'));
  const [isInitialized, setIsInitialized] = useState<boolean>(false); // Nuevo estado

  useEffect(() => {
    const storedTimestamp = localStorage.getItem('lastSyncTimestamp');
    if (storedTimestamp && storedTimestamp !== "undefined") {
      setLastSyncTimestamp(storedTimestamp);
    } else if (storedTimestamp === "undefined") {
      localStorage.removeItem('lastSyncTimestamp');
      setLastSyncTimestamp(null);
    }
    // Cargar datos cacheados de localStorage al iniciar si existen
    try {
        const cachedDecks = localStorage.getItem('cachedDecks');
        const cachedCards = localStorage.getItem('cachedCards');
        if (cachedDecks) setDecks(JSON.parse(cachedDecks));
        if (cachedCards) setCards(JSON.parse(cachedCards));
    } catch (error) {
        console.error("Error parsing cached data from localStorage:", error);
        localStorage.removeItem('cachedDecks'); // Clear corrupted data
        localStorage.removeItem('cachedCards');
    }
    
    setIsInitialized(true); // Marcar como inicializado después de cargar caché/timestamp
  }, []);

  // Guardar en localStorage cuando cambian decks o cards
  useEffect(() => {
    if(isInitialized) { // Solo guardar si ya se inicializó para no sobreescribir con vacío al inicio
      localStorage.setItem('cachedDecks', JSON.stringify(decks));
    }
  }, [decks, isInitialized]);

  useEffect(() => {
    if(isInitialized) {
      localStorage.setItem('cachedCards', JSON.stringify(cards));
    }
  }, [cards, isInitialized]);

  const getDeckById = useCallback((idOrTempId: number | string): LocalDeck | undefined => {
    return decks.find(d => (d.id !== 0 && d.id.toString() === idOrTempId.toString()) || d._tempId === idOrTempId);
  }, [decks]);

  const getCardById = useCallback((idOrTempId: number | string): LocalCard | undefined => {
    return cards.find(c => (c.id !== 0 && c.id.toString() === idOrTempId.toString()) || c._tempId === idOrTempId);
  }, [cards]);

  const addDeck = useCallback(async (deckData: DeckCreatePayload): Promise<LocalDeck | null> => {
    const existingByName = decks.find(d => d.name === deckData.name && !d.is_deleted);
    if (existingByName) {
      const message = `Un mazo con el nombre '${deckData.name}' ya existe y no está marcado como eliminado.`;
      console.warn(`SyncContext: ${message}`);
      setSyncError(message);
      return null;
    }

    const tempId = uuidv4();
    const now = new Date().toISOString();
    const newLocalDeck: LocalDeck = {
      name: deckData.name,
      description: deckData.description,
      id: 0, // ID 0 para indicar que no tiene ID de servidor aún
      created_at: now,
      updated_at: now,
      is_deleted: false,
      _tempId: tempId,
      _isNew: true,
      _isDirty: false, // No está 'dirty' porque es nuevo, 'new' cubre eso
    };
    setDecks(prevDecks => [...prevDecks, newLocalDeck]);
    console.log("SyncContext: Mazo nuevo añadido localmente:", newLocalDeck);
    return newLocalDeck;
  }, [decks, setSyncError]);

  const addCard = useCallback(async (cardData: CardCreatePayload): Promise<LocalCard | null> => {
    const tempId = uuidv4();
    const now = new Date().toISOString();
    const defaultFsrsState = 0; // 0 = New in FSRS

    const newLocalCard: LocalCard = {
      deck_id: cardData.deck_id,
      front_content: cardData.front_content || null,
      back_content: cardData.back_content || null,
      raw_cloze_text: cardData.raw_cloze_text,
      cloze_data: cardData.cloze_data,
      tags: cardData.tags || [],
      id: 0,
      created_at: now,
      updated_at: now,
      is_deleted: false,
      next_review_at: now,
      fsrs_stability: null,
      fsrs_difficulty: null,
      fsrs_lapses: 0,
      fsrs_state: defaultFsrsState,
      _tempId: tempId,
      _isNew: true,
      _isDirty: false,
    };
    setCards(prevCards => [...prevCards, newLocalCard]);
    console.log("SyncContext: Tarjeta nueva añadida localmente:", newLocalCard);
    return newLocalCard;
  }, [cards, setCards]);

  const updateDeck = useCallback(async (idOrTempId: number | string, deckUpdates: DeckUpdatePayload) => {
    setDecks(prevDecks =>
      prevDecks.map(deck => {
        if ((deck.id !== 0 && deck.id.toString() === idOrTempId.toString()) || deck._tempId === idOrTempId) {
          console.log(`SyncContext: Actualizando mazo ${idOrTempId}. Es nuevo? ${deck._isNew}`);
          // Prevenir que name se vuelva null si el payload lo trae así y el modelo LocalDeck no lo permite
          const currentName = deck.name;
          const newName = deckUpdates.name === null ? currentName : deckUpdates.name;

          return { 
            ...deck, 
            ...deckUpdates, 
            name: newName ?? currentName, // Asegurar que name no sea null
            updated_at: new Date().toISOString(),
            _isDirty: !deck._isNew, 
          };
        }
        return deck;
      })
    );
  }, [setDecks]);

  const updateCard = useCallback(async (idOrTempId: number | string, cardUpdates: CardUpdatePayload) => {
    setCards(prevCards =>
      prevCards.map(card => {
        if ((card.id !== 0 && card.id.toString() === idOrTempId.toString()) || card._tempId === idOrTempId) {
          console.log(`SyncContext: Actualizando tarjeta ${idOrTempId}. Es nueva? ${card._isNew}`);
          const existingRawCloze = (card as LocalCard).raw_cloze_text;
          // Asegurar que raw_cloze_text se extraiga correctamente del payload si existe
          const newRawCloze = (cardUpdates as Partial<LocalCard>).raw_cloze_text !== undefined 
            ? (cardUpdates as Partial<LocalCard>).raw_cloze_text 
            : existingRawCloze;

          // Convertir front_content/back_content de string a ContentBlock[] si es necesario
          let processedFrontContent = cardUpdates.front_content;
          if (typeof processedFrontContent === 'string') {
            processedFrontContent = [{ type: 'html', content: processedFrontContent }];
          }

          let processedBackContent = cardUpdates.back_content;
          if (typeof processedBackContent === 'string') {
            processedBackContent = [{ type: 'html', content: processedBackContent }];
          }

          return { 
            ...card, 
            ...cardUpdates, 
            front_content: processedFrontContent !== undefined ? processedFrontContent : card.front_content,
            back_content: processedBackContent !== undefined ? processedBackContent : card.back_content,
            raw_cloze_text: newRawCloze,
            updated_at: new Date().toISOString(),
            _isDirty: !card._isNew, 
          };
        }
        return card;
      })
    );
  }, [setCards]);

  const markDeckAsDeleted = useCallback(async (idOrTempId: number | string) => {
    let deckRemoved = false;
    setDecks(prevDecks =>
      prevDecks.map(deck => {
        if ((deck.id !== 0 && deck.id.toString() === idOrTempId.toString()) || deck._tempId === idOrTempId) {
          console.log(`SyncContext: Marcando mazo ${idOrTempId} como eliminado.`);
          if (deck._isNew) { 
            deckRemoved = true;
            return { ...deck, _isDeleted_locally_before_sync: true, is_deleted: true }; 
          }
          return { ...deck, is_deleted: true, deleted_at: new Date().toISOString(), _isDirty: true };
        }
        return deck;
      })
    );
    if (deckRemoved) {
      setDecks(prevDecks => prevDecks.filter(d => !(d as any)._isDeleted_locally_before_sync));
    }
  }, [setDecks]);

  const markCardAsDeleted = useCallback(async (idOrTempId: number | string) => {
    let cardRemoved = false;
    setCards(prevCards =>
      prevCards.map(card => {
        if ((card.id !== 0 && card.id.toString() === idOrTempId.toString()) || card._tempId === idOrTempId) {
          console.log(`SyncContext: Marcando tarjeta ${idOrTempId} como eliminada.`);
           if (card._isNew) {
            cardRemoved = true;
            return { ...card, _isDeleted_locally_before_sync: true, is_deleted: true };
          }
          return { ...card, is_deleted: true, deleted_at: new Date().toISOString(), _isDirty: true };
        }
        return card;
      })
    );
    if (cardRemoved) {
      setCards(prevCards => prevCards.filter(c => !(c as any)._isDeleted_locally_before_sync));
    }
  }, [setCards]);

  const initiateSync = useCallback(async () => {
    if (isSyncing) {
      console.log("SyncContext: Sync ya en progreso.");
      return;
    }
    console.log("SyncContext: Iniciando ciclo de sincronización...");
    setIsSyncing(true);
    setSyncError(null);

    // --- PUSH ---
    // Recolectar cambios locales para enviar al servidor
    const newDecksToPush: DeckCreatePayload[] = decks
      .filter(d => d._isNew && !d.is_deleted) // No enviar nuevos que fueron eliminados antes del primer sync
      .map(d => ({ name: d.name, description: d.description }));

    const newCardsToPush: CardCreatePayload[] = cards
      .filter(c => c._isNew && !c.is_deleted)
      .map(c => ({
        deck_id: c.deck_id, // Esto podría ser un _tempId de mazo, el backend necesitará manejarlo o resolvemos antes
        front_content: c.front_content as ContentBlock[] | null | undefined, // Asegurar tipo
        back_content: c.back_content as ContentBlock[] | null | undefined,  // Asegurar tipo
        raw_cloze_text: c.raw_cloze_text,
        cloze_data: c.cloze_data,
        tags: c.tags,
        // El backend asignará fsrs_state, next_review_at, etc. para tarjetas nuevas
      }));

    const updatedDecksToPush: ApiDeck[] = decks
      .filter(d => d._isDirty && !d._isNew) // Solo actualizados que ya existen en servidor
      .map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        created_at: d.created_at, // Estos no se deberían modificar realmente
        updated_at: d.updated_at, // El backend debería actualizar esto
        is_deleted: d.is_deleted,
        deleted_at: d.deleted_at,
      }));

    const updatedCardsToPush: ApiCard[] = cards
      .filter(c => c._isDirty && !c._isNew)
      .map(c => ({
        id: c.id,
        deck_id: c.deck_id,
        front_content: c.front_content as ContentBlock[] | null | undefined,
        back_content: c.back_content as ContentBlock[] | null | undefined,
        raw_cloze_text: c.raw_cloze_text,
        cloze_data: c.cloze_data,
        tags: c.tags,
        next_review_at: c.next_review_at,
        fsrs_stability: c.fsrs_stability,
        fsrs_difficulty: c.fsrs_difficulty,
        fsrs_lapses: c.fsrs_lapses,
        fsrs_state: c.fsrs_state,
        created_at: c.created_at,
        updated_at: c.updated_at, // El backend debería actualizar esto
        is_deleted: c.is_deleted,
        deleted_at: c.deleted_at,
      }));
    
    let pushSuccessful = true;
    let pushResponseData: PushResponse | null = null;

    if (newDecksToPush.length > 0 || newCardsToPush.length > 0 || updatedDecksToPush.length > 0 || updatedCardsToPush.length > 0) {
      console.log("SyncContext: [Push] Cambios locales detectados. Enviando al servidor...");
      console.log("SyncContext: [Push] Nuevos Mazos:", newDecksToPush.length);
      console.log("SyncContext: [Push] Nuevas Tarjetas:", newCardsToPush.length);
      console.log("SyncContext: [Push] Mazos Actualizados:", updatedDecksToPush.length);
      console.log("SyncContext: [Push] Tarjetas Actualizadas:", updatedCardsToPush.length);
      
      const pushPayload: PushRequest = {
        client_timestamp: lastSyncTimestamp || new Date(0).toISOString(), // Enviar fecha muy antigua si no hay sync previo
        new_decks: newDecksToPush,
        new_cards: newCardsToPush,
        updated_decks: updatedDecksToPush,
        updated_cards: updatedCardsToPush,
      };

      try {
        pushResponseData = await syncPush(pushPayload);
        console.log("SyncContext: [Push] Respuesta del servidor:", pushResponseData);
        // Aquí necesitaríamos una lógica para manejar conflictos y actualizar IDs temporales
        // con los IDs reales devueltos por el servidor.
        // Por ahora, asumimos que el push es exitoso y el pull traerá los IDs correctos.

      } catch (error: any) {
        console.error("SyncContext: [Push] Error al enviar cambios al servidor:", error);
        setSyncError(`Error en Push: ${error.message || 'Error desconocido'}`);
        pushSuccessful = false; // No continuar con pull si el push falló críticamente
      }
    } else {
      console.log("SyncContext: [Push] No hay cambios locales para enviar.");
    }

    // --- PULL ---
    // Solo proceder con PULL si el PUSH fue exitoso o no había nada que pushear
    if (pushSuccessful) {
      console.log("SyncContext: [Pull] Solicitando datos del servidor...");
      try {
        const pullData: PullResponse = await syncPull(lastSyncTimestamp || undefined);
        console.log("SyncContext: [Pull] Datos recibidos del servidor:", pullData);

        // Aquí es donde aplicaríamos los cambios del servidor al estado local.
        // Esta es una lógica de merge compleja.
        // Simplificación: Reemplazar datos locales con los del servidor,
        // pero con cuidado de no perder cambios locales no sincronizados si el push falló parcialmente.
        
        // Función para manejar la respuesta del pull
        const handlePullResponse = (serverData: PullResponse) => {
          console.log("SyncContext: [Pull] Procesando respuesta del servidor...");
          // Loguear los datos crudos puede ser muy verboso, pero útil para debug extremo.
          // console.log("DEBUG SYNC: Datos crudos del servidor:", JSON.stringify(serverData, null, 2));

          const serverDecks = serverData.decks;
          const serverCards = serverData.cards;

          // Log detallado y guardia para decks
          console.log('DEBUG SYNC: Datos crudos de serverData.decks:', serverDecks);
          console.log('DEBUG SYNC: typeof serverData.decks:', typeof serverDecks);
          console.log('DEBUG SYNC: Array.isArray(serverData.decks):', Array.isArray(serverDecks));

          let mergedDecks: LocalDeck[];
          if (Array.isArray(serverDecks)) {
            mergedDecks = serverDecks.map(d => ({ ...d, _isNew: false, _isDirty: false, is_deleted: d.is_deleted || false }));
            console.log('DEBUG SYNC: serverDecks procesados exitosamente. Cantidad:', mergedDecks.length);
          } else {
            console.warn('DEBUG SYNC: serverDecks NO es un array o es undefined. Valor recibido:', serverDecks, '. Se usará un array vacío para mergedDecks.');
            mergedDecks = []; // Usar array vacío como fallback seguro
          }

          // Log detallado y guardia para cards
          console.log('DEBUG SYNC: Datos crudos de serverData.cards:', serverCards);
          console.log('DEBUG SYNC: typeof serverData.cards:', typeof serverCards);
          console.log('DEBUG SYNC: Array.isArray(serverData.cards):', Array.isArray(serverCards));

          let mergedCards: LocalCard[];
          if (Array.isArray(serverCards)) {
            mergedCards = serverCards.map(c => ({ ...c, _isNew: false, _isDirty: false, is_deleted: c.is_deleted || false }));
            console.log('DEBUG SYNC: serverCards procesados exitosamente. Cantidad:', mergedCards.length);
          } else {
            console.warn('DEBUG SYNC: serverCards NO es un array o es undefined. Valor recibido:', serverCards, '. Se usará un array vacío para mergedCards.');
            mergedCards = []; // Usar array vacío como fallback seguro
          }
          
          // Si el PUSH tuvo items nuevos, el PULL debería traerlos con sus IDs reales.
          // Necesitamos mapear los _tempId a los IDs reales.
          if (pushResponseData && Array.isArray(pushResponseData.created_decks)) {
            pushResponseData.created_decks.forEach(createdServerDeck => {
              // Intenta encontrar el deck local que corresponde al que se acaba de crear en el servidor.
              // Esto es heurístico, podría basarse en el nombre si _tempId no está disponible o no es fiable post-serialización.
              const localNewDeck = decks.find(d => d._isNew && d.name === createdServerDeck.name); 
              if (localNewDeck) {
                console.log(`DEBUG SYNC: Mapeando _tempId para mazo nuevo '${createdServerDeck.name}' de temp ${localNewDeck._tempId} a ID real ${createdServerDeck.id}`);
                // Actualizar el deck en mergedDecks si ya existe, o añadirlo.
                const existingInMergedIndex = mergedDecks.findIndex(md => md.id === createdServerDeck.id || (md.name === createdServerDeck.name && md._isNew)); // Considerar match por nombre si el ID es 0 o _tempId
                if (existingInMergedIndex > -1) {
                  mergedDecks[existingInMergedIndex] = { ...mergedDecks[existingInMergedIndex], ...createdServerDeck, _isNew: false, _isDirty: false };
                } else {
                  mergedDecks.push({ ...createdServerDeck, _isNew: false, _isDirty: false });
                }
              }
            });
          }

          if (pushResponseData && Array.isArray(pushResponseData.created_cards)) {
            pushResponseData.created_cards.forEach(createdServerCard => {
              // Similar lógica para tarjetas, podría ser más complejo identificar la tarjeta local original
              // Aquí podríamos necesitar una mejor estrategia de mapeo, quizás usando el _tempId si se envió y se devolvió.
              const localNewCard = cards.find(c => c._isNew && c.deck_id === createdServerCard.deck_id && JSON.stringify(c.front_content) === JSON.stringify(createdServerCard.front_content) ); // Heurística
              if (localNewCard) {
                console.log(`DEBUG SYNC: Mapeando _tempId para tarjeta nueva (frontal: ${JSON.stringify(createdServerCard.front_content)}) de temp ${localNewCard._tempId} a ID real ${createdServerCard.id}`);
                const existingInMergedIndex = mergedCards.findIndex(mc => mc.id === createdServerCard.id);
                if (existingInMergedIndex > -1) {
                  mergedCards[existingInMergedIndex] = { ...mergedCards[existingInMergedIndex], ...createdServerCard, _isNew: false, _isDirty: false };
                } else {
                  mergedCards.push({ ...createdServerCard, _isNew: false, _isDirty: false });
                }
              }
            });
          }

          console.log("SyncContext: [Pull] Aplicando datos del servidor al estado local (estrategia de reemplazo).");
          setDecks(mergedDecks);
          setCards(mergedCards);
          
          const newTimestamp = serverData.server_timestamp;
          setLastSyncTimestamp(newTimestamp);
          localStorage.setItem('lastSyncTimestamp', newTimestamp);
          console.log("SyncContext: [Pull] Sincronización completada. Nuevo timestamp:", newTimestamp);

        };

        handlePullResponse(pullData);

      } catch (error: any) {
        console.error("SyncContext: [Pull] Error al obtener datos del servidor:", error);
        setSyncError(`Error en Pull: ${error.message || 'Error desconocido'}`);
      }
    }

    setIsSyncing(false);
    setIsInitialized(true); // Asegurar que está inicializado después del primer intento de sync
    console.log("SyncContext: Ciclo de sincronización finalizado.");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSyncing, lastSyncTimestamp, decks, cards]); // decks y cards aquí para re-evaluar si hay cambios para el PUSH

  // Efecto para iniciar la sincronización al montar y luego periódicamente
  useEffect(() => {
    if (!isInitialized) return; // No hacer nada hasta que la carga inicial de caché/timestamp esté completa

    console.log("SyncContext: useEffect para sincronización periódica o inicial.");
    
    initiateSync(); // Sincronizar al inicio después de la inicialización

    const intervalId = setInterval(() => {
      console.log("SyncContext: Disparando sincronización periódica...");
      initiateSync();
    }, 300000); // Sincronizar cada 5 minutos

    return () => clearInterval(intervalId); // Limpiar intervalo al desmontar
  }, [initiateSync, isInitialized]); // Depender de isInitialized

  const contextValue: SyncContextType = {
    decks,
    cards,
    isSyncing,
    syncError,
    lastSyncTimestamp,
    isInitialized,
    initiateSync,
    addDeck,
    addCard,
    updateDeck,
    updateCard,
    markDeckAsDeleted,
    markCardAsDeleted,
    getDeckById,
    getCardById,
  };

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};

// 4. Hook Personalizado
export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync debe usarse dentro de un SyncProvider');
  }
  return context;
};

// Nota: La lógica de reconciliación y manejo de IDs para elementos nuevos/actualizados es compleja.
// Esta implementación es un paso adelante pero podría necesitar ajustes finos,
// especialmente en cómo se mapean los IDs de elementos nuevos después del PUSH
// y cómo se manejan los conflictos de forma más granular.
// El filtrado de elementos eliminados también es una simplificación.