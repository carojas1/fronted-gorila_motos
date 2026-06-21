import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'gm_terms_v1';

export function useTermsAccepted() {
  return localStorage.getItem(STORAGE_KEY) === 'accepted';
}

export function acceptTerms() {
  localStorage.setItem(STORAGE_KEY, 'accepted');
}

const PUNTOS = [
  'Gestionamos tus datos de taller conforme a la Ley LOPDP del Ecuador.',
  'Tus datos (clientes, motos, órdenes) son privados y solo visibles para el personal autorizado.',
  'La información de facturación se conserva según normativa SRI Ecuador.',
  'Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento.',
  'El servicio se presta bajo los Términos de Uso de Gorila Motos.',
];

interface Props {
  onAccept: () => void;
}

export default function TermsModal({ onAccept }: Props) {
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Pequeño delay para que el dashboard cargue primero
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleAccept = () => {
    setChecking(true);
    setTimeout(() => {
      acceptTerms();
      setVisible(false);
      setTimeout(onAccept, 300);
    }, 400);
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 280ms ease',
      }}>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 480,
          background: '#0F0F14',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          animation: 'slideUp 300ms cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative',
        }}>

          {/* Icono */}
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(225,20,40,0.1)',
            border: '1px solid rgba(225,20,40,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Shield size={24} color="#E11428" />
          </div>

          {/* Título */}
          <h2 style={{
            color: '#fff', fontWeight: 900, fontSize: 22,
            margin: '0 0 6px', letterSpacing: '-0.025em', lineHeight: 1.1,
          }}>
            Términos del servicio
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>
            Antes de continuar, por favor revisa y acepta los términos de uso de{' '}
            <span style={{ color: '#fff', fontWeight: 700 }}>Gorila Motos</span>.
          </p>

          {/* Puntos clave */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '16px 18px',
            marginBottom: 22,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {PUNTOS.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <CheckCircle2 size={14} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{p}</span>
              </div>
            ))}
          </div>

          {/* Links */}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 20, lineHeight: 1.7 }}>
            Al continuar aceptas nuestra{' '}
            <Link
              to="/privacidad"
              target="_blank"
              style={{ color: '#E11428', textDecoration: 'none', fontWeight: 600 }}
            >
              Política de Privacidad
            </Link>
            {' '}y los{' '}
            <Link
              to="/terminos"
              target="_blank"
              style={{ color: '#E11428', textDecoration: 'none', fontWeight: 600 }}
            >
              Términos de Uso
            </Link>
            {' '}conforme a la normativa ecuatoriana (LOPDP · SRI).
          </p>

          {/* Botón aceptar */}
          <button
            onClick={handleAccept}
            disabled={checking}
            style={{
              width: '100%', height: 50, borderRadius: 12,
              background: checking
                ? 'rgba(225,20,40,0.5)'
                : 'linear-gradient(135deg,#E11428 0%,#C0101E 100%)',
              color: '#fff', fontWeight: 700, fontSize: 15,
              border: 'none', cursor: checking ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: checking ? 'none' : '0 6px 24px rgba(225,20,40,0.4)',
              transition: 'all 200ms ease',
              letterSpacing: '-0.01em',
            }}
          >
            {checking ? (
              <>
                <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Registrando aceptación…
              </>
            ) : (
              <>
                <CheckCircle2 size={17} />
                Acepto los términos y condiciones
              </>
            )}
          </button>

          {/* Nota inferior */}
          <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 14 }}>
            Solo se muestra una vez · Gorila Motos © 2025 · Ecuador
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(32px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes spin    { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
      `}</style>
    </>
  );
}
