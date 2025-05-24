import React from 'react';
import { useStats } from '../hooks/useStats';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'indigo';
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period: string;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, trend }) => {
  const colorClasses = {
    blue: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: '#3b82f6' },
    green: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', icon: '#22c55e' },
    orange: { bg: '#fff7ed', border: '#f97316', text: '#c2410c', icon: '#f97316' },
    purple: { bg: '#faf5ff', border: '#a855f7', text: '#7c3aed', icon: '#a855f7' },
    red: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626', icon: '#ef4444' },
    indigo: { bg: '#eef2ff', border: '#6366f1', text: '#4338ca', icon: '#6366f1' }
  };

  const colors = colorClasses[color];

  return (
    <div style={{
      backgroundColor: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '20px',
      position: 'relative',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '14px', 
          fontWeight: '500', 
          color: colors.text,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </h3>
        <span style={{ fontSize: '24px' }}>{icon}</span>
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <span style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: colors.text,
          lineHeight: '1'
        }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      
      {subtitle && (
        <p style={{ 
          margin: 0, 
          fontSize: '13px', 
          color: colors.text, 
          opacity: 0.8,
          lineHeight: '1.2'
        }}>
          {subtitle}
        </p>
      )}
      
      {trend && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          marginTop: '8px',
          fontSize: '12px',
          color: trend.direction === 'up' ? '#059669' : '#dc2626'
        }}>
          <span>{trend.direction === 'up' ? '↗️' : '↘️'}</span>
          <span>{trend.value > 0 ? '+' : ''}{trend.value}% {trend.period}</span>
        </div>
      )}
    </div>
  );
};

interface QuickActionProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, description, icon, color, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'left',
      width: '100%'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color;
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#e5e7eb';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{
      backgroundColor: color,
      color: 'white',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '24px',
      lineHeight: '1'
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
        {title}
      </h4>
      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
        {description}
      </p>
    </div>
  </button>
);

interface StatsOverviewProps {
  onNavigate?: (path: string) => void;
  className?: string;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ onNavigate, className = "" }) => {
  const stats = useStats();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <div className={`stats-overview ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado */}
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>
          📊 Panel de Estadísticas
        </h2>
        <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
          Resumen completo de tu progreso de aprendizaje
        </p>
      </div>

      {/* Métricas principales */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        <StatCard
          title="Tarjetas Estudiadas Hoy"
          value={stats.cardsStudiedToday}
          subtitle="¡Mantén el ritmo!"
          icon="🎯"
          color="blue"
          trend={{
            value: 15,
            direction: 'up',
            period: 'vs ayer'
          }}
        />
        
        <StatCard
          title="Racha Actual"
          value={`${stats.studyStreak.current} días`}
          subtitle={`Récord: ${stats.studyStreak.longest} días`}
          icon="🔥"
          color="orange"
        />
        
        <StatCard
          title="Precisión Promedio"
          value={`${stats.averageAccuracy.toFixed(1)}%`}
          subtitle="En las últimas revisiones"
          icon="🎯"
          color="green"
          trend={{
            value: 3,
            direction: 'up',
            period: 'esta semana'
          }}
        />
        
        <StatCard
          title="Total de Tarjetas"
          value={stats.totalCards}
          subtitle={`En ${stats.totalDecks} mazos`}
          icon="📚"
          color="purple"
        />
      </div>

      {/* Estadísticas de progreso */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        <StatCard
          title="Esta Semana"
          value={stats.cardsStudiedThisWeek}
          subtitle="tarjetas estudiadas"
          icon="📅"
          color="indigo"
        />
        
        <StatCard
          title="Este Mes"
          value={stats.cardsStudiedThisMonth}
          subtitle="tarjetas estudiadas"
          icon="📆"
          color="blue"
        />
        
        <StatCard
          title="Tiempo Promedio"
          value={`${stats.averageStudyTime}s`}
          subtitle="por tarjeta"
          icon="⏱️"
          color="green"
        />
        
        <StatCard
          title="Retención"
          value={`${stats.retentionRate.toFixed(1)}%`}
          subtitle="de conocimiento"
          icon="🧠"
          color="purple"
        />
      </div>

      {/* Proyecciones */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
          🎯 Proyección de Completitud
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
              {stats.projectedCompletion.totalDays}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>días restantes</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
              {stats.projectedCompletion.cardsPerDay.toFixed(1)}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>tarjetas por día</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>
              {stats.projectedCompletion.estimatedFinish}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>fecha estimada</div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
          🚀 Acciones Rápidas
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '12px'
        }}>
          <QuickAction
            title="Ver Gráficos Detallados"
            description="Analiza tu progreso con visualizaciones avanzadas"
            icon="📈"
            color="#3b82f6"
            onClick={() => handleNavigation('/stats/charts')}
          />
          
          <QuickAction
            title="Análisis por Mazos"
            description="Compara el rendimiento entre diferentes mazos"
            icon="📊"
            color="#059669"
            onClick={() => handleNavigation('/stats/decks')}
          />
          
          <QuickAction
            title="Calendario de Actividad"
            description="Visualiza tu constancia con un heatmap anual"
            icon="📅"
            color="#7c3aed"
            onClick={() => handleNavigation('/stats/activity')}
          />
          
          <QuickAction
            title="Exportar Reporte"
            description="Descarga un informe completo en PDF"
            icon="📄"
            color="#f97316"
            onClick={() => handleNavigation('/stats/export')}
          />
        </div>
      </div>
    </div>
  );
};

export default StatsOverview; 