/* ─────────────────────────────────────────────
   GORILA MOTOS — Pantalla de acceso
   Layout cinematográfico con moto 3D real (R3F)
   ───────────────────────────────────────────── */

import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail, Lock, ArrowRight, Cpu, Wifi, ShieldCheck, Shield,
  Zap, Wrench, GaugeCircle, Cog,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthEntrance } from '../../hooks/useGsap';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

/* Lazy: la moto 3D se carga solo cuando se necesita (no bloquea login) */
const Bike3D = lazy(() => import('../../components/3d/Bike3D'));

const schema = z.object({
  correo:     z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
type Form = z.infer<typeof schema>;

/* ─── Hora viva (HH:mm:ss) ─── */
function useClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { leftRef, rightRef } = useAuthEntrance();
  const clock = useClock();

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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-gm-dark text-white">

      {/* ════════════════════════════════════════════════════
          PANEL IZQUIERDO — Garage cinematográfico con moto 3D
         ════════════════════════════════════════════════════ */}
      <section
        ref={leftRef}
        className="
          relative overflow-hidden noise
          lg:w-[62%] xl:w-[64%]
          min-h-[58vh] lg:min-h-screen
          flex flex-col
        "
      >
        {/* ─ Fondo: gradiente + glow ambiente ─ */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_20%_-10%,#1c0408_0%,#0B0B0D_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_115%,#220609_0%,transparent_60%)]" />
          <div className="absolute inset-0 grid-overlay opacity-50" />
          <div
            className="absolute top-1/3 -right-32 w-[560px] h-[560px] rounded-full neon-pulse"
            style={{ background: 'radial-gradient(circle, rgba(225,20,40,0.30) 0%, transparent 65%)' }}
          />
          <div
            className="absolute -bottom-40 left-1/4 w-[480px] h-[480px] rounded-full neon-pulse"
            style={{ background: 'radial-gradient(circle, rgba(255,46,67,0.20) 0%, transparent 65%)', animationDelay: '2s' }}
          />
        </div>

        {/* Decoración: pistones rotando */}
        <img
          src="/brand/pistones.png" alt="" aria-hidden
          className="absolute top-[6%] right-[12%] w-24 opacity-[0.10] invert rotate-slow hidden lg:block"
        />

        {/* ═══════════ TOP BAR ═══════════ */}
        <header className="auth-item relative z-10 flex items-start justify-between px-6 lg:px-12 pt-6 lg:pt-8">
          {/* Brand — Letra amarrada profesional */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src="/brand/gorila-logo.png"
                alt="Gorila Motos"
                className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/10 shadow-lg shadow-black/40"
              />
              <span className="absolute inset-0 rounded-xl ring-1 ring-gm-red/40" />
            </div>
            <div className="leading-none">
              <p style={{ fontFamily: "'Dancing Script', cursive", fontSize: '36px', fontWeight: 700 }} className="text-white drop-shadow-lg">
                Gorila <span className="text-gm-red">Motos</span>
              </p>
              <p className="text-white/40 text-[10px] tracking-[0.32em] uppercase mt-1">
                Sistema interno · Taller
              </p>
            </div>
          </div>

          {/* Status panel (derecha) */}
          <div className="hidden md:flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase text-white/55">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              Sistema operativo
            </div>
            <p className="font-mono text-xs text-white/70 tabular-nums">{hhmmss} <span className="text-white/30">·</span> Quito-EC</p>
            <p className="text-[10px] text-white/30 capitalize">{fecha}</p>
          </div>
        </header>

        {/* ═══════════ ESCENA 3D ═══════════ */}
        <div className="relative flex-1 flex flex-col min-h-[300px]">
          {/* ════════════════════════════════════════════════════
              HUD / ETIQUETAS DE LA MOTO (Izquierda y Derecha)
             ════════════════════════════════════════════════════ */}
          
          {/* ── MARCAS DE MOTOS (Lado Izquierdo) ── */}
          <div className="hidden lg:flex absolute top-1/2 left-6 -translate-y-1/2 flex-col gap-8 z-10 pointer-events-none">

            {/* YAMAHA */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] tracking-[0.35em] text-white/30 uppercase font-semibold">Japón</p>
                <p className="text-[16px] font-black tracking-widest text-white leading-tight">YAMAHA</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gm-red animate-pulse shadow-[0_0_6px_#E11428]" />
                <div className="w-12 h-px" style={{background:'linear-gradient(to right, #E11428, transparent)'}} />
              </div>
            </div>

            {/* DUCATI */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] tracking-[0.35em] text-white/30 uppercase font-semibold">Italia</p>
                <p className="text-[16px] font-black tracking-widest text-white leading-tight">DUCATI</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                <div className="w-8 h-px bg-white/25" />
              </div>
            </div>

            {/* KAWASAKI */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] tracking-[0.35em] text-white/30 uppercase font-semibold">Japón</p>
                <p className="text-[16px] font-black tracking-widest text-white leading-tight">KAWASAKI</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                <div className="w-10 h-px bg-white/25" />
              </div>
            </div>

          </div>

          {/* ── MARCAS DE MOTOS (Lado Derecho) ── */}
          <div className="hidden lg:flex absolute top-1/2 right-6 -translate-y-1/2 flex-col gap-8 z-10 pointer-events-none items-end">

            {/* HONDA */}
            <div className="flex items-center gap-3 flex-row-reverse">
              <div className="text-left">
                <p className="text-[9px] tracking-[0.35em] text-white/30 uppercase font-semibold">Japón</p>
                <p className="text-[16px] font-black tracking-widest text-white leading-tight">HONDA</p>
              </div>
              <div className="flex items-center gap-1 flex-row-reverse">
                <div className="w-1.5 h-1.5 rounded-full bg-gm-red animate-pulse shadow-[0_0_6px_#E11428]" />
                <div className="w-12 h-px" style={{background:'linear-gradient(to left, #E11428, transparent)'}} />
              </div>
            </div>

            {/* BMW */}
            <div className="flex items-center gap-3 flex-row-reverse">
              <div className="text-left">
                <p className="text-[9px] tracking-[0.35em] text-white/30 uppercase font-semibold">Alemania</p>
                <p className="text-[16px] font-black tracking-widest text-white leading-tight">BMW</p>
              </div>
              <div className="flex items-center gap-1 flex-row-reverse">
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                <div className="w-8 h-px bg-white/25" />
              </div>
            </div>

            {/* SUZUKI */}
            <div className="flex items-center gap-3 flex-row-reverse">
              <div className="text-left">
                <p className="text-[9px] tracking-[0.35em] text-white/30 uppercase font-semibold">Japón</p>
                <p className="text-[16px] font-black tracking-widest text-white leading-tight">SUZUKI</p>
              </div>
              <div className="flex items-center gap-1 flex-row-reverse">
                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                <div className="w-10 h-px bg-white/25" />
              </div>
            </div>

          </div>

          {/* Canvas 3D — filtro para virar azul → rojo */}
          <div className="relative w-full h-full flex-1 min-h-[300px] lg:min-h-[450px]">
            <Suspense
              fallback={
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex flex-col items-center gap-3 text-white/40">
                    <Cog size={22} className="animate-spin" />
                    <p className="text-[10px] tracking-[0.3em] uppercase">Cargando modelo 3D</p>
                  </div>
                </div>
              }
            >
              {/* hue-rotate(125deg): azul(240°) → rojo(≈5°) */}
              <div className="absolute inset-0" style={{ filter: 'hue-rotate(125deg) saturate(1.6) brightness(1.05)' }}>
                <Bike3D className="absolute inset-0 w-full h-full" autoRotateSpeed={1.2} />
              </div>
            </Suspense>

            {/* Glow rojo bajo la moto */}
            <div
              className="absolute left-1/2 bottom-[14%] -translate-x-1/2 w-[55%] h-16 blur-3xl pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(225,20,40,0.5) 0%, transparent 70%)' }}
            />
          </div>

        </div>

        {/* ═══════════ FRASE MOTIVACIONAL — DEBAJO DE LA MOTO ═══════════ */}
        <div className="relative z-10 text-center px-8 lg:px-16 py-6 lg:py-8">
          <p
            style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700 }}
            className="text-[22px] sm:text-[30px] lg:text-[38px] text-black leading-tight"
          >
            La única forma de hacer
          </p>
          <p
            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.06em' }}
            className="text-[52px] sm:text-[72px] lg:text-[90px] text-black font-black leading-none uppercase"
          >
            UN GRAN TRABAJO
          </p>
          <p
            style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700 }}
            className="text-[20px] sm:text-[28px] lg:text-[34px] text-black leading-tight mt-1"
          >
            es amar lo que haces
          </p>
        </div>

        {/* ═══════════ FOOTER ═══════════ */}
        <div className="auth-item relative z-10 px-6 lg:px-12 pb-5 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-white/35">
              <span className="w-6 h-px bg-gm-red/60" />
              © Gorila Motos · {new Date().getFullYear()}
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-white/30">
              <Wifi size={11} className="text-emerald-400" />
              Sistema operativo · {import.meta.env.MODE}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          PANEL DERECHO — Formulario (Dark Mode)
         ════════════════════════════════════════════════════ */}
      <section
        ref={rightRef}
        className="
          relative flex-1 flex flex-col
          bg-gm-dark2 text-white
          px-6 sm:px-10 lg:px-14
          py-8 lg:py-10
          border-l border-white/[0.04]
        "
      >
        {/* Marca esquina */}
        <div className="auth-item flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-gm-red font-bold">
            <Wrench size={12} />
            Acceso · Taller
          </span>
          <Link
            to="/registro"
            className="text-[11px] tracking-[0.2em] uppercase text-white/50 hover:text-gm-red transition-colors font-semibold"
          >
            Crear cuenta
          </Link>
        </div>

        {/* Bloque central */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm">

            {/* ─── MARCA: GORILA (heavy) + Motos (script) ─── */}
            <div className="auth-item mb-10">
              <div className="brand-combo">
                <span className="brand-heavy">Gorila</span>
                <span className="brand-script">Motos</span>
              </div>
              <div className="brand-underline w-36 mt-3 mb-4" />
              <p className="text-white/55 text-base font-light tracking-wide italic">
                Forjando la excelencia en cada ruta, todos los días.
              </p>
            </div>

            {/* Advertencia de Admin solicitada por el usuario */}
            <div className="auth-item mb-6">
              <div className="flex flex-col p-3.5 rounded-xl bg-gm-red/5 border border-gm-red/20 shadow-[0_0_15px_rgba(225,20,40,0.05)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield size={13} className="text-gm-red animate-pulse" />
                  <span className="text-[10px] tracking-[0.25em] uppercase text-gm-red font-black">Acceso de Administrador</span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                  Solo el <strong className="text-white/80 font-bold">correo corporativo autorizado</strong> tiene privilegios para entrar como Admin.
                </p>
              </div>
            </div>

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
                  className="text-xs text-white/40 hover:text-gm-red transition-colors font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="auth-item pt-2">
                <Button
                  type="submit"
                  size="lg"
                  loading={loading}
                  className="w-full group !bg-gm-red hover:!bg-gm-red-lt text-white"
                  iconRight={
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  }
                >
                  Iniciar sesión
                </Button>
              </div>
            </form>

            {/* Demo creds */}
            <div className="auth-item mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] tracking-[0.25em] uppercase text-white/40 font-semibold mb-1">
                Acceso de prueba
              </p>
              <p className="text-xs text-white/80 font-mono tabular-nums">
                andres@gmotors.com <span className="text-white/30">·</span> 123
              </p>
            </div>
          </div>
        </div>

        {/* Footer mobile */}
        <p className="auth-item lg:hidden mt-6 text-center text-[10px] tracking-[0.3em] uppercase text-white/30">
          © Gorila Motos · {new Date().getFullYear()}
        </p>
      </section>
    </div>
  );
}
