import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';

export interface UserSettings {
  // Configuraciones de estudio
  defaultCardsPerSession: number;
  enableAudio: boolean;
  autoPlayAudio: boolean;
  showAnswerTime: boolean;
  
  // Configuraciones de UI
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'en';
  compactMode: boolean;
  enableAnimations: boolean;
  
  // Configuraciones de notificaciones  
  enableNotifications: boolean;
  studyReminders: boolean;
  reminderTime: string;
  
  // Configuraciones de datos
  autoSync: boolean;
  offlineMode: boolean;
  
  // Configuraciones avanzadas
  enableDebugMode: boolean;
  fsrsParameters: {
    requestRetention: number;
    maximumInterval: number;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  // Configuraciones de estudio
  defaultCardsPerSession: 20,
  enableAudio: true,
  autoPlayAudio: false,
  showAnswerTime: true,
  
  // Configuraciones de UI
  theme: 'light',
  language: 'es',
  compactMode: false,
  enableAnimations: true,
  
  // Configuraciones de notificaciones
  enableNotifications: false,
  studyReminders: false,
  reminderTime: '20:00',
  
  // Configuraciones de datos
  autoSync: true,
  offlineMode: false,
  
  // Configuraciones avanzadas
  enableDebugMode: false,
  fsrsParameters: {
    requestRetention: 0.9,
    maximumInterval: 36500
  }
};

interface UseSettingsReturn {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  updateFSRSParameter: <K extends keyof UserSettings['fsrsParameters']>(
    key: K, 
    value: UserSettings['fsrsParameters'][K]
  ) => void;
  saveSettings: () => Promise<boolean>;
  resetToDefaults: () => Promise<boolean>;
  exportSettings: () => void;
  importSettings: (file: File) => Promise<boolean>;
  isLoading: boolean;
  isOnline: boolean;
  lastSyncTime: Date | null;
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Detectar cambios en el estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cargar configuraciones al inicio
  useEffect(() => {
    loadSettings();
  }, []);

  // Guardar en localStorage cuando cambian las configuraciones (SOLO después de inicializar)
  useEffect(() => {
    if (isInitialized) {
      console.log('🔄 Auto-guardando configuraciones en localStorage');
      localStorage.setItem('juanpa_user_settings', JSON.stringify(settings));
    }
  }, [settings, isInitialized]);

  // Aplicar configuraciones de tema
  useEffect(() => {
    applyThemeSettings();
  }, [settings.theme]);

  // Aplicar configuraciones globales
  useEffect(() => {
    applyGlobalSettings();
  }, [settings.compactMode, settings.enableAnimations, settings.language]);

  // Aplicar configuraciones cuando cambian
  useEffect(() => {
    if (isInitialized) {
      console.log('🎨 Aplicando configuraciones via settingsService');
      settingsService.applyAllSettings(settings);
    }
  }, [settings, isInitialized]);

  // Solicitar permisos de notificación cuando se habilitan
  useEffect(() => {
    if (settings.enableNotifications) {
      settingsService.requestNotificationPermission().then(granted => {
        if (!granted) {
          console.warn('Permisos de notificación denegados');
        }
      });
    }
  }, [settings.enableNotifications]);

  const loadSettings = async () => {
    try {
      console.log('🔧 Cargando configuraciones...');
      
      // Cargar desde localStorage primero
      const localSettings = localStorage.getItem('juanpa_user_settings');
      if (localSettings) {
        console.log('📦 Configuraciones encontradas en localStorage');
        const parsed = JSON.parse(localSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
        console.log('✅ Configuraciones cargadas desde localStorage:', parsed);
      } else {
        console.log('📭 No hay configuraciones en localStorage, usando valores por defecto');
      }

      // TEMPORALMENTE DESHABILITADO: Sincronización con servidor
      // El endpoint /api/v1/settings no existe aún en el backend
      // Si está online, sincronizar con el servidor
      // if (isOnline) {
      //   await syncWithServer();
      // }
      
      // Marcar como inicializado para habilitar auto-guardado
      setIsInitialized(true);
      console.log('🎯 Configuraciones inicializadas correctamente');
      
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      setIsInitialized(true); // Inicializar de todos modos
    }
  };

  const syncWithServer = async () => {
    try {
      setIsLoading(true);
      
      // Obtener configuraciones del servidor
      const response = await fetch('/api/v1/settings');
      if (response.ok) {
        const serverSettings = await response.json();
        
        // Solo sincronizar si realmente hay configuraciones válidas del servidor
        if (serverSettings && Object.keys(serverSettings).length > 0) {
          // Convertir formato del servidor al formato del frontend
          const frontendSettings: UserSettings = {
            defaultCardsPerSession: serverSettings.default_cards_per_session,
            enableAudio: serverSettings.enable_audio,
            autoPlayAudio: serverSettings.auto_play_audio,
            showAnswerTime: serverSettings.show_answer_time,
            theme: serverSettings.theme,
            language: serverSettings.language,
            compactMode: serverSettings.compact_mode,
            enableAnimations: serverSettings.enable_animations,
            enableNotifications: serverSettings.enable_notifications,
            studyReminders: serverSettings.study_reminders,
            reminderTime: serverSettings.reminder_time,
            autoSync: serverSettings.auto_sync,
            offlineMode: serverSettings.offline_mode,
            enableDebugMode: serverSettings.enable_debug_mode,
            fsrsParameters: {
              requestRetention: serverSettings.fsrs_request_retention,
              maximumInterval: serverSettings.fsrs_maximum_interval
            }
          };

          console.log('Sincronizando configuraciones desde servidor:', frontendSettings);
          setSettings(frontendSettings);
          setLastSyncTime(new Date());
        } else {
          console.log('No hay configuraciones válidas en el servidor, manteniendo configuraciones locales');
        }
      } else {
        console.log('Error al obtener configuraciones del servidor:', response.status);
      }
    } catch (error) {
      console.error('Error syncing with server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToServer = async (settingsToSave: UserSettings): Promise<boolean> => {
    if (!isOnline) return false;

    try {
      // Convertir formato del frontend al formato del servidor
      const serverFormat = {
        default_cards_per_session: settingsToSave.defaultCardsPerSession,
        enable_audio: settingsToSave.enableAudio,
        auto_play_audio: settingsToSave.autoPlayAudio,
        show_answer_time: settingsToSave.showAnswerTime,
        theme: settingsToSave.theme,
        language: settingsToSave.language,
        compact_mode: settingsToSave.compactMode,
        enable_animations: settingsToSave.enableAnimations,
        enable_notifications: settingsToSave.enableNotifications,
        study_reminders: settingsToSave.studyReminders,
        reminder_time: settingsToSave.reminderTime,
        auto_sync: settingsToSave.autoSync,
        offline_mode: settingsToSave.offlineMode,
        enable_debug_mode: settingsToSave.enableDebugMode,
        fsrs_request_retention: settingsToSave.fsrsParameters.requestRetention,
        fsrs_maximum_interval: settingsToSave.fsrsParameters.maximumInterval
      };

      const response = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverFormat),
      });

      if (response.ok) {
        setLastSyncTime(new Date());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving to server:', error);
      return false;
    }
  };

  const applyThemeSettings = () => {
    const { theme } = settings;
    const root = document.documentElement;

    console.log('Aplicando tema:', theme);

    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      console.log('Tema auto aplicado:', isDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
      console.log('Tema directo aplicado:', theme);
    }
  };

  const applyGlobalSettings = () => {
    const { compactMode, enableAnimations, language } = settings;
    const root = document.documentElement;

    // Aplicar modo compacto
    if (compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    // Aplicar configuración de animaciones
    if (!enableAnimations) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }

    // Aplicar idioma
    root.setAttribute('lang', language);
  };

  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateFSRSParameter = useCallback(<K extends keyof UserSettings['fsrsParameters']>(
    key: K, 
    value: UserSettings['fsrsParameters'][K]
  ) => {
    setSettings(prev => ({
      ...prev,
      fsrsParameters: { ...prev.fsrsParameters, [key]: value }
    }));
  }, []);

  const saveSettings = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      console.log('💾 Guardando configuraciones...', settings);
      
      // Guardar en localStorage siempre (esto es lo principal)
      localStorage.setItem('juanpa_user_settings', JSON.stringify(settings));
      console.log('✅ Configuraciones guardadas en localStorage');
      
      // TEMPORALMENTE DESHABILITADO: Sincronización con servidor
      // El endpoint /api/v1/settings no existe aún en el backend
      // Si está online y autoSync está habilitado, guardar en el servidor
      // if (isOnline && settings.autoSync) {
      //   const success = await saveToServer(settings);
      //   if (success) {
      //     console.log('✅ Configuraciones sincronizadas con servidor');
      //   } else {
      //     console.log('⚠️ No se pudo sincronizar con servidor, pero guardado localmente');
      //   }
      // }
      
      return true; // Siempre exitoso si se guarda en localStorage
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [settings]);

  const resetToDefaults = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setSettings(DEFAULT_SETTINGS);

      // Si está online, también restablecer en el servidor
      if (isOnline) {
        const response = await fetch('/api/v1/settings/reset', {
          method: 'POST',
        });
        return response.ok;
      }

      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  const exportSettings = useCallback(() => {
    // Usar el servicio para exportar con metadata
    const exportData = settingsService.exportSettingsWithMetadata(settings);
    const dataBlob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `juanpa-configuraciones-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const importSettings = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      // Validar configuraciones usando el servicio
      const validatedSettings = settingsService.validateImportedSettings(importedData);
      if (!validatedSettings) {
        throw new Error('Configuraciones inválidas');
      }
      
      // Combinar con configuraciones por defecto
      const finalSettings = { ...DEFAULT_SETTINGS, ...validatedSettings };
      setSettings(finalSettings);
      
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }, []);

  return {
    settings,
    updateSetting,
    updateFSRSParameter,
    saveSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
    isLoading,
    isOnline,
    lastSyncTime
  };
}; 