/* ─────────────────────────────────────────────
   GORILA MOTOS — Login Enterprise Premium
   Split layout: hero izquierdo + formulario derecho
   ───────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail, Lock, ArrowRight, Wifi, Shield,
  Wrench, CheckCircle2, BarChart3, Users, Zap, Clock,
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

/* ─── Schema de validación ─── */
const schema = z.object({
  correo:     z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
type Form = z.infer<typeof schema>;

/* ─── Reloj vivo ─── */
function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ─── Features del sistema ─── */
const FEATURES = [
  { icon: Wrench,       label: 'Gestión de órdenes de taller',       desc: 'Control total del flujo de trabajo' },
  { icon: Users,        label: 'CRM de clientes y mecánicos',         desc: 'Base de datos unificada' },
  { icon: BarChart3,    label: 'Reportes y analíticas en tiempo real', desc: 'Métricas accionables' },
  { icon: CheckCircle2, label: 'Inventario y productos',               desc: 'Stock automatizado' },
  { icon: Zap,          label: 'Facturación electrónica',              desc: 'Integración SRI Ecuador' },
];

/* ─── Estadísticas dummy ─── */
const STATS = [
  { value: '500+', label: 'Talleres activos' },
  { value: '98%',  label: 'Uptime garantizado' },
  { value: '24/7', label: 'Soporte técnico' },
  { value: '12k+', label: 'Órdenes procesadas' },
];

/* ─── Formas decorativas (CSS puro, sin deps) ─── */
const SHAPES = [
  { size: 320, top: '-8%',  left: '-6%',  delay: '0s',    opacity: 0.06, type: 'circle' },
  { size: 200, top: '60%',  left: '-10%', delay: '3s',    opacity: 0.04, type: 'circle' },
  { size: 160, top: '10%',  left: '72%',  delay: '1.5s',  opacity: 0.05, type: 'hexagon' },
  { size: 100, top: '78%',  left: '80%',  delay: '2.5s',  opacity: 0.04, type: 'hexagon' },
  { size: 240, top: '38%',  left: '40%',  delay: '4s',    opacity: 0.03, type: 'circle' },
];

function DecorativeShapes() {
  return (
    <>
      {SHAPES.map((s, i) => (
        <div
          key={i}
          aria-hidden
          className="absolute pointer-events-none select-none"
          style={{
            width:  s.size,
            height: s.size,
            top:    s.top,
            left:   s.left,
            opacity: s.opacity,
            animation: `floatShape 8s ease-in-out infinite`,
            animationDelay: s.delay,
            ...(s.type === 'circle'
              ? {
                  borderRadius: '50%',
                  border: '1.5px solid rgba(225,20,40,0.9)',
                }
              : {
                  clipPath: 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)',
                  background: 'rgba(225,20,40,0.15)',
                }),
          }}
        />
      ))}
      {/* Keyframe inline para la animación de flotación */}
      <style>{`
        @keyframes floatShape {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-14px) rotate(3deg); }
          66%       { transform: translateY(8px) rotate(-2deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(225,20,40,0); }
          50%       { box-shadow: 0 0 0 8px rgba(225,20,40,0.12); }
        }
        .btn-shimmer {
          background: linear-gradient(
            90deg,
            #E11428 0%, #FF2E43 40%, #fff3 50%, #FF2E43 60%, #E11428 100%
          );
          background-size: 200% auto;
          animation: shimmer 2.8s linear infinite;
        }
        .btn-shimmer:disabled { animation: none; }
      `}</style>
    </>
  );
}

/* ══════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════ */
export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const clock    = useClock();

  /* ─ Refs para GSAP ─ */
  const leftRef  = useRef<HTMLElement>(null);
  const rightRef = useRef<HTMLElement>(null);

  /* ─ GSAP entrance animation ─ */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      /* Lado izquierdo: fade in desde la izquierda */
      if (leftRef.current) {
        tl.fromTo(
          leftRef.current,
          { x: -50, opacity: 0 },
          { x: 0,   opacity: 1, duration: 0.9 },
        );
        /* Elementos internos en cascada */
        tl.fromTo(
          leftRef.current.querySelectorAll('.hero-item'),
          { y: 28, opacity: 0 },
          { y: 0,  opacity: 1, duration: 0.55, stagger: 0.09 },
          '-=0.55',
        );
      }

      /* Lado derecho: slide desde la derecha */
      if (rightRef.current) {
        tl.fromTo(
          rightRef.current,
          { x: 60, opacity: 0 },
          { x: 0,  opacity: 1, duration: 0.85 },
          '-=0.7',
        );
        tl.fromTo(
          rightRef.current.querySelectorAll('.auth-item'),
          { y: 22, opacity: 0 },
          { y: 0,  opacity: 1, duration: 0.5, stagger: 0.08 },
          '-=0.55',
        );
      }
    });

    return () => ctx.revert();
  }, []);

  /* ─ React Hook Form ─ */
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

  const hhmmss = clock.toLocaleTimeString('es-EC', { hour12: false });
  const fecha  = clock.toLocaleDateString('es-EC', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row overflow-hidden" style={{ background: '#0B0B0D' }}>

      {/* ════════════════════════════════════════════════════
          PANEL IZQUIERDO — Hero oscuro con formas y marca
          Oculto en mobile (< lg)
         ════════════════════════════════════════════════════ */}
      <section
        ref={leftRef}
        className="hidden lg:flex relative overflow-hidden flex-col lg:w-[60%] xl:w-[62%] min-h-screen"
        style={{
          background: 'radial-gradient(ellipse 100% 90% at 20% -5%, #1a0306 0%, #0B0B0D 55%), radial-gradient(ellipse 70% 60% at 80% 110%, #1f0407 0%, transparent 55%)',
        }}
      >
        {/* Capa de ruido/grid sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.015) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.015) 40px)',
          }}
        />

        {/* Glow ambient rojo */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '15%', right: '-5%',
            width: 480, height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(225,20,40,0.18) 0%, transparent 65%)',
            filter: 'blur(8px)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-10%', left: '20%',
            width: 360, height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(225,20,40,0.10) 0%, transparent 65%)',
            filter: 'blur(12px)',
          }}
        />

        {/* Formas geométricas decorativas */}
        <DecorativeShapes />

        {/* ─── TOP BAR ─── */}
        <header className="hero-item relative z-10 flex items-center justify-between px-10 xl:px-14 pt-8">
          {/* Logo + marca */}
          <div className="flex items-center gap-4">
            <div
              className="relative w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E11428, #8B0010)', boxShadow: '0 0 20px rgba(225,20,40,0.4)' }}
            >
              <Wrench size={22} className="text-white" />
            </div>
            <div className="leading-none">
              <p className="text-white font-black text-xl tracking-tight">
                Gorila <span style={{ color: '#E11428' }}>Motos</span>
              </p>
              <p className="text-white/35 text-[10px] tracking-[0.3em] uppercase mt-0.5">
                Sistema Enterprise
              </p>
            </div>
          </div>

          {/* Clock / status */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)' }} />
              Sistema operativo
            </div>
            <p className="font-mono text-xs text-white/60 tabular-nums">{hhmmss} · Quito EC</p>
            <p className="text-[10px] text-white/30 capitalize">{fecha}</p>
          </div>
        </header>

        {/* ─── MARCA PRINCIPAL ─── */}
        <div className="hero-item relative z-10 flex-1 flex flex-col justify-center px-10 xl:px-14 py-10">
          {/* Badge versión */}
          <div className="inline-flex items-center gap-2 mb-6 self-start">
            <span
              className="px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.25em] uppercase"
              style={{ background: 'rgba(225,20,40,0.12)', border: '1px solid rgba(225,20,40,0.3)', color: '#FF4D5E' }}
            >
              Enterprise v2.0
            </span>
            <Wifi size={11} className="text-emerald-400" />
          </div>

          {/* Título enorme */}
          <div className="mb-2">
            <h1
              className="font-black leading-none text-white"
              style={{ fontSize: 'clamp(56px, 7vw, 92px)', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              GORILA
            </h1>
            <h1
              className="font-black leading-none"
              style={{
                fontSize: 'clamp(56px, 7vw, 92px)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                background: 'linear-gradient(90deg, #E11428 0%, #FF2E43 50%, #FF6B7A 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              MOTOS
            </h1>
          </div>
          <p className="text-white/40 text-base font-light tracking-wide mb-10 max-w-xs">
            Plataforma enterprise para talleres de motocicletas en Ecuador
          </p>

          {/* ─── FEATURES ─── */}
          <ul className="space-y-4 mb-10">
            {FEATURES.map(({ icon: Icon, label, desc }, i) => (
              <li key={i} className="flex items-start gap-3 group">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 transition-all duration-200 group-hover:scale-105"
                  style={{ background: 'rgba(225,20,40,0.10)', border: '1px solid rgba(225,20,40,0.2)' }}
                >
                  <Icon size={14} style={{ color: '#E11428' }} />
                </div>
                <div>
                  <p className="text-white/85 text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-white/35 text-xs mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* ─── ESTADÍSTICAS ─── */}
          <div className="grid grid-cols-4 gap-4">
            {STATS.map(({ value, label }, i) => (
              <div
                key={i}
                className="rounded-xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-white font-black text-lg leading-none mb-1" style={{ color: '#E11428' }}>{value}</p>
                <p className="text-white/35 text-[10px] leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <footer className="hero-item relative z-10 flex items-center justify-between px-10 xl:px-14 pb-6">
          <p className="text-white/25 text-[10px] tracking-[0.3em] uppercase">
            © {new Date().getFullYear()} Gorila Motos · Ecuador
          </p>
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase text-white/25">
            <Clock size={10} />
            Talleres activos 24/7
          </div>
        </footer>
      </section>

      {/* ════════════════════════════════════════════════════
          PANEL DERECHO — Formulario minimalista premium
         ════════════════════════════════════════════════════ */}
      <section
        ref={rightRef}
        className="relative flex-1 flex flex-col lg:w-[40%] xl:w-[38%] min-h-screen"
        style={{ background: '#0F0F14', borderLeft: '1px solid rgba(255,255,255,0.04)' }}
      >
        {/* Glow sutil en la esquina superior */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-60px', right: '-60px',
            width: 240, height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(225,20,40,0.08) 0%, transparent 65%)',
          }}
        />

        {/* ─── TOP ─── */}
        <div className="auth-item relative z-10 flex items-center justify-between px-8 xl:px-12 pt-8">
          {/* Logo mobile (solo visible en < lg) */}
          <div className="flex items-center gap-3 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E11428, #8B0010)' }}
            >
              <Wrench size={16} className="text-white" />
            </div>
            <span className="text-white font-black text-lg">
              Gorila <span style={{ color: '#E11428' }}>Motos</span>
            </span>
          </div>

          {/* Badge acceso en desktop */}
          <span className="hidden lg:inline-flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase font-bold" style={{ color: '#E11428' }}>
            <Lock size={11} />
            Acceso seguro
          </span>

          <Link
            to="/registro"
            className="text-[11px] tracking-[0.2em] uppercase text-white/40 hover:text-white/75 transition-colors font-semibold"
          >
            Crear cuenta
          </Link>
        </div>

        {/* ─── FORMULARIO CENTRADO ─── */}
        <div className="flex-1 flex items-center justify-center px-8 xl:px-12 py-8">
          <div className="w-full max-w-[340px]">

            {/* Título del panel */}
            <div className="auth-item mb-8">
              <h2 className="text-white font-black text-3xl leading-tight mb-2">
                Bienvenido<br />
                <span style={{ color: '#E11428' }}>de vuelta</span>
              </h2>
              <p className="text-white/40 text-sm font-light">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            {/* Aviso de acceso admin */}
            <div className="auth-item mb-6">
              <div
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(225,20,40,0.05)', border: '1px solid rgba(225,20,40,0.15)' }}
              >
                <Shield size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#E11428' }} />
                <div>
                  <p className="text-[10px] font-black tracking-[0.22em] uppercase mb-1" style={{ color: '#E11428' }}>
                    Acceso de Administrador
                  </p>
                  <p className="text-[11px] text-white/45 leading-relaxed">
                    Solo el <strong className="text-white/70">correo corporativo autorizado</strong> tiene privilegios de administrador.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── FORM ─── */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="auth-item">
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="tu@correo.com"
                  prefix={<Mail size={15} />}
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
                  prefix={<Lock size={15} />}
                  error={errors.contrasena?.message}
                  autoComplete="current-password"
                  {...register('contrasena')}
                />
              </div>

              <div className="auth-item flex justify-end">
                <Link
                  to="/recuperar"
                  className="text-xs text-white/35 hover:text-white/65 transition-colors font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="auth-item pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-shimmer w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  style={loading ? { background: '#E11428' } : {}}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Verificando...
                    </span>
                  ) : (
                    <>
                      Iniciar sesión
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Demo credentials */}
            <div className="auth-item mt-6 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/30 font-semibold mb-1.5">
                Acceso de prueba
              </p>
              <p className="text-xs text-white/65 font-mono tabular-nums">
                andres@gmotors.com <span className="text-white/25">·</span> 123
              </p>
            </div>
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <footer className="auth-item relative z-10 px-8 xl:px-12 pb-6">
          <p className="text-center text-[10px] tracking-[0.25em] uppercase text-white/20">
            © 2025 Gorila Motos · Sistema Enterprise
          </p>
        </footer>
      </section>
    </div>
  );
}
