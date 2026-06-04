/* ─────────────────────────────────────────────
   GORILA MOTOS — Login final
   Dark · Moto 3D · Sin crashes · Mobile-first
   ───────────────────────────────────────────── */

import { lazy, Suspense, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight, Shield, Wrench } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';

const Bike3D = lazy(() => import('../../components/3d/Bike3D'));

const schema = z.object({
  correo:     z.string().email('Correo no válido'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const [demo, setDemo] = useState(false);

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

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0D', display: 'flex', flexDirection: 'column' }}>

      {/* ══ HERO + FORM ════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>

        {/* ── Lado izquierdo: Moto 3D (solo desktop) ── */}
        <div
          className="hidden lg:flex"
          style={{
            width: '58%',
            position: 'relative',
            background: 'radial-gradient(ellipse 90% 80% at 50% 50%, #120509 0%, #0B0B0D 70%)',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Glow rojo ambiental */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 65% 45% at 50% 55%, rgba(225,20,40,0.14) 0%, transparent 65%)',
          }} />

          {/* Grid decorativo */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.012) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.012) 40px)',
          }} />

          {/* Logo */}
          <div style={{ position: 'absolute', top: 28, left: 32, display: 'flex', alignItems: 'center', gap: 12, zIndex: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,#E11428,#8B0010)',
              boxShadow: '0 0 22px rgba(225,20,40,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Wrench size={19} color="white" />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 17, margin: 0, lineHeight: 1 }}>
                Gorila <span style={{ color: '#E11428' }}>Motos</span>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', margin: '3px 0 0' }}>
                Sistema Enterprise
              </p>
            </div>
          </div>

          {/* Moto 3D */}
          <div style={{ width: '100%', position: 'relative', zIndex: 10 }}>
            <div style={{ width: '100%', height: 'min(480px, 52vh)' }}>
              <Suspense fallback={
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 40, height: 40, border: '2px solid rgba(225,20,40,0.3)',
                    borderTopColor: '#E11428', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                </div>
              }>
                <Bike3D />
              </Suspense>
            </div>

            {/* Tagline */}
            <div style={{ textAlign: 'center', padding: '8px 24px 32px' }}>
              <p style={{
                color: '#fff', fontWeight: 900, margin: 0,
                fontSize: 'clamp(28px,3.5vw,46px)', letterSpacing: '-0.02em', lineHeight: 1.1,
              }}>
                Tu taller,{' '}
                <span style={{
                  background: 'linear-gradient(90deg,#E11428,#FF6B7A)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  bajo control.
                </span>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: '8px 0 0', fontWeight: 300 }}>
                Plataforma profesional para talleres de motos en Ecuador
              </p>
            </div>
          </div>
        </div>

        {/* ── Lado derecho: Formulario ── */}
        <div style={{
          flex: 1,
          background: '#0F0F14',
          borderLeft: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
          position: 'relative',
        }}>

          {/* Glow corner */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(225,20,40,0.06) 0%,transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Logo mobile */}
          <div className="flex lg:hidden" style={{ alignItems: 'center', gap: 10, marginBottom: 32, alignSelf: 'flex-start', maxWidth: 360, width: '100%' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg,#E11428,#8B0010)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Wrench size={16} color="white" />
            </div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 17, margin: 0 }}>
              Gorila <span style={{ color: '#E11428' }}>Motos</span>
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: 360 }}>

            {/* Título */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 28, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Bienvenido de vuelta
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, margin: '6px 0 0' }}>
                Accede al panel de tu taller
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@correo.com"
                prefix={<Mail size={14} />}
                error={errors.correo?.message}
                autoComplete="email"
                {...register('correo')}
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                prefix={<Lock size={14} />}
                error={errors.contrasena?.message}
                autoComplete="current-password"
                {...register('contrasena')}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/registro" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
                  ¿No tienes cuenta? Regístrate
                </Link>
                <Link to="/recuperar" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 48,
                  borderRadius: 12,
                  background: '#E11428',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: loading ? 'none' : '0 0 28px rgba(225,20,40,0.35)',
                  transition: 'opacity 200ms',
                  marginTop: 4,
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Verificando…
                  </>
                ) : (
                  <>Iniciar sesión <ArrowRight size={15} /></>
                )}
              </button>
            </form>

            {/* Badge seguridad */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
              <Shield size={11} color="rgba(255,255,255,0.2)" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Conexión SSL cifrada · Datos protegidos</span>
            </div>

            {/* Demo */}
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setDemo(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}
              >
                {demo ? 'Ocultar demo ↑' : 'Credenciales de demo →'}
              </button>
              {demo && (
                <div style={{
                  marginTop: 8, padding: '10px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'left',
                }}>
                  <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)', margin: '0 0 4px' }}>andres@gmotors.com</p>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.28)', margin: 0 }}>contraseña: 123</p>
                </div>
              )}
            </div>

            <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.12)', marginTop: 24, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              © {new Date().getFullYear()} Gorila Motos · Ecuador
            </p>
          </div>
        </div>
      </div>

      {/* ══ MÓDULOS DEL SISTEMA ══════════════════════════ */}
      <div style={{
        background: '#0C0C10',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '48px 24px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#E11428', fontWeight: 700, margin: '0 0 6px' }}>
            ¿Qué hace el sistema?
          </p>
          <h2 style={{ textAlign: 'center', color: '#fff', fontWeight: 900, fontSize: 'clamp(20px,3vw,28px)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            Todo en un solo lugar
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.28)', fontSize: 13, margin: '0 0 32px', lineHeight: 1.6 }}>
            Gestión integral para talleres de motos — web y app móvil para Ecuador
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 28,
          }}>
            {[
              { color: '#E11428', label: 'Órdenes de servicio',    desc: 'Flujo completo del taller' },
              { color: '#3B82F6', label: 'Registro de motos',       desc: 'Ficha técnica y diagnóstico' },
              { color: '#10B981', label: 'Inventario inteligente',  desc: 'Stock con alertas automáticas' },
              { color: '#8B5CF6', label: 'Facturación SRI',         desc: 'Ecuador · IVA 15% · 2024' },
              { color: '#F59E0B', label: 'Puntos / Fidelización',   desc: 'Gamificación para clientes' },
              { color: '#14B8A6', label: 'Rastreador combustible',  desc: 'Costo y consumo por km' },
              { color: '#EF4444', label: 'Alertas de aceite',       desc: 'Por km · email automático' },
              { color: '#6366F1', label: 'Portal del cliente',      desc: 'Historial desde el celular' },
            ].map(({ color, label, desc }) => (
              <div key={label} style={{
                background: 'linear-gradient(150deg,#17171E 0%,#111115 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '14px 16px',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9,
                  background: `${color}15`, border: `1px solid ${color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                </div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 13, margin: '0 0 3px' }}>{label}</p>
                <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {[
              { l: 'Frontend',    v: 'React 19 + Vite' },
              { l: 'Backend',     v: 'Spring Boot + PostgreSQL' },
              { l: 'App móvil',   v: 'Android · iOS (Capacitor)' },
              { l: 'Facturación', v: 'SRI Ecuador · IVA 15%' },
            ].map(({ l, v }) => (
              <div key={l} style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 10, padding: '10px 14px', textAlign: 'center',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 3px', fontWeight: 700 }}>{l}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyframe para el spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
