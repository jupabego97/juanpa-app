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
      console.log("SyncContext: Sincronización ya en progreso.");
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    console.log("SyncContext: Iniciando sincronización. Último timestamp:", lastSyncTimestamp);

    let pullData: PullResponse | null = null;
    try {
      // 1. PULL CHANGES FROM SERVER
      console.log("SyncContext: Realizando PULL...");
      pullData = await syncPull(lastSyncTimestamp || undefined); // Enviar undefined si es null
      console.log("SyncContext: PULL completado. Datos recibidos:", pullData);

      // 2. PREPARE LOCAL DATA & MERGE PULL DATA (Reconciliation)
      // Esta es la parte compleja. Estrategia:
      // - Los datos del servidor (pullData) son la "verdad" para los elementos existentes.
      // - Los elementos nuevos (_isNew) localmente se intentarán enviar.
      // - Los elementos modificados (_isDirty) localmente se intentarán enviar.
      // - Los elementos eliminados (is_deleted y _isDirty) localmente se intentarán enviar como eliminaciones.

      let reconciledDecks: LocalDeck[] = [];
      let reconciledCards: LocalCard[] = [];

      // Merge Decks
      const serverDecksMap = new Map(pullData.decks.map(d => [d.id, d]));
      const localDecksCopy = [...decks]; // Copia para trabajar

      localDecksCopy.forEach(localDeck => {
        if (localDeck.id !== 0 && serverDecksMap.has(localDeck.id)) { // Existe en servidor
          const serverDeck = serverDecksMap.get(localDeck.id)!;
          if (new Date(serverDeck.updated_at) > new Date(localDeck.updated_at) && !localDeck._isDirty && !localDeck._isNew) {
            // Versión del servidor es más nueva y no hay cambios locales pendientes para este mazo
            reconciledDecks.push({ ...serverDeck, _isDirty: false, _isNew: false });
          } else if (localDeck._isDirty || localDeck.is_deleted) {
            // Hay cambios locales (modificación o eliminación), mantener el local para el push
            reconciledDecks.push(localDeck);
          } else {
            // No hay cambios locales y el local es igual o más nuevo (esto no debería pasar si _isDirty se maneja bien)
            // O el servidor no lo tiene (marcado como eliminado en el servidor)
             if (!serverDeck.is_deleted) { // Si el servidor no lo tiene como eliminado
                reconciledDecks.push({ ...localDeck, _isDirty: false, _isNew: false }); // Mantener local, resetear flags
             } else {
                // El servidor lo tiene como eliminado, y no tenemos cambios locales. Se elimina localmente.
             }
          }
          serverDecksMap.delete(localDeck.id); // Eliminar del mapa para procesar los restantes del servidor
        } else if (localDeck._isNew) { // Nuevo localmente
          reconciledDecks.push(localDeck);
        } else if (localDeck.id !== 0 && !serverDecksMap.has(localDeck.id) && !localDeck.is_deleted) {
           // Existe localmente con ID de servidor, pero no vino en el pull Y NO está marcado como eliminado localmente.
           // Esto podría significar que fue eliminado en otro cliente y el servidor ya no lo envía.
           // O si el pull fue incremental y no se incluyó por no haber cambios.
           // Por ahora, si no está en el pull y no está _isDirty/_isNew, lo descartamos.
           // Si queremos una papelera o algo más robusto, esto necesita cambiar.
           console.log(`SyncContext: Mazo local con ID ${localDeck.id} no encontrado en pull, se asume eliminado en servidor o no modificado.`);
        } else if (localDeck.is_deleted && localDeck.id !==0 && localDeck._isDirty){ // Marcado para eliminar y tiene ID
            reconciledDecks.push(localDeck); // Mantener para el push de eliminación
        }
      });
      // Añadir mazos restantes del servidor (nuevos para este cliente)
      serverDecksMap.forEach(serverDeck => {
        if (!serverDeck.is_deleted) { // Solo añadir si no está marcado como eliminado
          reconciledDecks.push({ ...serverDeck, _isDirty: false, _isNew: false });
        }
      });
      
      // Merge Cards (lógica similar a los mazos)
      const serverCardsMap = new Map(pullData.cards.map(c => [c.id, c]));
      const localCardsCopy = [...cards];

      localCardsCopy.forEach(localCard => {
        if (localCard.id !== 0 && serverCardsMap.has(localCard.id)) {
          const serverCard = serverCardsMap.get(localCard.id)!;
          if (new Date(serverCard.updated_at) > new Date(localCard.updated_at) && !localCard._isDirty && !localCard._isNew) {
            reconciledCards.push({ ...serverCard, _isDirty: false, _isNew: false });
          } else if (localCard._isDirty || localCard.is_deleted) {
            reconciledCards.push(localCard);
          } else {
             if(!serverCard.is_deleted){
                reconciledCards.push({ ...localCard, _isDirty: false, _isNew: false });
             }
          }
          serverCardsMap.delete(localCard.id);
        } else if (localCard._isNew) {
          reconciledCards.push(localCard);
        } else if (localCard.id !== 0 && !serverCardsMap.has(localCard.id) && !localCard.is_deleted) {
           console.log(`SyncContext: Tarjeta local con ID ${localCard.id} no encontrada en pull, se asume eliminada en servidor o no modificada.`);
        } else if (localCard.is_deleted && localCard.id !==0 && localCard._isDirty){
            reconciledCards.push(localCard);
        }
      });
      serverCardsMap.forEach(serverCard => {
        if (!serverCard.is_deleted) {
          reconciledCards.push({ ...serverCard, _isDirty: false, _isNew: false });
        }
      });

      setDecks(reconciledDecks);
      setCards(reconciledCards);
      
      const newLastSyncTimestamp = pullData.server_timestamp;

      // 3. PREPARE PUSH PAYLOAD
      const decksToCreate: DeckCreatePayload[] = reconciledDecks
        .filter(d => d._isNew && !d.is_deleted)
        .map(d => ({ name: d.name, description: d.description }));

      const cardsToCreate: CardCreatePayload[] = reconciledCards
        .filter(c => c._isNew && !c.is_deleted && typeof c.deck_id === 'number' && c.deck_id !== 0) 
        .map(c => {
          let frontContentForPayload: ContentBlock[] | null | undefined = undefined;
          if (Array.isArray(c.front_content)) {
            frontContentForPayload = c.front_content;
          } else if (typeof c.front_content === 'string') {
            frontContentForPayload = [{ type: 'html', content: c.front_content }];
          } else {
            frontContentForPayload = c.front_content; // Asignar null o undefined directamente
          }

          let backContentForPayload: ContentBlock[] | null | undefined = undefined;
          if (Array.isArray(c.back_content)) {
            backContentForPayload = c.back_content;
          } else if (typeof c.back_content === 'string') {
            backContentForPayload = [{ type: 'html', content: c.back_content }];
          } else {
            backContentForPayload = c.back_content; // Asignar null o undefined directamente
          }
          
          return {
            deck_id: c.deck_id as number, 
            front_content: frontContentForPayload,
            back_content: backContentForPayload,
            raw_cloze_text: c.raw_cloze_text,
            cloze_data: c.cloze_data,
            tags: c.tags,
          };
        });
      
      // Para updated_decks y updated_cards, enviamos el objeto completo como lo espera el backend (ApiDeck/ApiCard)
      const decksToUpdate: ApiDeck[] = reconciledDecks
        .filter(d => d.id !== 0 && (d._isDirty || d.is_deleted)) // Dirty O marcado para eliminar (con ID de servidor)
        .map(({ _tempId, _isNew, _isDirty, ...apiDeck }) => apiDeck); // Quitar campos locales

      const cardsToUpdate: ApiCard[] = reconciledCards
        .filter(c => c.id !== 0 && (c._isDirty || c.is_deleted))
        .map(({ _tempId, _isNew, _isDirty, ...apiCard }) => apiCard);

      const pushPayload: PushRequest = {
        client_timestamp: newLastSyncTimestamp, // Usar el timestamp del pull que acabamos de recibir
        new_decks: decksToCreate.length > 0 ? decksToCreate : undefined,
        new_cards: cardsToCreate.length > 0 ? cardsToCreate : undefined,
        updated_decks: decksToUpdate.length > 0 ? decksToUpdate : undefined,
        updated_cards: cardsToUpdate.length > 0 ? cardsToUpdate : undefined,
      };

      console.log("SyncContext: Preparando PUSH con payload:", JSON.stringify(pushPayload, null, 2));

      if (!pushPayload.new_decks && !pushPayload.new_cards && !pushPayload.updated_decks && !pushPayload.updated_cards) {
        console.log("SyncContext: No hay cambios locales para enviar en PUSH. Sincronización (pull) completada.");
        setLastSyncTimestamp(newLastSyncTimestamp);
        localStorage.setItem('lastSyncTimestamp', newLastSyncTimestamp);
        setIsSyncing(false);
        return;
      }

      // 4. PUSH CHANGES TO SERVER
      console.log("SyncContext: Realizando PUSH...");
      const pushResponse: PushResponse = await syncPush(pushPayload);
      console.log('SyncContext: PUSH completado. Respuesta:', pushResponse);

      // 5. PROCESS PUSH RESPONSE (Update local state based on server confirmation)
      let finalDecks = [...reconciledDecks];
      let finalCards = [...reconciledCards];

      if (pushResponse.conflicts && pushResponse.conflicts.length > 0) {
        const conflictMessages = pushResponse.conflicts.map(c => c.message).join('; ');
        setSyncError(`Conflictos detectados: ${conflictMessages}`);
      }

      const deckIdMap = new Map<string, number>(); // <tempId, serverId>

      if (pushResponse.created_decks) {
        finalDecks = finalDecks.map(localDeck => {
          if (localDeck._isNew) {
            const createdServerDeck = pushResponse.created_decks?.find(cd => cd.name === localDeck.name);
            if (createdServerDeck) {
              if (localDeck._tempId) {
                deckIdMap.set(localDeck._tempId, createdServerDeck.id);
              }
              return { 
                ...createdServerDeck, 
                _isNew: false, 
                _isDirty: false, 
                _tempId: undefined 
              };
            }
          }
          return localDeck;
        }).filter(d => !(d._isNew && !pushResponse.created_decks?.some(cd => cd.name === d.name))); 
      }

      if (pushResponse.created_cards) {
        finalCards = finalCards.map(localCard => {
          if (localCard._isNew) {
            const createdServerCard = pushResponse.created_cards?.find(
              (sc) => {
                let cardDeckIdToCheck = localCard.deck_id;
                // Si el deck_id de la tarjeta local es un _tempId de mazo, usa el ID mapeado del servidor
                if (typeof localCard.deck_id === 'string' && deckIdMap.has(localCard.deck_id)) {
                  cardDeckIdToCheck = deckIdMap.get(localCard.deck_id)!;
                }
                const deckIdMatches = sc.deck_id === cardDeckIdToCheck;
                
                const contentMatches = JSON.stringify(sc.front_content) === JSON.stringify(localCard.front_content) && 
                                     JSON.stringify(sc.back_content) === JSON.stringify(localCard.back_content) &&
                                     sc.raw_cloze_text === localCard.raw_cloze_text;
                return deckIdMatches && contentMatches;
              }
            );
            if (createdServerCard) {
              return { 
                ...createdServerCard, 
                _isNew: false, 
                _isDirty: false, 
                _tempId: undefined 
              };
            }
          }
          return localCard;
        }).filter(c => {
            if (!c._isNew) return true; // Mantener si no es nueva
            // Para tarjetas nuevas, verificar si realmente se crearon (lógica similar a la de búsqueda)
            const wasCreated = pushResponse.created_cards?.some(sc => {
                let cardDeckIdToCheck = c.deck_id;
                if (typeof c.deck_id === 'string' && deckIdMap.has(c.deck_id)) {
                    cardDeckIdToCheck = deckIdMap.get(c.deck_id)!;
                }
                const deckIdMatches = sc.deck_id === cardDeckIdToCheck;
                const contentMatches = JSON.stringify(sc.front_content) === JSON.stringify(c.front_content) && 
                                     JSON.stringify(sc.back_content) === JSON.stringify(c.back_content) &&
                                     sc.raw_cloze_text === c.raw_cloze_text;
                return deckIdMatches && contentMatches && sc.id !== 0;
            });
            return wasCreated; // Solo mantener las nuevas que fueron creadas
        });
      }

      // Actualizar deck_id en tarjetas (nuevas o existentes) si su mazo era nuevo y ahora tiene ID de servidor
      finalCards = finalCards.map(card => {
        let newDeckId = card.deck_id;
        if (typeof card.deck_id === 'string' && deckIdMap.has(card.deck_id)) {
          newDeckId = deckIdMap.get(card.deck_id)!;
        }
        return { ...card, deck_id: newDeckId };
      });

      // Resetear flags _isDirty para elementos actualizados/eliminados que se procesaron sin conflicto
      // (Asumimos que si no hay conflicto, el servidor aceptó el cambio)
      finalDecks = finalDecks.map(d => {
        if (d._isDirty) { // Si estaba sucio (actualizado o marcado para eliminar)
            // Y si no es un mazo nuevo que falló en crearse (ya filtrado)
            // O si es un mazo existente que fue modificado/eliminado y no hubo conflicto específico para él
            return { ...d, _isDirty: false };
        }
        return d;
      });

      finalCards = finalCards.map(c => {
        if (c._isDirty) {
            return { ...c, _isDirty: false };
        }
        return c;
      });
      
      // Filtrar elementos que están marcados como is_deleted y ya no están _isDirty (eliminación procesada)
      const trulyFinalDecks = finalDecks.filter(d => !d.is_deleted || d._isDirty);
      const trulyFinalCards = finalCards.filter(c => !c.is_deleted || c._isDirty);

      setDecks(trulyFinalDecks);
      setCards(trulyFinalCards);

      setLastSyncTimestamp(newLastSyncTimestamp);
      localStorage.setItem('lastSyncTimestamp', newLastSyncTimestamp);
      console.log("SyncContext: Sincronización completada. Nuevo timestamp:", newLastSyncTimestamp);

    } catch (err) {
      console.error("SyncContext: Error durante la sincronización:", err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido durante la sincronización.';
      setSyncError(`Error de sincronización: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, lastSyncTimestamp, decks, cards, setSyncError, setDecks, setCards, setIsSyncing, setLastSyncTimestamp]); // Actualizar dependencias

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