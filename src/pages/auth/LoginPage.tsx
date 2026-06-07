/* ─────────────────────────────────────────────────────────────
   GMotors — Login Page v3
   Emil Kowalski philosophy: restraint, spring physics, pixel-perfect
   Palette: deep dark · violet glow · indigo accents · brand red
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail, Lock, ArrowRight, Shield, Globe,
  Wrench, Package, Receipt, Smartphone, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';
import { firebaseEnabled } from '../../lib/firebase';

/* ─── Schema ─── */
const schema = z.object({
  correo:     z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
type Form = z.infer<typeof schema>;

/* ─── Estado del servidor ─── */
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

const STATUS_CFG: Record<ServerStatus, { label: string; color: string; pulse: boolean }> = {
  checking: { label: 'Verificando…',     color: '#6B7280', pulse: true  },
  online:   { label: 'Sistema activo',   color: '#22C55E', pulse: false },
  starting: { label: 'Servidor iniciando…', color: '#F59E0B', pulse: true },
  offline:  { label: 'Sin conexión',     color: '#EF4444', pulse: false },
};

/* ─── Features del sistema ─── */
const FEATURES = [
  { icon: Wrench,      label: 'Órdenes en tiempo real',     color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  { icon: Package,     label: 'Inventario y stock crítico', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)'  },
  { icon: Receipt,     label: 'Facturación SRI compatible', color: '#34D399', bg: 'rgba(52,211,153,0.12)'  },
  { icon: Smartphone,  label: 'App móvil Android e iOS',    color: '#FBBF24', bg: 'rgba(251,191,36,0.12)'  },
];

/* ─── Logo ─── */
function Logo({ size = 48 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: 'linear-gradient(135deg,#E11428,#7a000e)',
      boxShadow: '0 0 0 2px rgba(225,20,40,0.35), 0 8px 28px rgba(225,20,40,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {ok
        ? <img src="/brand/gorila-logo.png" alt="" onError={() => setOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>🦍</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { login, loginWithGoogle, loading } = useAuth();
  const navigate        = useNavigate();
  const toast           = useToast();
  const [params]        = useSearchParams();
  const serverStatus    = useServerStatus();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [entered,       setEntered]       = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (params.get('verified') === '1') toast.success('¡Correo verificado!', 'Email confirmado');
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

  const { label: stLabel, color: stColor, pulse: stPulse } = STATUS_CFG[serverStatus];

  /* ── Estilos de transición de entrada ── */
  const enterStyle = (delay: number) => ({
    opacity:   entered ? 1 : 0,
    transform: entered ? 'translateY(0)' : 'translateY(18px)',
    transition: `opacity 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, transform 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
  });

  return (
    <div style={{
      height: '100vh', overflow: 'hidden',
      display: 'flex',
      fontFamily: "'Inter', system-ui, sans-serif",
      background: '#030307',
    }}>

      {/* ═══════ PANEL IZQUIERDO — Branding ═══════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: '54%',
          position: 'relative',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '36px 48px 40px',
          overflow: 'hidden',
          background: 'linear-gradient(155deg, #0C0524 0%, #060314 40%, #020215 100%)',
        }}
      >
        {/* Orbs animados */}
        <div style={{
          position:'absolute', top:'-10%', right:'-5%', pointerEvents:'none',
          width: 520, height: 520, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)',
          animation:'orbDrift1 14s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', bottom:'-15%', left:'-10%', pointerEvents:'none',
          width: 480, height: 480, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 65%)',
          animation:'orbDrift2 18s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', top:'40%', left:'30%', pointerEvents:'none',
          width: 300, height: 300, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(225,20,40,0.07) 0%, transparent 60%)',
          animation:'orbDrift3 22s ease-in-out infinite',
        }}/>

        {/* Grid overlay */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage: [
            'repeating-linear-gradient(0deg,transparent,transparent 63px,rgba(255,255,255,0.024) 64px)',
            'repeating-linear-gradient(90deg,transparent,transparent 63px,rgba(255,255,255,0.024) 64px)',
          ].join(','),
        }}/>
        {/* Borde derecho */}
        <div style={{
          position:'absolute', top:0, right:0, bottom:0, width:1,
          background:'linear-gradient(to bottom, transparent 5%, rgba(124,58,237,0.2) 50%, transparent 95%)',
          pointerEvents:'none',
        }}/>

        {/* Logo + marca */}
        <div style={{ position:'relative', zIndex:2 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, ...enterStyle(0) }}>
            <Logo size={50}/>
            <div style={{ lineHeight:1.1 }}>
              <p style={{
                fontFamily:"'Dancing Script', cursive",
                fontWeight:700, fontSize:28, margin:0, lineHeight:1,
                background:'linear-gradient(135deg,#FBBF24,#F59E0B)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                filter:'drop-shadow(0 0 16px rgba(251,191,36,0.35))',
              }}>
                Gorila Motos
              </p>
              <p style={{ color:'rgba(255,255,255,0.22)', fontSize:11, margin:'3px 0 0', fontWeight:500 }}>
                Gestión de talleres · Ecuador
              </p>
            </div>
          </div>
        </div>

        {/* Headline central */}
        <div style={{ position:'relative', zIndex:2 }}>
          <div style={enterStyle(80)}>
            <p style={{
              fontSize:11, fontWeight:700, letterSpacing:'0.22em',
              textTransform:'uppercase', color:'rgba(167,139,250,0.65)',
              marginBottom:14,
            }}>
              Sistema de gestión
            </p>
            <h1 style={{
              color:'#fff', fontWeight:900, margin:'0 0 16px',
              fontSize:'clamp(32px,3.2vw,50px)',
              lineHeight:1.06, letterSpacing:'-0.03em',
            }}>
              Tu taller,{' '}
              <span style={{
                background:'linear-gradient(135deg,#A78BFA 0%,#7C3AED 50%,#6D28D9 100%)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              }}>
                en control.
              </span>
            </h1>
            <p style={{ color:'rgba(255,255,255,0.32)', fontSize:15, margin:'0 0 36px', lineHeight:1.7 }}>
              Todo lo que necesitas para gestionar órdenes, inventario y clientes — en un solo lugar.
            </p>

            {/* Features */}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {FEATURES.map(({ icon: Icon, label, color, bg }, i) => (
                <div
                  key={label}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    ...enterStyle(160 + i * 60),
                  }}
                >
                  <div style={{
                    width:36, height:36, borderRadius:10,
                    background:bg, border:`1px solid ${color}28`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flexShrink:0,
                  }}>
                    <Icon size={16} style={{ color }}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <CheckCircle2 size={12} style={{ color, flexShrink:0 }}/>
                    <span style={{ fontSize:14, color:'rgba(255,255,255,0.65)', fontWeight:500 }}>{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer izquierdo */}
        <div style={{ position:'relative', zIndex:2, ...enterStyle(450) }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)',
            borderRadius:99, padding:'7px 16px',
          }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#A78BFA', boxShadow:'0 0 8px rgba(167,139,250,0.8)' }}/>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)', fontWeight:600 }}>
              Plataforma certificada · LOPDP Ecuador
            </span>
          </div>
        </div>
      </div>

      {/* ═══════ PANEL DERECHO — Formulario ═══════ */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column',
        justifyContent:'center', alignItems:'center',
        padding:'40px 32px',
        background:'linear-gradient(180deg, #06060F 0%, #040409 100%)',
        position:'relative', overflowY:'auto',
      }}>

        {/* Orb sutil detrás del form */}
        <div style={{
          position:'absolute', top:'-20%', right:'-30%', pointerEvents:'none',
          width:500, height:500, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 60%)',
        }}/>
        <div style={{
          position:'absolute', bottom:'-20%', left:'-20%', pointerEvents:'none',
          width:400, height:400, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(225,20,40,0.05) 0%, transparent 60%)',
        }}/>

        {/* Logo mobile */}
        <div className="flex lg:hidden" style={{
          alignItems:'center', gap:12, marginBottom:28,
          alignSelf:'flex-start', width:'100%', maxWidth:400,
        }}>
          <Logo size={42}/>
          <div>
            <p style={{
              fontFamily:"'Dancing Script', cursive",
              fontWeight:700, fontSize:20, margin:0, lineHeight:1,
              background:'linear-gradient(135deg,#FBBF24,#F59E0B)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            }}>
              Gorila Motos
            </p>
            <p style={{ color:'rgba(255,255,255,0.22)', fontSize:10, margin:'2px 0 0' }}>
              Gestión de talleres · Ecuador
            </p>
          </div>
        </div>

        <div style={{ width:'100%', maxWidth:400, position:'relative', zIndex:1 }}>

          {/* Status badge */}
          <div style={{ ...enterStyle(0), marginBottom:24 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:7,
              background:`${stColor}0D`, border:`1px solid ${stColor}28`,
              borderRadius:99, padding:'5px 14px',
            }}>
              <span style={{
                width:6, height:6, borderRadius:'50%',
                background:stColor, boxShadow:`0 0 ${stPulse?7:4}px ${stColor}`,
                animation:stPulse?'pulseDot 1.4s ease-in-out infinite':'none',
              }}/>
              <span style={{ fontSize:11, color:`${stColor}CC`, fontWeight:600 }}>{stLabel}</span>
            </div>
          </div>

          {/* Encabezado */}
          <div style={{ marginBottom:28, ...enterStyle(60) }}>
            <h2 style={{
              color:'#fff', fontWeight:900, fontSize:26,
              margin:'0 0 8px', letterSpacing:'-0.03em', lineHeight:1.1,
            }}>
              Bienvenido de vuelta
            </h2>
            <p style={{ color:'rgba(255,255,255,0.32)', fontSize:13, margin:0, lineHeight:1.65 }}>
              Ingresa tus credenciales para gestionar tu taller.
            </p>
          </div>

          {/* Botón Google */}
          {firebaseEnabled && (
            <div style={enterStyle(100)}>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading || loading}
                className="google-btn"
                style={{
                  width:'100%', height:48, borderRadius:12, marginBottom:16,
                  background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.10)',
                  color:'rgba(255,255,255,0.85)', fontWeight:600, fontSize:14,
                  cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  transition:'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
                  position:'relative', overflow:'hidden',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(255,255,255,0.07)';
                  el.style.borderColor = 'rgba(255,255,255,0.18)';
                  el.style.transform = 'translateY(-1px)';
                  el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(255,255,255,0.04)';
                  el.style.borderColor = 'rgba(255,255,255,0.10)';
                  el.style.transform = '';
                  el.style.boxShadow = '';
                }}
                onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
                onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {googleLoading ? (
                  <svg style={{ animation:'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <Globe size={16} style={{ color:'#A78BFA' }}/>
                )}
                Continuar con Google
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }}/>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)', fontWeight:500 }}>o con tu correo</span>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }}/>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            style={{ display:'flex', flexDirection:'column', gap:14 }}
          >

            <div style={enterStyle(firebaseEnabled ? 180 : 120)}>
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

            <div style={enterStyle(firebaseEnabled ? 220 : 160)}>
              <Input
                label="Contraseña"
                type="password"
                placeholder="Tu contraseña"
                prefix={<Lock size={14}/>}
                error={errors.contrasena?.message}
                autoComplete="current-password"
                {...register('contrasena')}
              />
              <div style={{ textAlign:'right', marginTop:7 }}>
                <Link to="/recuperar" style={{ fontSize:12, color:'rgba(255,255,255,0.28)', textDecoration:'none', fontWeight:500 }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <div style={enterStyle(firebaseEnabled ? 260 : 200)}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  height:50, borderRadius:13, marginTop:4,
                  background:loading
                    ? 'rgba(225,20,40,0.4)'
                    : 'linear-gradient(135deg, #E11428 0%, #C8001F 100%)',
                  color:'#fff', fontWeight:700, fontSize:15,
                  border:'none', letterSpacing:'-0.01em',
                  cursor:loading ? 'not-allowed' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow:loading ? 'none' : '0 4px 24px rgba(225,20,40,0.4), 0 0 0 1px rgba(225,20,40,0.15)',
                  transition:'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
                  width:'100%', position:'relative', overflow:'hidden',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.boxShadow = '0 6px 32px rgba(225,20,40,0.55), 0 0 0 1px rgba(225,20,40,0.25)';
                    el.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = loading ? 'none' : '0 4px 24px rgba(225,20,40,0.4), 0 0 0 1px rgba(225,20,40,0.15)';
                  el.style.transform = '';
                }}
                onMouseDown={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
                onMouseUp={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = ''; }}
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
            </div>

          </form>

          {/* Link crear cuenta */}
          <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'rgba(255,255,255,0.28)', ...enterStyle(300) }}>
            ¿Primera vez?{' '}
            <Link to="/registro" style={{ color:'#FBBF24', fontWeight:700, textDecoration:'none' }}>
              Crear cuenta
            </Link>
          </p>

          {/* Footer legal */}
          <div style={{ marginTop:28, ...enterStyle(340) }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'center', marginBottom:9 }}>
              <Shield size={10} color="rgba(255,255,255,0.15)"/>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.15)' }}>
                SSL · Datos protegidos · LOPDP Ecuador
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
              {[
                { label:'Privacidad', to:'/privacidad' },
                { label:'Términos',   to:'/terminos'   },
              ].map(({ label, to }) => (
                <Link key={to} to={to} style={{ fontSize:10, color:'rgba(255,255,255,0.2)', textDecoration:'none', fontWeight:500 }}>
                  {label}
                </Link>
              ))}
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.1)' }}>© 2025 Gorila Motos</span>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(1.4); }
        }
        @keyframes orbDrift1 {
          0%,100% { transform: translate(0,0) scale(1);     }
          33%     { transform: translate(-40px,30px) scale(1.06); }
          66%     { transform: translate(25px,-20px) scale(0.96); }
        }
        @keyframes orbDrift2 {
          0%,100% { transform: translate(0,0) scale(1);      }
          40%     { transform: translate(30px,-40px) scale(1.08); }
          70%     { transform: translate(-20px,20px) scale(0.94); }
        }
        @keyframes orbDrift3 {
          0%,100% { transform: translate(0,0) scale(1);     }
          50%     { transform: translate(-30px,-30px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
