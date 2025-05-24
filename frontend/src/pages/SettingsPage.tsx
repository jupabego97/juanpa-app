import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';

interface SettingsSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, icon, children }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '24px',
    marginBottom: '20px'
  }}>
    <h3 style={{
      margin: '0 0 16px 0',
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      {title}
    </h3>
    {children}
  </div>
);

interface SettingItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, description, children }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6'
  }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '2px' }}>
        {label}
      </div>
      {description && (
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          {description}
        </div>
      )}
    </div>
    <div style={{ marginLeft: '16px' }}>
      {children}
    </div>
  </div>
);

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled = false }) => (
  <label style={{ display: 'flex', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      style={{ display: 'none' }}
    />
    <span style={{ 
      width: '40px', 
      height: '20px', 
      backgroundColor: checked && !disabled ? '#3b82f6' : '#d1d5db',
      borderRadius: '10px',
      position: 'relative',
      transition: 'background-color 0.2s',
      opacity: disabled ? 0.5 : 1
    }}>
      <span style={{
        position: 'absolute',
        top: '2px',
        left: checked && !disabled ? '22px' : '2px',
        width: '16px',
        height: '16px',
        backgroundColor: 'white',
        borderRadius: '50%',
        transition: 'left 0.2s'
      }} />
    </span>
  </label>
);

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
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
  } = useSettings();

  const handleSaveSettings = async () => {
    const success = await saveSettings();
    if (success) {
      alert('Configuraciones guardadas exitosamente');
    } else {
      alert('Error al guardar configuraciones');
    }
  };

  const handleResetToDefaults = async () => {
    if (confirm('¿Estás seguro de que quieres restablecer todas las configuraciones a sus valores por defecto?')) {
      const success = await resetToDefaults();
      if (success) {
        alert('Configuraciones restablecidas a valores por defecto');
      } else {
        alert('Error al restablecer configuraciones');
      }
    }
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const success = await importSettings(file);
      if (success) {
        alert('Configuraciones importadas exitosamente');
      } else {
        alert('Error al importar configuraciones. Verifica que el archivo sea válido.');
      }
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '800', color: '#1f2937' }}>
          ⚙️ Configuraciones
        </h1>
        <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
          Personaliza tu experiencia de aprendizaje con JuanPA
        </p>
        
        {/* Estado de conexión */}
        <div style={{ 
          marginTop: '12px', 
          padding: '8px 12px', 
          backgroundColor: isOnline ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${isOnline ? '#16a34a' : '#dc2626'}`,
          borderRadius: '6px',
          fontSize: '12px',
          color: isOnline ? '#166534' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>{isOnline ? '🟢' : '🔴'}</span>
          {isOnline ? 'Conectado' : 'Sin conexión'}
          {lastSyncTime && (
            <span style={{ marginLeft: 'auto', opacity: 0.7 }}>
              Última sincronización: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Configuraciones de Estudio */}
      <SettingsSection title="Configuraciones de Estudio" icon="📚">
        <SettingItem 
          label="Tarjetas por sesión" 
          description="Número predeterminado de tarjetas a revisar"
        >
          <input
            type="number"
            min="1"
            max="100"
            value={settings.defaultCardsPerSession}
            onChange={(e) => updateSetting('defaultCardsPerSession', parseInt(e.target.value) || 1)}
            style={{
              width: '80px',
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </SettingItem>

        <SettingItem 
          label="Habilitar audio" 
          description="Permitir reproducción de archivos de audio en las tarjetas"
        >
          <ToggleSwitch
            checked={settings.enableAudio}
            onChange={(checked) => updateSetting('enableAudio', checked)}
          />
        </SettingItem>

        <SettingItem 
          label="Reproducir audio automáticamente" 
          description="Reproducir audio al mostrar una tarjeta"
        >
          <ToggleSwitch
            checked={settings.autoPlayAudio}
            onChange={(checked) => updateSetting('autoPlayAudio', checked)}
            disabled={!settings.enableAudio}
          />
        </SettingItem>

        <SettingItem 
          label="Mostrar tiempo de respuesta" 
          description="Mostrar cuánto tiempo tardaste en responder"
        >
          <ToggleSwitch
            checked={settings.showAnswerTime}
            onChange={(checked) => updateSetting('showAnswerTime', checked)}
          />
        </SettingItem>
      </SettingsSection>

      {/* Configuraciones de Interfaz */}
      <SettingsSection title="Configuraciones de Interfaz" icon="🎨">
        <SettingItem 
          label="Tema" 
          description="Apariencia visual de la aplicación"
        >
          <select
            value={settings.theme}
            onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark' | 'auto')}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
            <option value="auto">Automático</option>
          </select>
        </SettingItem>

        <SettingItem 
          label="Idioma" 
          description="Idioma de la interfaz"
        >
          <select
            value={settings.language}
            onChange={(e) => updateSetting('language', e.target.value as 'es' | 'en')}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </SettingItem>

        <SettingItem 
          label="Modo compacto" 
          description="Interfaz más densa con menos espaciado"
        >
          <ToggleSwitch
            checked={settings.compactMode}
            onChange={(checked) => updateSetting('compactMode', checked)}
          />
        </SettingItem>

        <SettingItem 
          label="Habilitar animaciones" 
          description="Transiciones y efectos visuales"
        >
          <ToggleSwitch
            checked={settings.enableAnimations}
            onChange={(checked) => updateSetting('enableAnimations', checked)}
          />
        </SettingItem>
      </SettingsSection>

      {/* Configuraciones de Notificaciones */}
      <SettingsSection title="Configuraciones de Notificaciones" icon="🔔">
        <SettingItem 
          label="Habilitar notificaciones" 
          description="Permitir notificaciones del navegador"
        >
          <ToggleSwitch
            checked={settings.enableNotifications}
            onChange={(checked) => updateSetting('enableNotifications', checked)}
          />
        </SettingItem>

        <SettingItem 
          label="Recordatorios de estudio" 
          description="Recibir recordatorios diarios para estudiar"
        >
          <ToggleSwitch
            checked={settings.studyReminders}
            onChange={(checked) => updateSetting('studyReminders', checked)}
            disabled={!settings.enableNotifications}
          />
        </SettingItem>

        <SettingItem 
          label="Hora de recordatorio" 
          description="Hora para recibir recordatorios diarios"
        >
          <input
            type="time"
            value={settings.reminderTime}
            onChange={(e) => updateSetting('reminderTime', e.target.value)}
            disabled={!settings.studyReminders || !settings.enableNotifications}
            style={{
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              opacity: (!settings.studyReminders || !settings.enableNotifications) ? 0.5 : 1
            }}
          />
        </SettingItem>
      </SettingsSection>

      {/* Configuraciones de Datos */}
      <SettingsSection title="Configuraciones de Datos" icon="☁️">
        <SettingItem 
          label="Sincronización automática" 
          description="Sincronizar datos automáticamente cuando esté online"
        >
          <ToggleSwitch
            checked={settings.autoSync}
            onChange={(checked) => updateSetting('autoSync', checked)}
          />
        </SettingItem>

        <SettingItem 
          label="Modo offline preferido" 
          description="Priorizar funcionamiento offline sobre sincronización"
        >
          <ToggleSwitch
            checked={settings.offlineMode}
            onChange={(checked) => updateSetting('offlineMode', checked)}
          />
        </SettingItem>
      </SettingsSection>

      {/* Configuraciones Avanzadas */}
      <SettingsSection title="Configuraciones Avanzadas" icon="🔧">
        <SettingItem 
          label="Algoritmo FSRS - Retención deseada" 
          description="Qué porcentaje de tarjetas quieres recordar (recomendado: 90%)"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min="0.7"
              max="0.98"
              step="0.01"
              value={settings.fsrsParameters.requestRetention}
              onChange={(e) => updateFSRSParameter('requestRetention', parseFloat(e.target.value))}
              style={{ width: '100px' }}
            />
            <span style={{ fontSize: '14px', fontWeight: '500', minWidth: '40px' }}>
              {(settings.fsrsParameters.requestRetention * 100).toFixed(0)}%
            </span>
          </div>
        </SettingItem>

        <SettingItem 
          label="Intervalo máximo (días)" 
          description="Máximo tiempo entre revisiones"
        >
          <input
            type="number"
            min="30"
            max="36500"
            value={settings.fsrsParameters.maximumInterval}
            onChange={(e) => updateFSRSParameter('maximumInterval', parseInt(e.target.value) || 30)}
            style={{
              width: '100px',
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </SettingItem>

        <SettingItem 
          label="Modo de depuración" 
          description="Mostrar información técnica adicional (solo para desarrolladores)"
        >
          <ToggleSwitch
            checked={settings.enableDebugMode}
            onChange={(checked) => updateSetting('enableDebugMode', checked)}
          />
        </SettingItem>
      </SettingsSection>

      {/* Botones de acción */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳' : '💾'} 
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </button>

        <button
          onClick={handleResetToDefaults}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: 'white',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          🔄 Restablecer por Defecto
        </button>

        <button
          onClick={exportSettings}
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: 'white',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          📤 Exportar Configuraciones
        </button>

        <label style={{
          padding: '12px 24px',
          backgroundColor: 'white',
          color: '#6b7280',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: isLoading ? 0.6 : 1
        }}>
          📥 Importar Configuraciones
          <input
            type="file"
            accept=".json"
            onChange={handleImportSettings}
            disabled={isLoading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Info footer */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#1e40af'
      }}>
        💡 <strong>Tip:</strong> Tus configuraciones se guardan localmente y se sincronizarán automáticamente 
        cuando estés conectado. Puedes exportarlas para hacer una copia de seguridad o transferirlas a otro dispositivo.
      </div>
    </div>
  );
};

export default SettingsPage; 