/* ─────────────────────────────────────────────────────────────
   GMotors — Login Page v4
   · 3D moto de vuelta en el panel izquierdo
   · Paleta: negro #03030A · naranja #FF6600 · rojo #E11428 · oro #FFD700
   · Títulos: Bebas Neue  |  Cuerpo/UI: Inter
   · Emil Kowalski: spring hover, glow focus, stagger entrance
   ───────────────────────────────────────────────────────────── */

import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight, Shield, Globe, Zap, Package, Receipt, Smartphone } from 'lucide-react';
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

const STATUS: Record<ServerStatus, { label: string; color: string; pulse: boolean }> = {
  checking: { label: 'Verificando…',        color: '#6B7280', pulse: true  },
  online:   { label: 'Sistema en línea',    color: '#22C55E', pulse: false },
  starting: { label: 'Servidor iniciando…', color: '#FF6600', pulse: true  },
  offline:  { label: 'Sin conexión',        color: '#EF4444', pulse: false },
};

const FEATURES = [
  { icon: Zap,        label: 'Órdenes en tiempo real',     color: '#FF6600' },
  { icon: Package,    label: 'Inventario y stock crítico', color: '#FF8C40' },
  { icon: Receipt,    label: 'Facturación SRI compatible', color: '#FFAC70' },
  { icon: Smartphone, label: 'App Android e iOS',          color: '#FFD700' },
];

/* ─── Logo ─── */
function Logo({ size = 52 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.2,
      background: 'linear-gradient(135deg,#E11428,#7a000e)',
      boxShadow: '0 0 0 2px rgba(225,20,40,0.4), 0 8px 32px rgba(225,20,40,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {ok
        ? <img src="/brand/gorila-logo.png" alt="" onError={() => setOk(false)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : <span style={{ fontSize: size * 0.5, lineHeight:1 }}>🦍</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { login, loginWithGoogle, loading } = useAuth();
  const navigate     = useNavigate();
  const toast        = useToast();
  const [params]     = useSearchParams();
  const serverStatus = useServerStatus();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [entered,    setEntered]    = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (params.get('verified') === '1') toast.success('¡Correo verificado!', 'Email confirmado');
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

  const handleGoogle = async () => {
    if (!loginWithGoogle) return;
    setGoogleBusy(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error con Google');
    } finally {
      setGoogleBusy(false);
    }
  };

  const { label: stLabel, color: stColor, pulse: stPulse } = STATUS[serverStatus];

  /* Spring entrance: translateY + opacity con cubic-bezier spring */
  const enter = (delay: number): React.CSSProperties => ({
    opacity:   entered ? 1 : 0,
    transform: entered ? 'translateY(0)' : 'translateY(18px)',
    transition: `opacity 0.52s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms,
                 transform 0.52s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
  });

  return (
    <div style={{
      height: '100vh', overflow: 'hidden', display: 'flex',
      background: '#03030A',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ════════ PANEL IZQUIERDO — 3D moto + overlay ════════ */}
      <div
        className="hidden lg:block"
        style={{ width: '56%', position: 'relative', overflow: 'hidden', background: '#03030A' }}
      >
        {/* Glow naranja ambiental detrás del 3D */}
        <div style={{
          position:'absolute', top:'8%', left:'5%', pointerEvents:'none', zIndex:0,
          width:540, height:540, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(255,102,0,0.13) 0%, transparent 62%)',
          animation:'glowPulse 8s ease-in-out infinite',
        }}/>
        <div style={{
          position:'absolute', bottom:'8%', right:'8%', pointerEvents:'none', zIndex:0,
          width:300, height:300, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(225,20,40,0.07) 0%, transparent 65%)',
        }}/>

        {/* Bike3D full height */}
        <div style={{ position:'absolute', inset:0, zIndex:1 }}>
          <Suspense fallback={
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#03030A' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{
                  width:52, height:52, borderRadius:'50%',
                  border:'3px solid rgba(255,102,0,0.15)',
                  borderTop:'3px solid #FF6600',
                  animation:'spin 0.8s linear infinite',
                  margin:'0 auto 14px',
                }}/>
                <p style={{ color:'rgba(255,255,255,0.2)', fontSize:12 }}>Cargando moto 3D…</p>
              </div>
            </div>
          }>
            <Bike3D/>
          </Suspense>
        </div>

        {/* Gradiente superior — zona logo legible */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:180,
          background:'linear-gradient(to bottom, rgba(3,3,10,0.94) 0%, transparent 100%)',
          zIndex:2, pointerEvents:'none',
        }}/>

        {/* Gradiente inferior — zona texto legible */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:'56%',
          background:'linear-gradient(to top, rgba(3,3,10,0.99) 0%, rgba(3,3,10,0.82) 45%, transparent 100%)',
          zIndex:2, pointerEvents:'none',
        }}/>

        {/* Borde derecho naranja sutil */}
        <div style={{
          position:'absolute', top:0, right:0, bottom:0, width:1,
          background:'linear-gradient(to bottom, transparent 5%, rgba(255,102,0,0.22) 50%, transparent 95%)',
          zIndex:4, pointerEvents:'none',
        }}/>

        {/* Logo — top-left */}
        <div style={{ position:'absolute', top:30, left:34, zIndex:3 }}>
          <div style={{ display:'flex', alignItems:'center', gap:13 }}>
            <Logo size={52}/>
            <div style={{ lineHeight:1.1 }}>
              <p style={{
                fontFamily:"'Dancing Script', cursive",
                fontWeight:700, fontSize:30, margin:0, lineHeight:1,
                background:'linear-gradient(135deg,#FFD700,#FFA500)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                filter:'drop-shadow(0 0 22px rgba(255,165,0,0.55))',
              }}>
                Gorila Motos
              </p>
              <p style={{ color:'rgba(255,255,255,0.26)', fontSize:11, margin:'3px 0 0', fontWeight:500 }}>
                Gestión de talleres · Ecuador
              </p>
            </div>
          </div>
        </div>

        {/* Contenido bottom — Bebas Neue */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 34px 34px', zIndex:3 }}>

          <p style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:11, letterSpacing:'0.24em', color:'rgba(255,102,0,0.65)',
            margin:'0 0 6px',
          }}>
            Sistema de gestión
          </p>

          <h1 style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:'clamp(46px,5vw,72px)',
            lineHeight:0.94, letterSpacing:'0.02em',
            margin:'0 0 18px', color:'#fff',
          }}>
            Tu taller,{' '}
            <span style={{
              background:'linear-gradient(90deg, #FF8C40, #FF6600)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              filter:'drop-shadow(0 0 28px rgba(255,102,0,0.55))',
            }}>
              en control.
            </span>
          </h1>

          {/* Feature pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:18 }}>
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:99, padding:'5px 11px',
                  transition:'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
                  cursor:'default',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background   = `${color}12`;
                  el.style.borderColor  = `${color}30`;
                  el.style.transform    = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background  = 'rgba(255,255,255,0.04)';
                  el.style.borderColor = 'rgba(255,255,255,0.07)';
                  el.style.transform   = '';
                }}
              >
                <Icon size={12} style={{ color, flexShrink:0 }}/>
                <span style={{ fontSize:11.5, color:'rgba(255,255,255,0.58)', fontWeight:500 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Badge Ecuador */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:7 }}>
            <span style={{
              width:6, height:6, borderRadius:'50%',
              background:'#FF6600', boxShadow:'0 0 10px rgba(255,102,0,0.9)',
              animation:'glowPulse 2s ease-in-out infinite',
            }}/>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.26)', fontWeight:600 }}>
              Ecuador · SSL · LOPDP
            </span>
          </div>
        </div>
      </div>

      {/* ════════ PANEL DERECHO — Formulario ════════ */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column',
        justifyContent:'center', alignItems:'center',
        padding:'32px 28px', overflowY:'auto',
        background:'linear-gradient(180deg, #060610 0%, #04040C 100%)',
        position:'relative',
      }}>
        {/* Orbs de fondo del panel derecho */}
        <div style={{
          position:'absolute', top:'-12%', right:'-22%', pointerEvents:'none', zIndex:0,
          width:480, height:480, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(255,102,0,0.045) 0%, transparent 60%)',
        }}/>
        <div style={{
          position:'absolute', bottom:'-10%', left:'-15%', pointerEvents:'none', zIndex:0,
          width:380, height:380, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(225,20,40,0.035) 0%, transparent 60%)',
        }}/>

        {/* Logo mobile */}
        <div className="flex lg:hidden" style={{
          alignItems:'center', gap:12, marginBottom:28,
          alignSelf:'flex-start', width:'100%', maxWidth:380,
        }}>
          <Logo size={44}/>
          <p style={{
            fontFamily:"'Dancing Script', cursive",
            fontWeight:700, fontSize:22, margin:0,
            background:'linear-gradient(135deg,#FFD700,#FFA500)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          }}>
            Gorila Motos
          </p>
        </div>

        <div style={{ width:'100%', maxWidth:380, position:'relative', zIndex:1 }}>

          {/* Status */}
          <div style={{ marginBottom:22, ...enter(0) }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:7,
              background:`${stColor}0D`, border:`1px solid ${stColor}28`,
              borderRadius:99, padding:'5px 13px',
            }}>
              <span style={{
                width:6, height:6, borderRadius:'50%',
                background:stColor, boxShadow:`0 0 7px ${stColor}`,
                animation:stPulse?'pulseDot 1.4s ease-in-out infinite':'none',
              }}/>
              <span style={{ fontSize:11, color:`${stColor}CC`, fontWeight:600 }}>{stLabel}</span>
            </div>
          </div>

          {/* Heading — Inter 900 */}
          <div style={{ marginBottom:26, ...enter(60) }}>
            <h2 style={{
              color:'#fff', fontWeight:900, fontSize:26,
              margin:'0 0 8px', letterSpacing:'-0.04em', lineHeight:1.05,
            }}>
              Bienvenido de vuelta
            </h2>
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13.5, margin:0, lineHeight:1.65, fontWeight:400 }}>
              Ingresa tus credenciales para gestionar tu taller.
            </p>
          </div>

          {/* Google */}
          {firebaseEnabled && (
            <div style={enter(110)}>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleBusy || loading}
                style={{
                  width:'100%', height:48, borderRadius:12, marginBottom:16,
                  background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(255,255,255,0.09)',
                  color:'rgba(255,255,255,0.82)', fontWeight:600, fontSize:14,
                  cursor:(googleBusy||loading)?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  transition:'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background  = 'rgba(255,255,255,0.07)';
                  el.style.borderColor = 'rgba(255,255,255,0.16)';
                  el.style.transform   = 'translateY(-2px)';
                  el.style.boxShadow   = '0 6px 22px rgba(0,0,0,0.35)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background  = 'rgba(255,255,255,0.04)';
                  el.style.borderColor = 'rgba(255,255,255,0.09)';
                  el.style.transform   = '';
                  el.style.boxShadow   = 'none';
                }}
                onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={e   => { (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {googleBusy
                  ? <svg style={{ animation:'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
                  : <Globe size={16} style={{ color:'#FF8C40' }}/>}
                Continuar con Google
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.055)' }}/>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)', fontWeight:500 }}>o con tu correo</span>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.055)' }}/>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display:'flex', flexDirection:'column', gap:13 }}>

            <div style={enter(firebaseEnabled ? 170 : 110)}>
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

            <div style={enter(firebaseEnabled ? 210 : 150)}>
              <Input
                label="Contraseña"
                type="password"
                placeholder="Tu contraseña"
                prefix={<Lock size={14}/>}
                error={errors.contrasena?.message}
                autoComplete="current-password"
                {...register('contrasena')}
              />
              <div style={{ textAlign:'right', marginTop:6 }}>
                <Link
                  to="/recuperar"
                  style={{ fontSize:12, color:'rgba(255,255,255,0.24)', textDecoration:'none', fontWeight:500, transition:'color 150ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF8C40'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.24)'; }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {/* Botón submit */}
            <div style={enter(firebaseEnabled ? 250 : 190)}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width:'100%', height:52, borderRadius:13, marginTop:4,
                  background: loading
                    ? 'rgba(225,20,40,0.38)'
                    : 'linear-gradient(135deg, #E11428 0%, #C0001D 100%)',
                  color:'#fff', fontWeight:700, fontSize:15, letterSpacing:'-0.01em',
                  border:'none', cursor:loading?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow: loading ? 'none' : '0 4px 28px rgba(225,20,40,0.42), 0 0 0 1px rgba(225,20,40,0.15)',
                  transition:'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-2px)';
                    el.style.boxShadow = '0 8px 36px rgba(225,20,40,0.58), 0 0 0 1px rgba(225,20,40,0.25)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = '';
                  el.style.boxShadow = loading ? 'none' : '0 4px 28px rgba(225,20,40,0.42), 0 0 0 1px rgba(225,20,40,0.15)';
                }}
                onMouseDown={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={e =>   { if (!loading) (e.currentTarget as HTMLElement).style.transform = ''; }}
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
          <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'rgba(255,255,255,0.27)', ...enter(290) }}>
            ¿Primera vez?{' '}
            <Link
              to="/registro"
              style={{ color:'#FFD700', fontWeight:700, textDecoration:'none', transition:'color 150ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FFA500'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#FFD700'; }}
            >
              Crear cuenta
            </Link>
          </p>

          {/* Footer legal */}
          <div style={{ marginTop:22, ...enter(320) }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, justifyContent:'center', marginBottom:8 }}>
              <Shield size={10} color="rgba(255,255,255,0.13)"/>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.14)' }}>SSL · Datos protegidos · LOPDP Ecuador</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
              {[{ label:'Privacidad', to:'/privacidad' }, { label:'Términos', to:'/terminos' }].map(({ label, to }) => (
                <Link key={to} to={to} style={{ fontSize:10, color:'rgba(255,255,255,0.18)', textDecoration:'none', fontWeight:500 }}>{label}</Link>
              ))}
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.1)' }}>© 2025 Gorila Motos</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.45)} }
        @keyframes glowPulse{ 0%,100%{opacity:1} 50%{opacity:0.65} }
      `}</style>
    </div>
  );
}
