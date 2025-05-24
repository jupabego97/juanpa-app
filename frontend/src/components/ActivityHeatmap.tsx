import React, { useMemo } from 'react';
import { useStats } from '../hooks/useStats';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface HeatmapDayProps {
  date: string;
  count: number;
  level: number;
  onClick: (date: string, count: number) => void;
}

const HeatmapDay: React.FC<HeatmapDayProps> = ({ date, count, level, onClick }) => {
  const getColor = (level: number) => {
    const colors = {
      0: '#ebedf0', // Sin actividad
      1: '#9be9a8', // Baja actividad
      2: '#40c463', // Actividad moderada
      3: '#30a14e', // Alta actividad
      4: '#216e39'  // Actividad muy alta
    };
    return colors[level as keyof typeof colors] || colors[0];
  };

  return (
    <div
      onClick={() => onClick(date, count)}
      style={{
        width: '12px',
        height: '12px',
        backgroundColor: getColor(level),
        border: '1px solid rgba(27, 31, 35, 0.06)',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      title={`${format(parseISO(date), 'd MMM yyyy', { locale: es })}: ${count} tarjetas estudiadas`}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#1f2937';
        e.currentTarget.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(27, 31, 35, 0.06)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    />
  );
};

interface ActivityHeatmapProps {
  className?: string;
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ className = "" }) => {
  const stats = useStats();

  const [selectedDay, setSelectedDay] = React.useState<{ date: string; count: number } | null>(null);
  const [hoveredMonth, setHoveredMonth] = React.useState<string | null>(null);

  // Organizar datos por semanas
  const heatmapData = useMemo(() => {
    const data = stats.activityHeatmap;
    const weeks: Array<Array<{ date: string; count: number; level: number }>> = [];
    
    // Obtener el primer día de la primera semana
    const firstDate = parseISO(data[0]?.date || new Date().toISOString().split('T')[0]);
    const startWeek = startOfWeek(firstDate, { weekStartsOn: 1 }); // Lunes como primer día
    
    let currentWeek: Array<{ date: string; count: number; level: number }> = [];
    
    // Rellenar días anteriores al primer dato si es necesario
    const daysBeforeFirstData = eachDayOfInterval({
      start: startWeek,
      end: firstDate
    }).slice(0, -1);
    
    daysBeforeFirstData.forEach(date => {
      const dayOfWeek = getDay(date);
      if (dayOfWeek === 1 && currentWeek.length > 0) { // Nuevo lunes
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
      currentWeek.push({
        date: format(date, 'yyyy-MM-dd'),
        count: 0,
        level: 0
      });
    });

    // Procesar datos reales
    data.forEach(day => {
      const date = parseISO(day.date);
      const dayOfWeek = getDay(date);
      
      if (dayOfWeek === 1 && currentWeek.length > 0) { // Nuevo lunes
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
      
      currentWeek.push(day);
    });
    
    // Agregar la última semana si tiene datos
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [stats.activityHeatmap]);

  // Obtener estadísticas generales del heatmap
  const heatmapStats = useMemo(() => {
    const data = stats.activityHeatmap;
    const totalDays = data.length;
    const activeDays = data.filter(day => day.count > 0).length;
    const totalCards = data.reduce((sum, day) => sum + day.count, 0);
    const maxDayCount = Math.max(...data.map(day => day.count));
    const avgPerActiveDay = activeDays > 0 ? totalCards / activeDays : 0;
    
    return {
      totalDays,
      activeDays,
      totalCards,
      maxDayCount,
      avgPerActiveDay,
      consistencyRate: (activeDays / totalDays) * 100
    };
  }, [stats.activityHeatmap]);

  const handleDayClick = (date: string, count: number) => {
    setSelectedDay({ date, count });
  };

  const getMonthLabels = () => {
    const months: string[] = [];
    const seenMonths = new Set<string>();
    
    heatmapData.forEach(week => {
      week.forEach(day => {
        const monthKey = format(parseISO(day.date), 'MMM yyyy', { locale: es });
        if (!seenMonths.has(monthKey)) {
          seenMonths.add(monthKey);
          months.push(monthKey);
        }
      });
    });
    
    return months.slice(-12); // Últimos 12 meses
  };

  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div className={`activity-heatmap ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado */}
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
          🔥 Calendario de Actividad
        </h2>
        <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
          Tu consistencia de estudio durante el último año
        </p>
      </div>

      {/* Estadísticas del heatmap */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '8px'
      }}>
        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
            {heatmapStats.activeDays}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>días activos</div>
        </div>
        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
            {heatmapStats.totalCards}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>tarjetas totales</div>
        </div>
        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#7c3aed' }}>
            {heatmapStats.maxDayCount}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>mejor día</div>
        </div>
        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
            {heatmapStats.consistencyRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>consistencia</div>
        </div>
      </div>

      {/* Heatmap principal */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'auto'
      }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            Últimos 12 meses
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
            <span>Menos</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  style={{
                    width: '10px',
                    height: '10px',
                    backgroundColor: level === 0 ? '#ebedf0' : 
                                   level === 1 ? '#9be9a8' :
                                   level === 2 ? '#40c463' :
                                   level === 3 ? '#30a14e' : '#216e39',
                    borderRadius: '2px'
                  }}
                />
              ))}
            </div>
            <span>Más</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Etiquetas de días de la semana */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '20px' }}>
            {dayLabels.map((day, index) => (
              <div
                key={day}
                style={{
                  width: '12px',
                  height: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: '#6b7280',
                  fontWeight: '500'
                }}
              >
                {index % 2 === 0 ? day : ''}
              </div>
            ))}
          </div>

          {/* Grid del heatmap */}
          <div style={{ flex: 1 }}>
            {/* Etiquetas de meses */}
            <div style={{ 
              height: '20px', 
              marginBottom: '2px',
              display: 'flex',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              {getMonthLabels().map((month, index) => (
                <div
                  key={month}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    fontWeight: '500'
                  }}
                  onMouseEnter={() => setHoveredMonth(month)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  {index % 2 === 0 || hoveredMonth === month ? month : ''}
                </div>
              ))}
            </div>

            {/* Grid de semanas */}
            <div style={{ 
              display: 'flex', 
              gap: '2px',
              overflowX: 'auto',
              minWidth: 'fit-content'
            }}>
              {heatmapData.map((week, weekIndex) => (
                <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {week.map((day, dayIndex) => (
                    <HeatmapDay
                      key={`${weekIndex}-${dayIndex}`}
                      date={day.date}
                      count={day.count}
                      level={day.level}
                      onClick={handleDayClick}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Información del día seleccionado */}
      {selectedDay && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
            📅 {format(parseISO(selectedDay.date), 'EEEE, d MMMM yyyy', { locale: es })}
          </h4>
          <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
            {selectedDay.count === 0 
              ? 'No hubo actividad de estudio este día.'
              : `Estudiaste ${selectedDay.count} tarjeta${selectedDay.count !== 1 ? 's' : ''} este día.`
            }
          </p>
          <button
            onClick={() => setSelectedDay(null)}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: '#1e40af',
              border: '1px solid #1e40af',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Insights y tips */}
      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#166534' }}>
          🎯 Análisis de Consistencia
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <strong style={{ fontSize: '14px', color: '#166534' }}>Racha actual:</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#166534' }}>
              {stats.studyStreak.current} días consecutivos
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '14px', color: '#166534' }}>Promedio por día activo:</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#166534' }}>
              {heatmapStats.avgPerActiveDay.toFixed(1)} tarjetas
            </p>
          </div>
          <div>
            <strong style={{ fontSize: '14px', color: '#166534' }}>Recomendación:</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#166534' }}>
              {heatmapStats.consistencyRate > 70 
                ? '¡Excelente consistencia! Mantén el ritmo.'
                : heatmapStats.consistencyRate > 40
                ? 'Buen progreso, intenta ser más consistente.'
                : 'Establece una rutina diaria de estudio.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatmap; 