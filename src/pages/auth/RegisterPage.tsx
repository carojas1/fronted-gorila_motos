import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../lib/api';
import { useAuthEntrance } from '../../hooks/useGsap';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { User, Mail, Lock, MapPin } from 'lucide-react';

const schema = z.object({
  nombre_completo: z.string().min(3, 'Mínimo 3 caracteres'),
  nombre_usuario:  z.string().min(3, 'Mínimo 3 caracteres').regex(/^\S+$/, 'Sin espacios'),
  correo:          z.string().email('Correo no válido'),
  contrasena:      z.string().min(6, 'Mínimo 6 caracteres'),
  pais:            z.string().min(2, 'Requerido'),
  ciudad:          z.string().min(2, 'Requerido'),
  descripcion:     z.string().default('Usuario del sistema'),
});
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { leftRef, rightRef } = useAuthEntrance();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { descripcion: 'Usuario del sistema' },
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await authApi.register({ ...data, ruta_imagen: 'null' });
      toast.success('Cuenta creada. Inicia sesión.', '¡Bienvenido!');
      navigate('/login');
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
      <div ref={leftRef} className="hidden lg:flex relative w-[45%] bg-gm-dark overflow-hidden noise">
        <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_15%_-10%,#1a0408_0%,#0B0B0D_55%)]" />
        <div className="absolute inset-0 grid-overlay opacity-50" />
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full neon-pulse"
             style={{ background: 'radial-gradient(circle, rgba(225,20,40,0.28) 0%, transparent 65%)' }} />
        <div className="absolute -bottom-28 -right-20 w-[360px] h-[360px] rounded-full neon-pulse"
             style={{ background: 'radial-gradient(circle, rgba(255,46,67,0.18) 0%, transparent 65%)', animationDelay: '1.6s' }} />

        <img
          src="/brand/pistones.png" alt="" aria-hidden
          className="absolute top-[12%] right-[8%] w-28 opacity-[0.10] invert rotate-slow"
        />

        <div className="relative flex flex-col justify-between h-full p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-lg">
              <img src="/brand/gorila-logo.png" alt="Gorila Motos" className="w-full h-full object-cover" />
              <span className="absolute inset-0 ring-1 ring-gm-red/30 rounded-xl" />
            </div>
            <div className="leading-tight">
              <p className="text-white font-extrabold tracking-[0.18em] text-[15px]">
                GORILA <span className="text-gm-red">MOTOS</span>
              </p>
              <p className="text-white/40 text-[10px] tracking-[0.35em] uppercase mt-0.5">Taller · Desde 2022</p>
            </div>
          </div>

          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-gm-red font-semibold">
              <span className="w-6 h-px bg-gm-red" />
              Registro
            </span>
            <h1 className="text-4xl font-black text-white leading-[1.05] tracking-tight">
              Únete al<br />
              <span className="text-gradient-red">taller</span><br />
              que mueve la ciudad.
            </h1>
            <p className="text-white/45 text-sm leading-relaxed max-w-xs">
              Crea tu cuenta para gestionar registros, motos, inventario y equipo desde un solo lugar.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-white/35">
            <span className="w-8 h-px bg-gm-red/60" />
            © GORILA MOTOS · {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div ref={rightRef} className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 bg-gm-bg overflow-y-auto">
        <div className="w-full max-w-sm mx-auto py-10">
          <div className="auth-item mb-7">
            <h2 className="text-2xl font-bold text-gm-text tracking-tight">Crear cuenta</h2>
            <p className="text-gm-muted text-sm mt-1">Completa los datos para registrarte</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="auth-item">
              <Input label="Nombre completo" placeholder="Juan Pérez"
                prefix={<User size={15} />} error={errors.nombre_completo?.message}
                {...register('nombre_completo')} />
            </div>
            <div className="auth-item">
              <Input label="Nombre de usuario" placeholder="juan.perez"
                prefix={<span className="text-xs">@</span>} error={errors.nombre_usuario?.message}
                {...register('nombre_usuario')} />
            </div>
            <div className="auth-item">
              <Input label="Correo electrónico" type="email" placeholder="tu@correo.com"
                prefix={<Mail size={15} />} error={errors.correo?.message}
                {...register('correo')} />
            </div>
            <div className="auth-item">
              <Input label="Contraseña" type="password" placeholder="••••••••"
                prefix={<Lock size={15} />} error={errors.contrasena?.message}
                {...register('contrasena')} />
            </div>
            <div className="auth-item grid grid-cols-2 gap-3">
              <Input label="País" placeholder="Ecuador"
                prefix={<MapPin size={15} />} error={errors.pais?.message}
                {...register('pais')} />
              <Input label="Ciudad" placeholder="Quito"
                error={errors.ciudad?.message} {...register('ciudad')} />
            </div>

            <div className="auth-item pt-1">
              <Button type="submit" size="lg" loading={loading} className="w-full">
                Crear cuenta
              </Button>
            </div>
          </form>

          <p className="auth-item mt-6 text-center text-sm text-gm-muted">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-gm-red font-medium hover:text-gm-red-lt transition-colors">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
