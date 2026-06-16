/* ─────────────────────────────────────────────
   GORILA MOTOS — Motos Page  (Redesign Premium)
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, Bike, Gauge, User,
  Calendar, Zap, Shield, ChevronRight, SlidersHorizontal, ClipboardList,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import gsap from 'gsap';
import { motosApi, usuariosApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMsg } from '../../lib/utils';
import type { Moto, Usuario } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';

const TIPOS = ['Sport', 'Naked', 'Touring', 'Enduro', 'Scrambler', 'Cruiser', 'Scooter', 'Otro'];

/* Color accent por tipo */
const TIPO_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  Sport:    { color: '#FF3B47', bg: 'rgba(255,59,71,0.12)',   dot: '#FF3B47' },
  Naked:    { color: '#FF8C00', bg: 'rgba(255,140,0,0.12)',   dot: '#FF8C00' },
  Touring:  { color: '#00C9FF', bg: 'rgba(0,201,255,0.12)',   dot: '#00C9FF' },
  Enduro:   { color: '#00E676', bg: 'rgba(0,230,118,0.12)',   dot: '#00E676' },
  Scrambler:{ color: '#D4A017', bg: 'rgba(212,160,23,0.12)',  dot: '#D4A017' },
  Cruiser:  { color: '#BF5FFF', bg: 'rgba(191,95,255,0.12)',  dot: '#BF5FFF' },
  Scooter:  { color: '#29D9C2', bg: 'rgba(41,217,194,0.12)',  dot: '#29D9C2' },
  Otro:     { color: '#8A8A9E', bg: 'rgba(138,138,158,0.12)', dot: '#8A8A9E' },
};
const getTipoConfig = (tipo: string) =>
  TIPO_CONFIG[tipo] ?? TIPO_CONFIG['Otro'];

const CC_RANGES = [
  { max: 125,  label: 'Urbana',           color: '#10B981' },
  { max: 200,  label: 'Semideportiva',    color: '#3B82F6' },
  { max: 400,  label: 'Deportiva',        color: '#F59E0B' },
  { max: 650,  label: 'Alto rendimiento', color: '#FF8C00' },
  { max: Infinity, label: 'Supersport',   color: '#E11428' },
];
const getCCRange = (cc: number) => CC_RANGES.find(r => cc <= r.max) ?? CC_RANGES[CC_RANGES.length - 1];

const schema = z.object({
  placa:       z.string().min(6, 'Mínimo 6 caracteres').transform((v) => v.toUpperCase()),
  anio:        z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  marca:       z.string().min(2),
  modelo:      z.string().min(1),
  nombre_moto: z.string().optional(),
  tipo_moto:   z.string().min(1, 'Selecciona el tipo'),
  kilometraje: z.coerce.number().int().nonnegative(),
  cilindraje:  z.coerce.number().int().positive(),
  id_usuario:  z.coerce.number().positive('Selecciona un propietario'),
});
type Form = z.infer<typeof schema>;

/* ─── Skeleton Card ─── */
function SkeletonCard() {
  return (
    <div className="moto-card-skeleton">
      <div className="moto-card-sk-header">
        <div className="sk-pill" />
        <div className="sk-actions" />
      </div>
      <div className="moto-card-sk-body">
        <div className="sk-title" />
        <div className="sk-sub" />
      </div>
      <div className="moto-card-sk-stats">
        {[1, 2, 3, 4].map((i) => <div key={i} className="sk-stat" />)}
      </div>
      <div className="moto-card-sk-footer" />
    </div>
  );
}

/* ─── Moto Card Premium ─── */
function MotoCard({
  moto, ownerName, onEdit, onDelete, index, canManage = false,
}: {
  moto: Moto; ownerName: string; index: number;
  onEdit: (m: Moto) => void; onDelete: (m: Moto) => void;
  canManage?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const tc = getTipoConfig(moto.tipo_moto);

  /* Mouse parallax glow */
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !glowRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    glowRef.current.style.background =
      `radial-gradient(circle at ${x}% ${y}%, ${tc.color}18 0%, transparent 60%)`;
  };

  const handleEnter = () => {
    gsap.to(cardRef.current, { y: -6, scale: 1.018, duration: 0.35, ease: 'power2.out' });
    gsap.to(glowRef.current, { opacity: 1, duration: 0.3 });
  };
  const handleLeave = () => {
    gsap.to(cardRef.current, { y: 0, scale: 1, duration: 0.45, ease: 'power3.out' });
    gsap.to(glowRef.current, { opacity: 0, duration: 0.4 });
    if (glowRef.current) glowRef.current.style.background = 'none';
  };

  const km = moto.kilometraje.toLocaleString('es-CO');
  const anioActual = new Date().getFullYear();
  const antiguedad = anioActual - moto.anio;

  return (
    <div
      ref={cardRef}
      className="moto-card card-enter"
      style={{ '--tc': tc.color, '--tc-bg': tc.bg } as React.CSSProperties}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseMove={handleMove}
    >
      {/* Glow layer */}
      <div ref={glowRef} className="moto-card-glow" />

      {/* Top accent bar */}
      <div className="moto-card-accent" style={{ background: `linear-gradient(90deg, ${tc.color}, transparent)` }} />

      {/* Header */}
      <div className="moto-card-header">
        {/* Tipo badge */}
        <div className="moto-tipo-badge" style={{ background: tc.bg, borderColor: `${tc.color}35` }}>
          <span className="moto-tipo-dot" style={{ background: tc.color }} />
          <span style={{ color: tc.color }}>{moto.tipo_moto}</span>
        </div>

        {/* Acciones — solo para admin/mecánico */}
        {canManage && (
          <div className="moto-card-actions">
            <button onClick={() => onEdit(moto)} className="moto-action-btn" title="Editar">
              <Pencil size={12} />
            </button>
            <button onClick={() => onDelete(moto)} className="moto-action-btn danger" title="Eliminar">
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Photo + Plate + Main info */}
      <div className="moto-card-body">
        {moto.ruta_imagen_motos && moto.ruta_imagen_motos !== 'Desconocido' ? (
          <div style={{ width: '100%', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 10, border: `1px solid ${tc.color}20` }}>
            <img src={moto.ruta_imagen_motos} alt={`${moto.marca} ${moto.modelo}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ) : null}
        <div className="moto-plate-wrap">
          <span className="plate-tag">{moto.placa}</span>
        </div>
        <h3 className="moto-name">
          {moto.marca} <span className="moto-modelo">{moto.modelo}</span>
        </h3>
        {moto.nombre_moto && (
          <p className="moto-alias">
            <span className="moto-alias-quote">"</span>{moto.nombre_moto}<span className="moto-alias-quote">"</span>
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="moto-stats">
        <div className="moto-stat-item">
          <div className="moto-stat-icon" style={{ background: tc.bg }}>
            <Gauge size={13} style={{ color: tc.color }} />
          </div>
          <div>
            <p className="moto-stat-val">{moto.cilindraje}</p>
            <p className="moto-stat-lbl">CC</p>
          </div>
        </div>

        <div className="moto-stat-divider" />

        <div className="moto-stat-item">
          <div className="moto-stat-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Zap size={13} className="text-white/40" />
          </div>
          <div>
            <p className="moto-stat-val">{km}</p>
            <p className="moto-stat-lbl">km</p>
          </div>
        </div>

        <div className="moto-stat-divider" />

        <div className="moto-stat-item">
          <div className="moto-stat-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Calendar size={13} className="text-white/40" />
          </div>
          <div>
            <p className="moto-stat-val">{moto.anio}</p>
            <p className="moto-stat-lbl">{antiguedad === 0 ? 'nuevo' : `${antiguedad}a`}</p>
          </div>
        </div>
      </div>

      {/* CC range badge */}
      {(() => {
        const range = getCCRange(moto.cilindraje);
        return (
          <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: range.color, background: `${range.color}15`,
              border: `1px solid ${range.color}30`, borderRadius: 99, padding: '2px 8px',
            }}>
              {moto.cilindraje} cc — {range.label}
            </span>
          </div>
        );
      })()}

      {/* Footer owner + diagnostic */}
      <div className="moto-card-footer">
        <div className="moto-owner">
          <div className="moto-owner-avatar">
            <User size={9} />
          </div>
          <span className="moto-owner-name">{ownerName}</span>
        </div>
        <Link
          to={`/diagnostico?moto_id=${moto.id_moto}`}
          title="Ver / crear diagnóstico"
          onClick={e => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'rgba(59,130,246,0.7)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#3B82F6'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(59,130,246,0.7)'}
        >
          <ClipboardList size={11} /> Diagnóstico
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════ MAIN PAGE ═══════════════ */
export default function MotosPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const toast   = useToast();
  const { user: me, isAdmin, isMecanico, isCliente } = useAuth();

  /** Admin y mecánico tienen acceso completo (crear/editar/eliminar, ver todo) */
  const canManage = isAdmin || isMecanico;

  const [motos,        setMotos]        = useState<Moto[]>([]);
  const [usuarios,     setUsuarios]     = useState<Usuario[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterTipo,   setFilterTipo]   = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<Moto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Moto | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (isCliente && !canManage && me) {
        // Cliente: solo sus propias motos, sin llamar a la lista completa
        const { data } = await motosApi.byUser(me.id_usuario);
        setMotos(data as Moto[]);
        setUsuarios([me as unknown as Usuario]);
      } else {
        // Admin / Mecánico: todas las motos y todos los propietarios
        const [m, u] = await Promise.allSettled([motosApi.list(), usuariosApi.list()]);
        if (m.status === 'fulfilled') setMotos(m.value.data as Moto[]);
        if (u.status === 'fulfilled') setUsuarios(u.value.data as Usuario[]);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [isCliente, canManage, me]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.mp-header-el', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.06 })
        .fromTo('.card-enter', { y: 40, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.65, clearProps: 'transform' }, '-=0.3');
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  const openCreate = () => {
    setEditTarget(null);
    reset({ id_usuario: 0 });
    setModalOpen(true);
  };

  const openEdit = (m: Moto) => {
    setEditTarget(m);
    reset({
      placa: m.placa, anio: m.anio, marca: m.marca, modelo: m.modelo,
      nombre_moto: m.nombre_moto ?? '', tipo_moto: m.tipo_moto,
      kilometraje: m.kilometraje, cilindraje: m.cilindraje, id_usuario: m.id_usuario,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: Form) => {
    setSaving(true);
    try {
      if (editTarget) {
        await motosApi.update(editTarget.id_moto, data);
        toast.success('Moto actualizada');
      } else {
        await motosApi.create(data);
        toast.success('Moto registrada');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await motosApi.remove(deleteTarget.id_moto);
      toast.success('Moto eliminada');
      setDeleteTarget(null);
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const ownerName = (id: number) =>
    usuarios.find((u) => u.id_usuario === id)?.nombre_completo ?? '—';

  const filtered = motos.filter((m) => {
    const q = search.toLowerCase();
    const matchQ =
      m.placa.toLowerCase().includes(q) ||
      m.marca.toLowerCase().includes(q) ||
      m.modelo.toLowerCase().includes(q);
    const matchTipo = filterTipo === '' || m.tipo_moto === filterTipo;
    return matchQ && matchTipo;
  });

  /* Stats summary */
  const totalKm = motos.reduce((a, b) => a + b.kilometraje, 0);
  const tiposUnicos = [...new Set(motos.map((m) => m.tipo_moto))];

  return (
    <div ref={pageRef} className="mp-root">

      {/* ─── Page Header ─── */}
      <div className="mp-header mp-header-el">
        <div className="mp-header-left">
          <div className="mp-breadcrumb">
            <Shield size={10} className="mp-bc-icon" />
            <span>{canManage ? 'Inventario' : 'Mi cuenta'}</span>
            <span className="mp-bc-sep">›</span>
            <span className="mp-bc-active">{canManage ? 'Vehículos' : 'Mis motos'}</span>
          </div>
          <h1 className="mp-title">
            {canManage
              ? <>Flota de <span className="mp-title-accent">Motos</span></>
              : <>Mis <span className="mp-title-accent">Motos</span></>
            }
          </h1>
        </div>
        <Button icon={<Plus size={14} />} onClick={openCreate}>
          {canManage ? 'Nueva moto' : 'Agregar moto'}
        </Button>
      </div>

      {/* ─── KPI Strip ─── */}
      <div className="mp-kpi-strip mp-header-el">
        <div className="mp-kpi">
          <span className="mp-kpi-num">{motos.length}</span>
          <span className="mp-kpi-lbl">Motos totales</span>
        </div>
        <div className="mp-kpi-sep" />
        <div className="mp-kpi">
          <span className="mp-kpi-num">{tiposUnicos.length}</span>
          <span className="mp-kpi-lbl">Tipos diferentes</span>
        </div>
        <div className="mp-kpi-sep" />
        <div className="mp-kpi">
          <span className="mp-kpi-num">{(totalKm / 1000).toFixed(0)}k</span>
          <span className="mp-kpi-lbl">Km acumulados</span>
        </div>
        <div className="mp-kpi-sep" />
        <div className="mp-kpi">
          <span className="mp-kpi-num">{usuarios.length}</span>
          <span className="mp-kpi-lbl">Propietarios</span>
        </div>
      </div>

      {/* ─── Search + Filters ─── */}
      <div className="mp-controls mp-header-el">
        <div className="search-d">
          <Search size={14} />
          <input
            className="gm-input-d mp-search-input"
            placeholder="Buscar placa, marca o modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mp-filters">
          <SlidersHorizontal size={12} className="mp-filter-icon" />
          <button
            className={`filter-chip ${filterTipo === '' ? 'active' : ''}`}
            onClick={() => setFilterTipo('')}
          >
            Todos
          </button>
          {TIPOS.map((t) => (
            <button
              key={t}
              className={`filter-chip ${filterTipo === t ? 'active' : ''}`}
              onClick={() => setFilterTipo(filterTipo === t ? '' : t)}
              style={filterTipo === t
                ? { '--chip-color': getTipoConfig(t).color } as React.CSSProperties
                : {}}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Grid ─── */}
      <div className="mp-grid">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.length === 0
            ? (
              <div className="mp-empty">
                <div className="mp-empty-icon">
                  <Bike size={32} />
                </div>
                <p className="mp-empty-title">Sin motos registradas</p>
                <p className="mp-empty-sub">
                  {search || filterTipo ? 'Intenta con otro filtro' : 'Agrega la primera moto de la flota'}
                </p>
                {!search && !filterTipo && (
                  <button onClick={openCreate} className="mp-empty-cta">
                    <Plus size={14} /> Registrar primera moto
                  </button>
                )}
              </div>
            )
            : filtered.map((m, i) => (
              <MotoCard
                key={m.id_moto}
                moto={m}
                ownerName={ownerName(m.id_usuario)}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                index={i}
                canManage={canManage}
              />
            ))
        }
      </div>

      {/* ─── Modal crear/editar ─── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar moto' : 'Registrar nueva moto'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button form="moto-form" type="submit" loading={saving}>
              {editTarget ? 'Guardar cambios' : 'Registrar moto'}
            </Button>
          </>
        }
      >
        <form id="moto-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

          {/* Aviso de privacidad — solo al crear, no al editar */}
          {!editTarget && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.18)',
              borderLeft: '3px solid #3B82F6',
              borderRadius: 9, padding: '11px 14px',
            }}>
              <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>🔒</span>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', margin: 0, lineHeight: 1.65 }}>
                <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>Aviso de privacidad:</strong>{' '}
                Los datos que ingreses (placa, marca, modelo, kilometraje y propietario) serán visibles para el
                administrador y el personal autorizado del taller, conforme a la{' '}
                <a
                  href="/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}
                >
                  política de privacidad
                </a>.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Placa" placeholder="ABC-1234" error={errors.placa?.message} {...register('placa')} />
            <Input label="Año" type="number" placeholder={String(new Date().getFullYear())} error={errors.anio?.message} {...register('anio')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Marca" placeholder="Yamaha" error={errors.marca?.message} {...register('marca')} />
            <Input label="Modelo" placeholder="MT-07" error={errors.modelo?.message} {...register('modelo')} />
          </div>
          <Input label='Nombre moto (opcional)' placeholder='"La Bestia"' {...register('nombre_moto')} />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1.5">Tipo de moto</label>
              <select className="gm-input-d" {...register('tipo_moto')}>
                <option value="">Seleccionar</option>
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.tipo_moto && <p className="text-xs text-gm-red mt-1">{errors.tipo_moto.message}</p>}
            </div>
            <Input label="Cilindraje (cc)" type="number" placeholder="650" error={errors.cilindraje?.message} {...register('cilindraje')} />
            <Input label="Kilometraje" type="number" placeholder="0" error={errors.kilometraje?.message} {...register('kilometraje')} />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Propietario</label>
            {canManage ? (
              /* Admin / Mecánico — elige cualquier propietario */
              <>
                <select className="gm-input-d" {...register('id_usuario')}>
                  <option value="0">Seleccionar propietario</option>
                  {[...usuarios]
                    .sort((a, b) => {
                      const aAdmin = a.correo === 'gorilamotos2026@gmail.com';
                      const bAdmin = b.correo === 'gorilamotos2026@gmail.com';
                      if (aAdmin && !bAdmin) return 1;
                      if (!aAdmin && bAdmin) return -1;
                      return (a.nombre_completo ?? '').localeCompare(b.nombre_completo ?? '');
                    })
                    .map((u) => (
                      <option key={u.id_usuario} value={u.id_usuario}>
                        {u.nombre_completo} — {u.correo}
                      </option>
                    ))}
                </select>
                {errors.id_usuario && <p className="text-xs text-gm-red mt-1">{errors.id_usuario.message}</p>}
              </>
            ) : (
              /* Cliente — siempre es él mismo */
              <>
                <input type="hidden" value={me?.id_usuario ?? 0} {...register('id_usuario')} />
                <div className="gm-input-d flex items-center gap-2 text-white/50 cursor-not-allowed select-none"
                     style={{ opacity: 0.7 }}>
                  <User size={13} />
                  <span>{me?.nombre_completo} (tu cuenta)</span>
                </div>
              </>
            )}
          </div>
        </form>
      </Modal>

      {/* ─── Modal confirmar eliminar ─── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar moto"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmDelete}>Eliminar</Button>
          </>
        }
      >
        <p className="text-sm text-white/60">
          ¿Eliminar la moto{' '}
          <span className="plate-tag">{deleteTarget?.placa}</span>
          {' '}·{' '}<strong className="text-white/85">{deleteTarget?.marca} {deleteTarget?.modelo}</strong>?
          <br />
          <span className="text-white/35 text-xs mt-2 block">Se perderán todos sus registros de servicio.</span>
        </p>
      </Modal>
    </div>
  );
}
