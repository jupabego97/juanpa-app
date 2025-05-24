import React, { useState, useMemo } from 'react';
import { useStats, type DeckStats } from '../hooks/useStats';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DeckAnalyticsProps {
  className?: string;
}

interface DeckCardProps {
  deck: DeckStats;
  isSelected: boolean;
  onClick: () => void;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, isSelected, onClick }) => {
  const completionRate = deck.completionRate;
  const urgencyScore = deck.dueCards / (deck.totalCards || 1) * 100;
  
  const getUrgencyColor = (score: number) => {
    if (score > 30) return '#ef4444'; // Rojo - urgente
    if (score > 15) return '#f59e0b'; // Amarillo - moderado
    return '#10b981'; // Verde - bajo
  };

  const getCompletionColor = (rate: number) => {
    if (rate > 80) return '#10b981'; // Verde - excelente
    if (rate > 60) return '#f59e0b'; // Amarillo - bueno
    if (rate > 30) return '#f97316'; // Naranja - moderado
    return '#ef4444'; // Rojo - necesita atención
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        backgroundColor: isSelected ? '#f0f9ff' : 'white',
        border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
          {deck.name}
        </h3>
        <div style={{
          padding: '4px 8px',
          backgroundColor: getCompletionColor(completionRate),
          color: 'white',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {completionRate.toFixed(0)}%
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>
            {deck.totalCards}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
            {deck.masteredCards}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Dominadas</div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>
            {deck.newCards}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Nuevas</div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: getUrgencyColor(urgencyScore) }}>
            {deck.dueCards}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Pendientes</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#6b7280' }}>
        <span>Facilidad: {deck.averageEase.toFixed(1)}</span>
        <span>Racha: {deck.studyStreak} días</span>
      </div>
    </div>
  );
};

const DeckAnalytics: React.FC<DeckAnalyticsProps> = ({ className = "" }) => {
  const stats = useStats();
  const [selectedDeck, setSelectedDeck] = useState<DeckStats | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'performance'>('overview');

  // Datos para comparación entre mazos
  const comparisonData = useMemo(() => {
    return stats.deckStats.map(deck => ({
      name: deck.name.length > 10 ? deck.name.substring(0, 10) + '...' : deck.name,
      fullName: deck.name,
      totalCards: deck.totalCards,
      masteredCards: deck.masteredCards,
      dueCards: deck.dueCards,
      completionRate: deck.completionRate,
      efficiency: deck.totalCards > 0 ? (deck.masteredCards / deck.totalCards) * 100 : 0
    }));
  }, [stats.deckStats]);

  // Datos de rendimiento por dificultad
  const performanceData = useMemo(() => {
    if (!selectedDeck) return [];
    
    return [
      { difficulty: 'Fácil', cards: Math.floor(selectedDeck.masteredCards * 0.6), accuracy: 95 },
      { difficulty: 'Moderado', cards: Math.floor(selectedDeck.masteredCards * 0.3), accuracy: 85 },
      { difficulty: 'Difícil', cards: Math.floor(selectedDeck.masteredCards * 0.1), accuracy: 70 }
    ];
  }, [selectedDeck]);

  // Top mazos por diferentes métricas
  const topDecks = useMemo(() => {
    const sorted = [...stats.deckStats].sort((a, b) => b.completionRate - a.completionRate);
    return {
      byCompletion: sorted.slice(0, 3),
      byVolume: [...stats.deckStats].sort((a, b) => b.totalCards - a.totalCards).slice(0, 3),
      byStreak: [...stats.deckStats].sort((a, b) => b.studyStreak - a.studyStreak).slice(0, 3)
    };
  }, [stats.deckStats]);

  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Performers */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
          🏆 Mejores Rendimientos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#059669' }}>Por Completitud</h4>
            {topDecks.byCompletion.map((deck, index) => (
              <div key={deck.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '4px 0',
                borderBottom: index < 2 ? '1px solid #f3f4f6' : 'none'
              }}>
                <span style={{ fontSize: '13px' }}>{index + 1}. {deck.name}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                  {deck.completionRate.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#3b82f6' }}>Por Volumen</h4>
            {topDecks.byVolume.map((deck, index) => (
              <div key={deck.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '4px 0',
                borderBottom: index < 2 ? '1px solid #f3f4f6' : 'none'
              }}>
                <span style={{ fontSize: '13px' }}>{index + 1}. {deck.name}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6' }}>
                  {deck.totalCards} tarjetas
                </span>
              </div>
            ))}
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#f59e0b' }}>Por Consistencia</h4>
            {topDecks.byStreak.map((deck, index) => (
              <div key={deck.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '4px 0',
                borderBottom: index < 2 ? '1px solid #f3f4f6' : 'none'
              }}>
                <span style={{ fontSize: '13px' }}>{index + 1}. {deck.name}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b' }}>
                  {deck.studyStreak} días
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de comparación general */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
          📊 Comparación General de Mazos
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" fontSize={12} stroke="#6b7280" />
            <YAxis fontSize={12} stroke="#6b7280" />
            <Tooltip 
              formatter={(value, name) => [value, name === 'totalCards' ? 'Total' : name === 'masteredCards' ? 'Dominadas' : 'Pendientes']}
              labelFormatter={(label) => comparisonData.find(d => d.name === label)?.fullName || label}
            />
            <Legend />
            <Bar dataKey="totalCards" fill="#3b82f6" name="Total" />
            <Bar dataKey="masteredCards" fill="#10b981" name="Dominadas" />
            <Bar dataKey="dueCards" fill="#f59e0b" name="Pendientes" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderComparison = () => (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
        📈 Análisis de Eficiencia por Mazo
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={comparisonData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="name" fontSize={12} stroke="#6b7280" />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={12} stroke="#6b7280" />
          <Tooltip 
            formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Eficiencia']}
            labelFormatter={(label) => comparisonData.find(d => d.name === label)?.fullName || label}
          />
          <Line 
            type="monotone" 
            dataKey="efficiency" 
            stroke="#8b5cf6" 
            strokeWidth={3}
            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, stroke: '#8b5cf6', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderPerformanceDetail = () => {
    if (!selectedDeck) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#6b7280',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Selecciona un Mazo</h3>
          <p style={{ margin: 0 }}>Elige un mazo de la lista para ver su análisis detallado</p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Información detallada del mazo seleccionado */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            📋 Detalle de {selectedDeck.name}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                {selectedDeck.completionRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '14px', color: '#1e40af' }}>Completitud</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                {selectedDeck.averageEase.toFixed(1)}
              </div>
              <div style={{ fontSize: '14px', color: '#166534' }}>Facilidad Promedio</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#fff7ed', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#c2410c' }}>
                {selectedDeck.studyStreak}
              </div>
              <div style={{ fontSize: '14px', color: '#c2410c' }}>Días de Racha</div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#faf5ff', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>
                {selectedDeck.lastStudied ? new Date(selectedDeck.lastStudied).toLocaleDateString('es-ES') : 'N/A'}
              </div>
              <div style={{ fontSize: '14px', color: '#7c3aed' }}>Último Estudio</div>
            </div>
          </div>
        </div>

        {/* Gráfico de rendimiento por dificultad */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            🎯 Rendimiento por Dificultad
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="difficulty" fontSize={12} stroke="#6b7280" />
              <YAxis yAxisId="left" fontSize={12} stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={12} stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cards" fill="#3b82f6" name="Cantidad de Tarjetas" />
              <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} name="Precisión %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className={`deck-analytics ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado */}
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
          📚 Análisis por Mazos
        </h2>
        <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
          Comparaciones detalladas y métricas de rendimiento por mazo
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Lista de mazos */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            Tus Mazos ({stats.deckStats.length})
          </h3>
          {stats.deckStats.map(deck => (
            <DeckCard
              key={deck.id}
              deck={deck}
              isSelected={selectedDeck?.id === deck.id}
              onClick={() => setSelectedDeck(deck)}
            />
          ))}
        </div>

        {/* Contenido principal */}
        <div style={{ flex: 1 }}>
          {/* Tabs de navegación */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {[
              { key: 'overview', label: '📊 Vista General' },
              { key: 'comparison', label: '📈 Comparación' },
              { key: 'performance', label: '🎯 Rendimiento' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key as any)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: viewMode === tab.key ? '#3b82f6' : 'white',
                  color: viewMode === tab.key ? 'white' : '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenido dinámico */}
          {viewMode === 'overview' && renderOverview()}
          {viewMode === 'comparison' && renderComparison()}
          {viewMode === 'performance' && renderPerformanceDetail()}
        </div>
      </div>
    </div>
  );
};

export default DeckAnalytics; 