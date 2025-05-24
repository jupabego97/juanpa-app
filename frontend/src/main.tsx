import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { SyncProvider } from './contexts/SyncContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SyncProvider>
      <App />
      </SyncProvider>
    </BrowserRouter>
  </StrictMode>,
);
