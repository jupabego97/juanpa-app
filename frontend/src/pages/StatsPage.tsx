import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsOverview from '../components/StatsOverview';
import ProgressCharts from '../components/ProgressCharts';
import ActivityHeatmap from '../components/ActivityHeatmap';
import DeckAnalytics from '../components/DeckAnalytics';
import ReportExporter from '../components/ReportExporter';

type StatsTab = 'overview' | 'charts' | 'activity' | 'decks' | 'export';

interface TabConfig {
  key: StatsTab;
  label: string;
  icon: string;
  description: string;
}

const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');

  const tabs: TabConfig[] = [
    {
      key: 'overview',
      label: 'Vista General',
      icon: '📊',
      description: 'Resumen completo de estadísticas'
    },
    {
      key: 'charts',
      label: 'Gráficos',
      icon: '📈',
      description: 'Visualizaciones de progreso temporal'
    },
    {
      key: 'activity',
      label: 'Actividad',
      icon: '🔥',
      description: 'Calendario de consistencia'
    },
    {
      key: 'decks',
      label: 'Por Mazos',
      icon: '📚',
      description: 'Análisis detallado por mazo'
    },
    {
      key: 'export',
      label: 'Exportar',
      icon: '📄',
      description: 'Generar reportes'
    }
  ];

  const handleNavigation = (path: string) => {
    // Manejar navegación desde los componentes
    if (path === '/stats/charts') {
      setActiveTab('charts');
    } else if (path === '/stats/decks') {
      setActiveTab('decks');
    } else if (path === '/stats/activity') {
      setActiveTab('activity');
    } else if (path === '/stats/export') {
      setActiveTab('export');
    } else {
      navigate(path);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <StatsOverview onNavigate={handleNavigation} />;
      case 'charts':
        return <ProgressCharts />;
      case 'activity':
        return <ActivityHeatmap />;
      case 'decks':
        return <DeckAnalytics />;
      case 'export':
        return <ReportExporter />;
      default:
        return <StatsOverview onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: 'auto', padding: '20px' }}>
      {/* Encabezado principal */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '800', color: '#1f2937' }}>
          📊 Estadísticas Avanzadas
        </h1>
        <p style={{ margin: 0, fontSize: '18px', color: '#6b7280' }}>
          Análisis completo de tu progreso de aprendizaje con JuanPA
        </p>
      </div>

      {/* Navegación por tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: activeTab === tab.key ? '#3b82f6' : 'white',
              color: activeTab === tab.key ? 'white' : '#6b7280',
              border: `2px solid ${activeTab === tab.key ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <span style={{ fontSize: '24px', marginBottom: '4px' }}>{tab.icon}</span>
            <span style={{ marginBottom: '2px' }}>{tab.label}</span>
            <span style={{ 
              fontSize: '11px', 
              opacity: 0.8,
              textAlign: 'center',
              lineHeight: '1.2'
            }}>
              {tab.description}
            </span>
          </button>
        ))}
      </div>

      {/* Indicador del tab activo */}
      <div style={{
        marginBottom: '24px',
        padding: '12px 16px',
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '20px' }}>
          {tabs.find(tab => tab.key === activeTab)?.icon}
        </span>
        <div>
          <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', color: '#1e40af' }}>
            {tabs.find(tab => tab.key === activeTab)?.label}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', opacity: 0.8 }}>
            {tabs.find(tab => tab.key === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div style={{ minHeight: '500px' }}>
        {renderTabContent()}
      </div>

      {/* Footer con información adicional */}
      <div style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
              💡 Consejos
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Revisa tus estadísticas regularmente para optimizar tu aprendizaje
            </div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
              🎯 Meta
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Mantén una consistencia diaria para mejores resultados
            </div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
              📱 Acceso
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Las estadísticas se actualizan en tiempo real
            </div>
          </div>
        </div>
        
        <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
          JuanPA • Sistema de Repetición Espaciada • Estadísticas generadas localmente
        </p>
      </div>
    </div>
  );
};

export default StatsPage;
