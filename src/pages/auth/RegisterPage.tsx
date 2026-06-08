/* ─────────────────────────────────────────────────────────────
   GMotors — Register Page v5
   Minimalista: negro · blanco · rojo — sin mezcla de colores
   Emil Kowalski: spring hover, stagger, custom checkbox
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Phone, ArrowRight, Shield, Check } from 'lucide-react';
import { authApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';
import { firebaseEnabled, startGoogleRedirect, getGoogleRedirectUser } from '../../lib/firebase';
import { useServerStatus } from '../../hooks/useServerStatus';

const schema = z.object({
  nombre_completo: z.string().min(3, 'Mínimo 3 caracteres'),
  correo:          z.string().email('Correo no válido'),
  telefono:        z.string().min(7, 'Ingresa un teléfono válido'),
  contrasena:      z.string().min(6, 'Mínimo 6 caracteres'),
  confirmar:       z.string().min(1, 'Confirma tu contraseña'),
  terms:           z.boolean().refine(v => v === true, { message: 'Debes aceptar los términos' }),
}).refine(d => d.contrasena === d.confirmar, {
  message: 'Las contraseñas no coinciden', path: ['confirmar'],
});
type Form = z.infer<typeof schema>;

/* ─── Logo ─── */
function Logo({ size = 42 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: 'linear-gradient(135deg,#E11428,#8B0010)',
      boxShadow: '0 0 0 1px rgba(225,20,40,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {ok
        ? <img src="/brand/gorila-logo.png" alt="" onError={() => setOk(false)} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
        : <span style={{ fontSize: size * 0.5, lineHeight:1 }}>🦍</span>}
    </div>
  );
}

/* ─── Google icon SVG ─── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/* ─── Strength indicator ─── */
function PasswordStrength({ value }: { value: string }) {
  const s = !value ? 0 : value.length < 6 ? 1 : value.length < 8 ? 2 : /[A-Z]/.test(value) && /[0-9]/.test(value) ? 4 : 3;
  const colors = ['', '#E11428', '#E8850A', '#F0B429', '#22C55E'];
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  if (!value) return null;
  return (
    <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 3, flex: 1 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= s ? colors[s] : 'rgba(255,255,255,0.07)',
            transition: 'background 250ms',
          }}/>
        ))}
      </div>
      <span style={{ fontSize: 10, color: colors[s], fontWeight: 700, minWidth: 44 }}>{labels[s]}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  const navigate     = useNavigate();
  const toast        = useToast();
  const serverStatus = useServerStatus();
  const { processGoogleUser, user, token } = useAuth();
  const [loading,       setLoading]       = useState(false);
  const [googleBusy,    setGoogleBusy]    = useState(false);
  const [entered,       setEntered]       = useState(false);
  const [termsChecked,  setTermsChecked]  = useState(false);
  const [passValue,     setPassValue]     = useState('');

  /* Navegación reactiva — igual que en LoginPage */
  useEffect(() => {
    if (user && token) navigate('/dashboard', { replace: true });
  }, [user, token, navigate]);

  /* Detectar resultado de Google redirect al volver de autenticación */
  useEffect(() => {
    if (!firebaseEnabled || !processGoogleUser) return;
    let cancelled = false;
    getGoogleRedirectUser()
      .then(async fbUser => {
        if (!fbUser || cancelled) return;
        setGoogleBusy(true);
        try { await processGoogleUser(fbUser); }
        catch (err) { if (!cancelled) toast.error(getErrorMsg(err), 'Error con Google'); }
        finally    { if (!cancelled) setGoogleBusy(false); }
      })
      .catch(err => {
        if (!cancelled) toast.error(getErrorMsg(err), 'Error con Google');
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      /* Registro directo en el backend — sin verificación Firebase.
         Google Auth usa su propio flujo (redirect). */
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
      toast.success('¡Cuenta creada! Ahora inicia sesión.', '¡Listo!');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Google Sign-In — siempre usa REDIRECT (sin popup).
   * Igual que LoginPage: evita COOP errors, funciona en desktop, móvil y WebViews.
   */
  const handleGoogle = async () => {
    if (!processGoogleUser) return;
    setGoogleBusy(true);
    try {
      await startGoogleRedirect();
      /* La página navega a Google — al regresar, el useEffect de getGoogleRedirectUser
         detecta el resultado y llama processGoogleUser automáticamente */
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/unauthorized-domain') {
        toast.error(
          'Este dominio no está autorizado. Usa gmotors-frontend.vercel.app',
          'Dominio no autorizado'
        );
      } else {
        toast.error(getErrorMsg(err), 'Error al iniciar Google');
      }
      setGoogleBusy(false);
    }
  };

  const enter = (delay: number): React.CSSProperties => ({
    opacity:   entered ? 1 : 0,
    transform: entered ? 'none' : 'translateY(14px)',
    transition: `opacity 0.45s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms,
                 transform 0.45s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
  });

  const isBusy    = loading || googleBusy;
  const isBlocked = isBusy || serverStatus === 'starting';

  return (
    <div style={{
      minHeight: '100vh', overflowX: 'hidden',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '32px 16px 48px',
      fontFamily: "'Inter', system-ui, sans-serif",
      background: '#0A0A0A',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* ─── Header ─── */}
        <div style={{ marginBottom: 24, ...enter(0) }}>
          {/* Marca centrada, impactante */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }}>
            <Logo size={56}/>
            <div>
              <p style={{ fontFamily:"'Dancing Script', cursive", fontWeight:700, fontSize:28, margin:0, lineHeight:1, color:'#EBEBEB' }}>
                Gorila Motos
              </p>
              <p style={{ color:'rgba(255,255,255,0.28)', fontSize:11, margin:'4px 0 0', fontWeight:500, letterSpacing:'0.1em', textTransform:'uppercase' }}>
                Gestión de talleres · Ecuador
              </p>
            </div>
          </div>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(36px,5.5vw,54px)',
            lineHeight: 0.9, letterSpacing: '0.01em',
            margin: '0 0 10px', color: '#EBEBEB',
          }}>
            Crea tu <span style={{ color: '#E11428' }}>cuenta.</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13.5, margin: 0, lineHeight: 1.65 }}>
            Únete al sistema de gestión para talleres de motos en Ecuador.
          </p>
        </div>

        {/* ─── Google (acción primaria) ─── */}
        {firebaseEnabled && (
          <div style={{ marginBottom: 20, ...enter(60) }}>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={isBlocked}
              style={{
                width: '100%', height: 48,
                background: isBlocked ? 'rgba(255,255,255,0.7)' : '#FFFFFF',
                color: '#0A0A0A', fontWeight: 600, fontSize: 14,
                border: 'none', borderRadius: 10,
                cursor: isBlocked ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 160ms cubic-bezier(0.34,1.56,0.64,1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={e => {
                if (!isBlocked) {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-1px)';
                  el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = '';
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
              }}
              onMouseDown={e => { if (!isBlocked) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
              onMouseUp={e =>   { if (!isBlocked) (e.currentTarget as HTMLElement).style.transform = ''; }}
            >
              {googleBusy
                ? <svg style={{ animation:'spin 0.8s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(10,10,10,0.2)" strokeWidth="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round"/></svg>
                : <GoogleIcon/>}
              {serverStatus === 'starting' ? 'Esperando servidor…' : 'Registrarse con Google'}
            </button>

            <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:16 }}>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }}/>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)', fontWeight:500 }}>o con correo</span>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }}/>
            </div>
          </div>
        )}

        {/* ─── Card formulario ─── */}
        <div style={{
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '24px 22px 20px',
          ...enter(firebaseEnabled ? 100 : 60),
        }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display:'flex', flexDirection:'column', gap:12 }}>

            <div style={enter(firebaseEnabled ? 130 : 80)}>
              <Input label="Nombre completo" type="text" placeholder="Ej. Carlos Andrade"
                prefix={<User size={14}/>} error={errors.nombre_completo?.message}
                autoComplete="name" {...register('nombre_completo')}/>
            </div>

            <div style={enter(firebaseEnabled ? 155 : 105)}>
              <Input label="Correo electrónico" type="email" placeholder="tu@correo.com"
                prefix={<Mail size={14}/>} error={errors.correo?.message}
                autoComplete="email" {...register('correo')}/>
            </div>

            <div style={enter(firebaseEnabled ? 180 : 130)}>
              <Input label="Teléfono / WhatsApp" type="tel" placeholder="0987 654 321"
                prefix={<Phone size={14}/>} error={errors.telefono?.message}
                autoComplete="tel" {...register('telefono')}/>
            </div>

            <div style={enter(firebaseEnabled ? 205 : 155)}>
              <Input label="Contraseña" type="password" placeholder="Mínimo 6 caracteres"
                prefix={<Lock size={14}/>} error={errors.contrasena?.message}
                autoComplete="new-password" {...register('contrasena')}/>
              <PasswordStrength value={passValue}/>
            </div>

            <div style={enter(firebaseEnabled ? 230 : 180)}>
              <Input label="Confirmar contraseña" type="password" placeholder="Repite tu contraseña"
                prefix={<Lock size={14}/>} error={errors.confirmar?.message}
                autoComplete="new-password" {...register('confirmar')}/>
            </div>

            {/* Checkbox custom */}
            <div style={{ marginTop: 4, ...enter(firebaseEnabled ? 255 : 205) }}>
              <label
                style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}
                onClick={() => { const n = !termsChecked; setTermsChecked(n); setValue('terms', n, { shouldValidate: true }); }}
              >
                <div style={{
                  width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
                  background: termsChecked ? '#E11428' : 'transparent',
                  border: `1.5px solid ${termsChecked ? '#E11428' : 'rgba(255,255,255,0.14)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all 180ms cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  {termsChecked && <Check size={11} style={{ color:'#fff', strokeWidth:3 }}/>}
                </div>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.65 }}>
                  He leído y acepto la{' '}
                  <a href="/privacidad" target="_blank" rel="noopener" style={{ color:'#EBEBEB', fontWeight:700, textDecoration:'none' }} onClick={e => e.stopPropagation()}>
                    Política de Privacidad
                  </a>
                  {' '}y los{' '}
                  <a href="/terminos" target="_blank" rel="noopener" style={{ color:'#EBEBEB', fontWeight:700, textDecoration:'none' }} onClick={e => e.stopPropagation()}>
                    Términos de Uso
                  </a>.
                </span>
              </label>
              <input type="checkbox" style={{ display:'none' }} {...register('terms')}/>
              {errors.terms && <p style={{ color:'#E11428', fontSize:11.5, marginTop:5, paddingLeft:28 }}>{errors.terms.message}</p>}
            </div>

            {/* Botón submit */}
            <div style={{ marginTop: 8, ...enter(firebaseEnabled ? 280 : 230) }}>
              <button
                type="submit"
                disabled={isBlocked}
                style={{
                  width:'100%', height:50, borderRadius:10,
                  background: isBlocked ? 'rgba(225,20,40,0.4)' : '#E11428',
                  color:'#fff', fontWeight:700, fontSize:15, letterSpacing:'-0.01em',
                  border:'none', cursor:isBlocked?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  boxShadow: isBlocked ? 'none' : '0 0 0 1px rgba(225,20,40,0.3)',
                  transition:'all 160ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => {
                  if (!isBlocked) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = '#FF1F37';
                    el.style.transform  = 'translateY(-1px)';
                    el.style.boxShadow  = '0 4px 20px rgba(225,20,40,0.5)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = isBlocked ? 'rgba(225,20,40,0.4)' : '#E11428';
                  el.style.transform  = '';
                  el.style.boxShadow  = isBlocked ? 'none' : '0 0 0 1px rgba(225,20,40,0.3)';
                }}
                onMouseDown={e => { if (!isBlocked) (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
                onMouseUp={e =>   { if (!isBlocked) (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                {loading && !googleBusy ? (
                  <>
                    <svg style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Creando cuenta…
                  </>
                ) : serverStatus === 'starting' ? (
                  <>
                    <svg style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Despertando servidor…
                  </>
                ) : (
                  <>Crear cuenta <ArrowRight size={15}/></>
                )}
              </button>
              {serverStatus === 'starting' && (
                <p style={{ textAlign:'center', marginTop:8, fontSize:11.5, color:'rgba(255,255,255,0.28)', lineHeight:1.6 }}>
                  El servidor está despertando (~30 s), se habilitará solo.
                </p>
              )}
            </div>

          </form>
        </div>

        {/* Link login */}
        <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'rgba(255,255,255,0.28)', ...enter(320) }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color:'#EBEBEB', fontWeight:700, textDecoration:'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#EBEBEB'; }}>
            Iniciar sesión
          </Link>
        </p>

        <div style={{ textAlign:'center', marginTop:14, ...enter(340) }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <Shield size={9} color="rgba(255,255,255,0.12)"/>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.15)' }}>SSL · LOPDP Ecuador · © 2025 Gorila Motos</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
