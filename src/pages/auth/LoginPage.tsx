/* ─────────────────────────────────────────────
   GORILA MOTOS — Login v3
   Moto 3D real · Sin estadísticas falsas
   Responsive para web y APK mobile
   ───────────────────────────────────────────── */

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail, Lock, ArrowRight, Shield, Wrench, Package,
  Bike, Star, Fuel, Bell, FileText, Users,
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';

/* Moto 3D lazy — no bloquea el form */
const Bike3D = lazy(() => import('../../components/3d/Bike3D'));

const schema = z.object({
  correo:     z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
type Form = z.infer<typeof schema>;

/* ── Módulos del sistema ── */
const MODULES = [
  { icon: Wrench,   color: '#E11428', label: 'Órdenes de servicio',     desc: 'Gestiona el flujo completo del taller' },
  { icon: Bike,     color: '#3B82F6', label: 'Registro de motos',        desc: 'Ficha técnica, fotos y diagnóstico' },
  { icon: Package,  color: '#10B981', label: 'Inventario inteligente',   desc: 'Stock con alertas automáticas' },
  { icon: FileText, color: '#8B5CF6', label: 'Facturación SRI Ecuador',  desc: 'Cumple normativa 2024 (IVA 15%)' },
  { icon: Star,     color: '#F59E0B', label: 'Puntos y gamificación',    desc: 'Fideliza a tus clientes' },
  { icon: Fuel,     color: '#14B8A6', label: 'Rastreador combustible',   desc: 'Control de consumo y costos' },
  { icon: Bell,     color: '#EF4444', label: 'Alertas de mantenimiento', desc: 'Cambio de aceite por kilómetros' },
  { icon: Users,    color: '#6366F1', label: 'Portal del cliente',       desc: 'Historial y puntos desde el celular' },
];

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const formRef  = useRef<HTMLDivElement>(null);
  const modsRef  = useRef<HTMLDivElement>(null);

  /* GSAP entrance */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(formRef.current,
        { y: 40, opacity: 0 },
        { y: 0,  opacity: 1, duration: 0.8, ease: 'power3.out' },
      );
      gsap.fromTo(
        formRef.current?.querySelectorAll('.auth-item') ?? [],
        { y: 20, opacity: 0 },
        { y: 0,  opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out', delay: 0.25 },
      );
      if (modsRef.current) {
        gsap.fromTo(
          modsRef.current.querySelectorAll('.mod-card'),
          { y: 30, opacity: 0 },
          { y: 0,  opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power2.out', delay: 0.5 },
        );
      }
    });
    return () => ctx.revert();
  }, []);

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

  const [showDemo, setShowDemo] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0B0B0D' }}
    >

      {/* ════════════════════════════════════════════
          SECCIÓN PRINCIPAL — Hero + Form
          ════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-screen">

        {/* ── IZQUIERDA: Moto 3D (oculta en mobile pequeño) ── */}
        <div
          className="relative hidden sm:flex lg:w-[58%] items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse 90% 80% at 50% 50%, #12050a 0%, #0B0B0D 70%)',
            minHeight: '100vh',
          }}
        >
          {/* Glow ambiental rojo */}
          <div className="absolute inset-0 pointer-events-none"
               style={{
                 background: 'radial-gradient(ellipse 70% 50% at 50% 55%, rgba(225,20,40,0.12) 0%, transparent 65%)',
               }} />

          {/* Grid decorativo */}
          <div className="absolute inset-0 pointer-events-none"
               style={{
                 backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.012) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.012) 40px)',
               }} />

          {/* Logo top-left */}
          <div className="absolute top-7 left-8 flex items-center gap-3 z-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#E11428,#8B0010)', boxShadow:'0 0 20px rgba(225,20,40,0.4)' }}>
              <Wrench size={18} className="text-white" />
            </div>
            <div className="leading-none">
              <p className="text-white font-black text-base tracking-tight">
                Gorila <span style={{ color:'#E11428' }}>Motos</span>
              </p>
              <p className="text-white/30 text-[9px] tracking-[0.3em] uppercase mt-0.5">Sistema de gestión</p>
            </div>
          </div>

          {/* ── MOTO 3D ── */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6">
            <div className="w-full" style={{ height: 'min(520px, 60vh)' }}>
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-gm-red/30 border-t-gm-red rounded-full animate-spin" />
                </div>
              }>
                <Bike3D />
              </Suspense>
            </div>

            {/* Tagline debajo de la moto */}
            <div className="text-center mt-4 pb-8">
              <h2 className="text-white font-black text-3xl xl:text-4xl leading-tight"
                  style={{ letterSpacing:'-0.02em' }}>
                Tu taller,
              </h2>
              <h2 className="font-black text-3xl xl:text-4xl leading-tight"
                  style={{
                    letterSpacing:'-0.02em',
                    background:'linear-gradient(90deg,#E11428,#FF6B7A)',
                    WebkitBackgroundClip:'text',
                    WebkitTextFillColor:'transparent',
                  }}>
                bajo control.
              </h2>
              <p className="text-white/35 text-sm mt-2 font-light">
                Gestión profesional para talleres de motos en Ecuador
              </p>
            </div>
          </div>
        </div>

        {/* ── DERECHA: Formulario ── */}
        <div
          className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-10 lg:w-[42%] relative"
          style={{ background:'#0F0F14', borderLeft:'1px solid rgba(255,255,255,0.04)' }}
        >
          {/* Glow top-right */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
               style={{ background:'radial-gradient(circle,rgba(225,20,40,0.07) 0%,transparent 65%)' }} />

          {/* Logo mobile (solo en sm sin hero) */}
          <div className="flex sm:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background:'linear-gradient(135deg,#E11428,#8B0010)' }}>
              <Wrench size={16} className="text-white" />
            </div>
            <p className="text-white font-black text-lg">
              Gorila <span style={{ color:'#E11428' }}>Motos</span>
            </p>
          </div>

          <div ref={formRef} className="w-full max-w-[360px] mx-auto">

            {/* Título */}
            <div className="auth-item mb-7">
              <h1 className="text-white font-black text-2xl lg:text-3xl leading-tight">
                Bienvenido
              </h1>
              <p className="text-white/40 text-sm mt-1">Ingresa al panel de control</p>
            </div>

            {/* Badge seguridad */}
            <div className="auth-item mb-5 flex items-center gap-2 px-3 py-2 rounded-xl"
                 style={{ background:'rgba(225,20,40,0.04)', border:'1px solid rgba(225,20,40,0.12)' }}>
              <Shield size={12} style={{ color:'#E11428' }} className="shrink-0" />
              <p className="text-[11px] text-white/40">
                Conexión segura · <span className="text-white/55">SSL cifrado</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

              <div className="auth-item flex items-center justify-between">
                <Link to="/registro"
                      className="text-[11px] text-white/35 hover:text-white/65 transition-colors">
                  ¿No tienes cuenta?
                </Link>
                <Link to="/recuperar"
                      className="text-[11px] text-white/35 hover:text-white/65 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="auth-item pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: loading
                      ? '#9E0E1B'
                      : 'linear-gradient(90deg,#E11428 0%,#FF2E43 50%,#E11428 100%)',
                    backgroundSize: '200% auto',
                    boxShadow: loading ? 'none' : '0 0 24px rgba(225,20,40,0.35)',
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

            {/* Demo credentials toggle */}
            <div className="auth-item mt-5">
              <button
                type="button"
                onClick={() => setShowDemo(v => !v)}
                className="w-full text-[11px] text-white/25 hover:text-white/45 transition-colors text-center"
              >
                {showDemo ? 'Ocultar credenciales de prueba ↑' : '¿Necesitas credenciales de demo? →'}
              </button>
              {showDemo && (
                <div className="mt-2 px-4 py-3 rounded-xl"
                     style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1.5">Demo</p>
                  <p className="text-xs font-mono text-white/55">andres@gmotors.com</p>
                  <p className="text-xs font-mono text-white/35">contraseña: 123</p>
                </div>
              )}
            </div>

            <p className="auth-item mt-8 text-center text-[10px] text-white/18 tracking-widest uppercase">
              © {new Date().getFullYear()} Gorila Motos · Ecuador
            </p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECCIÓN INFERIOR — Qué hace el sistema
          ════════════════════════════════════════════ */}
      <section
        ref={modsRef}
        className="w-full px-6 sm:px-10 xl:px-20 py-12"
        style={{
          background: 'linear-gradient(180deg,#0F0F14 0%,#0B0B0D 100%)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        {/* Header sección */}
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.35em] uppercase text-gm-red/60 font-bold mb-2">
            Módulos del sistema
          </p>
          <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight">
            Todo lo que necesita tu taller
          </h2>
          <p className="text-white/30 text-sm mt-2 max-w-xl mx-auto">
            Plataforma integral para talleres de motos — web y app móvil.
            Diseñado para el mercado ecuatoriano.
          </p>
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-5xl mx-auto mb-12">
          {MODULES.map(({ icon: Icon, color, label, desc }) => (
            <div
              key={label}
              className="mod-card gm-card-d rounded-2xl p-4 flex flex-col gap-2 group hover:scale-[1.02] transition-transform"
              style={{ '--metric-color': color } as React.CSSProperties}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background:`${color}15`, border:`1px solid ${color}25` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-white/80 font-bold text-sm leading-tight">{label}</p>
              <p className="text-white/30 text-[11px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Especificaciones técnicas */}
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Tecnología',      val: 'React + Spring Boot' },
            { label: 'Base de datos',   val: 'PostgreSQL · Supabase' },
            { label: 'App móvil',       val: 'Android · iOS (Capacitor)' },
            { label: 'Facturación',     val: 'SRI Ecuador · IVA 15%' },
          ].map(({ label, val }) => (
            <div key={label}
                 className="px-4 py-3 rounded-xl text-center"
                 style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[10px] text-white/28 uppercase tracking-wider font-bold mb-1">{label}</p>
              <p className="text-white/60 text-xs font-semibold">{val}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
