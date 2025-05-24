import React from 'react';
import { useSync } from '../contexts/SyncContext';

interface SyncButtonProps {
  className?: string;
  showStatus?: boolean;
}

const SyncButton: React.FC<SyncButtonProps> = ({ className = '', showStatus = true }) => {
  const { 
    initiateSync, 
    isSyncing, 
    syncError, 
    lastSyncTimestamp,
    decks,
    cards 
  } = useSync();

  const handleSync = async () => {
    if (!isSyncing) {
      await initiateSync();
    }
  };

  // Contar elementos pendientes de sincronización
  const pendingDecks = decks.filter(d => d._isNew || d._isDirty).length;
  const pendingCards = cards.filter(c => c._isNew || c._isDirty).length;
  const totalPending = pendingDecks + pendingCards;

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Nunca';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} h`;
    return `Hace ${Math.floor(diffMins / 1440)} días`;
  };

  return (
    <div className={`sync-button-container ${className}`}>
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className={`sync-button ${isSyncing ? 'syncing' : ''} ${totalPending > 0 ? 'has-pending' : ''}`}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: isSyncing ? '#6c757d' : totalPending > 0 ? '#ffc107' : '#28a745',
          color: 'white',
          cursor: isSyncing ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease'
        }}
        title={
          isSyncing 
            ? 'Sincronizando...' 
            : totalPending > 0 
              ? `${totalPending} cambios pendientes de sincronización`
              : 'Todo sincronizado'
        }
      >
        <span 
          role="img" 
          aria-label="sync" 
          style={{
            transform: isSyncing ? 'rotate(360deg)' : 'none',
            transition: 'transform 1s linear',
            animation: isSyncing ? 'spin 1s linear infinite' : 'none'
          }}
        >
          🔄
        </span>
        {isSyncing ? 'Sincronizando...' : totalPending > 0 ? `Sincronizar (${totalPending})` : 'Sincronizar'}
      </button>

      {showStatus && (
        <div className="sync-status" style={{ marginTop: '4px', fontSize: '12px', color: '#6c757d' }}>
          {syncError ? (
            <div style={{ color: '#dc3545' }}>
              ❌ Error: {syncError}
            </div>
          ) : (
            <div>
              📅 Última sincronización: {formatLastSync(lastSyncTimestamp)}
            </div>
          )}
          {totalPending > 0 && (
            <div style={{ color: '#ffc107', marginTop: '2px' }}>
              ⏳ {pendingDecks} mazos y {pendingCards} tarjetas pendientes
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .sync-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .sync-button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default SyncButton; 