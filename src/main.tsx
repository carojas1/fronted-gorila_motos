import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

/* Solo activa Google OAuth si hay un Client ID válido configurado */
const AppWrapper = GOOGLE_CLIENT_ID
  ? () => (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    )
  : () => <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Boundary global: si algo falla a nivel raíz, no deja pantalla blanca total */}
    <ErrorBoundary>
      <AppWrapper />
    </ErrorBoundary>
  </StrictMode>
);
