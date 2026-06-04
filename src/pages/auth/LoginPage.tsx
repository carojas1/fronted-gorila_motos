/* ─────────────────────────────────────────────
   GORILA MOTOS — Login v4
   Moto 3D Sketchfab · Google Sign-In · Email automático
   Sin estadísticas falsas · Responsive APK
   ───────────────────────────────────────────── */

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGoogleLogin } from '@react-oauth/google';
import {
  Mail, Lock, ArrowRight, Shield, Wrench, Package,
  Bike, Star, Fuel, Bell, FileText, Users, ChevronDown,
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import { api } from '../../lib/api';
import Input from '../../components/ui/Input';

const Bike3D = lazy(() => import('../../components/3d/Bike3D'));

const schema = z.object({
  correo:     z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
type Form = z.infer<typeof schema>;

/* ── Módulos del sistema ── */
const MODULES = [
  { icon: Wrench,   color: '#E11428', label: 'Órdenes de servicio',     desc: 'Gestión completa del taller' },
  { icon: Bike,     color: '#3B82F6', label: 'Registro de motos',        desc: 'Ficha técnica y diagnóstico' },
  { icon: Package,  color: '#10B981', label: 'Inventario con alertas',   desc: 'Stock crítico automático' },
  { icon: FileText, color: '#8B5CF6', label: 'Facturación SRI Ecuador',  desc: 'Cumple normativa IVA 15%' },
  { icon: Star,     color: '#F59E0B', label: 'Puntos y gamificación',    desc: 'Fideliza a tus clientes' },
  { icon: Fuel,     color: '#14B8A6', label: 'Rastreador combustible',   desc: 'Costo por kilómetro' },
  { icon: Bell,     color: '#EF4444', label: 'Alertas mantenimiento',    desc: 'Por kilómetros · email automático' },
  { icon: Users,    color: '#6366F1', label: 'Portal del cliente',       desc: 'Historial desde el celular' },
];

/* ── Separador ── */
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <span className="text-[11px] text-white/25 font-medium">{label}</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
    </div>
  );
}

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const rightRef = useRef<HTMLDivElement>(null);
  const modsRef  = useRef<HTMLDivElement>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  /* GSAP entrance */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(rightRef.current,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.75, ease: 'power3.out' }
      );
      gsap.fromTo(
        rightRef.current?.querySelectorAll('.auth-item') ?? [],
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'power2.out', delay: 0.2 }
      );
      if (modsRef.current) {
        gsap.fromTo(
          modsRef.current.querySelectorAll('.mod-card'),
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out', delay: 0.45 }
        );
      }
    });
    return () => ctx.revert();
  }, []);

  /* Form */
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ correo, contrasena }: Form) => {
    try {
      await login(correo, contrasena);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(getErrorMsg(err), 'Acceso denegado');
    }
  };

  /* Google Sign-In */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        /* Obtener datos del usuario desde Google */
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(r => r.json());

        /* Intentar login/registro con Google en el backend */
        const { data } = await api.post('/usuarios/google', {
          correo:         userInfo.email,
          nombre_completo: userInfo.name,
          google_id:      userInfo.sub,
          ruta_imagen:    userInfo.picture,
        });

        const token = data.token ?? data.jwt ?? data.accessToken;
        if (token) {
          localStorage.setItem('gm_token', token);
          localStorage.setItem('gm_user', JSON.stringify(data.usuario ?? data.user ?? data));
          window.location.href = '/dashboard';
        }
      } catch (err) {
        toast.error('No se pudo iniciar sesión con Google. Usa correo y contraseña.', 'Error Google');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => toast.error('Google no disponible en este momento', 'Error'),
  });

  const hasGoogleClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0B0B0D' }}>

      {/* ═══ SECCIÓN PRINCIPAL ═══════════════════════════════ */}
      <div className="flex flex-col lg:flex-row flex-1">

        {/* ── IZQUIERDA: Moto 3D ── */}
        <div
          className="hidden sm:flex lg:w-[58%] relative items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse 90% 80% at 50% 50%, #12050a 0%, #0B0B0D 70%)',
            minHeight: '100vh',
          }}
        >
          {/* Glow rojo */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 55%, rgba(225,20,40,0.13) 0%, transparent 65%)' }} />

          {/* Grid */}
          <div className="absolute inset-0 pointer-events-none"
               style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.013) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.013) 40px)' }} />

          {/* Logo */}
          <div className="absolute top-7 left-8 flex items-center gap-3 z-10">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#E11428,#8B0010)', boxShadow: '0 0 22px rgba(225,20,40,0.45)' }}>
              <Wrench size={19} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-[17px] tracking-tight leading-none">
                Gorila <span style={{ color: '#E11428' }}>Motos</span>
              </p>
              <p className="text-white/28 text-[9px] tracking-[0.3em] uppercase mt-0.5">Sistema Enterprise</p>
            </div>
          </div>

          {/* Moto 3D + tagline */}
          <div className="relative z-10 w-full flex flex-col items-center justify-center px-6"
               style={{ minHeight: '100vh' }}>
            <div className="w-full" style={{ height: 'min(500px, 55vh)' }}>
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-gm-red/30 border-t-gm-red rounded-full animate-spin" />
                </div>
              }>
                <Bike3D />
              </Suspense>
            </div>

            <div className="text-center mt-2 pb-10">
              <h2 className="text-white font-black leading-tight"
                  style={{ fontSize: 'clamp(32px,4.5vw,52px)', letterSpacing: '-0.02em' }}>
                Tu taller,
              </h2>
              <h2 className="font-black leading-tight"
                  style={{
                    fontSize: 'clamp(32px,4.5vw,52px)',
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(90deg,#E11428,#FF6B7A)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                bajo control.
              </h2>
              <p className="text-white/30 text-sm mt-2 font-light">
                Gestión integral para talleres de motos · Ecuador
              </p>
            </div>
          </div>
        </div>

        {/* ── DERECHA: Formulario ── */}
        <div
          className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-12 relative"
          style={{ background: '#0F0F14', borderLeft: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle,rgba(225,20,40,0.06) 0%,transparent 65%)' }} />

          {/* Logo mobile */}
          <div className="flex sm:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#E11428,#8B0010)' }}>
              <Wrench size={16} className="text-white" />
            </div>
            <p className="text-white font-black text-lg">
              Gorila <span style={{ color:'#E11428' }}>Motos</span>
            </p>
          </div>

          <div ref={rightRef} className="w-full max-w-[360px] mx-auto">

            {/* Título */}
            <div className="auth-item mb-6">
              <h1 className="text-white font-black text-2xl lg:text-[1.75rem] leading-tight tracking-tight">
                Bienvenido de vuelta
              </h1>
              <p className="text-white/35 text-sm mt-1">Accede al panel de tu taller</p>
            </div>

            {/* Google Sign-In */}
            {hasGoogleClientId && (
              <div className="auth-item mb-4">
                <button
                  type="button"
                  onClick={() => googleLogin()}
                  disabled={googleLoading}
                  className="w-full h-11 rounded-xl flex items-center justify-center gap-3 font-semibold text-sm transition-all disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.8)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  {googleLoading ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continuar con Google
                </button>
                <Divider label="o usa tu correo" />
              </div>
            )}

            {/* Form email/password */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3.5">
              <div className="auth-item">
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="tu@correo.com"
                  prefix={<Mail size={14} />}
                  error={errors.correo?.message}
                  autoComplete="email"
                  {...register('correo')}
                />
              </div>

              <div className="auth-item">
                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  prefix={<Lock size={14} />}
                  error={errors.contrasena?.message}
                  autoComplete="current-password"
                  {...register('contrasena')}
                />
              </div>

              <div className="auth-item flex items-center justify-between pt-0.5">
                <Link to="/registro" className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
                  Crear cuenta
                </Link>
                <Link to="/recuperar" className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="auth-item pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: '#E11428',
                    boxShadow: loading ? 'none' : '0 0 28px rgba(225,20,40,0.35)',
                  }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Verificando…
                    </>
                  ) : (
                    <>Iniciar sesión <ArrowRight size={15} /></>
                  )}
                </button>
              </div>
            </form>

            {/* Badge seguridad */}
            <div className="auth-item mt-4 flex items-center justify-center gap-1.5">
              <Shield size={11} className="text-white/20" />
              <p className="text-[10px] text-white/22">Conexión SSL cifrada · Datos protegidos</p>
            </div>

            {/* Demo credentials */}
            <div className="auth-item mt-4">
              <button
                type="button"
                onClick={() => setShowDemo(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-white/22 hover:text-white/45 transition-colors"
              >
                Credenciales de demo
                <ChevronDown size={11} style={{ transform: showDemo ? 'rotate(180deg)' : '', transition: 'transform 200ms' }} />
              </button>
              {showDemo && (
                <div className="mt-2 px-4 py-3 rounded-xl"
                     style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-xs font-mono text-white/45">andres@gmotors.com</p>
                  <p className="text-xs font-mono text-white/28">contraseña: 123</p>
                </div>
              )}
            </div>

            <p className="auth-item mt-6 text-center text-[10px] text-white/15 tracking-widest uppercase">
              © {new Date().getFullYear()} Gorila Motos · Ecuador
            </p>
          </div>
        </div>
      </div>

      {/* ═══ MÓDULOS DEL SISTEMA ════════════════════════════ */}
      <section
        ref={modsRef}
        className="px-6 sm:px-10 xl:px-20 py-14"
        style={{ background: '#0C0C10', borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.4em] uppercase font-bold mb-2"
             style={{ color: '#E11428' }}>
            ¿Qué hace el sistema?
          </p>
          <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight">
            Todo en un solo lugar
          </h2>
          <p className="text-white/28 text-sm mt-2 max-w-lg mx-auto leading-relaxed">
            Plataforma integral para talleres de motos — gestiona servicios, clientes,
            inventario y facturación desde web o celular.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-5xl mx-auto mb-10">
          {MODULES.map(({ icon: Icon, color, label, desc }) => (
            <div
              key={label}
              className="mod-card gm-card-d rounded-2xl p-4 flex flex-col gap-2 hover:scale-[1.02] transition-transform cursor-default"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: `${color}15`, border: `1px solid ${color}22` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-white/78 font-bold text-sm leading-tight">{label}</p>
              <p className="text-white/28 text-[11px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Specs técnicas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-5xl mx-auto">
          {[
            { label: 'Frontend',      val: 'React 19 + Vite + Tailwind' },
            { label: 'Backend',       val: 'Spring Boot + PostgreSQL' },
            { label: 'App móvil',     val: 'Android + iOS (Capacitor)' },
            { label: 'Facturación',   val: 'SRI Ecuador · IVA 15%' },
          ].map(({ label, val }) => (
            <div key={label}
                 className="px-4 py-3 rounded-xl text-center"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] text-white/25 uppercase tracking-wider font-bold mb-1">{label}</p>
              <p className="text-white/50 text-xs font-semibold">{val}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
