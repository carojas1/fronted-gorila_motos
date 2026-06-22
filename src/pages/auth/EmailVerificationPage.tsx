/* ─────────────────────────────────────────────
   GMotors — Página de verificación de email
   Se muestra tras el registro con Firebase
   ───────────────────────────────────────────── */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../lib/theme';
import { Mail, RefreshCw, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { authApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import {
  checkEmailVerified,
  resendVerificationEmail,
  firebaseSignIn,
  firebaseSignOut,
} from '../../lib/firebase';

function GorilaLogo({ size = 52 }: { size?: number }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25,
      background: 'linear-gradient(135deg,#E11428,#7a000e)',
      boxShadow: '0 0 32px rgba(225,20,40,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {imgOk ? (
        <img
          src="/brand/gorila-logo.png"
          alt="Gorila Motos"
          onError={() => setImgOk(false)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: size * 0.48, lineHeight: 1 }}>🦍</span>
      )}
    </div>
  );
}

export default function EmailVerificationPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const [theme]   = useTheme();
  const isDark    = theme === 'dark';

  const [checking,  setChecking]  = useState(false);
  const [resending, setResending] = useState(false);
  const [verified,  setVerified]  = useState(false);
  const [countdown, setCountdown] = useState(60); // segundos para reenvío
  const [canResend, setCanResend] = useState(false);

  /* Recuperar datos del registro pendiente */
  const pendingRaw = sessionStorage.getItem('gm_pending_register');
  const pending    = pendingRaw ? JSON.parse(pendingRaw) as {
    nombre_completo: string; correo: string;
    telefono: string; contrasena: string;
  } : null;

  /* Si no hay datos pendientes → redirigir a login */
  useEffect(() => {
    if (!pending) navigate('/login', { replace: true });
  }, []);

  /* Cuenta regresiva para reenvío */
  useEffect(() => {
    if (canResend) return;
    if (countdown <= 0) { setCanResend(true); return; }
    const id = setTimeout(() => setCountdown(v => v - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, canResend]);

  const handleCheckVerified = async () => {
    if (!pending) return;
    setChecking(true);
    try {
      /* Re-iniciar sesión Firebase para refrescar el estado */
      await firebaseSignIn(pending.correo, pending.contrasena);
      const ok = await checkEmailVerified();

      if (!ok) {
        toast.error('Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada.', 'No verificado');
        setChecking(false);
        return;
      }

      /* ── Email verificado → crear usuario en el backend ── */
      setVerified(true);
      await authApi.register({
        nombre_completo: pending.nombre_completo,
        nombre_usuario:  pending.correo.split('@')[0],
        correo:          pending.correo,
        contrasena:      pending.contrasena,
        pais:            'Ecuador',
        ciudad:          'Ecuador',
        descripcion:     `CEDULA: N/A | TELEFONO: ${pending.telefono}`,
        ruta_imagen:     null,
      });

      sessionStorage.removeItem('gm_pending_register');
      await firebaseSignOut();

      toast.success('¡Cuenta creada! Ya puedes iniciar sesión.', '¡Bienvenido!');
      setTimeout(() => navigate('/login?verified=1', { replace: true }), 1800);
    } catch (err) {
      setVerified(false);
      toast.error(getErrorMsg(err), 'Error');
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !pending) return;
    setResending(true);
    try {
      await firebaseSignIn(pending.correo, pending.contrasena);
      await resendVerificationEmail();
      await firebaseSignOut();
      toast.success('Email de verificación reenviado.', 'Email enviado');
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error al reenviar');
    } finally {
      setResending(false);
    }
  };

  if (!pending) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090C',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* Glow ambiental */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(66,133,244,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 32, justifyContent: 'center' }}>
          <GorilaLogo size={44} />
          <p style={{
            fontFamily: "'Dancing Script', cursive",
            fontWeight: 700, fontSize: 24, margin: 0,
            color: '#FFD700',
            textShadow: '0 0 16px rgba(255,215,0,0.35)',
          }}>
            Gorila Motos
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: isDark ? 'linear-gradient(160deg, #141419 0%, #0F0F14 100%)' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #E4E7EC',
          borderRadius: 22,
          padding: '36px 32px',
          boxShadow: isDark ? '0 28px 70px rgba(0,0,0,0.6)' : '0 28px 70px rgba(0,0,0,0.10)',
          textAlign: 'center',
        }}>

          {/* Icono animado */}
          {verified ? (
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: 'rgba(34,197,94,0.1)',
              border: '2px solid rgba(34,197,94,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 0 40px rgba(34,197,94,0.2)',
            }}>
              <CheckCircle2 size={36} color="#22C55E" />
            </div>
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background: 'rgba(66,133,244,0.1)',
              border: '2px solid rgba(66,133,244,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 0 40px rgba(66,133,244,0.15)',
              animation: 'pulse-mail 2s ease-in-out infinite',
            }}>
              <Mail size={36} color="#4285F4" />
            </div>
          )}

          <h1 style={{
            color: '#fff', fontWeight: 900, fontSize: 24,
            margin: '0 0 10px', letterSpacing: '-0.02em',
          }}>
            {verified ? '¡Email verificado!' : 'Verifica tu correo'}
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 28px', lineHeight: 1.7 }}>
            {verified
              ? 'Tu cuenta ha sido creada. Te redirigiremos al login en un momento…'
              : <>
                  Enviamos un correo de verificación a{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{pending.correo}</strong>.
                  Haz clic en el enlace que te enviamos y luego regresa aquí.
                </>
            }
          </p>

          {!verified && (
            <>
              {/* Pasos */}
              <div style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: '16px 20px', marginBottom: 24,
                textAlign: 'left',
              }}>
                {[
                  '1. Abre tu aplicación de correo electrónico',
                  '2. Busca un email de "Gorila Motos" o "noreply@firebaseapp.com"',
                  '3. Haz clic en "Verificar dirección de correo electrónico"',
                  '4. Regresa aquí y presiona "Ya verifiqué mi correo"',
                ].map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    marginBottom: i < 3 ? 10 : 0,
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, color: '#4285F4',
                      background: 'rgba(66,133,244,0.15)', border: '1px solid rgba(66,133,244,0.25)',
                      borderRadius: 4, padding: '2px 6px', flexShrink: 0, marginTop: 1,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                      {step.slice(3)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Botón principal */}
              <button
                onClick={handleCheckVerified}
                disabled={checking}
                style={{
                  width: '100%', height: 50, borderRadius: 12,
                  background: checking
                    ? 'rgba(225,20,40,0.4)'
                    : 'linear-gradient(135deg,#E11428 0%,#C0101E 100%)',
                  color: '#fff', fontWeight: 700, fontSize: 15,
                  border: 'none', cursor: checking ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: checking ? 'none' : '0 6px 28px rgba(225,20,40,0.38)',
                  transition: 'all 200ms ease', marginBottom: 14,
                  letterSpacing: '-0.01em',
                }}
              >
                {checking ? (
                  <>
                    <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Comprobando verificación…
                  </>
                ) : (
                  <>Ya verifiqué mi correo <ArrowRight size={16}/></>
                )}
              </button>

              {/* Reenvío */}
              <button
                onClick={handleResend}
                disabled={!canResend || resending}
                style={{
                  width: '100%', height: 42, borderRadius: 10,
                  background: 'transparent',
                  border: `1px solid ${canResend ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                  color: canResend ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                  fontSize: 13, fontWeight: 500,
                  cursor: canResend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'all 200ms ease',
                }}
              >
                {resending ? (
                  <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Reenviando…</>
                ) : canResend ? (
                  <><RefreshCw size={14} /> Reenviar email de verificación</>
                ) : (
                  <><Clock size={14} /> Reenviar en {countdown}s</>
                )}
              </button>
            </>
          )}

        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          ¿Correo equivocado?{' '}
          <span
            style={{ color: '#FFD700', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => { sessionStorage.removeItem('gm_pending_register'); navigate('/registro'); }}
          >
            Volver al registro
          </span>
        </p>

      </div>

      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes pulse-mail {
          0%, 100% { box-shadow: 0 0 40px rgba(66,133,244,0.15); transform: scale(1); }
          50% { box-shadow: 0 0 60px rgba(66,133,244,0.3); transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
