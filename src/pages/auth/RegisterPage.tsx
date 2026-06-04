/* ─────────────────────────────────────────────
   GORILA MOTOS — Registro
   Flujo 2 pasos: cuenta → datos del taller
   Elegante, dark, mobile-first
   ───────────────────────────────────────────── */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Mail, Lock, MapPin, Wrench, ChevronRight,
  Store, CheckCircle, Phone, ArrowLeft,
} from 'lucide-react';
import { authApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';

/* ── Esquema completo ── */
const schema = z.object({
  /* Paso 1 — Cuenta personal */
  nombre_completo: z.string().min(3, 'Mínimo 3 caracteres'),
  correo:          z.string().email('Correo no válido'),
  contrasena:      z.string().min(6, 'Mínimo 6 caracteres'),
  telefono:        z.string().min(7, 'Teléfono requerido'),
  /* Paso 2 — Datos del negocio */
  nombre_taller:   z.string().min(2, 'Nombre del taller requerido'),
  ciudad:          z.string().min(2, 'Ciudad requerida'),
  pais:            z.string().default('Ecuador'),
  especialidades:  z.string().min(3, 'Indica al menos una especialidad'),
  tipo_negocio:    z.string().min(1, 'Selecciona el tipo'),
});
type Form = z.infer<typeof schema>;

const TIPOS = [
  'Taller multimarca',
  'Taller especializado (motos sport)',
  'Taller especializado (motos trail)',
  'Taller especializado (motos clásicas)',
  'Taller servicio rápido',
  'Concesionario con taller',
  'Taller a domicilio',
  'Otro',
];

const ESPECIALIDADES_SUGERIDAS = [
  'Cambio de aceite', 'Frenos', 'Sistema eléctrico',
  'Motor', 'Suspensión', 'Carburación / Inyección',
  'Carrocería', 'Llantas', 'Diagnóstico electrónico',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const toast    = useToast();
  const [step, setStep]     = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [chips, setChips]   = useState<string[]>([]);

  const { register, handleSubmit, trigger, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { pais: 'Ecuador' },
  });

  const toggleChip = (esp: string) => {
    const next = chips.includes(esp)
      ? chips.filter(c => c !== esp)
      : [...chips, esp];
    setChips(next);
    setValue('especialidades', next.join(', '), { shouldValidate: true });
  };

  const goStep2 = async () => {
    const ok = await trigger(['nombre_completo', 'correo', 'contrasena', 'telefono']);
    if (ok) setStep(2);
  };

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const desc = `TALLER: ${data.nombre_taller} | TIPO: ${data.tipo_negocio} | ESPECIALIDADES: ${data.especialidades} | TEL: ${data.telefono}`;
      await authApi.register({
        nombre_completo: data.nombre_completo,
        nombre_usuario:  data.correo.split('@')[0],
        correo:          data.correo,
        contrasena:      data.contrasena,
        pais:            data.pais,
        ciudad:          data.ciudad,
        descripcion:     desc,
        ruta_imagen:     null,
      });
      toast.success('Cuenta creada exitosamente. Inicia sesión.', '¡Bienvenido!');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      {/* Glow */}
      <div style={{ position: 'fixed', top: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(225,20,40,0.07) 0%,transparent 65%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#E11428,#8B0010)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wrench size={16} color="white" />
          </div>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 17, margin: 0 }}>
            Gorila <span style={{ color: '#E11428' }}>Motos</span>
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'linear-gradient(150deg,#17171E 0%,#111115 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}>

          {/* Pasos indicador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            {[1, 2].map(n => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: step >= n ? '#E11428' : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${step >= n ? '#E11428' : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: step >= n ? '#fff' : 'rgba(255,255,255,0.3)',
                  transition: 'all 200ms',
                }}>
                  {step > n ? <CheckCircle size={13} /> : n}
                </div>
                <span style={{ fontSize: 12, color: step >= n ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', fontWeight: 600 }}>
                  {n === 1 ? 'Tu cuenta' : 'Tu taller'}
                </span>
                {n < 2 && <ChevronRight size={12} color="rgba(255,255,255,0.15)" />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* ══ PASO 1: Datos personales ══ */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                    Crea tu cuenta
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>
                    Datos de acceso al sistema
                  </p>
                </div>

                <Input label="Nombre completo *" type="text" placeholder="Ej. Carlos Andrade"
                  prefix={<User size={14} />} error={errors.nombre_completo?.message}
                  {...register('nombre_completo')} />

                <Input label="Correo electrónico *" type="email" placeholder="tu@correo.com"
                  prefix={<Mail size={14} />} error={errors.correo?.message}
                  {...register('correo')} />

                <Input label="Teléfono / WhatsApp *" type="tel" placeholder="0987654321"
                  prefix={<Phone size={14} />} error={errors.telefono?.message}
                  {...register('telefono')} />

                <Input label="Contraseña *" type="password" placeholder="Mínimo 6 caracteres"
                  prefix={<Lock size={14} />} error={errors.contrasena?.message}
                  {...register('contrasena')} />

                <button
                  type="button"
                  onClick={goStep2}
                  style={{
                    height: 46, borderRadius: 12, background: '#E11428',
                    color: '#fff', fontWeight: 700, fontSize: 14,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 0 24px rgba(225,20,40,0.3)',
                    marginTop: 4,
                  }}
                >
                  Continuar <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* ══ PASO 2: Datos del taller ══ */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 20, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                    Cuéntanos de tu taller
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>
                    Esta información aparece en tus facturas y portal
                  </p>
                </div>

                <Input label="Nombre del taller *" type="text" placeholder="Ej. Taller Los Ángeles"
                  prefix={<Store size={14} />} error={errors.nombre_taller?.message}
                  {...register('nombre_taller')} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Input label="Ciudad *" type="text" placeholder="Quito"
                    prefix={<MapPin size={14} />} error={errors.ciudad?.message}
                    {...register('ciudad')} />
                  <Input label="País" type="text" placeholder="Ecuador"
                    prefix={<MapPin size={14} />} error={errors.pais?.message}
                    {...register('pais')} />
                </div>

                {/* Tipo de negocio */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Tipo de taller *
                  </label>
                  <select
                    className="gm-select-d"
                    style={{ width: '100%' }}
                    {...register('tipo_negocio')}
                  >
                    <option value="">Selecciona el tipo…</option>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.tipo_negocio && <p style={{ color: '#E11428', fontSize: 11, marginTop: 4 }}>{errors.tipo_negocio.message}</p>}
                </div>

                {/* Especialidades con chips */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Especialidades *
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {ESPECIALIDADES_SUGERIDAS.map(esp => (
                      <button
                        key={esp}
                        type="button"
                        onClick={() => toggleChip(esp)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: `1px solid ${chips.includes(esp) ? 'rgba(225,20,40,0.45)' : 'rgba(255,255,255,0.1)'}`,
                          background: chips.includes(esp) ? 'rgba(225,20,40,0.15)' : 'rgba(255,255,255,0.04)',
                          color: chips.includes(esp) ? '#E11428' : 'rgba(255,255,255,0.45)',
                          transition: 'all 140ms',
                        }}
                      >
                        {esp}
                      </button>
                    ))}
                  </div>
                  {chips.length === 0 && errors.especialidades && (
                    <p style={{ color: '#E11428', fontSize: 11 }}>{errors.especialidades.message}</p>
                  )}
                  {chips.length > 0 && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                      Seleccionadas: {chips.join(', ')}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1, height: 46, borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)',
                      fontWeight: 700, fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <ArrowLeft size={14} /> Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 2, height: 46, borderRadius: 12,
                      background: '#E11428',
                      border: 'none',
                      color: '#fff', fontWeight: 700, fontSize: 14,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 0 24px rgba(225,20,40,0.3)',
                    }}
                  >
                    {loading ? 'Creando cuenta…' : <><CheckCircle size={16} /> Crear mi cuenta</>}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#E11428', fontWeight: 700, textDecoration: 'none' }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
