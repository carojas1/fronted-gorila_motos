/* ─────────────────────────────────────────────
   GMotors — Mi Moto (vista cliente)
   Muestra las motos del cliente o formulario para registrar la primera.
   Incluye sección para completar datos personales (cédula / teléfono).
   ───────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bike, Plus, User, Phone, CreditCard,
  CheckCircle, AlertTriangle, Pencil, X, Save,
} from 'lucide-react';
import { motosApi, usuariosApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg, extractPhone, extractCedula } from '../../lib/utils';
import Input from '../../components/ui/Input';
import type { Moto } from '../../types';

/* ─── Tipos de moto disponibles ─── */
const TIPOS = ['Sport', 'Naked', 'Touring', 'Enduro', 'Scrambler', 'Cruiser', 'Scooter', 'Otro'];

const TIPO_COLOR: Record<string, string> = {
  Sport: '#FF3B47', Naked: '#FF8C00', Touring: '#00C9FF',
  Enduro: '#00E676', Scrambler: '#D4A017', Cruiser: '#BF5FFF',
  Scooter: '#29D9C2', Otro: '#8A8A9E',
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

  const [editingPerfil, setEditingPerfil] = useState(false);
  const [savingPerfil,  setSavingPerfil]  = useState(false);

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
      .then(({ data }) => setMotos(Array.isArray(data) ? data : []))
      .catch(() => setMotos([]))
      .finally(() => setLoadingMotos(false));
  }, [user?.id_usuario]);

  /* Pre-rellenar form perfil con datos actuales */
  useEffect(() => {
    if (editingPerfil) {
      resetPerfil({ cedula: cedula ?? '', telefono: telefono ?? '' });
    }
  }, [editingPerfil]);

  /* ── Guardar moto ── */
  const onSaveMoto = async (data: MotoForm) => {
    if (!user?.id_usuario) return;
    setSavingMoto(true);
    try {
      const { data: nuevaMoto } = await motosApi.create({
        ...data,
        id_usuario: user.id_usuario,
      });
      setMotos(prev => [...prev, nuevaMoto as Moto]);
      resetMoto();
      setAddingMoto(false);
      toast.success('¡Moto registrada correctamente!', 'Mi Moto');
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error al guardar');
    } finally {
      setSavingMoto(false);
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
            const color = TIPO_COLOR[moto.tipo_moto ?? 'Otro'] ?? '#8A8A9E';
            return (
              <div key={moto.id_moto} style={{
                ...card,
                borderLeft: `3px solid ${color}`,
                display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  background: `${color}18`,
                  border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bike size={24} color={color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#EBEBEB', fontWeight: 800, fontSize: 16, margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                    {moto.marca} {moto.modelo}
                    {moto.nombre_moto && <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500, fontSize: 13 }}> — {moto.nombre_moto}</span>}
                  </p>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Placa: <b style={{ color: '#EBEBEB' }}>{moto.placa}</b></span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Año: <b style={{ color: '#EBEBEB' }}>{moto.anio}</b></span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>CC: <b style={{ color: '#EBEBEB' }}>{moto.cilindraje}</b></span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>KM: <b style={{ color: '#EBEBEB' }}>{moto.kilometraje?.toLocaleString()}</b></span>
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color, padding: '3px 10px',
                  background: `${color}15`, border: `1px solid ${color}25`, borderRadius: 99,
                }}>
                  {moto.tipo_moto}
                </span>
                <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0 }} />
              </div>
            );
          })}

          {/* Botón agregar otra moto */}
          {!addingMoto && (
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
            <button onClick={() => { setAddingMoto(false); resetMoto(); }}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleMoto(onSaveMoto)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <button type="button" onClick={() => { setAddingMoto(false); resetMoto(); }}
                style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={savingMoto}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#fff', background: savingMoto ? 'rgba(225,20,40,0.4)' : '#E11428', border: 'none', borderRadius: 10, padding: '9px 22px', cursor: savingMoto ? 'not-allowed' : 'pointer' }}>
                <Save size={14} /> {savingMoto ? 'Guardando…' : 'Guardar moto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
