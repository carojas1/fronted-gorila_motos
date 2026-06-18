/* ─────────────────────────────────────────────
   GMotors — Error Boundary
   Evita la "pantalla blanca / app congelada": si cualquier
   componente lanza un error en render, se muestra una tarjeta
   de recuperación (en vez de desmontar todo el árbol de React).
   ───────────────────────────────────────────── */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Cambia este valor (p.ej. la ruta) para reintentar automáticamente al navegar. */
  resetKey?: string | number;
  /** Render alternativo. Si se omite, usa la tarjeta por defecto. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log para diagnóstico (visible en la consola del navegador)
    console.error('[GMotors] Error capturado por ErrorBoundary:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    // Al cambiar la ruta (resetKey) → limpiar el error y reintentar render
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{
          maxWidth: 460, width: '100%', textAlign: 'center',
          background: 'linear-gradient(150deg, rgba(30,30,40,0.9) 0%, rgba(22,22,30,0.9) 100%)',
          border: '1px solid rgba(225,20,40,0.25)',
          borderRadius: 20, padding: '36px 28px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(225,20,40,0.12)', border: '1px solid rgba(225,20,40,0.3)',
            fontSize: 28,
          }}>⚠️</div>

          <h2 style={{ color: '#fff', fontSize: 19, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Algo se interrumpió en esta sección
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 22px' }}>
            No te preocupes — tus datos están a salvo. Puedes reintentar esta página o volver al inicio.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.reset}
              style={{
                background: '#E11428', color: '#fff', border: 'none', borderRadius: 11,
                padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 0 0 1px rgba(225,20,40,0.4)',
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 11,
                padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Ir al inicio
            </button>
          </div>

          <details style={{ marginTop: 20, textAlign: 'left' }}>
            <summary style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, cursor: 'pointer', userSelect: 'none' }}>
              Detalle técnico
            </summary>
            <pre style={{
              color: 'rgba(255,120,130,0.7)', fontSize: 11, marginTop: 8,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8,
              maxHeight: 140, overflow: 'auto',
            }}>{error.message}</pre>
          </details>
        </div>
      </div>
    );
  }
}
