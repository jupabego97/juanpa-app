import { Routes, Route, Link, NavLink } from 'react-router-dom';
import './App.css'; // Puedes mantener o modificar los estilos globales
import 'react-tooltip/dist/react-tooltip.css'; // Importar CSS de react-tooltip
import { Tooltip } from 'react-tooltip';      // Importar Tooltip

// Importa las páginas/componentes que usarás en las rutas
import DeckListPage from './pages/DeckListPage'; 
import CreateDeckPage from './pages/CreateDeckPage'; 
import DeckDetailPage from './pages/DeckDetailPage'; 
import CreateCardPage from './pages/CreateCardPage'; 
import ReviewPage from './pages/ReviewPage'; 
import StatsPage from './pages/StatsPage'; 
import ImportPage from './pages/ImportPage'; 
import EditDeckPage from './pages/EditDeckPage'; 
import EditCardPage from './pages/EditCardPage'; // Importar EditCardPage
import QuickCapturePage from './pages/QuickCapturePage'; // Importar QuickCapturePage
import SettingsPage from './pages/SettingsPage'; // Importar SettingsPage
import AIGeneratorPage from './pages/AIGeneratorPage'; // Importar AIGeneratorPage
import HelpPage from './pages/HelpPage'; // Importar HelpPage
import SyncButton from './components/SyncButton'; // Importar SyncButton
import OfflineIndicator from './components/OfflineIndicator'; // Importar OfflineIndicator

function SomeOtherPage() { // Componente de ejemplo, se puede mantener o eliminar
  return (
    <div>
      <h2>Otra Página</h2>
      <p>Contenido de otra página.</p>
      <Link to="/">Volver a Inicio</Link>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <div className="App">
      <OfflineIndicator />
      <header className="app-nav">
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <NavLink to="/" end>
              <span role="img" aria-label="Inicio" className="nav-icon">🏠</span> Inicio
            </NavLink>
            <NavLink to="/decks/new" className={({ isActive }) => isActive ? "active nav-button-compact" : "nav-button-compact"}>
              <span role="img" aria-label="Crear Mazo" className="nav-icon">➕</span> Crear
            </NavLink>
            <NavLink to="/quick-capture" className={({ isActive }) => isActive ? "active nav-button-compact" : "nav-button-compact"}>
              <span role="img" aria-label="Captura OCR" className="nav-icon">📸</span> OCR
            </NavLink>
            <NavLink to="/ai-generator" className={({ isActive }) => isActive ? "active nav-button-compact" : "nav-button-compact"}>
              <span role="img" aria-label="IA Generador" className="nav-icon">🤖</span> IA
            </NavLink>
            <NavLink to="/review">
              <span role="img" aria-label="Repasar" className="nav-icon">🔄</span> Repasar
            </NavLink>
            <NavLink to="/stats">
              <span role="img" aria-label="Estadísticas" className="nav-icon">📊</span> Stats
            </NavLink>
            <NavLink to="/import" className={({ isActive }) => isActive ? "active nav-button-compact" : "nav-button-compact"}>
              <span role="img" aria-label="Importar" className="nav-icon">📥</span> Import
            </NavLink>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NavLink to="/settings" className={({ isActive }) => isActive ? "active nav-button-compact" : "nav-button-compact"}>
              <span role="img" aria-label="Configuraciones" className="nav-icon">⚙️</span>
            </NavLink>
            <NavLink to="/help" className={({ isActive }) => isActive ? "active nav-button-compact" : "nav-button-compact"}>
              <span role="img" aria-label="Ayuda" className="nav-icon">📖</span>
            </NavLink>
            <SyncButton showStatus={false} />
          </div>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<DeckListPage />} />
          <Route path="/decks/new" element={<CreateDeckPage />} />
          <Route path="/decks/:deckId" element={<DeckDetailPage />} />
          <Route path="/decks/:deckId/edit" element={<EditDeckPage />} /> 
          <Route path="/cards/create" element={<CreateCardPage />} />
          <Route path="/cards/edit/:cardId" element={<EditCardPage />} />
          <Route path="/quick-capture" element={<QuickCapturePage />} />
          <Route path="/ai-generator" element={<AIGeneratorPage />} />
          <Route path="/study/:deckId" element={<ReviewPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/stats" element={<StatsPage />} /> 
          <Route path="/import" element={<ImportPage />} /> 
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/some-other-page" element={<SomeOtherPage />} /> 
        </Routes>
      </main>
      <footer>
        {/* Pie de página si es necesario */}
      </footer>
      <Tooltip id="heatmap-tooltip" /> {/* Añadir el componente Tooltip aquí */}
    </div>
  );
}

export default App;
