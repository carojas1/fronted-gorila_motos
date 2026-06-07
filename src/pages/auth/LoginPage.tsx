/* ─────────────────────────────────────────────────────────────
   GMotors — Login Page v6
   Layout cinematográfico: moto como escena, no como elemento
   Marca grande, atmósfera roja, mobile-first
   Emil Kowalski: spring, stagger, purposeful motion
   Google: signInWithRedirect (sin errores COOP)
   ───────────────────────────────────────────────────────────── */

import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';
import { firebaseEnabled, startGoogleRedirect, getGoogleRedirectUser } from '../../lib/firebase';

const Bike3D = lazy(() => import('../../components/3d/Bike3D'));

/* ─── Schema ─── */
const schema = z.object({
  correo:     z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
type Form = z.infer<typeof schema>;

/* ─── Server status ─── */
type ServerStatus = 'checking' | 'online' | 'starting' | 'offline';

function useServerStatus(): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>('checking');
  useEffect(() => {
    const API  = import.meta.env.VITE_API_URL ?? 'https://backend-gorila-motos.onrender.com/api';
    const ctrl = new AbortController();
    const id   = setTimeout(() => setStatus('starting'), 7000);
    fetch(`${API}/actuator/health`, { signal: ctrl.signal })
      .then(r => {
        clearTimeout(id);
        // 401/403 = servidor activo, solo endpoint protegido → OK
        setStatus(r.ok || r.status === 401 || r.status === 403 ? 'online' : 'starting');
      })
      .catch((e: Error) => {
        clearTimeout(id);
        if (e.name !== 'AbortError') setStatus('starting');
      });
    return () => { clearTimeout(id); ctrl.abort(); };
  }, []);
  return status;
}

/* ─── Logo gorila ─── */
function Logo({ size = 44 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: 'linear-gradient(135deg,#E11428,#7A000D)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
      boxShadow: `0 0 0 1px rgba(225,20,40,0.35), 0 ${size * 0.1}px ${size * 0.4}px rgba(225,20,40,0.2)`,
    }}>
      {ok
        ? <img src="/brand/gorila-logo.png" alt="" onError={() => setOk(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        : <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>🦍</span>}
    </div>
  );
}

/* ─── Google icon SVG ─── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/* ─── Spinner inline ─── */
function Spinner({ color = 'white', size = 16 }: { color?: string; size?: number }) {
  return (
    <svg style={{ animation: 'gm-spin 0.8s linear infinite', flexShrink: 0 }}
      width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(10,10,10,0.15)'} strokeWidth="3"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { login, processGoogleUser, loading, user, token } = useAuth();
  const navigate     = useNavigate();
  const toast        = useToast();
  const [params]     = useSearchParams();
  const serverStatus = useServerStatus();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [entered,    setEntered]    = useState(false);

  /* ── Navegación REACTIVA — se dispara cuando el contexto tiene sesión válida ──
     Esto resuelve el race-condition entre setState del contexto y navigate:
     en lugar de navegar dentro del callback async, observamos el estado. */
  useEffect(() => {
    if (user && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, token, navigate]);

  /* Spring entrance */
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* Notificación verificación */
  useEffect(() => {
    if (params.get('verified') === '1')
      toast.success('¡Correo verificado! Ahora puedes iniciar sesión.', 'Email confirmado');
  }, []);

  /* Resultado del Google redirect — procesamos, la navegación la hace el effect de arriba */
  useEffect(() => {
    if (!firebaseEnabled || !processGoogleUser) return;
    let cancelled = false;
    setGoogleBusy(true);
    getGoogleRedirectUser()
      .then(async fbUser => {
        if (!fbUser || cancelled) return;
        try {
          await processGoogleUser(fbUser);
          // navigate ocurre en el useEffect de user+token de arriba
        } catch (err) {
          if (!cancelled) toast.error(getErrorMsg(err), 'Error con Google');
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setGoogleBusy(false); });
    return () => { cancelled = true; };
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = useCallback(async ({ correo, contrasena }: Form) => {
    try {
      await login(correo, contrasena);
      // navigate ocurre en el useEffect de user+token
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error de acceso');
    }
  }, [login, toast]);

  const handleGoogle = () => {
    setGoogleBusy(true);
    startGoogleRedirect().catch(err => {
      toast.error(getErrorMsg(err), 'Error al iniciar Google');
      setGoogleBusy(false);
    });
  };

  /* Status */
  const statusMap = {
    checking: { dot: '#555',    text: 'Verificando…',          pulse: true  },
    online:   { dot: '#22C55E', text: 'Sistema en línea',      pulse: false },
    starting: { dot: '#F59E0B', text: 'Servidor iniciando…',   pulse: true  },
    offline:  { dot: '#555',    text: 'Sin conexión',          pulse: false },
  };
  const st = statusMap[serverStatus];

  /* Spring entrance helper */
  const enter = (delay: number): React.CSSProperties => ({
    opacity:    entered ? 1 : 0,
    transform:  entered ? 'none' : 'translateY(16px)',
    transition: `opacity 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms,
                 transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
  });

  const isLoading = loading || googleBusy;

  return (
    <div style={{
      minHeight: '100vh',
      display:   'flex',
      background: '#0A0A0A',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow:   'hidden',
    }}>

      {/* ════════════════════════════════════════
          PANEL IZQUIERDO — escena cinematográfica
          Solo desktop (lg+)
          ════════════════════════════════════════ */}
      <div
        className="hidden lg:block"
        style={{
          width: '56%', position: 'relative', overflow: 'hidden',
          background: '#060608',
          flexShrink: 0,
        }}
      >
        {/* Atmósfera: glow rojo central */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 85% 70% at 52% 48%, rgba(225,20,40,0.08) 0%, transparent 68%)',
        }}/>

        {/* Viñeta lateral izquierda */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(6,6,8,0.7) 0%, transparent 30%, transparent 70%, rgba(6,6,8,0.4) 100%)',
        }}/>

        {/* MARCA — top-left, más grande y poderosa */}
        <div style={{
          position: 'absolute', top: 32, left: 36, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'gm-fadein 0.6s ease both',
        }}>
          <Logo size={56}/>
          <div>
            <p style={{
              fontFamily: "'Dancing Script', cursive",
              fontWeight: 700, fontSize: 30,
              margin: 0, lineHeight: 1, color: '#EBEBEB',
              letterSpacing: '-0.01em',
            }}>
              Gorila Motos
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.28)', fontSize: 11,
              margin: '4px 0 0', fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Gestión de talleres
            </p>
          </div>
        </div>

        {/* MOTO 3D — sin caja, sin borde, cinemática */}
        {/* El overflow negativo + overflow:hidden en el padre crean el crop cinematográfico */}
        <div style={{
          position: 'absolute',
          top: '6%', left: '-18%', right: '-18%', bottom: '20%',
          zIndex: 1,
        }}>
          <Suspense fallback={
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spinner color="#E11428" size={32}/>
            </div>
          }>
            <Bike3D/>
          </Suspense>
        </div>

        {/* Reflejo del suelo — glow rojo bajo la moto */}
        <div style={{
          position: 'absolute',
          bottom: '19%', left: '15%', right: '15%', height: 80,
          zIndex: 2, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 100% at 50% 100%, rgba(225,20,40,0.2) 0%, transparent 100%)',
          filter: 'blur(18px)',
        }}/>

        {/* Fade inferior — para leer el texto */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '28%', zIndex: 3, pointerEvents: 'none',
          background: 'linear-gradient(to top, #060608 0%, rgba(6,6,8,0.92) 45%, transparent 100%)',
        }}/>

        {/* TEXTO INFERIOR — grande, impactante */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0 36px 34px', zIndex: 4,
          animation: 'gm-fadein 0.8s 0.2s ease both',
        }}>
          <p style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.25)', margin: '0 0 8px',
          }}>
            Sistema profesional
          </p>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(56px,6vw,82px)',
            lineHeight: 0.9, letterSpacing: '0.01em',
            margin: '0 0 18px', color: '#EBEBEB',
          }}>
            Tu taller,<br/>
            <span style={{ color: '#E11428' }}>en control.</span>
          </h1>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {['Órdenes', 'Inventario', 'Facturación SRI', 'App móvil'].map(f => (
              <span key={f} style={{
                fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 99, padding: '5px 13px',
                letterSpacing: '0.02em',
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          PANEL DERECHO — formulario
          Full-screen en mobile
          ════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '32px 24px 40px', overflowY: 'auto',
        background: '#0A0A0A',
        borderLeft: '1px solid rgba(255,255,255,0.04)',
        minWidth: 0,
      }}>

        {/* ── HERO MOBILE — solo se ve en pantallas pequeñas ── */}
        <div className="flex lg:hidden" style={{
          flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          width: '100%', maxWidth: 380, marginBottom: 36,
          ...enter(0),
        }}>
          <Logo size={80}/>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 42, letterSpacing: '0.05em',
            color: '#EBEBEB', margin: '16px 0 4px', lineHeight: 1,
          }}>
            Gorila Motos
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, margin: '0 0 20px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Gestión de talleres · Ecuador
          </p>
          <div style={{ width: 40, height: 2, background: '#E11428', borderRadius: 99, opacity: 0.8 }}/>
        </div>

        {/* ── CONTENIDO FORMULARIO ── */}
        <div style={{ width: '100%', maxWidth: 356 }}>

          {/* Status servidor */}
          <div style={{ marginBottom: 22, ...enter(0) }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: st.dot,
                animation: st.pulse ? 'gm-pulse 1.6s ease-in-out infinite' : 'none',
                boxShadow: st.pulse ? `0 0 7px ${st.dot}` : 'none',
              }}/>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                {st.text}
              </span>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 26, ...enter(60) }}>
            <h2 style={{
              color: '#EBEBEB', fontWeight: 800, fontSize: 26,
              margin: '0 0 7px', letterSpacing: '-0.04em', lineHeight: 1.05,
            }}>
              Accede al sistema
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13.5, margin: 0, lineHeight: 1.65 }}>
              Ingresa con tu cuenta de Google o con tu correo.
            </p>
          </div>

          {/* Google — acción primaria */}
          {firebaseEnabled && (
            <div style={{ marginBottom: 18, ...enter(110) }}>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                style={{
                  width: '100%', height: 50,
                  background: isLoading ? 'rgba(255,255,255,0.75)' : '#FFFFFF',
                  color: '#111', fontWeight: 600, fontSize: 14,
                  border: 'none', borderRadius: 11,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 160ms cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => {
                  if (!isLoading) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform  = 'translateY(-1px)';
                    el.style.boxShadow  = '0 6px 20px rgba(0,0,0,0.6)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = '';
                  el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.5)';
                }}
                onMouseDown={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
                onMouseUp={e   => { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {isLoading && googleBusy
                  ? <Spinner color="#111" size={18}/>
                  : <GoogleIcon/>}
                Continuar con Google
              </button>
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, ...enter(150) }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }}/>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500, letterSpacing: '0.04em' }}>
              {firebaseEnabled ? 'o con correo' : 'Ingresa con tu cuenta'}
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }}/>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div style={enter(180)}>
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@correo.com"
                prefix={<Mail size={14}/>}
                error={errors.correo?.message}
                autoComplete="email"
                {...register('correo')}
              />
            </div>

            <div style={enter(210)}>
              <Input
                label="Contraseña"
                type="password"
                placeholder="Tu contraseña"
                prefix={<Lock size={14}/>}
                error={errors.contrasena?.message}
                autoComplete="current-password"
                {...register('contrasena')}
              />
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <Link
                  to="/recuperar"
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', textDecoration: 'none', fontWeight: 500 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <div style={{ marginTop: 4, ...enter(240) }}>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%', height: 50, borderRadius: 11,
                  background: isLoading ? 'rgba(225,20,40,0.4)' : '#E11428',
                  color: '#fff', fontWeight: 700, fontSize: 15,
                  letterSpacing: '-0.01em', border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: isLoading ? 'none' : '0 0 0 1px rgba(225,20,40,0.35)',
                  transition: 'all 160ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => {
                  if (!isLoading) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = '#FF1F37';
                    el.style.transform  = 'translateY(-1px)';
                    el.style.boxShadow  = '0 6px 24px rgba(225,20,40,0.5)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = isLoading ? 'rgba(225,20,40,0.4)' : '#E11428';
                  el.style.transform  = '';
                  el.style.boxShadow  = isLoading ? 'none' : '0 0 0 1px rgba(225,20,40,0.35)';
                }}
                onMouseDown={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
                onMouseUp={e   => { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {loading && !googleBusy
                  ? <><Spinner size={16}/> Verificando…</>
                  : <>Iniciar sesión <ArrowRight size={15}/></>}
              </button>
            </div>
          </form>

          {/* Link registro */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.28)', ...enter(280) }}>
            ¿Primera vez?{' '}
            <Link
              to="/registro"
              style={{ color: '#EBEBEB', fontWeight: 700, textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#EBEBEB'; }}
            >
              Crear cuenta
            </Link>
          </p>

          {/* Legal */}
          <div style={{ marginTop: 24, textAlign: 'center', ...enter(310) }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
              <Shield size={9} color="rgba(255,255,255,0.1)"/>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.13)' }}>SSL · LOPDP Ecuador</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              {[{ label: 'Privacidad', to: '/privacidad' }, { label: 'Términos', to: '/terminos' }].map(({ label, to }) => (
                <Link key={to} to={to}
                  style={{ fontSize: 10, color: 'rgba(255,255,255,0.16)', textDecoration: 'none' }}>
                  {label}
                </Link>
              ))}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)' }}>© 2025</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gm-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes gm-pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.6)} }
        @keyframes gm-fadein  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}
