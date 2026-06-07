/* ─────────────────────────────────────────────────────────────
   GMotors — Login Page v5
   Minimalista premium: negro · blanco · rojo de marca
   Sin mezcla de colores — una paleta, un acento
   Emil Kowalski: spring hover, stagger, purposeful motion
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
    const API = import.meta.env.VITE_API_URL ?? 'https://backend-gorila-motos.onrender.com/api';
    const ctrl = new AbortController();
    const id   = setTimeout(() => setStatus('starting'), 6000);
    fetch(`${API}/actuator/health`, { signal: ctrl.signal })
      .then(r => { clearTimeout(id); setStatus(r.ok ? 'online' : 'starting'); })
      .catch((e: Error) => { clearTimeout(id); if (e.name !== 'AbortError') setStatus('starting'); });
    return () => { clearTimeout(id); ctrl.abort(); };
  }, []);
  return status;
}

/* ─── Logo ─── */
function Logo({ size = 44 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: 'linear-gradient(135deg,#E11428,#8B0010)',
      boxShadow: '0 0 0 1px rgba(225,20,40,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {ok
        ? <img src="/brand/gorila-logo.png" alt="" onError={() => setOk(false)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : <span style={{ fontSize: size * 0.5, lineHeight:1 }}>🦍</span>}
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

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { login, processGoogleUser, loading } = useAuth();
  const navigate     = useNavigate();
  const toast        = useToast();
  const [params]     = useSearchParams();
  const serverStatus = useServerStatus();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [entered,    setEntered]    = useState(false);

  /* Entrada con spring */
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);

  /* Notificación de verificación */
  useEffect(() => {
    if (params.get('verified') === '1') toast.success('¡Correo verificado! Ahora puedes iniciar sesión.', 'Email confirmado');
  }, []);

  /* ── Manejar resultado del Google redirect ── */
  useEffect(() => {
    if (!firebaseEnabled || !processGoogleUser) return;
    setGoogleBusy(true);
    getGoogleRedirectUser()
      .then(async fbUser => {
        if (!fbUser) return; // No hay redirect pendiente
        try {
          await processGoogleUser(fbUser);
          navigate('/dashboard', { replace: true });
        } catch (err) {
          toast.error(getErrorMsg(err), 'Error con Google');
        }
      })
      .catch(() => {})
      .finally(() => setGoogleBusy(false));
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = useCallback(async ({ correo, contrasena }: Form) => {
    try {
      await login(correo, contrasena);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error de acceso');
    }
  }, [login, navigate, toast]);

  /* Google: iniciar redirect (no popup) */
  const handleGoogle = () => {
    setGoogleBusy(true);
    startGoogleRedirect().catch(err => {
      toast.error(getErrorMsg(err), 'Error al iniciar Google');
      setGoogleBusy(false);
    });
  };

  /* Status colors */
  const statusMap = {
    checking: { dot: '#555', text: 'Verificando servidor…',   pulse: true  },
    online:   { dot: '#22C55E', text: 'Sistema en línea',     pulse: false },
    starting: { dot: '#E11428', text: 'Servidor iniciando…',  pulse: true  },
    offline:  { dot: '#555', text: 'Sin conexión',            pulse: false },
  };
  const st = statusMap[serverStatus];

  /* Spring entrance */
  const enter = (delay: number): React.CSSProperties => ({
    opacity:   entered ? 1 : 0,
    transform: entered ? 'none' : 'translateY(14px)',
    transition: `opacity 0.45s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms,
                 transform 0.45s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
  });

  const isLoading = loading || googleBusy;

  return (
    <div style={{
      height: '100vh', overflow: 'hidden', display: 'flex',
      background: '#0A0A0A',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ════ PANEL IZQUIERDO — 3D moto ════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: '52%', position: 'relative', overflow: 'hidden',
          flexDirection: 'column',
          background: '#050507',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Logo top-left */}
        <div style={{
          position: 'absolute', top: 28, left: 28, zIndex: 4,
          display: 'flex', alignItems: 'center', gap: 11,
        }}>
          <Logo size={40}/>
          <div>
            <p style={{
              fontFamily: "'Dancing Script', cursive",
              fontWeight: 700, fontSize: 22, margin: 0, lineHeight: 1,
              color: '#EBEBEB',
            }}>
              Gorila Motos
            </p>
            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, margin: '2px 0 0', fontWeight: 500 }}>
              Gestión de talleres
            </p>
          </div>
        </div>

        {/* 3D Bike — contenido en un frame, no full-bleed */}
        <div style={{
          position: 'absolute',
          top: '12%', left: '6%', right: '6%', bottom: '30%',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)',
          background: '#030303',
          zIndex: 1,
        }}>
          <Suspense fallback={
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#030303' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '2px solid rgba(225,20,40,0.15)',
                borderTop: '2px solid #E11428',
                animation: 'spin 0.8s linear infinite',
              }}/>
            </div>
          }>
            <Bike3D/>
          </Suspense>
        </div>

        {/* Gradiente bottom para leer el texto */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '34%',
          background: 'linear-gradient(to top, rgba(5,5,7,1) 0%, rgba(5,5,7,0.7) 60%, transparent 100%)',
          zIndex: 2, pointerEvents: 'none',
        }}/>

        {/* Texto bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 28px 28px', zIndex: 3 }}>
          <p style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)', margin: '0 0 6px',
          }}>
            Sistema profesional
          </p>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(38px,4vw,58px)',
            lineHeight: 0.95, letterSpacing: '0.01em',
            margin: '0 0 16px', color: '#EBEBEB',
          }}>
            Tu taller,{' '}
            <span style={{ color: '#E11428' }}>en control.</span>
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Órdenes', 'Inventario', 'Facturación SRI', 'App móvil'].map(f => (
              <span key={f} style={{
                fontSize: 11, color: 'rgba(255,255,255,0.38)', fontWeight: 500,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 99, padding: '4px 10px',
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ════ PANEL DERECHO — Formulario ════ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '32px 28px', overflowY: 'auto',
        background: '#0A0A0A',
        position: 'relative',
      }}>
        {/* Logo mobile */}
        <div className="flex lg:hidden" style={{
          alignItems: 'center', gap: 10, marginBottom: 28,
          alignSelf: 'flex-start', width: '100%', maxWidth: 380,
        }}>
          <Logo size={38}/>
          <p style={{ fontFamily:"'Dancing Script', cursive", fontWeight:700, fontSize:20, margin:0, color:'#EBEBEB' }}>
            Gorila Motos
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Status */}
          <div style={{ marginBottom: 24, ...enter(0) }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: st.dot,
                animation: st.pulse ? 'pulse 1.5s ease-in-out infinite' : 'none',
                boxShadow: st.pulse ? `0 0 6px ${st.dot}` : 'none',
              }}/>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{st.text}</span>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 28, ...enter(60) }}>
            <h2 style={{
              color: '#EBEBEB', fontWeight: 800, fontSize: 26,
              margin: '0 0 8px', letterSpacing: '-0.04em', lineHeight: 1.05,
            }}>
              Accede al sistema
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13.5, margin: 0, lineHeight: 1.65 }}>
              Ingresa con tu cuenta de Google o con tu correo.
            </p>
          </div>

          {/* ── Google Button — acción primaria ── */}
          {firebaseEnabled && (
            <div style={{ marginBottom: 20, ...enter(110) }}>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                style={{
                  width: '100%', height: 48,
                  background: isLoading ? 'rgba(255,255,255,0.7)' : '#FFFFFF',
                  color: '#0A0A0A', fontWeight: 600, fontSize: 14,
                  border: 'none', borderRadius: 10,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 160ms cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => {
                  if (!isLoading) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-1px)';
                    el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = '';
                  el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
                }}
                onMouseDown={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
                onMouseUp={e   => { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {isLoading && googleBusy
                  ? <svg style={{ animation:'spin 0.8s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(10,10,10,0.2)" strokeWidth="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round"/></svg>
                  : <GoogleIcon/>}
                Continuar con Google
              </button>
            </div>
          )}

          {/* OR divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, ...enter(150) }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }}/>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
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
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontWeight: 500 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; }}
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
                  width: '100%', height: 50, borderRadius: 10,
                  background: isLoading ? 'rgba(225,20,40,0.4)' : '#E11428',
                  color: '#fff', fontWeight: 700, fontSize: 15,
                  letterSpacing: '-0.01em', border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: isLoading ? 'none' : '0 0 0 1px rgba(225,20,40,0.3)',
                  transition: 'all 160ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => {
                  if (!isLoading) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background   = '#FF1F37';
                    el.style.transform    = 'translateY(-1px)';
                    el.style.boxShadow    = '0 4px 20px rgba(225,20,40,0.5)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = isLoading ? 'rgba(225,20,40,0.4)' : '#E11428';
                  el.style.transform  = '';
                  el.style.boxShadow  = isLoading ? 'none' : '0 0 0 1px rgba(225,20,40,0.3)';
                }}
                onMouseDown={e => { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
                onMouseUp={e =>   { if (!isLoading) (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {loading && !googleBusy ? (
                  <>
                    <svg style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Verificando…
                  </>
                ) : (
                  <>Iniciar sesión <ArrowRight size={15}/></>
                )}
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
          <div style={{ marginTop: 24, ...enter(300) }}>
            <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'center', marginBottom:7 }}>
              <Shield size={9} color="rgba(255,255,255,0.12)"/>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.15)' }}>SSL · LOPDP Ecuador</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
              {[{label:'Privacidad', to:'/privacidad'}, {label:'Términos', to:'/terminos'}].map(({label, to}) => (
                <Link key={to} to={to} style={{ fontSize:10, color:'rgba(255,255,255,0.18)', textDecoration:'none' }}>{label}</Link>
              ))}
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.1)' }}>© 2025</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(1.5)} }
      `}</style>
    </div>
  );
}
