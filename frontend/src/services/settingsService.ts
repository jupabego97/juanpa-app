import type { UserSettings } from '../hooks/useSettings';

export class SettingsService {
  private static instance: SettingsService;
  private notificationPermission: NotificationPermission = 'default';

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  constructor() {
    this.checkNotificationPermission();
  }

  /**
   * Solicita permisos de notificación si están habilitadas
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error solicitando permisos de notificación:', error);
      return false;
    }
  }

  /**
   * Verifica el estado actual de los permisos de notificación
   */
  checkNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    this.notificationPermission = Notification.permission;
    return this.notificationPermission;
  }

  /**
   * Muestra una notificación
   */
  showNotification(title: string, options?: NotificationOptions): void {
    if (this.notificationPermission !== 'granted') {
      console.warn('No hay permisos para mostrar notificaciones');
      return;
    }

    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  }

  /**
   * Programa recordatorios de estudio
   */
  scheduleStudyReminder(settings: UserSettings): void {
    // Cancelar recordatorios existentes
    this.cancelStudyReminders();

    if (!settings.enableNotifications || !settings.studyReminders) {
      return;
    }

    // Programar recordatorio diario
    const [hours, minutes] = settings.reminderTime.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    // Si ya pasó la hora de hoy, programar para mañana
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const msUntilReminder = reminderTime.getTime() - now.getTime();

    setTimeout(() => {
      this.showNotification('🧠 ¡Hora de estudiar!', {
        body: 'Es momento de repasar tus tarjetas en JuanPA',
        tag: 'study-reminder',
        requireInteraction: true
      });

      // Reprogramar para el día siguiente
      this.scheduleStudyReminder(settings);
    }, msUntilReminder);
  }

  /**
   * Cancela todos los recordatorios de estudio
   */
  cancelStudyReminders(): void {
    // En un entorno real, usarías Service Workers para manejar notificaciones persistentes
    // Por ahora, solo limpiamos los timeouts existentes
    if (typeof window !== 'undefined') {
      // Esto es una simplificación. En producción usarías un approach más robusto
      console.log('Cancelando recordatorios existentes');
    }
  }

  /**
   * Aplica configuraciones de audio
   */
  applyAudioSettings(settings: UserSettings): void {
    // Configurar audio global
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (settings.enableAudio) {
        audio.volume = 0.7; // Volumen por defecto
        if (settings.autoPlayAudio) {
          audio.autoplay = true;
        }
      } else {
        audio.volume = 0;
        audio.autoplay = false;
      }
    });
  }

  /**
   * Aplica configuraciones de FSRS al sistema de repaso
   */
  applyFSRSSettings(settings: UserSettings): void {
    // Esto se usaría para configurar el algoritmo FSRS
    const fsrsConfig = {
      requestRetention: settings.fsrsParameters.requestRetention,
      maximumInterval: settings.fsrsParameters.maximumInterval
    };

    // Guardar configuración FSRS en localStorage para que el sistema de repaso la use
    localStorage.setItem('juanpa_fsrs_config', JSON.stringify(fsrsConfig));
  }

  /**
   * Aplica configuraciones de debug
   */
  applyDebugSettings(settings: UserSettings): void {
    const body = document.body;
    
    if (settings.enableDebugMode) {
      body.classList.add('debug-mode');
      
      // Crear panel de debug si no existe
      if (!document.getElementById('debug-panel')) {
        this.createDebugPanel();
      }
    } else {
      body.classList.remove('debug-mode');
      
      // Remover panel de debug
      const debugPanel = document.getElementById('debug-panel');
      if (debugPanel) {
        debugPanel.remove();
      }
    }
  }

  /**
   * Crea un panel de información de debug
   */
  private createDebugPanel(): void {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.className = 'debug-info';
    
    const updateDebugInfo = () => {
      const settings = JSON.parse(localStorage.getItem('juanpa_user_settings') || '{}');
      const isOnline = navigator.onLine;
      const lastSync = localStorage.getItem('juanpa_last_sync');
      
      debugPanel.innerHTML = `
        <div><strong>Debug Info</strong></div>
        <div>Online: ${isOnline ? '✓' : '✗'}</div>
        <div>Last Sync: ${lastSync || 'Never'}</div>
        <div>Theme: ${settings.theme || 'light'}</div>
        <div>Compact: ${settings.compactMode ? '✓' : '✗'}</div>
        <div>Animations: ${settings.enableAnimations ? '✓' : '✗'}</div>
        <div>Cards/Session: ${settings.defaultCardsPerSession || 20}</div>
        <div>FSRS Retention: ${(settings.fsrsParameters?.requestRetention * 100 || 90).toFixed(0)}%</div>
      `;
    };

    updateDebugInfo();
    
    // Actualizar cada 5 segundos
    setInterval(updateDebugInfo, 5000);
    
    document.body.appendChild(debugPanel);
  }

  /**
   * Aplica todas las configuraciones al sistema
   */
  applyAllSettings(settings: UserSettings): void {
    try {
      this.applyAudioSettings(settings);
      this.applyFSRSSettings(settings);
      this.applyDebugSettings(settings);
      
      // Programar recordatorios si están habilitados
      if (settings.enableNotifications && settings.studyReminders) {
        this.scheduleStudyReminder(settings);
      }

      console.log('Configuraciones aplicadas exitosamente');
    } catch (error) {
      console.error('Error aplicando configuraciones:', error);
    }
  }

  /**
   * Obtiene estadísticas de uso de configuraciones
   */
  getUsageStats(): Record<string, any> {
    const settings = JSON.parse(localStorage.getItem('juanpa_user_settings') || '{}');
    const usageStats = JSON.parse(localStorage.getItem('juanpa_usage_stats') || '{}');
    
    return {
      settingsConfigured: Object.keys(settings).length,
      lastModified: settings.lastModified || null,
      notificationPermission: this.notificationPermission,
      studySessionsToday: usageStats.studySessionsToday || 0,
      cardsReviewedToday: usageStats.cardsReviewedToday || 0
    };
  }

  /**
   * Exporta configuraciones con metadata
   */
  exportSettingsWithMetadata(settings: UserSettings): string {
    const exportData = {
      settings,
      metadata: {
        exportedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        appVersion: '1.0.0',
        usageStats: this.getUsageStats()
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Valida configuraciones importadas
   */
  validateImportedSettings(data: any): UserSettings | null {
    try {
      // Si es un objeto con metadata, extraer solo las configuraciones
      const settings = data.settings || data;
      
      // Validaciones básicas
      if (typeof settings !== 'object' || settings === null) {
        throw new Error('Configuraciones inválidas');
      }

      // Validar tipos de datos críticos
      if (settings.defaultCardsPerSession && (typeof settings.defaultCardsPerSession !== 'number' || settings.defaultCardsPerSession < 1 || settings.defaultCardsPerSession > 100)) {
        throw new Error('Número de tarjetas por sesión inválido');
      }

      if (settings.theme && !['light', 'dark', 'auto'].includes(settings.theme)) {
        throw new Error('Tema inválido');
      }

      if (settings.language && !['es', 'en'].includes(settings.language)) {
        throw new Error('Idioma inválido');
      }

      if (settings.fsrsParameters) {
        const { requestRetention, maximumInterval } = settings.fsrsParameters;
        if (requestRetention && (requestRetention < 0.7 || requestRetention > 0.98)) {
          throw new Error('Retención FSRS inválida');
        }
        if (maximumInterval && (maximumInterval < 30 || maximumInterval > 36500)) {
          throw new Error('Intervalo máximo FSRS inválido');
        }
      }

      return settings as UserSettings;
    } catch (error) {
      console.error('Error validando configuraciones:', error);
      return null;
    }
  }
}

export const settingsService = SettingsService.getInstance(); 