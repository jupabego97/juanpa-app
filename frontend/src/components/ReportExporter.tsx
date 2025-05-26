import React, { useState, useRef } from 'react';
import { useStats } from '../hooks/useStats';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReportExporterProps {
  className?: string;
}

interface ReportConfig {
  includeOverview: boolean;
  includeCharts: boolean;
  includeActivity: boolean;
  includeDecks: boolean;
  includeTags: boolean;
  format: 'pdf' | 'html' | 'json';
  period: 'week' | 'month' | 'quarter' | 'year';
}

const ReportExporter: React.FC<ReportExporterProps> = ({ className = "" }) => {
  const stats = useStats();
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<ReportConfig>({
    includeOverview: true,
    includeCharts: true,
    includeActivity: true,
    includeDecks: true,
    includeTags: true,
    format: 'pdf',
    period: 'month'
  });
  const [progress, setProgress] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);

  const generatePDFReport = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;

      // Portada
      setProgress(10);
      pdf.setFontSize(24);
      pdf.setTextColor(31, 41, 55);
      pdf.text('JuanPA - Reporte de Estadísticas', margin, margin + 20);
      
      pdf.setFontSize(12);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generado el ${format(new Date(), 'dd MMMM yyyy', { locale: es })}`, margin, margin + 35);
      pdf.text(`Período: ${config.period === 'week' ? 'Última semana' : 
                            config.period === 'month' ? 'Último mes' : 
                            config.period === 'quarter' ? 'Último trimestre' : 'Último año'}`, margin, margin + 45);

      let currentY = margin + 70;

      // Resumen ejecutivo
      if (config.includeOverview) {
        setProgress(25);
        pdf.setFontSize(16);
        pdf.setTextColor(31, 41, 55);
        pdf.text('📊 Resumen Ejecutivo', margin, currentY);
        currentY += 15;

        pdf.setFontSize(10);
        pdf.setTextColor(55, 65, 81);
        
        const overviewData = [
          [`Total de tarjetas:`, `${stats.totalCards}`],
          [`Tarjetas estudiadas hoy:`, `${stats.cardsStudiedToday}`],
          [`Racha actual:`, `${stats.studyStreak.current} días`],
          [`Precisión promedio:`, `${stats.averageAccuracy.toFixed(1)}%`],
          [`Tiempo promedio por tarjeta:`, `${stats.averageStudyTime}s`],
          [`Tasa de retención:`, `${stats.retentionRate.toFixed(1)}%`]
        ];

        overviewData.forEach(([label, value]) => {
          pdf.text(label, margin, currentY);
          pdf.text(value, margin + 80, currentY);
          currentY += 8;
        });

        currentY += 10;
      }

      // Estadísticas por mazo
      if (config.includeDecks) {
        setProgress(50);
        if (currentY > pageHeight - 60) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.setFontSize(16);
        pdf.setTextColor(31, 41, 55);
        pdf.text('📚 Análisis por Mazos', margin, currentY);
        currentY += 15;

        pdf.setFontSize(8);
        pdf.setTextColor(55, 65, 81);

        // Encabezados de tabla
        const headers = ['Mazo', 'Total', 'Dominadas', 'Pendientes', 'Completitud'];
        const colWidths = [60, 20, 25, 25, 25];
        let startX = margin;

        headers.forEach((header, index) => {
          pdf.text(header, startX, currentY);
          startX += colWidths[index];
        });
        currentY += 10;

        // Datos de mazos
        stats.deckStats.forEach((deck) => {
          if (currentY > pageHeight - 20) {
            pdf.addPage();
            currentY = margin + 20;
          }

          startX = margin;
          const rowData = [
            deck.name.length > 25 ? deck.name.substring(0, 22) + '...' : deck.name,
            deck.totalCards.toString(),
            deck.masteredCards.toString(),
            deck.dueCards.toString(),
            `${deck.completionRate.toFixed(0)}%`
          ];

          rowData.forEach((data, index) => {
            pdf.text(data, startX, currentY);
            startX += colWidths[index];
          });
          currentY += 8;
        });

        currentY += 15;
      }

      // Top tags
      if (config.includeTags) {
        setProgress(75);
        if (currentY > pageHeight - 60) {
          pdf.addPage();
          currentY = margin;
        }

        pdf.setFontSize(16);
        pdf.setTextColor(31, 41, 55);
        pdf.text('🏷️ Tags Más Estudiados', margin, currentY);
        currentY += 15;

        pdf.setFontSize(10);
        pdf.setTextColor(55, 65, 81);

        stats.topTags.slice(0, 10).forEach((tag, index) => {
          if (currentY > pageHeight - 20) {
            pdf.addPage();
            currentY = margin + 20;
          }

          pdf.text(`${index + 1}. ${tag.tag}`, margin, currentY);
          pdf.text(`${tag.count} tarjetas`, margin + 80, currentY);
          pdf.text(`${tag.accuracy.toFixed(1)}% precisión`, margin + 120, currentY);
          currentY += 8;
        });

        currentY += 15;
      }

      // Proyecciones
      setProgress(90);
      if (currentY > pageHeight - 60) {
        pdf.addPage();
        currentY = margin;
      }

      pdf.setFontSize(16);
      pdf.setTextColor(31, 41, 55);
      pdf.text('🎯 Proyecciones', margin, currentY);
      currentY += 15;

      pdf.setFontSize(10);
      pdf.setTextColor(55, 65, 81);

      const projectionData = [
        [`Días restantes estimados:`, `${stats.projectedCompletion.totalDays}`],
        [`Tarjetas por día recomendadas:`, `${stats.projectedCompletion.cardsPerDay.toFixed(1)}`],
        [`Fecha estimada de finalización:`, stats.projectedCompletion.estimatedFinish]
      ];

      projectionData.forEach(([label, value]) => {
        pdf.text(label, margin, currentY);
        pdf.text(value, margin + 80, currentY);
        currentY += 8;
      });

      // Pie de página
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Página ${i} de ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
        pdf.text('Generado por JuanPA', margin, pageHeight - 10);
      }

      setProgress(100);
      
      // Descargar PDF
      const fileName = `juanpa-reporte-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el reporte PDF. Inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const generateHTMLReport = () => {
    const reportContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JuanPA - Reporte de Estadísticas</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #374151; }
          h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #1f2937; margin-top: 30px; }
          .metric { display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e5e7eb; }
          .metric:nth-child(even) { background-color: #f9fafb; }
          .deck-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .deck-table th, .deck-table td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .deck-table th { background-color: #f3f4f6; font-weight: 600; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>📊 JuanPA - Reporte de Estadísticas</h1>
        <p><strong>Generado:</strong> ${format(new Date(), 'dd MMMM yyyy', { locale: es })}</p>
        
        <h2>📋 Resumen Ejecutivo</h2>
        <div class="metric"><span>Total de tarjetas:</span><span>${stats.totalCards}</span></div>
        <div class="metric"><span>Tarjetas estudiadas hoy:</span><span>${stats.cardsStudiedToday}</span></div>
        <div class="metric"><span>Racha actual:</span><span>${stats.studyStreak.current} días</span></div>
        <div class="metric"><span>Precisión promedio:</span><span>${stats.averageAccuracy.toFixed(1)}%</span></div>
        <div class="metric"><span>Tiempo promedio por tarjeta:</span><span>${stats.averageStudyTime}s</span></div>
        <div class="metric"><span>Tasa de retención:</span><span>${stats.retentionRate.toFixed(1)}%</span></div>
        
        <h2>📚 Análisis por Mazos</h2>
        <table class="deck-table">
          <thead>
            <tr>
              <th>Mazo</th>
              <th>Total</th>
              <th>Dominadas</th>
              <th>Pendientes</th>
              <th>Completitud</th>
            </tr>
          </thead>
          <tbody>
            ${stats.deckStats.map(deck => `
              <tr>
                <td>${deck.name}</td>
                <td>${deck.totalCards}</td>
                <td>${deck.masteredCards}</td>
                <td>${deck.dueCards}</td>
                <td>${deck.completionRate.toFixed(0)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h2>🏷️ Tags Más Estudiados</h2>
        ${stats.topTags.slice(0, 10).map((tag, index) => `
          <div class="metric">
            <span>${index + 1}. ${tag.tag}</span>
            <span>${tag.count} tarjetas (${tag.accuracy.toFixed(1)}% precisión)</span>
          </div>
        `).join('')}
        
        <h2>🎯 Proyecciones</h2>
        <div class="metric"><span>Días restantes estimados:</span><span>${stats.projectedCompletion.totalDays}</span></div>
        <div class="metric"><span>Tarjetas por día recomendadas:</span><span>${stats.projectedCompletion.cardsPerDay.toFixed(1)}</span></div>
        <div class="metric"><span>Fecha estimada de finalización:</span><span>${stats.projectedCompletion.estimatedFinish}</span></div>
        
        <div class="footer">
          <p>Reporte generado por JuanPA - Sistema de Repetición Espaciada</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `juanpa-reporte-${format(new Date(), 'yyyy-MM-dd')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateJSONReport = () => {
    const reportData = {
      metadata: {
        generated: new Date().toISOString(),
        period: config.period,
        version: '1.0'
      },
      overview: {
        totalCards: stats.totalCards,
        totalDecks: stats.totalDecks,
        cardsStudiedToday: stats.cardsStudiedToday,
        cardsStudiedThisWeek: stats.cardsStudiedThisWeek,
        cardsStudiedThisMonth: stats.cardsStudiedThisMonth,
        averageAccuracy: stats.averageAccuracy,
        averageStudyTime: stats.averageStudyTime,
        retentionRate: stats.retentionRate,
        studyStreak: stats.studyStreak
      },
      decks: stats.deckStats,
      topTags: stats.topTags,
      projections: stats.projectedCompletion,
      activity: {
        dailyReviews: stats.dailyReviews,
        weeklyProgress: stats.weeklyProgress,
        monthlyProgress: stats.monthlyProgress
      }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `juanpa-datos-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async () => {
    switch (config.format) {
      case 'pdf':
        await generatePDFReport();
        break;
      case 'html':
        generateHTMLReport();
        break;
      case 'json':
        generateJSONReport();
        break;
    }
  };

  return (
    <div className={`report-exporter ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Encabezado */}
      <div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
          📄 Exportar Reporte
        </h2>
        <p style={{ margin: 0, fontSize: '16px', color: '#6b7280' }}>
          Genera reportes detallados de tu progreso de aprendizaje
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Configuración del reporte */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            ⚙️ Configuración
          </h3>

          {/* Formato */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Formato de exportación:
            </label>
            <select
              value={config.format}
              onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as any }))}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px'
              }}
            >
              <option value="pdf">PDF (Documento)</option>
              <option value="html">HTML (Página web)</option>
              <option value="json">JSON (Datos)</option>
            </select>
          </div>

          {/* Período */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Período de análisis:
            </label>
            <select
              value={config.period}
              onChange={(e) => setConfig(prev => ({ ...prev, period: e.target.value as any }))}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px'
              }}
            >
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="quarter">Último trimestre</option>
              <option value="year">Último año</option>
            </select>
          </div>

          {/* Secciones a incluir */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Secciones a incluir:
            </label>
            {[
              { key: 'includeOverview', label: 'Resumen ejecutivo' },
              { key: 'includeDecks', label: 'Análisis por mazos' },
              { key: 'includeTags', label: 'Tags más estudiados' },
              { key: 'includeActivity', label: 'Calendario de actividad' },
              { key: 'includeCharts', label: 'Gráficos y visualizaciones' }
            ].map(section => (
              <label key={section.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <input
                  type="checkbox"
                  checked={config[section.key as keyof ReportConfig] as boolean}
                  onChange={(e) => setConfig(prev => ({ ...prev, [section.key]: e.target.checked }))}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '14px', color: '#374151' }}>{section.label}</span>
              </label>
            ))}
          </div>

          {/* Botón de generar */}
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isGenerating ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isGenerating ? (
              <>
                <span>⏳</span>
                Generando... {progress}%
              </>
            ) : (
              <>
                <span>📄</span>
                Generar Reporte
              </>
            )}
          </button>

          {/* Barra de progreso */}
          {isGenerating && (
            <div style={{
              marginTop: '8px',
              width: '100%',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}
        </div>

        {/* Vista previa */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
            👁️ Vista Previa del Reporte
          </h3>

          <div style={{
            backgroundColor: '#f9fafb',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            fontSize: '14px',
            color: '#374151'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1f2937' }}>
              📊 JuanPA - Reporte de Estadísticas
            </h4>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280' }}>
              Generado: {format(new Date(), 'dd MMMM yyyy', { locale: es })}
            </p>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#6b7280' }}>
              Formato: {config.format.toUpperCase()} | Período: {
                config.period === 'week' ? 'Última semana' :
                config.period === 'month' ? 'Último mes' :
                config.period === 'quarter' ? 'Último trimestre' : 'Último año'
              }
            </p>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
              <strong style={{ fontSize: '14px' }}>Contenido incluido:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                {config.includeOverview && <li>Resumen ejecutivo con métricas principales</li>}
                {config.includeDecks && <li>Análisis detallado por mazos</li>}
                {config.includeTags && <li>Top 10 de tags más estudiados</li>}
                {config.includeActivity && <li>Calendario de actividad</li>}
                {config.includeCharts && <li>Gráficos y visualizaciones</li>}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', marginTop: '12px' }}>
              <strong style={{ fontSize: '14px' }}>Datos del período seleccionado:</strong>
              <div style={{ marginTop: '8px', fontSize: '13px' }}>
                <div>• {stats.totalCards} tarjetas totales</div>
                <div>• {stats.totalDecks} mazos activos</div>
                <div>• {stats.cardsStudiedToday} tarjetas estudiadas hoy</div>
                <div>• {stats.studyStreak.current} días de racha actual</div>
              </div>
            </div>
          </div>

          {/* Información sobre formatos */}
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
            <strong>Información sobre formatos:</strong>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
              <li><strong>PDF:</strong> Documento listo para imprimir o compartir</li>
              <li><strong>HTML:</strong> Página web que puedes abrir en cualquier navegador</li>
              <li><strong>JSON:</strong> Datos estructurados para análisis externos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExporter; 