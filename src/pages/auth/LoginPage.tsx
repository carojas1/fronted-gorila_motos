import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight, Shield, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';
import { firebaseEnabled } from '../../lib/firebase';

const Bike3D = lazy(() => import('../../components/3d/Bike3D'));

/* ─── Schema ─── */
const schema = z.object({
  correo:     z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
type Form = z.infer<typeof schema>;

/* ─── Estado real del backend ─── */
type ServerStatus = 'checking' | 'online' | 'starting' | 'offline';

function useServerStatus(): ServerStatus {
  const [status, setStatus] = useState<ServerStatus>('checking');

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL ?? 'https://backend-gorila-motos.onrender.com/api';
    const controller = new AbortController();
    const id = setTimeout(() => setStatus('starting'), 6000);

    fetch(`${API}/actuator/health`, { signal: controller.signal })
      .then(r => {
        clearTimeout(id);
        setStatus(r.ok ? 'online' : 'starting');
      })
      .catch((err: Error) => {
        clearTimeout(id);
        if (err.name === 'AbortError') return;
        setStatus('starting');
      });

    return () => { clearTimeout(id); controller.abort(); };
  }, []);

  return status;
}

const STATUS_CONFIG: Record<ServerStatus, { label: string; color: string; pulse: boolean }> = {
  checking: { label: 'Verificando conexión…', color: '#6B7280', pulse: true  },
  online:   { label: 'Sistema operativo',      color: '#22C55E', pulse: false },
  starting: { label: 'Servidor iniciando…',    color: '#F59E0B', pulse: true  },
  offline:  { label: 'Sin conexión al servidor', color: '#EF4444', pulse: false },
};

/* ─── Logo Gorila Motos ─── */
function GorilaLogo({ size = 52 }: { size?: number }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25,
      background: 'linear-gradient(135deg,#E11428,#8B0010)',
      boxShadow: '0 0 32px rgba(225,20,40,0.55)',
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

/* ─── Nombre de marca en amarillo ─── */
function BrandName({ size = 20 }: { size?: number }) {
  return (
    <div style={{ lineHeight: 1.1 }}>
      <p style={{
        fontFamily: "'Dancing Script', cursive",
        fontWeight: 700,
        fontSize: size,
        margin: 0,
        lineHeight: 1,
        color: '#FFD700',
        textShadow: '0 0 20px rgba(255,215,0,0.4)',
        letterSpacing: '0.01em',
      }}>
        Gorila Motos
      </p>
      <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: size * 0.55, margin: '3px 0 0', fontWeight: 500 }}>
        Gestión de talleres · Ecuador
      </p>
    </div>
  );
}

/* ─── Componente principal ─── */
export default function LoginPage() {
  const { login, loginWithGoogle, loading } = useAuth();
  const navigate        = useNavigate();
  const toast           = useToast();
  const [params]        = useSearchParams();
  const serverStatus    = useServerStatus();
  const [googleLoading, setGoogleLoading] = useState(false);

  /* Si viene de verificar el correo, mostrar toast de bienvenida */
  useEffect(() => {
    if (params.get('verified') === '1') {
      toast.success('¡Correo verificado! Ya puedes iniciar sesión.', 'Email confirmado');
    }
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ correo, contrasena }: Form) => {
    try {
      await login(correo, contrasena);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error de acceso');
    }
  };

  const handleGoogle = async () => {
    if (!loginWithGoogle) return;
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error con Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  const { label: stLabel, color: stColor, pulse: stPulse } = STATUS_CONFIG[serverStatus];

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      background: '#09090C',
      display: 'flex',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ════════════ IZQUIERDA — Moto ════════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: '57%',
          position: 'relative',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '28px 40px 32px',
          background: 'radial-gradient(ellipse 85% 75% at 42% 50%, #130208 0%, #09090C 66%)',
          overflow: 'hidden',
        }}
      >
        {/* Glow ambiental */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 65% 55% at 40% 52%, rgba(225,20,40,0.12) 0%, transparent 60%)',
        }} />
        {/* Glow amarillo sutil */}
        <div style={{
          position: 'absolute', bottom: 60, left: 40, pointerEvents: 'none',
          width: 300, height: 120,
          background: 'radial-gradient(ellipse, rgba(255,215,0,0.06) 0%, transparent 70%)',
        }} />
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: [
            'repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,0.008) 60px)',
            'repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,0.008) 60px)',
          ].join(','),
        }} />
        {/* Borde derecho sutil */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 1,
          background: 'linear-gradient(to bottom,transparent 5%,rgba(225,20,40,0.13) 50%,transparent 95%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 14 }}>
          <GorilaLogo size={52} />
          <BrandName size={26} />
        </div>

        {/* Moto 3D */}
        <div style={{ position:'relative', zIndex:2, flex:1, display:'flex', alignItems:'center', padding:'8px 0', minHeight:0 }}>
          <div style={{ width:'100%', height:'min(420px, 56vh)', position:'relative' }}>
            <Suspense fallback={
              <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
                <div style={{
                  width:40, height:40,
                  border:'2px solid rgba(225,20,40,0.2)',
                  borderTopColor:'#E11428',
                  borderRadius:'50%',
                  animation:'spin 0.8s linear infinite',
                }} />
                <span style={{ color:'rgba(255,255,255,0.2)', fontSize:11 }}>Cargando modelo…</span>
              </div>
            }>
              <Bike3D />
            </Suspense>
          </div>
        </div>

        {/* Tagline bottom */}
        <div style={{ position:'relative', zIndex:2 }}>
          <h1 style={{
            color:'#fff', fontWeight:900,
            fontSize:'clamp(26px,2.8vw,40px)',
            margin:'0 0 7px', lineHeight:1.05, letterSpacing:'-0.035em',
          }}>
            Tu taller,{' '}
            <span style={{
              background:'linear-gradient(90deg,#E11428 0%,#FF4D5E 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>
              bajo control.
            </span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13, margin:0, lineHeight:1.6 }}>
            Órdenes · Inventario · Facturación SRI · App móvil Android e iOS
          </p>
        </div>
      </div>

      {/* ════════════ DERECHA — Form ════════════ */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column',
        justifyContent:'center', alignItems:'center',
        padding:'40px 32px', background:'#0D0D12',
        position:'relative', overflowY:'auto',
      }}>

        {/* Glow esquina */}
        <div style={{
          position:'absolute', top:-80, right:-80, pointerEvents:'none',
          width:280, height:280, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(225,20,40,0.05) 0%,transparent 65%)',
        }} />
        {/* Glow amarillo esquina */}
        <div style={{
          position:'absolute', bottom:-60, left:-60, pointerEvents:'none',
          width:220, height:220, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(255,215,0,0.04) 0%,transparent 65%)',
        }} />

        {/* Logo mobile */}
        <div className="flex lg:hidden" style={{
          alignItems:'center', gap:12, marginBottom:32,
          alignSelf:'flex-start', width:'100%', maxWidth:410,
        }}>
          <GorilaLogo size={44} />
          <BrandName size={22} />
        </div>

        <div style={{ width:'100%', maxWidth:410 }}>

          {/* Encabezado */}
          <div style={{ marginBottom:28 }}>
            {/* Estado real del backend */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:7,
              background:`${stColor}0D`,
              border:`1px solid ${stColor}28`,
              borderRadius:99, padding:'4px 12px', marginBottom:18,
            }}>
              <div style={{
                width:6, height:6, borderRadius:'50%',
                background:stColor,
                boxShadow:`0 0 ${stPulse ? 6 : 4}px ${stColor}`,
                animation: stPulse ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
              }} />
              <span style={{ fontSize:11, color:`${stColor}CC`, fontWeight:600 }}>
                {stLabel}
              </span>
            </div>

            <h2 style={{
              color:'#fff', fontWeight:900, fontSize:27,
              margin:0, letterSpacing:'-0.03em', lineHeight:1.1,
            }}>
              Accede a tu panel
            </h2>
            <p style={{ color:'rgba(255,255,255,0.32)', fontSize:13, margin:'9px 0 0', lineHeight:1.65 }}>
              Ingresa tus credenciales para gestionar tu taller de motos.
            </p>
          </div>

          {/* Botón Google (si Firebase está activo) */}
          {firebaseEnabled && (
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
              style={{
                width:'100%', height:46, borderRadius:12, marginBottom:16,
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.10)',
                color:'rgba(255,255,255,0.85)', fontWeight:600, fontSize:14,
                cursor: googleLoading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                transition:'all 200ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.10)';
              }}
            >
              {googleLoading ? (
                <svg style={{ animation:'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              ) : (
                <Globe size={16} style={{ color:'#4285F4' }} />
              )}
              Continuar con Google
            </button>
          )}

          {firebaseEnabled && (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)', fontWeight:500 }}>o con correo</span>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display:'flex', flexDirection:'column', gap:14 }}>

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              prefix={<Mail size={14} />}
              error={errors.correo?.message}
              autoComplete="email"
              {...register('correo')}
            />

            <div>
              <Input
                label="Contraseña"
                type="password"
                placeholder="Ingresa tu contraseña"
                prefix={<Lock size={14} />}
                error={errors.contrasena?.message}
                autoComplete="current-password"
                {...register('contrasena')}
              />
              <div style={{ textAlign:'right', marginTop:7 }}>
                <Link to="/recuperar" style={{ fontSize:12, color:'rgba(255,255,255,0.3)', textDecoration:'none', fontWeight:500 }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height:50, borderRadius:12, marginTop:4,
                background: loading
                  ? 'rgba(225,20,40,0.4)'
                  : 'linear-gradient(135deg,#E11428 0%,#C0101E 100%)',
                color:'#fff', fontWeight:700, fontSize:15,
                border:'none', letterSpacing:'-0.01em',
                cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow: loading ? 'none' : '0 6px 28px rgba(225,20,40,0.38)',
                transition:'all 200ms ease',
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Verificando…
                </>
              ) : (
                <>Iniciar sesión <ArrowRight size={16}/></>
              )}
            </button>
          </form>

          {/* Link crear cuenta */}
          <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'rgba(255,255,255,0.28)' }}>
            ¿Primera vez?{' '}
            <Link to="/registro" style={{ color:'#FFD700', fontWeight:700, textDecoration:'none' }}>
              Crear cuenta
            </Link>
          </p>

          {/* Footer legal */}
          <div style={{ marginTop:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'center', marginBottom:9 }}>
              <Shield size={10} color="rgba(255,255,255,0.17)"/>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.17)' }}>
                SSL cifrado · Datos protegidos · LOPDP Ecuador
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
              <Link to="/privacidad" style={{ fontSize:10, color:'rgba(255,255,255,0.22)', textDecoration:'none', fontWeight:500 }}>
                Privacidad
              </Link>
              <span style={{ color:'rgba(255,255,255,0.1)', fontSize:10 }}>·</span>
              <Link to="/terminos" style={{ fontSize:10, color:'rgba(255,255,255,0.22)', textDecoration:'none', fontWeight:500 }}>
                Términos
              </Link>
              <span style={{ color:'rgba(255,255,255,0.1)', fontSize:10 }}>·</span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.13)' }}>© 2025 Gorila Motos</span>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(1.35); }
        }
      `}</style>
    </div>
  );
}
