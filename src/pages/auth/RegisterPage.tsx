/* ─────────────────────────────────────────────────────────────
   GMotors — Register Page v4
   · Misma paleta: negro · naranja #FF6600 · rojo #E11428 · oro #FFD700
   · Títulos: Bebas Neue  |  Cuerpo: Inter
   · Emil Kowalski: spring hover/click, stagger entrance, checkbox custom
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
    message: 'Debes aceptar los términos',
  }),
}).refine(d => d.contrasena === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path:    ['confirmar'],
});
type Form = z.infer<typeof schema>;

/* ─── Logo ─── */
function Logo({ size = 48 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.2,
      background: 'linear-gradient(135deg,#E11428,#7a000e)',
      boxShadow: '0 0 0 2px rgba(225,20,40,0.4), 0 8px 32px rgba(225,20,40,0.35)',
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
  const s = !value ? 0
    : value.length < 6 ? 1
    : value.length < 8 ? 2
    : /[A-Z]/.test(value) && /[0-9]/.test(value) ? 4 : 3;
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  const colors = ['', '#EF4444', '#F59E0B', '#FF8C40', '#22C55E'];
  if (!value) return null;
  return (
    <div style={{ marginTop:7, display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ display:'flex', gap:4, flex:1 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex:1, height:3, borderRadius:99,
            background: i <= s ? colors[s] : 'rgba(255,255,255,0.07)',
            transition:'background 280ms',
          }}/>
        ))}
      </div>
      <span style={{ fontSize:10, color:colors[s], fontWeight:700, minWidth:44 }}>{labels[s]}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  const navigate = useNavigate();
  const toast    = useToast();
  const [loading,       setLoading]       = useState(false);
  const [entered,       setEntered]       = useState(false);
  const [termsChecked,  setTermsChecked]  = useState(false);
  const [passValue,     setPassValue]     = useState('');

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
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

  /* Spring entrance */
  const enter = (delay: number): React.CSSProperties => ({
    opacity:   entered ? 1 : 0,
    transform: entered ? 'translateY(0)' : 'translateY(18px)',
    transition: `opacity 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms,
                 transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
  });

  return (
    <div style={{
      minHeight:'100vh', overflowX:'hidden',
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'flex-start',
      padding:'36px 16px 52px',
      fontFamily:"'Inter', system-ui, sans-serif",
      background:'#03030A',
      position:'relative',
    }}>

      {/* ─── Orbs de fondo — naranja · rojo (coherentes con la paleta) ─── */}
      <div style={{
        position:'fixed', top:'-8%', right:'-12%', pointerEvents:'none', zIndex:0,
        width:600, height:600, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(255,102,0,0.09) 0%, transparent 62%)',
        animation:'glowPulse 10s ease-in-out infinite',
      }}/>
      <div style={{
        position:'fixed', bottom:'-12%', left:'-14%', pointerEvents:'none', zIndex:0,
        width:500, height:500, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(225,20,40,0.07) 0%, transparent 62%)',
        animation:'glowPulse 14s ease-in-out infinite reverse',
      }}/>

      <div style={{ width:'100%', maxWidth:460, position:'relative', zIndex:1 }}>

        {/* ─── Cabecera ─── */}
        <div style={{ marginBottom:26, ...enter(0) }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
            <Logo size={52}/>
            <div style={{ lineHeight:1.1 }}>
              <p style={{
                fontFamily:"'Dancing Script', cursive",
                fontWeight:700, fontSize:28, margin:0, lineHeight:1,
                background:'linear-gradient(135deg,#FFD700,#FFA500)',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                filter:'drop-shadow(0 0 18px rgba(255,165,0,0.5))',
              }}>
                Gorila Motos
              </p>
              <p style={{ color:'rgba(255,255,255,0.24)', fontSize:11, margin:'3px 0 0', fontWeight:500 }}>
                Gestión de talleres · Ecuador
              </p>
            </div>
          </div>

          {/* Título Bebas Neue */}
          <h1 style={{
            fontFamily:"'Bebas Neue', sans-serif",
            fontSize:'clamp(36px,6vw,52px)',
            lineHeight:0.94, letterSpacing:'0.02em',
            margin:'0 0 10px', color:'#fff',
          }}>
            Crea tu{' '}
            <span style={{
              background:'linear-gradient(90deg, #FF8C40, #FF6600)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              filter:'drop-shadow(0 0 24px rgba(255,102,0,0.5))',
            }}>
              cuenta.
            </span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13.5, margin:0, lineHeight:1.65, fontWeight:400 }}>
            Únete al sistema de gestión más completo para talleres de motos en Ecuador.
          </p>
        </div>

        {/* ─── Card del formulario ─── */}
        <div style={{
          background:'linear-gradient(160deg, rgba(18,18,28,0.85) 0%, rgba(12,12,20,0.9) 100%)',
          backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,102,0,0.1)',
          borderRadius:20,
          padding:'26px 26px 22px',
          boxShadow:'0 24px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)',
          ...enter(70),
        }}>

          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display:'flex', flexDirection:'column', gap:13 }}>

            <div style={enter(110)}>
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

            <div style={enter(150)}>
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

            <div style={enter(190)}>
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

            <div style={enter(230)}>
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

            <div style={enter(270)}>
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

            {/* ─── Checkbox de términos — custom ─── */}
            <div style={{ marginTop:4, ...enter(310) }}>
              <label
                style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}
                onClick={() => {
                  const next = !termsChecked;
                  setTermsChecked(next);
                  setValue('terms', next, { shouldValidate: true });
                }}
              >
                {/* Custom box con spring */}
                <div style={{
                  width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
                  background: termsChecked ? 'linear-gradient(135deg,#FF6600,#E05000)' : 'rgba(255,255,255,0.04)',
                  border:`1.5px solid ${termsChecked ? '#FF6600' : 'rgba(255,255,255,0.11)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
                  boxShadow: termsChecked ? '0 0 14px rgba(255,102,0,0.45)' : 'none',
                }}>
                  {termsChecked && <Check size={11} style={{ color:'#fff', strokeWidth:3 }}/>}
                </div>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.48)', lineHeight:1.65 }}>
                  He leído y acepto la{' '}
                  <a href="/privacidad" target="_blank" rel="noopener"
                    style={{ color:'#FF8C40', fontWeight:700, textDecoration:'none' }}
                    onClick={e => e.stopPropagation()}>
                    Política de Privacidad
                  </a>
                  {' '}y los{' '}
                  <a href="/terminos" target="_blank" rel="noopener"
                    style={{ color:'#FF8C40', fontWeight:700, textDecoration:'none' }}
                    onClick={e => e.stopPropagation()}>
                    Términos de Uso
                  </a>.
                </span>
              </label>
              <input type="checkbox" style={{ display:'none' }} {...register('terms')}/>
              {errors.terms && (
                <p style={{ color:'#EF4444', fontSize:11.5, marginTop:5, paddingLeft:28, fontWeight:500 }}>
                  {errors.terms.message}
                </p>
              )}
            </div>

            {/* ─── Botón submit ─── */}
            <div style={{ marginTop:6, ...enter(350) }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width:'100%', height:52, borderRadius:13,
                  background: loading
                    ? 'rgba(225,20,40,0.38)'
                    : 'linear-gradient(135deg, #E11428 0%, #C0001D 100%)',
                  color:'#fff', fontWeight:700, fontSize:15, letterSpacing:'-0.01em',
                  border:'none', cursor:loading?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow: loading ? 'none' : '0 4px 28px rgba(225,20,40,0.42), 0 0 0 1px rgba(225,20,40,0.15)',
                  transition:'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = 'translateY(-2px)';
                    el.style.boxShadow = '0 8px 36px rgba(225,20,40,0.58), 0 0 0 1px rgba(225,20,40,0.25)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = '';
                  el.style.boxShadow = loading ? 'none' : '0 4px 28px rgba(225,20,40,0.42), 0 0 0 1px rgba(225,20,40,0.15)';
                }}
                onMouseDown={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)'; }}
                onMouseUp={e =>   { if (!loading) (e.currentTarget as HTMLElement).style.transform = ''; }}
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
          <div style={{ marginTop:14, ...enter(390) }}>
            <div style={{
              display:'flex', alignItems:'flex-start', gap:10,
              background:'rgba(255,102,0,0.06)',
              border:'1px solid rgba(255,102,0,0.15)',
              borderRadius:12, padding:'10px 14px',
            }}>
              <Mail size={13} style={{ color:'#FF8C40', flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.38)', margin:0, lineHeight:1.65 }}>
                Recibirás un email de verificación. Confírmalo para activar tu acceso al sistema.
              </p>
            </div>
          </div>
        )}

        {/* ─── Link login ─── */}
        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'rgba(255,255,255,0.27)', ...enter(400) }}>
          ¿Ya tienes cuenta?{' '}
          <Link
            to="/login"
            style={{ color:'#FFD700', fontWeight:700, textDecoration:'none', transition:'color 150ms' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FFA500'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#FFD700'; }}
          >
            Iniciar sesión
          </Link>
        </p>

        {/* Footer */}
        <div style={{ textAlign:'center', marginTop:16, ...enter(420) }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <Shield size={10} color="rgba(255,255,255,0.13)"/>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.15)' }}>
              SSL · LOPDP Ecuador · © 2025 Gorila Motos
            </span>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes glowPulse{ 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
    </div>
  );
}
