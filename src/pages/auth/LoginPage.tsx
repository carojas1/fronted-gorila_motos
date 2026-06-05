import { lazy, Suspense } from 'react';
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

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
      background: '#09090C',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* ════════════════════════════════════════════
          HERO — moto 3D (sólo desktop)
          ════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: '58%',
          position: 'relative',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse 90% 80% at 38% 52%, #130208 0%, #09090C 65%)',
        }}
      >
        {/* Glow lateral derecho (separa de form) */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 1,
          background: 'linear-gradient(to bottom, transparent, rgba(225,20,40,0.18), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Grid perspectiva */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: [
            'repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.008) 60px)',
            'repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.008) 60px)',
          ].join(','),
        }} />

        {/* Orbe inferior */}
        <div style={{
          position: 'absolute', bottom: -120, left: '20%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(225,20,40,0.09) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '28px 36px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: 'linear-gradient(135deg, #E11428, #7a000e)',
            boxShadow: '0 0 28px rgba(225,20,40,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Wrench size={19} color="white" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 17, margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
              Gorila <span style={{ color: '#E11428' }}>Motos</span>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: '4px 0 0', fontWeight: 500 }}>
              Gestión de talleres · Ecuador
            </p>
          </div>
        </div>

        {/* Moto 3D — ocupa el centro */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', zIndex: 2 }}>
          <Suspense fallback={
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <div style={{
                width: 42, height: 42,
                border: '2px solid rgba(225,20,40,0.2)',
                borderTopColor: '#E11428',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12 }}>Cargando…</span>
            </div>
          }>
            <Bike3D />
          </Suspense>
        </div>

        {/* Tagline sobre la moto — esquina inferior */}
        <div style={{
          position: 'relative', zIndex: 2,
          padding: '20px 36px 34px',
        }}>
          <h1 style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: 'clamp(26px, 2.6vw, 38px)',
            margin: '0 0 6px',
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
          }}>
            Tu taller,{' '}
            <span style={{
              background: 'linear-gradient(90deg, #E11428 0%, #ff4d5e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              bajo control.
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Órdenes · Inventario · Facturación SRI · App móvil
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          PANEL DERECHO — Formulario
          ════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 28px',
        background: '#0D0D12',
        position: 'relative',
        overflowY: 'auto',
      }}>

        {/* Glow esquina superior */}
        <div style={{
          position: 'absolute', top: -80, right: -80, pointerEvents: 'none',
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(225,20,40,0.05) 0%, transparent 65%)',
        }} />

        {/* Logo mobile */}
        <div className="flex lg:hidden" style={{
          alignItems: 'center', gap: 10, marginBottom: 36,
          alignSelf: 'flex-start', width: '100%', maxWidth: 400,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #E11428, #7a000e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Wrench size={16} color="white" />
          </div>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 17, margin: 0, letterSpacing: '-0.02em' }}>
            Gorila <span style={{ color: '#E11428' }}>Motos</span>
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Encabezado */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              color: '#fff',
              fontWeight: 900,
              fontSize: 26,
              margin: '0 0 8px',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}>
              Accede a tu panel
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, margin: 0, lineHeight: 1.65 }}>
              Ingresa tus credenciales para gestionar tu taller de motos.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

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
              <div style={{ textAlign: 'right', marginTop: 7 }}>
                <Link
                  to="/recuperar"
                  style={{
                    fontSize: 12, color: 'rgba(255,255,255,0.32)',
                    textDecoration: 'none', fontWeight: 500,
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 50, borderRadius: 12, marginTop: 4,
                background: loading
                  ? 'rgba(225,20,40,0.4)'
                  : 'linear-gradient(135deg, #E11428, #c0101e)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 6px 28px rgba(225,20,40,0.42)',
                transition: 'all 220ms ease',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Verificando credenciales…
                </>
              ) : (
                <>Iniciar sesión <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Aviso servidor — visible sólo si hay error 502 frecuente */}
          <div style={{
            marginTop: 18, padding: '10px 14px', borderRadius: 9,
            background: 'rgba(255,180,0,0.05)',
            border: '1px solid rgba(255,180,0,0.12)',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>⚡</span>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', margin: 0, lineHeight: 1.6 }}>
              Si el sistema tarda en responder, el servidor está iniciando (plan cloud gratuito). Espera 30–50 s e intenta de nuevo.
            </p>
          </div>

          {/* Footer legal */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', marginBottom: 10 }}>
              <Shield size={10} color="rgba(255,255,255,0.18)" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>
                Conexión SSL cifrada · Datos protegidos · LOPDP Ecuador
              </span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              <Link to="/privacidad" style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', textDecoration: 'none', fontWeight: 500 }}>
                Privacidad
              </Link>
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
              <Link to="/terminos" style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', textDecoration: 'none', fontWeight: 500 }}>
                Términos de uso
              </Link>
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.13)' }}>© 2025 Gorila Motos</span>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
