/* ─────────────────────────────────────────────────────────────
   GMotors — Login Page v7
   Skills aplicadas:
   · Emil Kowalski  → spring physics, stagger, micro-interactions
   · pbakaus/impeccable → jerarquía, grid, negative space
   · taste-skill → referencias Vercel/Linear/Stripe, un solo acento
   ───────────────────────────────────────────────────────────── */

import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';
import { firebaseEnabled, startGoogleSignIn, getGoogleRedirectUser } from '../../lib/firebase';
import { healthApi } from '../../lib/api';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

const Bike3D = lazy(() => import('../../components/3d/Bike3D'));

const schema = z.object({
  correo:     z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
type Form = z.infer<typeof schema>;

/* ─── Logo gorila ─── */
function BrandLogo({ size = 48 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.22),
      background: 'linear-gradient(145deg,#E11428,#7A000D)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
      boxShadow: `0 0 0 1px rgba(225,20,40,0.4), 0 ${size*0.08}px ${size*0.35}px rgba(225,20,40,0.25)`,
    }}>
      {ok
        ? <img src="/brand/gorila-logo.png" alt="" onError={() => setOk(false)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        : <span style={{ fontSize: size * 0.52, lineHeight: 1 }}>🦍</span>}
    </div>
  );
}

/* ─── Google icon ─── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/* ─── Ring spinner ─── */
const Ring = ({ color = '#E11428', size = 18 }: { color?: string; size?: number }) => (
  <svg style={{ animation: 'gm-spin .8s linear infinite', flexShrink: 0 }}
    width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color === '#E11428' ? 'rgba(225,20,40,0.2)' : 'rgba(0,0,0,0.12)'} strokeWidth="3"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { login, processGoogleUser, loading, user, token } = useAuth();
  const navigate     = useNavigate();
  const toast        = useToast();
  const [params]     = useSearchParams();
  const [googleBusy,   setGoogleBusy]   = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [entered,      setEntered]      = useState(false);

  /* Navegación reactiva — se dispara cuando hay sesión válida en el contexto */
  useEffect(() => {
    if (user && token) navigate('/dashboard', { replace: true });
  }, [user, token, navigate]);

  /* Spring entrance */
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);

  /* Verificación email */
  useEffect(() => {
    if (params.get('verified') === '1')
      toast.success('¡Correo verificado! Ahora puedes iniciar sesión.', 'Email confirmado');
  }, []);

  /* Wake-up ping — despierta el backend Render al cargar la página de login.
     El backend duerme tras 15 min de inactividad (plan gratuito).
     Un 401 de respuesta es OK — el servidor ya está activo. */
  useEffect(() => {
    healthApi.check().catch(() => {});
  }, []);

  /* Detectar resultado de redirect previo (fallback para móviles/WebViews) */
  useEffect(() => {
    if (!firebaseEnabled || !processGoogleUser) return;
    let cancelled = false;
    getGoogleRedirectUser()
      .then(async fbUser => {
        if (!fbUser || cancelled) return;
        setGoogleBusy(true);
        try { await processGoogleUser(fbUser); }
        catch (err) { if (!cancelled) toast.error(getErrorMsg(err), 'Error con Google'); }
        finally { if (!cancelled) setGoogleBusy(false); }
      })
      .catch(err => {
        if (!cancelled) toast.error(getErrorMsg(err), 'Error con Google');
      });
    return () => { cancelled = true; };
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const [slowConn, setSlowConn] = useState(false);

  const onSubmit = useCallback(async ({ correo, contrasena }: Form) => {
    setLoginLoading(true);
    setSlowConn(false);
    const slowTimer = setTimeout(() => setSlowConn(true), 5_000);

    const tryLogin = async () => login(correo, contrasena);

    try {
      await tryLogin();
    } catch (err) {
      const hasResponse = !!(err as { response?: unknown })?.response;
      if (!hasResponse) {
        // Sin respuesta HTTP → backend dormido (Render free tier).
        // Mandamos otro ping de wake-up y esperamos a que arranque.
        setSlowConn(true);
        healthApi.check().catch(() => {});
        await new Promise(r => setTimeout(r, 32_000)); // ~30s arranque Render
        try {
          await tryLogin(); // segundo intento automático
        } catch (retryErr) {
          toast.error(getErrorMsg(retryErr), 'Error de acceso');
        }
      } else {
        toast.error(getErrorMsg(err), 'Error de acceso');
      }
    } finally {
      clearTimeout(slowTimer);
      setSlowConn(false);
      setLoginLoading(false);
    }
  }, [login, toast]);

  /**
   * Google Sign-In — popup (COOP: same-origin-allow-popups en vercel.json).
   * Si el popup tiene éxito → processGoogleUser() inmediatamente.
   * Si el popup está bloqueado → signInWithRedirect (fallback móvil).
   */
  const handleGoogle = async () => {
    if (!processGoogleUser) return;
    setGoogleBusy(true);
    try {
      const fbUser = await startGoogleSignIn();
      if (fbUser) {
        // Popup completado — procesar cuenta Google con el backend
        try {
          await processGoogleUser(fbUser);
          // useEffect([user, token]) navega a /dashboard automáticamente
        } catch (processErr) {
          toast.error(getErrorMsg(processErr), 'Error con Google');
          setGoogleBusy(false);
        }
      }
      // fbUser === null → redirect iniciado, la página navega sola
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/unauthorized-domain') {
        toast.error(
          'Este dominio no está autorizado en Firebase. Usa gmotors-frontend.vercel.app',
          'Dominio no autorizado'
        );
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        // Silenciar cancelación voluntaria del usuario; mostrar el resto
        toast.error(getErrorMsg(err), 'Error al iniciar Google');
      }
      setGoogleBusy(false);
    }
  };

  /* Emil Kowalski spring entrance — cada elemento entra de forma escalonada */
  const spring = (delay: number): React.CSSProperties => ({
    opacity:    entered ? 1 : 0,
    transform:  entered ? 'translateY(0)' : 'translateY(18px)',
    transition: `opacity .55s cubic-bezier(.34,1.56,.64,1) ${delay}ms,
                 transform .55s cubic-bezier(.34,1.56,.64,1) ${delay}ms`,
  });

  /* Hover button helper — Emil Kowalski micro-interaction */
  const btnHoverOn  = (el: HTMLElement, isPrimary: boolean) => {
    el.style.transform = 'translateY(-1px)';
    el.style.boxShadow = isPrimary
      ? '0 8px 28px rgba(225,20,40,0.45)'
      : '0 6px 24px rgba(0,0,0,0.6)';
  };
  const btnHoverOff = (el: HTMLElement, isPrimary: boolean) => {
    el.style.transform = '';
    el.style.boxShadow = isPrimary
      ? '0 0 0 1px rgba(225,20,40,0.4)'
      : '0 1px 4px rgba(0,0,0,0.4)';
  };
  const btnPress  = (el: HTMLElement) => { el.style.transform = 'scale(0.97)'; };
  const btnRelease = (el: HTMLElement) => { el.style.transform = ''; };

  const isLoading = loading || loginLoading || googleBusy;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: '#0A0A0A',
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden',
    }}>

      {/* ═══════════════════════════════════════
          PANEL IZQUIERDO — escena cinemática
          Solo en desktop (lg+)
          pbakaus: jerarquía visual clara
          taste-skill: como Vercel/Linear en oscuro
          ═══════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{
        width: '56%', flexShrink: 0, position: 'relative', overflow: 'hidden',
        flexDirection: 'column',
        /* Texture de grid sutil — referencia Linear/Vercel */
        background: '#060608',
        backgroundImage: [
          'radial-gradient(ellipse 90% 75% at 48% 48%, rgba(225,20,40,0.09) 0%, transparent 65%)',
          'radial-gradient(ellipse 60% 90% at 5% 95%, rgba(120,0,15,0.18) 0%, transparent 55%)',
          'linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.016) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, auto, 52px 52px, 52px 52px',
      }}>

        {/* Borde derecho sutil */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 1,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent 100%)',
          zIndex: 10,
        }}/>

        {/* MARCA TOP-LEFT — impeccable: logo es el anchor visual */}
        <div style={{
          position: 'absolute', top: 32, left: 36, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 14,
          animation: 'gm-fadein .6s ease both',
        }}>
          <BrandLogo size={58}/>
          <div>
            <p style={{
              fontFamily: "'Dancing Script', cursive",
              fontWeight: 700, fontSize: 30, margin: 0, lineHeight: 1,
              color: '#EBEBEB', letterSpacing: '-.01em',
            }}>Gorila Motos</p>
            <p style={{
              color: 'rgba(255,255,255,0.28)', fontSize: 10,
              margin: '4px 0 0', fontWeight: 600,
              letterSpacing: '.14em', textTransform: 'uppercase',
            }}>Gestión de talleres</p>
          </div>
        </div>

        {/* MOTO 3D — cinemática, sin frame-box.
            Envuelta en ErrorBoundary: si el WebGL falla (emuladores, GPU débil)
            la moto simplemente no se muestra y el login sigue funcionando. */}
        <ErrorBoundary fallback={() => null}>
          <Suspense fallback={null}>
            <div style={{
              position: 'absolute',
              top: '5%', left: '-20%', right: '-20%', bottom: '19%',
              zIndex: 1,
            }}>
              <Bike3D/>
            </div>
          </Suspense>
        </ErrorBoundary>

        {/* Reflejo del suelo — glow rojo bajo la moto (como fotograf. de producto) */}
        <div style={{
          position: 'absolute',
          bottom: '18%', left: '10%', right: '10%', height: 100,
          zIndex: 2, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 65% 100% at 50% 100%, rgba(225,20,40,0.22) 0%, transparent 100%)',
          filter: 'blur(22px)',
        }}/>

        {/* Fade inferior para leer el texto */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%',
          zIndex: 3, pointerEvents: 'none',
          background: 'linear-gradient(to top, #060608 0%, rgba(6,6,8,0.95) 40%, transparent 100%)',
        }}/>

        {/* TEXTO INFERIOR — Emil Kowalski: tipografía como gesto */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '0 36px 32px', zIndex: 4,
          animation: 'gm-fadein .8s .15s ease both',
        }}>
          <p style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.22)', margin: '0 0 6px',
          }}>Sistema profesional</p>

          {/* impeccable: headline domina, escala máxima con clamp */}
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(58px,6.5vw,88px)',
            lineHeight: .9, letterSpacing: '.01em',
            margin: '0 0 20px', color: '#EBEBEB',
          }}>
            Tu taller,<br/>
            <span style={{ color: '#E11428' }}>en control.</span>
          </h1>

          {/* Pills de features */}
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {['Órdenes', 'Inventario', 'Facturación SRI', 'App móvil'].map((f, i) => (
              <span key={f} style={{
                fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 99, padding: '5px 13px',
                letterSpacing: '.02em',
                animation: `gm-fadein .6s ${.25 + i*.08}s ease both`,
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          PANEL DERECHO — formulario
          Full-screen en mobile, lateral en desktop
          ═══════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '32px 24px 40px', overflowY: 'auto',
        background: '#0A0A0A', minWidth: 0,
        position: 'relative',
      }}>
        {/* Glow ambiental sutil detrás del formulario */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(225,20,40,0.04) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }}/>

        {/* ── HERO MOBILE — logo grande centrado ── */}
        <div className="flex lg:hidden" style={{
          flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          width: '100%', maxWidth: 380, marginBottom: 32,
          position: 'relative', zIndex: 1,
          ...spring(0),
        }}>
          <BrandLogo size={84}/>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 44, letterSpacing: '.05em',
            color: '#EBEBEB', margin: '16px 0 4px', lineHeight: 1,
          }}>Gorila Motos</h2>
          <p style={{
            color: 'rgba(255,255,255,0.28)', fontSize: 11, margin: '0 0 18px',
            fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase',
          }}>Gestión de talleres · Ecuador</p>
          <div style={{ width: 36, height: 2, background: '#E11428', borderRadius: 99 }}/>
        </div>

        {/* ── FORMULARIO ── */}
        <div style={{ width: '100%', maxWidth: 352, position: 'relative', zIndex: 1 }}>

          {/* Heading — impeccable: jerarquía dominante */}
          <div style={{ marginBottom: 28, ...spring(55) }}>
            <h2 style={{
              color: '#EBEBEB', fontWeight: 800, fontSize: 27,
              margin: '0 0 8px', letterSpacing: '-.04em', lineHeight: 1.05,
            }}>
              Accede al sistema
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13.5, margin: 0, lineHeight: 1.7 }}>
              Ingresa con Google o con tu correo y contraseña.
            </p>
          </div>

          {/* Google — siempre acción primaria */}
          <div style={{ marginBottom: 16, ...spring(100) }}>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={isLoading}
              style={{
                width: '100%', height: 50,
                background: isLoading ? 'rgba(255,255,255,0.65)' : '#FFFFFF',
                color: '#111', fontWeight: 600, fontSize: 14,
                border: 'none', borderRadius: 12,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 160ms cubic-bezier(.34,1.56,.64,1)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                letterSpacing: '-.01em',
              }}
              onMouseEnter={e => { if (!isLoading) btnHoverOn(e.currentTarget as HTMLElement, false); }}
              onMouseLeave={e => { btnHoverOff(e.currentTarget as HTMLElement, false); }}
              onMouseDown={e  => { if (!isLoading) btnPress(e.currentTarget as HTMLElement); }}
              onMouseUp={e    => { if (!isLoading) btnRelease(e.currentTarget as HTMLElement); }}
            >
              {isLoading && googleBusy ? <Ring color="#111" size={18}/> : <GoogleIcon/>}
              Continuar con Google
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, ...spring(140) }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }}/>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500, letterSpacing: '.04em' }}>
              o con correo
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }}/>
          </div>

          {/* Formulario — card sutil (gusto: Stripe/Linear style) */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '18px 16px 16px',
              display: 'flex', flexDirection: 'column', gap: 12,
              ...spring(175),
            }}>
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@correo.com"
                prefix={<Mail size={14}/>}
                error={errors.correo?.message}
                autoComplete="email"
                {...register('correo')}
              />
              <div>
                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="Tu contraseña"
                  prefix={<Lock size={14}/>}
                  error={errors.contrasena?.message}
                  autoComplete="current-password"
                  {...register('contrasena')}
                />
                <div style={{ textAlign: 'right', marginTop: 7 }}>
                  <Link
                    to="/recuperar"
                    style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#EBEBEB'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; }}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div style={{ marginTop: 12, ...spring(215) }}>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%', height: 52, borderRadius: 12,
                  background: isLoading ? 'rgba(225,20,40,0.38)' : '#E11428',
                  color: '#fff', fontWeight: 700, fontSize: 15,
                  letterSpacing: '-.015em', border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: isLoading ? 'none' : '0 0 0 1px rgba(225,20,40,0.4)',
                  transition: 'all 160ms cubic-bezier(.34,1.56,.64,1)',
                }}
                onMouseEnter={e => { if (!isLoading) btnHoverOn(e.currentTarget as HTMLElement, true); }}
                onMouseLeave={e => { btnHoverOff(e.currentTarget as HTMLElement, true); }}
                onMouseDown={e  => { if (!isLoading) btnPress(e.currentTarget as HTMLElement); }}
                onMouseUp={e    => { if (!isLoading) btnRelease(e.currentTarget as HTMLElement); }}
              >
                {(loading || loginLoading) && !googleBusy ? (
                  slowConn
                    ? <><Ring size={16}/> Despertando servidor…</>
                    : <><Ring size={16}/> Verificando…</>
                ) : <>Iniciar sesión <ArrowRight size={15}/></>}
              </button>
            </div>
          </form>

          {/* Link registro */}
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.26)', ...spring(255) }}>
            ¿Primera vez?{' '}
            <Link
              to="/registro"
              style={{ color: '#EBEBEB', fontWeight: 700, textDecoration: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#EBEBEB'; }}
            >Crear cuenta</Link>
          </p>

          {/* Legal footer — más visible */}
          <div style={{ marginTop: 24, ...spring(285) }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
              padding: '12px 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              {[
                { label: 'Privacidad', to: '/privacidad' },
                { label: 'Términos', to: '/terminos' },
              ].map(({ label, to }) => (
                <Link key={to} to={to}
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', textDecoration: 'none', fontWeight: 500 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.32)'; }}
                >
                  {label}
                </Link>
              ))}
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>© 2025 Gorila Motos</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gm-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes gm-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(1.7)} }
        @keyframes gm-fadein { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}
