import axios from 'axios';

// La URL base de tu API FastAPI
// En producción, se usará la variable de entorno VITE_API_URL
// En desarrollo, se usará localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

console.log('🔗 API Base URL:', API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 segundos timeout
});

// Interceptor para logging de requests en desarrollo
if (import.meta.env.DEV) {
  apiClient.interceptors.request.use(
    (config) => {
      console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
      return config;
    },
    (error) => {
      console.error('❌ Request Error:', error);
      return Promise.reject(error);
    }
  );

  apiClient.interceptors.response.use(
    (response) => {
      console.log('📥 API Response:', response.status, response.config.url);
      return response;
    },
    (error) => {
      console.error('❌ Response Error:', error.response?.status, error.config?.url, error.message);
      return Promise.reject(error);
    }
  );
}

// Interceptor para manejo de errores global
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Manejo de errores de red
    if (!error.response) {
      console.error('❌ Error de conexión:', error.message);
      // Podrías mostrar un toast o notificación aquí
      return Promise.reject(new Error('Error de conexión. Verifica tu conexión a internet.'));
    }

    // Manejo de errores HTTP específicos
    if (error.response.status === 401) {
      console.error("❌ No autorizado");
      // Aquí podrías redirigir al login si tuvieras autenticación
    } else if (error.response.status >= 500) {
      console.error("❌ Error del servidor");
      // Podrías mostrar un mensaje de error del servidor
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Definiciones de tipo para los datos que esperamos de la API
// Estas deberían idealmente coincidir o ser un subconjunto de los modelos Pydantic del backend (m.DeckRead, m.CardRead etc.)

export type ContentBlock = {
  type: 'text' | 'image' | 'audio' | 'cloze_text' | 'html'; // AĂąadir 'html'
  content?: string; // For text type or html type
  src?: string;     // For image or audio types
  alt?: string;     // For image type (optional accessibility text)
  textWithPlaceholders?: string; // For cloze_text type
};

export interface Deck {
  id: number;
  name: string;
  description?: string | null;
  created_at: string; 
  updated_at: string;
}

export interface DeckWithCards extends Deck {
  cards: Card[];
  updated_at: string;
}

export interface DeckSyncRead extends Deck {
  is_deleted: boolean;
  deleted_at?: string | null;
}

export interface Card {
  id: number;
  deck_id: number;
  front_content: string | ContentBlock[] | null | undefined; 
  back_content: string | ContentBlock[] | null | undefined;  
  raw_cloze_text?: string | null;
  cloze_data?: any; 
  tags?: string[] | null;
  next_review_at?: string | null;
  fsrs_stability?: number | null;
  fsrs_difficulty?: number | null;
  fsrs_lapses?: number | null;
  fsrs_state?: number | null; 
  created_at: string;
  updated_at: string;
}

export interface CardSyncRead extends Card {
  is_deleted: boolean;
  deleted_at?: string | null;
}

export interface CardReviewPayload {
  rating: 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
}

// Tipos para EstadĂ­sticas
export interface HeatmapDataPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface StreakData {
  current_streak: number;
}

export interface DeckCreatePayload {
  name: string;
  description?: string | null;
}

export interface DeckUpdatePayload {
  name?: string | null;
  description?: string | null;
}

export interface CardCreatePayload {
  deck_id: number;
  front_content?: ContentBlock[] | null; // Hacer opcional
  back_content?: ContentBlock[] | null;  // Hacer opcional
  raw_cloze_text?: string | null;       // AĂąadir para texto cloze
  cloze_data?: any | null;
  tags?: string[] | null;
}

export interface CardUpdatePayload {
  front_content?: ContentBlock[];
  back_content?: ContentBlock[];
  cloze_data?: any | null;
  tags?: string[] | null;
}

export interface ImportSummary {
  message: string;
  decks_created: number;
  cards_created: number;
  warnings: string[];
  errors: string[];
}

// Tipos para Sincronización
export interface PullResponse {
  server_timestamp: string; // ISO 8601 datetime string
  decks: DeckSyncRead[];
  cards: CardSyncRead[];
  // Podríamos añadir review_logs si también se sincronizan,
  // pero basándonos en los endpoints del backend, parece que no por ahora.
}

export interface PushRequest {
  client_timestamp: string; // ISO 8601 datetime string del último pull exitoso
  
  // Para elementos nuevos creados por el cliente
  new_decks?: DeckCreatePayload[];
  new_cards?: CardCreatePayload[];
  
  // Para elementos existentes que el cliente ha actualizado o quiere eliminar
  // El cliente establecerá is_deleted=true en un objeto aquí para indicar una eliminación.
  updated_decks?: DeckSyncRead[];
  updated_cards?: CardSyncRead[];
}

export interface ConflictInfo {
  type: string; // 'deck' o 'card' o 'new_deck_creation'
  id: number; // ID del objeto en conflicto, o -1 para errores de creación sin ID específico
  identifier?: string; // Nombre u otro identificador textual del objeto en conflicto
  // client_version: DeckUpdatePayload | CardUpdatePayload; // O los tipos Create si aplica
  // server_version: Deck | Card; // O los tipos Read/Base del servidor
  message: string;
}

export interface PushResponse {
  message: string;
  created_decks?: DeckSyncRead[];
  created_cards?: CardSyncRead[];
  conflicts?: ConflictInfo[];
}

// Funciones de API para Sincronización

export const syncPull = async (lastSyncTimestamp?: string): Promise<PullResponse> => {
  const params: { last_sync_timestamp?: string } = {};
  if (lastSyncTimestamp) {
    params.last_sync_timestamp = lastSyncTimestamp;
  }
  const response = await apiClient.get<PullResponse>('/sync/pull', { params });
  return response.data;
};

export const syncPush = async (data: PushRequest): Promise<PushResponse> => {
  const response = await apiClient.post<PushResponse>('/sync/push', data);
  return response.data;
};

// Tipos e interfaces para Gemini
export interface GeminiStatusResponse {
  available: boolean;
  model?: string | null;
  api_key_configured: boolean;
  last_error?: string | null;
}

export interface CardGenerationRequest {
  topic: string;
  num_cards?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  card_type?: 'standard' | 'cloze' | 'mixed';
  language?: 'es' | 'en';
  context?: string | null;
  deck_id: number;
  deck_name?: string | null;        // Requerido cuando deck_id = -1
  deck_description?: string | null; // Opcional cuando deck_id = -1
}

export interface CardGenerationResult {
  success: boolean;
  cards_created: Card[];
  metadata: {
    topic: string;
    requested_count?: number;
    generated_count?: number;
    difficulty?: string;
    card_type?: string;
    language?: string;
    model_used?: string;
    generation_time_seconds?: number;
    deck_id?: number;
    deck_name?: string;
    [key: string]: any;
  };
  errors?: string[];
  warnings?: string[];
}

// Funciones API para Gemini
export const getGeminiStatus = async (): Promise<GeminiStatusResponse> => {
  const response = await apiClient.get<GeminiStatusResponse>('/gemini/status');
  return response.data;
};

export const generateCardsWithGemini = async (request: CardGenerationRequest): Promise<CardGenerationResult> => {
  const response = await apiClient.post<CardGenerationResult>('/gemini/generate-cards', request);
  return response.data;
};

// Aquí continuarán las funciones que llaman a la API, por ejemplo:
// export const syncPull = async (lastSyncTimestamp?: string): Promise<PullResponse> => { ... }
// export const syncPush = async (data: PushRequest): Promise<PushResponse> => { ... }
