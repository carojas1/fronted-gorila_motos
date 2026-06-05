import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, Wrench, CheckCircle2, Shield } from 'lucide-react';
import Input from '../../components/ui/Input';

const schema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
});
type Form = z.infer<typeof schema>;

export default function RecuperarPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async () => {
    setLoading(true);
    // Simula envío — cuando el backend tenga el endpoint se conecta aquí
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    setSent(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0B0D',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg, #E11428, #8B0010)',
            boxShadow: '0 0 20px rgba(225,20,40,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Wrench size={18} color="white" />
          </div>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 17, margin: 0 }}>
            Gorila <span style={{ color: '#E11428' }}>Motos</span>
          </p>
        </div>

        <div style={{
          background: '#0F0F14',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: '36px 32px',
        }}>
          {!sent ? (
            <>
              <h1 style={{
                color: '#fff', fontWeight: 900, fontSize: 24,
                margin: '0 0 8px', letterSpacing: '-0.03em',
              }}>
                Recuperar contraseña
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 28px', lineHeight: 1.6 }}>
                Ingresa el correo de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="tu@correo.com"
                  prefix={<Mail size={14} />}
                  error={errors.correo?.message}
                  autoComplete="email"
                  {...register('correo')}
                />

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    height: 48, borderRadius: 11,
                    background: loading ? 'rgba(225,20,40,0.45)' : '#E11428',
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading ? 'none' : '0 4px 22px rgba(225,20,40,0.35)',
                    transition: 'all 200ms',
                  }}
                >
                  {loading ? (
                    <>
                      <svg style={{ animation: 'spin 0.8s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.22)" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Enviando…
                    </>
                  ) : (
                    'Enviar enlace de recuperación'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <CheckCircle2 size={26} color="#10B981" />
              </div>
              <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                Correo enviado
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 8px', lineHeight: 1.6 }}>
                Si el correo <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{getValues('correo')}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, margin: '0 0 24px', lineHeight: 1.6 }}>
                Revisa también tu carpeta de spam.
              </p>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Link
              to="/login"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                color: 'rgba(255,255,255,0.38)', textDecoration: 'none', fontSize: 13, fontWeight: 500,
              }}
            >
              <ArrowLeft size={13} /> Volver al inicio de sesión
            </Link>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Shield size={10} color="rgba(255,255,255,0.18)" />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>
              Conexión SSL · Datos protegidos
            </span>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.12)', marginTop: 20 }}>
          © 2025 Gorila Motos · Ecuador ·{' '}
          <Link to="/privacidad" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>Privacidad</Link>
        </p>
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
