/* ─────────────────────────────────────────────────────────────
   GMotors — Register Page v3
   Emil Kowalski: restraint, spring physics, pixel-perfect
   Misma paleta que LoginPage: deep dark · violet · brand red
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Phone, ArrowRight, Shield, Check } from 'lucide-react';
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
  terms:           z.boolean().refine(v => v === true, {
    message: 'Debes aceptar los términos y la política de privacidad',
  }),
}).refine(d => d.contrasena === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path:    ['confirmar'],
});
type Form = z.infer<typeof schema>;

/* ─── Logo ─── */
function Logo({ size = 46 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: 'linear-gradient(135deg,#E11428,#7a000e)',
      boxShadow: '0 0 0 2px rgba(225,20,40,0.35), 0 8px 28px rgba(225,20,40,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {ok
        ? <img src="/brand/gorila-logo.png" alt="" onError={() => setOk(false)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : <span style={{ fontSize: size * 0.5, lineHeight:1 }}>🦍</span>}
    </div>
  );
}

/* ─── Indicador fuerza de contraseña ─── */
function PasswordStrength({ value }: { value: string }) {
  const strength = !value ? 0
    : value.length < 6      ? 1
    : value.length < 8      ? 2
    : /[A-Z]/.test(value) && /[0-9]/.test(value) ? 4
    : 3;
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  const colors = ['', '#EF4444', '#F59E0B', '#22C55E', '#10B981'];
  if (!value) return null;
  return (
    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ display:'flex', gap:4, flex:1 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex:1, height:3, borderRadius:99,
            background: i <= strength ? colors[strength] : 'rgba(255,255,255,0.07)',
            transition: 'background 300ms',
          }}/>
        ))}
      </div>
      <span style={{ fontSize:10, color: colors[strength], fontWeight:700, minWidth:44 }}>
        {labels[strength]}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  const navigate          = useNavigate();
  const toast             = useToast();
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const [passValue, setPassValue] = useState('');
  const [termsChecked, setTermsChecked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60);
    return () => clearTimeout(t);
  }, []);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { terms: false },
  });

  const watchedPass = watch('contrasena', '');
  useEffect(() => { setPassValue(watchedPass); }, [watchedPass]);

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      if (firebaseEnabled) {
        await firebaseRegister(data.correo, data.contrasena);
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

  const enterStyle = (delay: number) => ({
    opacity:   entered ? 1 : 0,
    transform: entered ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
  });

  return (
    <div style={{
      minHeight:'100vh', overflowX:'hidden',
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      padding:'32px 16px 48px',
      fontFamily:"'Inter', system-ui, sans-serif",
      background:'#030307',
      position:'relative',
    }}>

      {/* ─── Orbs animados de fondo ─── */}
      <div style={{
        position:'fixed', top:'-10%', right:'-15%', pointerEvents:'none',
        width:600, height:600, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(124,58,237,0.11) 0%, transparent 60%)',
        animation:'orbDrift1 16s ease-in-out infinite',
      }}/>
      <div style={{
        position:'fixed', bottom:'-15%', left:'-15%', pointerEvents:'none',
        width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 60%)',
        animation:'orbDrift2 20s ease-in-out infinite',
      }}/>
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        pointerEvents:'none',
        width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(225,20,40,0.05) 0%, transparent 60%)',
        animation:'orbDrift3 24s ease-in-out infinite',
      }}/>

      <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>

        {/* ─── Cabecera ─── */}
        <div style={{ marginBottom:28, ...enterStyle(0) }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }}>
            <Logo size={48}/>
            <div style={{ lineHeight:1.1 }}>
              <p style={{
                fontFamily:"'Dancing Script', cursive",
                fontWeight:700, fontSize:26, margin:0, lineHeight:1,
                background:'linear-gradient(135deg,#FBBF24,#F59E0B)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                filter:'drop-shadow(0 0 14px rgba(251,191,36,0.3))',
              }}>
                Gorila Motos
              </p>
              <p style={{ color:'rgba(255,255,255,0.22)', fontSize:11, margin:'3px 0 0', fontWeight:500 }}>
                Gestión de talleres · Ecuador
              </p>
            </div>
          </div>
          <h1 style={{
            color:'#fff', fontWeight:900, fontSize:'clamp(22px,4vw,30px)',
            margin:'0 0 8px', letterSpacing:'-0.03em', lineHeight:1.1,
          }}>
            Crea tu cuenta
          </h1>
          <p style={{ color:'rgba(255,255,255,0.32)', fontSize:13.5, margin:0, lineHeight:1.65 }}>
            Únete al sistema de gestión más completo para talleres de motos.
          </p>
        </div>

        {/* ─── Card del formulario ─── */}
        <div style={{
          background:'linear-gradient(160deg, rgba(22,22,34,0.85) 0%, rgba(14,14,22,0.9) 100%)',
          backdropFilter:'blur(20px)',
          border:'1px solid rgba(124,58,237,0.12)',
          borderRadius:20,
          padding:'28px 28px 24px',
          boxShadow:'0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
          ...enterStyle(60),
        }}>

          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display:'flex', flexDirection:'column', gap:13 }}>

            {/* Nombre */}
            <div style={enterStyle(100)}>
              <Input
                label="Nombre completo"
                type="text"
                placeholder="Ej. Carlos Andrade"
                prefix={<User size={14}/>}
                error={errors.nombre_completo?.message}
                autoComplete="name"
                {...register('nombre_completo')}
              />
            </div>

            {/* Correo */}
            <div style={enterStyle(140)}>
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@correo.com"
                prefix={<Mail size={14}/>}
                error={errors.correo?.message}
                autoComplete="email"
                {...register('correo')}
              />
            </div>

            {/* Teléfono */}
            <div style={enterStyle(180)}>
              <Input
                label="Teléfono / WhatsApp"
                type="tel"
                placeholder="0987 654 321"
                prefix={<Phone size={14}/>}
                error={errors.telefono?.message}
                autoComplete="tel"
                {...register('telefono')}
              />
            </div>

            {/* Contraseña + strength */}
            <div style={enterStyle(220)}>
              <Input
                label="Contraseña"
                type="password"
                placeholder="Mínimo 6 caracteres"
                prefix={<Lock size={14}/>}
                error={errors.contrasena?.message}
                autoComplete="new-password"
                {...register('contrasena')}
              />
              <PasswordStrength value={passValue}/>
            </div>

            {/* Confirmar */}
            <div style={enterStyle(260)}>
              <Input
                label="Confirmar contraseña"
                type="password"
                placeholder="Repite tu contraseña"
                prefix={<Lock size={14}/>}
                error={errors.confirmar?.message}
                autoComplete="new-password"
                {...register('confirmar')}
              />
            </div>

            {/* Terms — checkbox custom */}
            <div style={{ marginTop:4, ...enterStyle(300) }}>
              <label
                style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}
                onClick={() => {
                  const next = !termsChecked;
                  setTermsChecked(next);
                  setValue('terms', next, { shouldValidate: true });
                }}
              >
                {/* Custom checkbox */}
                <div style={{
                  width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
                  background: termsChecked ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : 'rgba(255,255,255,0.04)',
                  border:`1.5px solid ${termsChecked ? '#7C3AED' : 'rgba(255,255,255,0.12)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: termsChecked ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                }}>
                  {termsChecked && <Check size={11} style={{ color:'#fff', strokeWidth:3 }}/>}
                </div>
                {/* Texto */}
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>
                  He leído y acepto la{' '}
                  <a
                    href="/privacidad"
                    target="_blank"
                    rel="noopener"
                    style={{ color:'#FBBF24', fontWeight:700, textDecoration:'none' }}
                    onClick={e => e.stopPropagation()}
                  >
                    Política de Privacidad
                  </a>
                  {' '}y los{' '}
                  <a
                    href="/terminos"
                    target="_blank"
                    rel="noopener"
                    style={{ color:'#FBBF24', fontWeight:700, textDecoration:'none' }}
                    onClick={e => e.stopPropagation()}
                  >
                    Términos de Uso
                  </a>.
                </span>
              </label>
              {/* Hidden input para RHF */}
              <input type="checkbox" style={{ display:'none' }} {...register('terms')}/>
              {errors.terms && (
                <p style={{ color:'#EF4444', fontSize:11.5, marginTop:5, paddingLeft:28, fontWeight:500 }}>
                  {errors.terms.message}
                </p>
              )}
            </div>

            {/* ─── Botón submit ─── */}
            <div style={{ marginTop:8, ...enterStyle(340) }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width:'100%', height:52, borderRadius:13,
                  background: loading
                    ? 'rgba(225,20,40,0.4)'
                    : 'linear-gradient(135deg, #E11428 0%, #C8001F 100%)',
                  color:'#fff', fontWeight:700, fontSize:15, letterSpacing:'-0.01em',
                  border:'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow: loading ? 'none' : '0 4px 28px rgba(225,20,40,0.42), 0 0 0 1px rgba(225,20,40,0.15)',
                  transition:'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.boxShadow = '0 8px 36px rgba(225,20,40,0.58), 0 0 0 1px rgba(225,20,40,0.25)';
                    el.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = loading ? 'none' : '0 4px 28px rgba(225,20,40,0.42), 0 0 0 1px rgba(225,20,40,0.15)';
                  el.style.transform = '';
                }}
                onMouseDown={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
                onMouseUp={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    {firebaseEnabled ? 'Enviando verificación…' : 'Creando cuenta…'}
                  </>
                ) : (
                  <>
                    {firebaseEnabled ? 'Crear cuenta y verificar email' : 'Crear cuenta'}
                    <ArrowRight size={16}/>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* ─── Info Firebase ─── */}
        {firebaseEnabled && (
          <div style={{ marginTop:14, ...enterStyle(380) }}>
            <div style={{
              display:'flex', alignItems:'flex-start', gap:10,
              background:'rgba(79,70,229,0.07)',
              border:'1px solid rgba(79,70,229,0.18)',
              borderRadius:12, padding:'10px 14px',
            }}>
              <Mail size={13} style={{ color:'#818CF8', flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', margin:0, lineHeight:1.6 }}>
                Recibirás un email de verificación. Confírmalo para activar tu acceso al sistema.
              </p>
            </div>
          </div>
        )}

        {/* ─── Link a login ─── */}
        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'rgba(255,255,255,0.28)', ...enterStyle(400) }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color:'#FBBF24', fontWeight:700, textDecoration:'none' }}>
            Iniciar sesión
          </Link>
        </p>

        {/* Footer legal */}
        <div style={{ textAlign:'center', marginTop:16, ...enterStyle(420) }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <Shield size={10} color="rgba(255,255,255,0.13)"/>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.15)' }}>
              SSL · LOPDP Ecuador · © 2025 Gorila Motos
            </span>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes orbDrift1 {
          0%,100% { transform: translate(0,0) scale(1);       }
          33%     { transform: translate(-35px,25px) scale(1.05); }
          66%     { transform: translate(22px,-18px) scale(0.96); }
        }
        @keyframes orbDrift2 {
          0%,100% { transform: translate(0,0) scale(1);       }
          40%     { transform: translate(28px,-35px) scale(1.07); }
          70%     { transform: translate(-18px,18px) scale(0.95); }
        }
        @keyframes orbDrift3 {
          0%,100% { transform: translate(-50%,-50%) scale(1);    }
          50%     { transform: translate(-50%,-50%) scale(1.12); }
        }
      `}</style>
    </div>
  );
}
