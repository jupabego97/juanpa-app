import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TutorialStepProps {
  number: number;
  title: string;
  description: string;
  image?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const TutorialStep: React.FC<TutorialStepProps> = ({ number, title, description, image, action }) => (
  <div style={{
    display: 'flex',
    gap: '20px',
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '16px'
  }}>
    <div style={{
      minWidth: '40px',
      height: '40px',
      backgroundColor: '#3b82f6',
      color: 'white',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: '600'
    }}>
      {number}
    </div>
    <div style={{ flex: 1 }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
        {title}
      </h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          {action.label}
        </button>
      )}
    </div>
    {image && (
      <div style={{
        width: '120px',
        height: '80px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px'
      }}>
        {image}
      </div>
    )}
  </div>
);

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    marginBottom: '8px',
    overflow: 'hidden'
  }}>
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px 20px',
        backgroundColor: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '16px',
        fontWeight: '500',
        color: '#1f2937'
      }}
    >
      {question}
      <span style={{ 
        fontSize: '20px',
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease'
      }}>
        ▼
      </span>
    </button>
    {isOpen && (
      <div style={{
        padding: '0 20px 16px 20px',
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: '1.6',
        borderTop: '1px solid #f3f4f6'
      }}>
        {answer}
      </div>
    )}
  </div>
);

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  linkText: string;
  linkAction: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, linkText, linkAction }) => (
  <div style={{
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
    <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
      {title}
    </h3>
    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
      {description}
    </p>
    <button
      onClick={linkAction}
      style={{
        padding: '8px 16px',
        backgroundColor: '#f3f4f6',
        color: '#374151',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer'
      }}
    >
      {linkText}
    </button>
  </div>
);

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tutorial' | 'faq' | 'features' | 'tips'>('tutorial');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const tabs = [
    { key: 'tutorial', label: '📚 Tutorial', description: 'Guía paso a paso' },
    { key: 'faq', label: '❓ FAQ', description: 'Preguntas frecuentes' },
    { key: 'features', label: '⭐ Funcionalidades', description: 'Explora características' },
    { key: 'tips', label: '💡 Consejos', description: 'Optimiza tu estudio' }
  ];

  const tutorialSteps = [
    {
      number: 1,
      title: 'Crea tu primer mazo',
      description: 'Comienza organizando tus tarjetas en mazos temáticos. Un mazo puede contener tarjetas sobre un tema específico como "Matemáticas" o "Historia".',
      image: '📚',
      action: {
        label: 'Crear Mazo',
        onClick: () => navigate('/decks/new')
      }
    },
    {
      number: 2,
      title: 'Añade tarjetas a tu mazo',
      description: 'Crea tarjetas con preguntas en el anverso y respuestas en el reverso. Puedes usar texto, imágenes, audio y formato cloze.',
      image: '📝',
      action: {
        label: 'Crear Tarjeta',
        onClick: () => navigate('/cards/create')
      }
    },
    {
      number: 3,
      title: 'Comienza a estudiar',
      description: 'Usa el sistema de repaso para estudiar tus tarjetas. El algoritmo FSRS optimizará automáticamente cuándo revisar cada tarjeta.',
      image: '🎯',
      action: {
        label: 'Ir a Repaso',
        onClick: () => navigate('/review')
      }
    },
    {
      number: 4,
      title: 'Captura contenido con OCR',
      description: 'Usa la cámara para capturar texto de libros, apuntes o pizarras y convertirlos automáticamente en tarjetas.',
      image: '📸',
      action: {
        label: 'Capturar OCR',
        onClick: () => navigate('/quick-capture')
      }
    },
    {
      number: 5,
      title: 'Revisa tus estadísticas',
      description: 'Monitorea tu progreso con gráficos detallados, heatmaps de actividad y análisis de rendimiento por mazo.',
      image: '📊',
      action: {
        label: 'Ver Estadísticas',
        onClick: () => navigate('/stats')
      }
    },
    {
      number: 6,
      title: 'Genera tarjetas con IA',
      description: 'Sube un PDF y deja que la IA genere tarjetas automáticamente basándose en el contenido del documento.',
      image: '🤖',
      action: {
        label: 'Generar con IA',
        onClick: () => navigate('/ai-generator')
      }
    }
  ];

  const faqItems = [
    {
      question: '¿Qué es la repetición espaciada?',
      answer: 'La repetición espaciada es una técnica de aprendizaje que programa las revisiones de material en intervalos de tiempo crecientes. Esto optimiza la retención a largo plazo basándose en la curva del olvido de Ebbinghaus.'
    },
    {
      question: '¿Cómo funciona el algoritmo FSRS?',
      answer: 'FSRS (Free Spaced Repetition Scheduler) es un algoritmo avanzado que calcula cuándo debes revisar cada tarjeta basándose en tu historial de respuestas, la dificultad del material y tu tasa de retención deseada.'
    },
    {
      question: '¿Qué son las tarjetas cloze?',
      answer: 'Las tarjetas cloze presentan texto con palabras o frases ocultas que debes completar. Por ejemplo: "La capital de {{c1::Francia}} es {{c2::París}}". Son muy efectivas para memorizar información factual.'
    },
    {
      question: '¿Puedo usar JuanPA sin conexión a internet?',
      answer: 'Sí, JuanPA funciona completamente offline. Todos tus datos se guardan localmente y se sincronizan automáticamente cuando vuelvas a tener conexión.'
    },
    {
      question: '¿Cómo importo mis tarjetas existentes?',
      answer: 'Puedes importar tarjetas desde archivos Markdown o CSV. Ve a la página de importación y sigue las instrucciones para el formato correcto.'
    },
    {
      question: '¿Qué formatos de archivo soporta el OCR?',
      answer: 'El OCR funciona con imágenes capturadas directamente con la cámara. Puede reconocer texto en múltiples idiomas y extraer contenido de libros, apuntes, pizarras y documentos.'
    },
    {
      question: '¿Cómo interpreto las estadísticas?',
      answer: 'Las estadísticas muestran tu progreso de aprendizaje. La racha indica días consecutivos de estudio, la precisión muestra tu porcentaje de respuestas correctas, y el heatmap visualiza tu constancia.'
    },
    {
      question: '¿Puedo personalizar los intervalos de repaso?',
      answer: 'Sí, puedes ajustar los parámetros del algoritmo FSRS en la configuración, incluyendo la retención deseada y el intervalo máximo entre revisiones.'
    }
  ];

  const features = [
    {
      icon: '📚',
      title: 'Mazos Organizados',
      description: 'Organiza tus tarjetas en mazos temáticos para un aprendizaje estructurado',
      linkText: 'Ver mis mazos',
      linkAction: () => navigate('/')
    },
    {
      icon: '🧠',
      title: 'Algoritmo FSRS',
      description: 'Optimización automática de intervalos de repaso basada en ciencia cognitiva',
      linkText: 'Aprender más',
      linkAction: () => setActiveTab('faq')
    },
    {
      icon: '📱',
      title: 'Funciona Offline',
      description: 'Estudia sin conexión con sincronización automática cuando esté disponible',
      linkText: 'Ver configuración',
      linkAction: () => navigate('/settings')
    },
    {
      icon: '📸',
      title: 'OCR Inteligente',
      description: 'Captura texto de imágenes y conviértelo automáticamente en tarjetas',
      linkText: 'Probar OCR',
      linkAction: () => navigate('/quick-capture')
    },
    {
      icon: '🤖',
      title: 'IA Generativa',
      description: 'Genera tarjetas automáticamente desde documentos PDF usando inteligencia artificial',
      linkText: 'Generar tarjetas',
      linkAction: () => navigate('/ai-generator')
    },
    {
      icon: '📊',
      title: 'Estadísticas Avanzadas',
      description: 'Analiza tu progreso con gráficos detallados y métricas de rendimiento',
      linkText: 'Ver estadísticas',
      linkAction: () => navigate('/stats')
    }
  ];

  const studyTips = [
    {
      title: '⏰ Estudia regularmente',
      description: 'Es mejor estudiar 15 minutos diarios que 2 horas una vez por semana. La constancia es clave para la retención a largo plazo.'
    },
    {
      title: '🎯 Sé específico',
      description: 'Crea tarjetas con preguntas específicas y respuestas concisas. Evita tarjetas con demasiada información.'
    },
    {
      title: '🔄 Reformula las preguntas',
      description: 'Crea múltiples tarjetas para el mismo concepto desde diferentes ángulos para fortalecer tu comprensión.'
    },
    {
      title: '📝 Usa tus propias palabras',
      description: 'Reformula la información con tus propias palabras en lugar de copiar textualmente. Esto mejora la comprensión.'
    },
    {
      title: '🖼️ Añade elementos visuales',
      description: 'Incluye imágenes, diagramas o esquemas cuando sea posible. La memoria visual es muy poderosa.'
    },
    {
      title: '🏷️ Organiza con etiquetas',
      description: 'Usa etiquetas para categorizar tus tarjetas. Esto te ayuda a filtrar y organizar mejor tu contenido.'
    },
    {
      title: '💡 Entiende antes de memorizar',
      description: 'Asegúrate de entender el concepto antes de crear la tarjeta. La comprensión facilita la memorización.'
    },
    {
      title: '📈 Revisa tus estadísticas',
      description: 'Usa las métricas para identificar áreas donde necesitas más práctica y ajustar tu estrategia de estudio.'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tutorial':
        return (
          <div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
              🚀 Comienza tu aventura de aprendizaje
            </h3>
            <p style={{ margin: '0 0 32px 0', fontSize: '16px', color: '#6b7280' }}>
              Sigue estos pasos para aprovechar al máximo JuanPA y optimizar tu proceso de estudio.
            </p>
            {tutorialSteps.map((step, index) => (
              <TutorialStep key={index} {...step} />
            ))}
          </div>
        );

      case 'faq':
        return (
          <div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
              ❓ Preguntas Frecuentes
            </h3>
            <p style={{ margin: '0 0 32px 0', fontSize: '16px', color: '#6b7280' }}>
              Encuentra respuestas a las preguntas más comunes sobre JuanPA.
            </p>
            {faqItems.map((item, index) => (
              <FAQItem
                key={index}
                question={item.question}
                answer={item.answer}
                isOpen={openFAQ === index}
                onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
              />
            ))}
          </div>
        );

      case 'features':
        return (
          <div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
              ⭐ Funcionalidades Principales
            </h3>
            <p style={{ margin: '0 0 32px 0', fontSize: '16px', color: '#6b7280' }}>
              Descubre todas las herramientas que JuanPA pone a tu disposición para optimizar tu aprendizaje.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {features.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        );

      case 'tips':
        return (
          <div>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
              💡 Consejos para Estudiar Mejor
            </h3>
            <p style={{ margin: '0 0 32px 0', fontSize: '16px', color: '#6b7280' }}>
              Estrategias comprobadas para maximizar la efectividad de tu estudio con tarjetas de memoria.
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '16px'
            }}>
              {studyTips.map((tip, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {tip.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                    {tip.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: 'auto', padding: '20px' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '800', color: '#1f2937' }}>
          📖 Centro de Ayuda
        </h1>
        <p style={{ margin: 0, fontSize: '18px', color: '#6b7280' }}>
          Todo lo que necesitas saber para dominar JuanPA
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
            onClick={() => setActiveTab(tab.key as any)}
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
              minWidth: '140px',
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{ marginBottom: '4px' }}>{tab.label}</span>
            <span style={{ 
              fontSize: '11px', 
              opacity: 0.8,
              textAlign: 'center'
            }}>
              {tab.description}
            </span>
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      <div style={{ minHeight: '500px' }}>
        {renderTabContent()}
      </div>

      {/* Footer con recursos adicionales */}
      <div style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
              🔬 Ciencia del Aprendizaje
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', lineHeight: '1.5' }}>
              JuanPA está basado en décadas de investigación en ciencia cognitiva, incluyendo los trabajos de Hermann Ebbinghaus sobre la curva del olvido y los principios de la repetición espaciada.
            </p>
          </div>

          <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#166534' }}>
              📚 Recursos Adicionales
            </h4>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '16px', fontSize: '14px', color: '#166534' }}>
              <li>Documentación técnica del algoritmo FSRS</li>
              <li>Estudios científicos sobre repetición espaciada</li>
              <li>Comunidad de usuarios en línea</li>
              <li>Tutoriales en video</li>
            </ul>
          </div>

          <div style={{ padding: '20px', backgroundColor: '#fef7ed', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#c2410c' }}>
              🤝 Soporte
            </h4>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#c2410c', lineHeight: '1.5' }}>
              ¿Necesitas ayuda adicional? No dudes en contactarnos:
            </p>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '14px', color: '#c2410c' }}>
              <li>Email: soporte@juanpa.app</li>
              <li>Telegram: @JuanPASupport</li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
          JuanPA v1.0 • Sistema de Repetición Espaciada • Hecho con ❤️ para estudiantes ambiciosos
        </div>
      </div>
    </div>
  );
};

export default HelpPage; 