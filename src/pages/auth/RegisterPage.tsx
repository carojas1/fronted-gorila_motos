import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Phone, Wrench, ArrowRight, Shield } from 'lucide-react';
import { authApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';

const schema = z.object({
  nombre_completo: z.string().min(3, 'Mínimo 3 caracteres'),
  correo:          z.string().email('Correo no válido'),
  telefono:        z.string().min(7, 'Ingresa un teléfono válido'),
  contrasena:      z.string().min(6, 'Mínimo 6 caracteres'),
  confirmar:       z.string().min(1, 'Confirma tu contraseña'),
}).refine(d => d.contrasena === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
});

type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await authApi.register({
        nombre_completo: data.nombre_completo,
        nombre_usuario:  data.correo.split('@')[0],
        correo:          data.correo,
        contrasena:      data.contrasena,
        pais:            'Ecuador',
        ciudad:          'Ecuador',
        descripcion:     `CEDULA: N/A | TELEFONO: ${data.telefono}`,
        ruta_imagen:     null,
      });
      toast.success('Cuenta creada. Ahora inicia sesión.', '¡Listo!');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090C',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* Glow ambiental */}
      <div style={{
        position: 'fixed', top: -120, left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(225,20,40,0.07) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 28 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: 'linear-gradient(135deg, #E11428, #7a000e)',
            boxShadow: '0 0 22px rgba(225,20,40,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Wrench size={18} color="white" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 17, margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
              Gorila <span style={{ color: '#E11428' }}>Motos</span>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: '3px 0 0' }}>
              Gestión de talleres · Ecuador
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#0F0F14',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18,
          padding: '32px 28px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        }}>

          {/* Encabezado */}
          <div style={{ marginBottom: 26 }}>
            <h1 style={{
              color: '#fff', fontWeight: 900, fontSize: 24,
              margin: '0 0 7px', letterSpacing: '-0.03em', lineHeight: 1.1,
            }}>
              Crear cuenta
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Completa tus datos para acceder al sistema de gestión.
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <Input
              label="Nombre completo"
              type="text"
              placeholder="Ej. Carlos Andrade"
              prefix={<User size={14} />}
              error={errors.nombre_completo?.message}
              autoComplete="name"
              {...register('nombre_completo')}
            />

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
              label="Teléfono / WhatsApp"
              type="tel"
              placeholder="0987 654 321"
              prefix={<Phone size={14} />}
              error={errors.telefono?.message}
              autoComplete="tel"
              {...register('telefono')}
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 6 caracteres"
              prefix={<Lock size={14} />}
              error={errors.contrasena?.message}
              autoComplete="new-password"
              {...register('contrasena')}
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite tu contraseña"
              prefix={<Lock size={14} />}
              error={errors.confirmar?.message}
              autoComplete="new-password"
              {...register('confirmar')}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 50, borderRadius: 12, marginTop: 6,
                background: loading
                  ? 'rgba(225,20,40,0.4)'
                  : 'linear-gradient(135deg, #E11428, #c0101e)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 6px 28px rgba(225,20,40,0.4)',
                transition: 'all 220ms ease',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 0.8s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Creando cuenta…
                </>
              ) : (
                <>Crear cuenta <ArrowRight size={16} /></>
              )}
            </button>

          </form>

          {/* Footer legal */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
            <Shield size={10} color="rgba(255,255,255,0.18)" />
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
              Al registrarte aceptas nuestra{' '}
              <Link to="/privacidad" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
                política de privacidad
              </Link>
              {' '}y los{' '}
              <Link to="/terminos" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
                términos de uso
              </Link>.
            </p>
          </div>

        </div>

        {/* Link login */}
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#E11428', fontWeight: 700, textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.12)' }}>
          © 2025 Gorila Motos · Ecuador
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
