/* ─────────────────────────────────────────────
   GMotors — Mi Moto (vista cliente)
   Muestra las motos del cliente o formulario para registrar la primera.
   Incluye sección para completar datos personales (cédula / teléfono).
   ───────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bike, Camera, Plus, User, Phone, CreditCard,
  CheckCircle, AlertTriangle, Pencil, X, Save,
  Gauge, Activity,
} from 'lucide-react';
import { motosApi, usuariosApi, mantenimientosApi } from '../../lib/api';
import { comprimirImagen, imagenMoto } from '../../lib/fotos';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg, extractPhone, extractCedula } from '../../lib/utils';
import Input from '../../components/ui/Input';
import type { Moto } from '../../types';
import { EstadoMotoLive } from '../../components/mantenimiento/EstadoMantenimiento';
import { calcularEstadoLocal } from '../../lib/mantenimiento';

/* ─── Tipos de moto usados en Ecuador (igual que MotosPage) ─── */
const TIPOS = ['Calle', 'Deportiva', 'Trabajo', 'Todoterreno', 'Touring', 'Otro'];

const TIPO_COLOR: Record<string, string> = {
  Calle: '#3B82F6', Deportiva: '#FF3B47', Trabajo: '#F59E0B',
  Todoterreno: '#00E676', Touring: '#00C9FF', Otro: '#8A8A9E',
};

/* ─── Schema formulario moto ─── */
const motoSchema = z.object({
  placa:       z.string().min(6, 'Mínimo 6 caracteres').transform(v => v.toUpperCase()),
  anio:        z.coerce.number().int().min(1980, 'Año desde 1980').max(new Date().getFullYear() + 1, 'Año inválido'),
  marca:       z.string().min(2, 'Ingresa la marca'),
  modelo:      z.string().min(1, 'Ingresa el modelo'),
  nombre_moto: z.string().optional(),
  tipo_moto:   z.string().min(1, 'Selecciona el tipo'),
  kilometraje: z.coerce.number().int().nonnegative('Ingresa los kilómetros'),
  cilindraje:  z.coerce.number().int().positive('Ingresa el cilindraje'),
});
type MotoForm = z.infer<typeof motoSchema>;

/* ─── Schema perfil personal ─── */
const perfilSchema = z.object({
  cedula:   z.string().min(8, 'Cédula/ID mínimo 8 dígitos').max(20),
  telefono: z.string().min(7, 'Teléfono mínimo 7 dígitos').max(15),
});
type PerfilForm = z.infer<typeof perfilSchema>;

/* ══════════════════════════════════════════════════════════════ */
export default function MiMotoPage() {
  const { user }   = useAuth();
  const toast      = useToast();

  const [motos,        setMotos]       = useState<Moto[]>([]);
  const [loadingMotos, setLoadingMotos] = useState(true);
  const [addingMoto,   setAddingMoto]  = useState(false);
  const [savingMoto,   setSavingMoto]  = useState(false);

  const [photoFile,    setPhotoFile]   = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingPhotoId, setSavingPhotoId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingPerfil, setEditingPerfil] = useState(false);
  const [savingPerfil,  setSavingPerfil]  = useState(false);

  /* Actualización de km */
  const [kmMoto,       setKmMoto]       = useState<Record<number, string>>({});
  const [savingKm,     setSavingKm]     = useState<number | null>(null);
  const [uploadMsg,    setUploadMsg]    = useState<string | null>(null);
  /* Mantenimientos por moto (desde el backend) para los badges */
  const [serviciosMap, setServiciosMap] = useState<Record<number, Record<string, number>>>({});

  const cedula   = extractCedula(user?.descripcion ?? '');
  const telefono = extractPhone(user?.descripcion  ?? '');
  const perfilOk = !!cedula && !!telefono;

  /* ── Moto form ── */
  const {
    register: regMoto,
    handleSubmit: handleMoto,
    reset: resetMoto,
    formState: { errors: errMoto },
  } = useForm<MotoForm>({ resolver: zodResolver(motoSchema) });

  /* ── Perfil form ── */
  const {
    register: regPerfil,
    handleSubmit: handlePerfil,
    reset: resetPerfil,
    formState: { errors: errPerfil },
  } = useForm<PerfilForm>({ resolver: zodResolver(perfilSchema) });

  /* Cargar motos del usuario */
  useEffect(() => {
    if (!user?.id_usuario) return;
    setLoadingMotos(true);
    motosApi.byUser(user.id_usuario)
      .then(({ data }) => {
        const lista = Array.isArray(data) ? data as Moto[] : [];
        setMotos(lista);
        setKmMoto(Object.fromEntries(lista.map(m => [m.id_moto, String(m.kilometraje)])));
        // Mantenimientos (nube) para los badges de cada moto
        Promise.allSettled(lista.map(m => mantenimientosApi.byMoto(m.id_moto)))
          .then(res => {
            const map: Record<number, Record<string, number>> = {};
            res.forEach((r, i) => {
              if (r.status === 'fulfilled') {
                const sm: Record<string, number> = {};
                (r.value.data as { tipo: string; kmServicio: number }[]).forEach(x => {
                  sm[x.tipo] = Math.max(sm[x.tipo] ?? 0, x.kmServicio);
                });
                map[lista[i].id_moto] = sm;
              }
            });
            setServiciosMap(map);
          });
      })
      .catch(() => setMotos([]))
      .finally(() => setLoadingMotos(false));
  }, [user?.id_usuario]);

  /* Actualizar km — EstadoMotoLive se recalcula solo al cambiar moto.kilometraje */
  const actualizarKm = async (moto: Moto) => {
    const km = parseInt(kmMoto[moto.id_moto] ?? '');
    if (isNaN(km) || km < 0) { toast.error('Ingresa un kilómetro válido', 'Error'); return; }
    setSavingKm(moto.id_moto);
    try {
      await motosApi.update(moto.id_moto, { kilometraje: km });
      setMotos(prev => prev.map(m => m.id_moto === moto.id_moto ? { ...m, kilometraje: km } : m));
      toast.success('Kilometraje actualizado · Recalculando mantenimiento…', 'Mi Moto');
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error');
    } finally {
      setSavingKm(null);
    }
  };

  /* Pre-rellenar form perfil con datos actuales */
  useEffect(() => {
    if (editingPerfil) {
      resetPerfil({ cedula: cedula ?? '', telefono: telefono ?? '' });
    }
  }, [editingPerfil]);

  /* ── Seleccionar foto (formulario de nueva moto) ── */
  const onSelectPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  /* ── Cambiar la foto de una moto YA registrada (cada quien la suya) ── */
  const cambiarFotoMoto = async (moto: Moto, file: File) => {
    setSavingPhotoId(moto.id_moto);
    try {
      const base64 = await comprimirImagen(file);
      await motosApi.update(moto.id_moto, { ruta_imagen_motos: base64 });
      setMotos(prev => prev.map(m => m.id_moto === moto.id_moto ? { ...m, ruta_imagen_motos: base64 } : m));
      toast.success('Foto actualizada', 'Mi Moto');
    } catch {
      toast.error('No se pudo guardar la foto (actualiza el backend a columna TEXT).', 'Foto');
    } finally {
      setSavingPhotoId(null);
    }
  };

  /* ── Cancelar formulario + limpiar foto ── */
  const handleCancelMoto = () => {
    setAddingMoto(false);
    resetMoto();
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  /* ── Guardar moto ── */
  const onSaveMoto = async (data: MotoForm) => {
    if (!user?.id_usuario) return;
    setSavingMoto(true);
    try {
      /* 1. Comprimir la foto en el dispositivo (instantáneo, sin servidor) */
      let fotoBase64: string | null = null;
      if (photoFile) {
        try { fotoBase64 = await comprimirImagen(photoFile); } catch { /* se guarda sin foto */ }
      }
      /* 2. Crear moto */
      const { data: nuevaMoto } = await motosApi.create({
        ...data,
        id_usuario: user.id_usuario,
      });
      const creada = nuevaMoto as Moto;
      if (fotoBase64 && creada?.id_moto) {
        try {
          await motosApi.update(creada.id_moto, { ruta_imagen_motos: fotoBase64 });
          creada.ruta_imagen_motos = fotoBase64;            // reflejar en la UI
        } catch {
          toast.error('La moto se creó, pero la foto no se guardó. Actualiza el backend (columna foto a TEXT).', 'Foto');
        }
      }
      setMotos(prev => [...prev, creada]);
      resetMoto();
      setAddingMoto(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success('¡Moto registrada correctamente!', 'Mi Moto');
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error al guardar');
    } finally {
      setSavingMoto(false);
      setUploadMsg(null);
    }
  };

  /* ── Guardar perfil ── */
  const onSavePerfil = async (data: PerfilForm) => {
    if (!user?.id_usuario) return;
    setSavingPerfil(true);
    try {
      await usuariosApi.update(user.id_usuario, {
        descripcion: `CEDULA: ${data.cedula} | TELEFONO: ${data.telefono}`,
      });
      toast.success('Datos personales actualizados.', 'Perfil');
      setEditingPerfil(false);
      // Actualizar user en localStorage
      const storedUser = JSON.parse(localStorage.getItem('gm_user') ?? '{}');
      storedUser.descripcion = `CEDULA: ${data.cedula} | TELEFONO: ${data.telefono}`;
      localStorage.setItem('gm_user', JSON.stringify(storedUser));
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error al actualizar');
    } finally {
      setSavingPerfil(false);
    }
  };

  /* ── Helpers de estilo ── */
  const card: React.CSSProperties = {
    background: '#111117',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: '20px 22px',
  };

  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
    marginBottom: 6, display: 'block',
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg,rgba(225,20,40,0.2),rgba(120,0,20,0.3))',
            border: '1px solid rgba(225,20,40,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bike size={20} color="#E11428" />
          </div>
          <div>
            <h1 style={{ color: '#EBEBEB', fontWeight: 800, fontSize: 22, margin: 0, letterSpacing: '-0.03em' }}>
              Mi Moto
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12.5, margin: 0 }}>
              Gestiona tu motocicleta y datos de perfil
            </p>
          </div>
        </div>
      </div>

      {/* ── Sección datos personales ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingPerfil ? 18 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={16} color={perfilOk ? '#10B981' : '#F59E0B'} />
            <span style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 14 }}>Datos personales</span>
            {perfilOk
              ? <span style={{ fontSize: 10, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>Completo</span>
              : <span style={{ fontSize: 10, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>Incompleto</span>}
          </div>
          {!editingPerfil && (
            <button
              onClick={() => setEditingPerfil(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
              }}
            >
              <Pencil size={12} /> Editar
            </button>
          )}
        </div>

        {!editingPerfil && (
          <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={13} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Cédula: <span style={{ color: cedula ? '#EBEBEB' : '#F59E0B', fontWeight: 600 }}>{cedula ?? 'No registrada'}</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={13} color="rgba(255,255,255,0.3)" />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Teléfono: <span style={{ color: telefono ? '#EBEBEB' : '#F59E0B', fontWeight: 600 }}>{telefono ?? 'No registrado'}</span>
              </span>
            </div>
          </div>
        )}

        {editingPerfil && (
          <form onSubmit={handlePerfil(onSavePerfil)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Cédula / ID"
                type="text"
                placeholder="1234567890"
                prefix={<CreditCard size={14} />}
                error={errPerfil.cedula?.message}
                {...regPerfil('cedula')}
              />
              <Input
                label="Teléfono / WhatsApp"
                type="tel"
                placeholder="0987 654 321"
                prefix={<Phone size={14} />}
                error={errPerfil.telefono?.message}
                {...regPerfil('telefono')}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingPerfil(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>
                <X size={12} /> Cancelar
              </button>
              <button type="submit" disabled={savingPerfil}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#fff', background: '#E11428', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: savingPerfil ? 'not-allowed' : 'pointer', opacity: savingPerfil ? 0.6 : 1 }}>
                <Save size={12} /> {savingPerfil ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Lista de motos ── */}
      {loadingMotos ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <svg style={{ animation: 'spin .8s linear infinite' }} width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(225,20,40,0.2)" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#E11428" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      ) : motos.length === 0 && !addingMoto ? (
        /* ── Estado vacío ── */
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(225,20,40,0.07)',
            border: '1px solid rgba(225,20,40,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Bike size={32} color="rgba(225,20,40,0.5)" />
          </div>
          <p style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 17, margin: '0 0 6px' }}>
            Aún no tienes motos registradas
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
            Registra tu moto para acceder a historial de mantenimiento,<br/>
            alertas y puntos de fidelidad.
          </p>
          {!perfilOk && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 10, padding: '8px 14px',
            }}>
              <AlertTriangle size={13} color="#F59E0B" />
              <span style={{ fontSize: 12, color: '#F59E0B' }}>Completa tus datos personales antes de registrar tu moto</span>
            </div>
          )}
          <br/>
          <button
            onClick={() => setAddingMoto(true)}
            disabled={!perfilOk}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 700, color: '#fff',
              background: perfilOk ? '#E11428' : 'rgba(255,255,255,0.08)',
              border: 'none', borderRadius: 10, padding: '10px 22px',
              cursor: perfilOk ? 'pointer' : 'not-allowed',
            }}
          >
            <Plus size={15} /> Registrar mi moto
          </button>
        </div>
      ) : (
        /* ── Cards de motos ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {motos.map(moto => {
            const color   = TIPO_COLOR[moto.tipo_moto ?? 'Otro'] ?? '#8A8A9E';
            const estLocal = calcularEstadoLocal(moto.cilindraje, moto.kilometraje, serviciosMap[moto.id_moto] ?? {});
            const hasVenc = estLocal.some(s => s.estado === 'VENCIDO');
            const hasPrx  = estLocal.some(s => s.estado === 'PROXIMO');
            return (
              <div key={moto.id_moto} style={{ ...card, borderLeft: `3px solid ${color}` }}>

                {/* ── Cabecera info moto ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
                  {/* Foto editable: cada cliente puede cambiar la de su moto */}
                  <label style={{ position: 'relative', flexShrink: 0, cursor: 'pointer', display: 'block', width: 56, height: 56 }}
                         title="Cambiar foto de tu moto">
                    {imagenMoto(moto) ? (
                      <img src={imagenMoto(moto)!} alt={`${moto.marca} ${moto.modelo}`} style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: `1px solid ${color}30`, display: 'block' }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bike size={24} color={color} />
                      </div>
                    )}
                    <span style={{ position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: '50%', background: savingPhotoId === moto.id_moto ? 'rgba(225,20,40,0.5)' : '#E11428', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #16161E' }}>
                      <Camera size={10} color="#fff" />
                    </span>
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                           disabled={savingPhotoId === moto.id_moto}
                           onChange={e => { const f = e.target.files?.[0]; if (f) cambiarFotoMoto(moto, f); e.target.value = ''; }} />
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#EBEBEB', fontWeight: 800, fontSize: 16, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                      {moto.marca} {moto.modelo}
                      {moto.nombre_moto && <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500, fontSize: 13 }}> — {moto.nombre_moto}</span>}
                    </p>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Placa: <b style={{ color: '#EBEBEB' }}>{moto.placa}</b></span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Año: <b style={{ color: '#EBEBEB' }}>{moto.anio}</b></span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>CC: <b style={{ color: '#EBEBEB' }}>{moto.cilindraje}</b></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, padding: '3px 10px', background: `${color}15`, border: `1px solid ${color}25`, borderRadius: 99 }}>{moto.tipo_moto}</span>
                    {hasVenc && <span style={{ fontSize: 10, color: '#E11428', background: 'rgba(225,20,40,0.1)', border: '1px solid rgba(225,20,40,0.2)', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>Mantenimiento vencido</span>}
                    {!hasVenc && hasPrx && <span style={{ fontSize: 10, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>Próximo mantenimiento</span>}
                    {!hasVenc && !hasPrx && <span style={{ fontSize: 10, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}><CheckCircle size={9} style={{ verticalAlign: 'middle', marginRight: 3 }} />Todo en orden</span>}
                  </div>
                </div>

                {/* ── Actualizar kilometraje ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
                  <Gauge size={14} color="rgba(255,255,255,0.4)" />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>Odómetro actual:</span>
                  <input
                    type="number" min="0"
                    value={kmMoto[moto.id_moto] ?? ''}
                    onChange={e => setKmMoto(prev => ({ ...prev, [moto.id_moto]: e.target.value }))}
                    style={{ flex: 1, height: 34, borderRadius: 8, padding: '0 10px', background: '#1A1A22', border: '1px solid rgba(255,255,255,0.1)', color: '#EBEBEB', fontSize: 13, outline: 'none' }}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>km</span>
                  <button
                    onClick={() => actualizarKm(moto)}
                    disabled={savingKm === moto.id_moto}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#fff', background: savingKm === moto.id_moto ? 'rgba(225,20,40,0.4)' : '#E11428', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: savingKm === moto.id_moto ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                    <Save size={12} /> {savingKm === moto.id_moto ? 'Guardando…' : 'Actualizar'}
                  </button>
                </div>

                {/* ── Estado de mantenimiento (en vivo) ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Activity size={13} color="rgba(255,255,255,0.4)" />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>Estado de mantenimiento</span>
                </div>
                <EstadoMotoLive moto={moto} />
              </div>
            );
          })}

          {/* Botón agregar otra moto — requiere datos personales completos */}
          {!addingMoto && (
            perfilOk ? (
              <button
                onClick={() => setAddingMoto(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                  width: '100%', padding: '13px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 180ms',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(225,20,40,0.3)';
                  (e.currentTarget as HTMLElement).style.color = '#E11428';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)';
                }}
              >
                <Plus size={15} /> Agregar otra moto
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px', borderRadius: 14, background: 'rgba(245,158,11,0.06)', border: '1px dashed rgba(245,158,11,0.25)', color: '#F59E0B', fontSize: 12.5, fontWeight: 600 }}>
                <AlertTriangle size={14} /> Completa tus datos personales para agregar otra moto
              </div>
            )
          )}
        </div>
      )}

      {/* ── Formulario agregar moto ── */}
      {addingMoto && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Plus size={16} color="#E11428" />
              <span style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 15 }}>Registrar moto</span>
            </div>
            <button onClick={handleCancelMoto}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleMoto(onSaveMoto)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Foto de la moto ── */}
            <div>
              <label style={label}>
                Foto de tu moto <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1px dashed ${photoPreview ? 'rgba(225,20,40,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 12, cursor: 'pointer', overflow: 'hidden',
                  background: 'rgba(255,255,255,0.02)', transition: 'border-color 180ms',
                  minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(225,20,40,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = photoPreview ? 'rgba(225,20,40,0.35)' : 'rgba(255,255,255,0.1)')}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 20 }}>
                    <Camera size={22} color="rgba(255,255,255,0.2)" />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Toca para subir una foto</span>
                  </div>
                )}
              </div>
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <X size={10} /> Quitar foto
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onSelectPhoto} />
            </div>

            {/* Fila 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Marca" type="text" placeholder="Ej. Honda, Yamaha…" error={errMoto.marca?.message} {...regMoto('marca')} />
              <Input label="Modelo" type="text" placeholder="Ej. CB300R, MT-07…" error={errMoto.modelo?.message} {...regMoto('modelo')} />
            </div>
            {/* Fila 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input label="Placa" type="text" placeholder="ABC-1234" error={errMoto.placa?.message} {...regMoto('placa')} />
              <Input label="Año" type="number" placeholder={String(new Date().getFullYear())} error={errMoto.anio?.message} {...regMoto('anio')} />
              <Input label="Nombre (apodo)" type="text" placeholder="Opcional" error={errMoto.nombre_moto?.message} {...regMoto('nombre_moto')} />
            </div>
            {/* Fila 3 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input label="Cilindraje (cc)" type="number" placeholder="300" error={errMoto.cilindraje?.message} {...regMoto('cilindraje')} />
              <Input label="Kilometraje" type="number" placeholder="0" error={errMoto.kilometraje?.message} {...regMoto('kilometraje')} />
              {/* Tipo de moto */}
              <div>
                <label style={label}>Tipo de moto</label>
                <select
                  {...regMoto('tipo_moto')}
                  style={{
                    width: '100%', height: 42, borderRadius: 10, padding: '0 12px',
                    background: '#1A1A22', border: `1px solid ${errMoto.tipo_moto ? '#E11428' : 'rgba(255,255,255,0.1)'}`,
                    color: '#EBEBEB', fontSize: 13, outline: 'none',
                  }}
                >
                  <option value="">Selecciona…</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errMoto.tipo_moto && <p style={{ color: '#E11428', fontSize: 11, marginTop: 4 }}>{errMoto.tipo_moto.message}</p>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={handleCancelMoto}
                style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={savingMoto}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: savingMoto ? 'rgba(225,20,40,0.4)' : '#E11428', border: 'none', borderRadius: 10, padding: '9px 22px', cursor: savingMoto ? 'not-allowed' : 'pointer' }}>
                <Save size={14} /> {savingMoto ? (uploadMsg ?? 'Guardando…') : 'Guardar moto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
