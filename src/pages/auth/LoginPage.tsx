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
      background: '#0B0B0D',
      display: 'flex',
    }}>

      {/* ══════════════════════════════════════
          IZQUIERDA — Moto 3D
          ══════════════════════════════════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width: '58%',
          position: 'relative',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse 90% 80% at 45% 50%, #130208 0%, #0B0B0D 68%)',
        }}
      >
        {/* Glow rojo ambiental */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 42% 52%, rgba(225,20,40,0.13) 0%, transparent 62%)',
        }} />

        {/* Grid perspectiva sutil */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: [
            'repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,0.009) 60px)',
            'repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,0.009) 60px)',
          ].join(','),
        }} />

        {/* Línea divisora derecha */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 1,
          background: 'linear-gradient(to bottom, transparent 10%, rgba(225,20,40,0.15) 50%, transparent 90%)',
          pointerEvents: 'none',
        }} />

        {/* Logo top-left */}
        <div style={{
          position: 'absolute', top: 28, left: 32, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #E11428, #8B0010)',
            boxShadow: '0 0 26px rgba(225,20,40,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Wrench size={20} color="white" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: 0, lineHeight: 1, letterSpacing: '-0.02em' }}>
              Gorila <span style={{ color: '#E11428' }}>Motos</span>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, margin: '4px 0 0', fontWeight: 500 }}>
              Gestión de talleres · Ecuador
            </p>
          </div>
        </div>

        {/* Moto 3D — ocupa todo el espacio */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          <Suspense fallback={
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 44, height: 44,
                border: '2px solid rgba(225,20,40,0.2)',
                borderTopColor: '#E11428',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          }>
            <Bike3D />
          </Suspense>
        </div>

        {/* Tagline — esquina inferior izquierda */}
        <div style={{
          position: 'absolute', bottom: 36, left: 36, zIndex: 10,
          maxWidth: 420,
        }}>
          <h1 style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: 'clamp(28px, 3vw, 44px)',
            margin: '0 0 8px',
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
          <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            Órdenes · Inventario · Facturación SRI · App móvil
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════
          DERECHA — Formulario
          ══════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 32px',
        background: '#0D0D12',
        position: 'relative',
        overflowY: 'auto',
      }}>

        {/* Glow esquina */}
        <div style={{
          position: 'absolute', top: -80, right: -80, pointerEvents: 'none',
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(225,20,40,0.05) 0%, transparent 65%)',
        }} />

        {/* Logo mobile */}
        <div className="flex lg:hidden" style={{
          alignItems: 'center', gap: 10, marginBottom: 32,
          alignSelf: 'flex-start', width: '100%', maxWidth: 400,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #E11428, #8B0010)',
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
          <div style={{ marginBottom: 30 }}>
            {/* Badge sistema activo */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(34,197,94,0.07)',
              border: '1px solid rgba(34,197,94,0.18)',
              borderRadius: 99, padding: '4px 13px', marginBottom: 18,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#22C55E', boxShadow: '0 0 5px #22C55E',
              }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                Sistema activo
              </span>
            </div>

            <h2 style={{
              color: '#fff', fontWeight: 900, fontSize: 28,
              margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1,
            }}>
              Accede a tu panel
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.32)', fontSize: 13,
              margin: '9px 0 0', lineHeight: 1.65,
            }}>
              Ingresa tus credenciales para gestionar tu taller.
            </p>
          </div>

          {/* Form */}
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
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontWeight: 500 }}
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
                  : 'linear-gradient(135deg, #E11428 0%, #C0101E 100%)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 6px 28px rgba(225,20,40,0.4)',
                transition: 'all 200ms ease',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Verificando…
                </>
              ) : (
                <>Iniciar sesión <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Aviso backend cold-start */}
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 9,
            background: 'rgba(255,180,0,0.04)',
            border: '1px solid rgba(255,180,0,0.10)',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>⚡</span>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: 0, lineHeight: 1.6 }}>
              Si el sistema tarda en responder, el servidor está iniciando. Espera 30–50 s e intenta de nuevo.
            </p>
          </div>

          {/* Footer legal */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', marginBottom: 10 }}>
              <Shield size={10} color="rgba(255,255,255,0.17)" />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.17)' }}>
                SSL cifrado · Datos protegidos · LOPDP Ecuador
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Link to="/privacidad" style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', textDecoration: 'none', fontWeight: 500 }}>
                Privacidad
              </Link>
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10 }}>·</span>
              <Link to="/terminos" style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', textDecoration: 'none', fontWeight: 500 }}>
                Términos
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
