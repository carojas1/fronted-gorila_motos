import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Mail, Lock, Phone, ArrowRight, Shield,
} from 'lucide-react';
import { authApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';
import { firebaseEnabled, firebaseRegister } from '../../lib/firebase';

/* ─── Schema ─── */
const schema = z.object({
  nombre_completo: z.string().min(3, 'Mínimo 3 caracteres'),
  correo:          z.string().email('Correo no válido'),
  telefono:        z.string().min(7, 'Ingresa un teléfono válido'),
  contrasena:      z.string().min(6, 'Mínimo 6 caracteres'),
  confirmar:       z.string().min(1, 'Confirma tu contraseña'),
  terms:           z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los términos y la política de privacidad',
  }),
}).refine(d => d.contrasena === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
});
type Form = z.infer<typeof schema>;

/* ─── Logo Gorila Motos (reutilizable) ─── */
function GorilaLogo({ size = 44 }: { size?: number }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25,
      background: 'linear-gradient(135deg,#E11428,#7a000e)',
      boxShadow: '0 0 28px rgba(225,20,40,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {imgOk ? (
        <img
          src="/brand/gorila-logo.png"
          alt="Gorila Motos"
          onError={() => setImgOk(false)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: size * 0.48, lineHeight: 1 }}>🦍</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PÁGINA DE REGISTRO
   ═══════════════════════════════════════════ */
export default function RegisterPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      terms: false,
    }
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      /* ── Con Firebase: crear usuario allí primero, enviar verificación ── */
      if (firebaseEnabled) {
        await firebaseRegister(data.correo, data.contrasena);
        /* Guardar datos pendientes para cuando el usuario verifique */
        sessionStorage.setItem('gm_pending_register', JSON.stringify({
          nombre_completo: data.nombre_completo,
          correo:          data.correo,
          telefono:        data.telefono,
          contrasena:      data.contrasena,
        }));
        toast.success('¡Revisa tu correo y haz clic en el enlace de verificación!', 'Email enviado');
        navigate('/verificar-email');
        return;
      }

      /* ── Sin Firebase: flujo original directo al backend ── */
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
      <div style={{
        position: 'fixed', bottom: -80, right: '20%',
        width: 400, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,215,0,0.04) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>

        {/* Logo + Nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 28 }}>
          <GorilaLogo size={44} />
          <div>
            <p style={{
              fontFamily: "'Dancing Script', cursive",
              fontWeight: 700, fontSize: 22, margin: 0, lineHeight: 1,
              color: '#FFD700',
              textShadow: '0 0 16px rgba(255,215,0,0.35)',
            }}>
              Gorila Motos
            </p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: '3px 0 0' }}>
              Gestión de talleres · Ecuador
            </p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(160deg, #141419 0%, #0F0F14 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 28px 70px rgba(0,0,0,0.6)',
        }}>

          {/* Encabezado */}
          <div style={{ marginBottom: 24 }}>
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

            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ marginTop: 4, cursor: 'pointer' }}
                  {...register('terms')}
                />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  He leído y acepto la{' '}
                  <Link to="/privacidad" target="_blank" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                    Política de Privacidad
                  </Link>
                  {' '}y los{' '}
                  <Link to="/terminos" target="_blank" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 600 }}>
                    Términos de Uso
                  </Link>.
                </span>
              </label>
              {errors.terms && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.terms.message}</p>}
            </div>

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
                  {firebaseEnabled ? 'Enviando verificación…' : 'Creando cuenta…'}
                </>
              ) : (
                <>{firebaseEnabled ? 'Registrarme y verificar email' : 'Crear cuenta'} <ArrowRight size={16} /></>
              )}
            </button>

          </form>

          {/* Footer info Firebase */}
          {firebaseEnabled && (
            <div style={{
              marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 8,
              background: 'rgba(66,133,244,0.06)',
              border: '1px solid rgba(66,133,244,0.15)',
              borderRadius: 8, padding: '9px 12px',
            }}>
              <Mail size={13} color="#4285F4" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>
                Te enviaremos un email de verificación. Debes confirmarlo para activar tu cuenta.
              </p>
            </div>
          )}

          {/* Footer legal */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
            <Shield size={10} color="rgba(255,255,255,0.18)" />
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
              Datos protegidos bajo la LOPDP del Ecuador
            </p>
          </div>

        </div>

        {/* Link login */}
        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#FFD700', fontWeight: 700, textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: 'rgba(255,255,255,0.12)' }}>
          © 2025 Gorila Motos · Ecuador
        </p>

      </div>

      <style>{`
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
      `}</style>
    </div>
  );
}
