import React, { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useStats } from '../hooks/useStats';

interface ChartTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const ChartTab: React.FC<ChartTabProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 16px',
      backgroundColor: isActive ? '#3b82f6' : 'white',
      color: isActive ? 'white' : '#6b7280',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    }}
  >
    {label}
  </button>
);

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any, name: string) => [string, string];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1f2937' }}>
          {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ 
            margin: '4px 0', 
            color: entry.color,
            fontSize: '14px'
          }}>
            {formatter ? 
              `${formatter(entry.value, entry.name)[1]}: ${formatter(entry.value, entry.name)[0]}` :
              `${entry.name}: ${entry.value}`
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ProgressChartsProps {
  className?: string;
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({ className = "" }) => {
  const stats = useStats();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'comparison'>('daily');

  // Colores para los gráficos
  const colors = {
    primary: '#3b82f6',
    secondary: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6'
  };

  // Datos para el gráfico de comparación de mazos
  const deckComparisonData = stats.deckStats.slice(0, 6).map(deck => ({
    name: deck.name.length > 12 ? deck.name.substring(0, 12) + '...' : deck.name,
    total: deck.totalCards,
    completado: deck.masteredCards,
    porcentaje: Math.round(deck.completionRate)
  }));

  // Datos para gráfico de pie de distribución de tarjetas
  const cardDistributionData = [
    { name: 'Nuevas', value: stats.deckStats.reduce((sum, deck) => sum + deck.newCards, 0), color: colors.warning },
    { name: 'Para Repasar', value: stats.deckStats.reduce((sum, deck) => sum + deck.dueCards, 0), color: colors.danger },
    { name: 'Aprendidas', value: stats.deckStats.reduce((sum, deck) => sum + deck.masteredCards, 0), color: colors.success }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'daily':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Gráfico de línea - Actividad diaria */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                📈 Actividad Diaria (Últimos 30 días)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.dailyReviews}>
                  <defs>
                    <linearGradient id="colorCards" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    fontSize={12}
                    stroke="#6b7280"
                  />
                  <YAxis fontSize={12} stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip formatter={(value, name) => [value.toString(), name === 'cardsReviewed' ? 'Tarjetas' : 'Correctas']} />} />
                  <Area 
                    type="monotone" 
                    dataKey="cardsReviewed" 
                    stroke={colors.primary} 
                    fillOpacity={1} 
                    fill="url(#colorCards)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de precisión diaria */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                🎯 Precisión Diaria
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.dailyReviews}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    fontSize={12}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    fontSize={12}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    content={<CustomTooltip formatter={(value) => [`${((value / (stats.dailyReviews.find(d => d.cardsReviewed === value)?.cardsReviewed || 1)) * 100).toFixed(1)}%`, 'Precisión']} />}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="correctAnswers" 
                    stroke={colors.success} 
                    strokeWidth={3}
                    dot={{ fill: colors.success, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: colors.success, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'weekly':
        return (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              📅 Progreso Semanal (Últimas 12 semanas)
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={stats.weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="week" fontSize={12} stroke="#6b7280" />
                <YAxis yAxisId="left" fontSize={12} stroke="#6b7280" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={12} stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="cards" fill={colors.primary} name="Tarjetas Estudiadas" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke={colors.success} strokeWidth={3} name="Precisión %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'monthly':
        return (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              📆 Tendencia Mensual (Últimos 6 meses)
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={stats.monthlyProgress}>
                <defs>
                  <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.purple} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.purple} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" fontSize={12} stroke="#6b7280" />
                <YAxis fontSize={12} stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cards" 
                  stroke={colors.purple} 
                  fillOpacity={1} 
                  fill="url(#colorMonthly)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case 'comparison':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Comparación de mazos */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                📊 Comparación de Mazos
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deckComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" fontSize={11} stroke="#6b7280" />
                  <YAxis fontSize={12} stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="total" fill={colors.secondary} name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completado" fill={colors.success} name="Completadas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribución de tarjetas */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                🥧 Distribución de Tarjetas
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={cardDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {cardDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`progress-charts ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Encabezado */}
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
          📈 Gráficos de Progreso
        </h2>
        <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
          Visualizaciones detalladas de tu actividad de estudio
        </p>
      </div>

      {/* Tabs de navegación */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <ChartTab
          label="📊 Diario"
          isActive={activeTab === 'daily'}
          onClick={() => setActiveTab('daily')}
        />
        <ChartTab
          label="📅 Semanal"
          isActive={activeTab === 'weekly'}
          onClick={() => setActiveTab('weekly')}
        />
        <ChartTab
          label="📆 Mensual"
          isActive={activeTab === 'monthly'}
          onClick={() => setActiveTab('monthly')}
        />
        <ChartTab
          label="🔍 Comparación"
          isActive={activeTab === 'comparison'}
          onClick={() => setActiveTab('comparison')}
        />
      </div>

      {/* Contenido dinámico */}
      {renderContent()}

      {/* Resumen de insights */}
      <div style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
          💡 Insights Clave
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#1e40af' }}>
          <li>Tu día más productivo fue cuando estudiaste {Math.max(...stats.dailyReviews.map(d => d.cardsReviewed))} tarjetas</li>
          <li>Mantienes una racha de {stats.studyStreak.current} días consecutivos</li>
          <li>Tu precisión promedio es del {stats.averageAccuracy.toFixed(1)}% - ¡excelente trabajo!</li>
          <li>Has completado el {stats.deckStats.reduce((sum, deck) => sum + deck.completionRate, 0) / stats.deckStats.length || 0}% de tus mazos en promedio</li>
        </ul>
      </div>
    </div>
  );
};

export default ProgressCharts; 