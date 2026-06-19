/* ─────────────────────────────────────────────
   GMotors — Perfil de Moto
   Historial de diagnósticos + info completa
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Bike, Gauge, Calendar, User, Pencil,
  ClipboardList, Plus, Clock, CheckCircle, AlertTriangle,
  XCircle, ChevronDown, ChevronUp, Cog, Link2, Shield,
  Circle, ArrowUpDown, Droplets, Zap, Activity, type LucideIcon,
} from 'lucide-react';
import { motosApi, diagnosticosApi, usuariosApi, registrosApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePolling } from '../../hooks/usePolling';
import { fmtMoney, fmtDate, toIsoStr, ESTADO_REGISTRO } from '../../lib/utils';
import type { Moto, Usuario, DiagnosticoMoto, RegistroDetalle } from '../../types';
import { EstadoMotoLive } from '../../components/mantenimiento/EstadoMantenimiento';
import { imagenMoto } from '../../lib/fotos';

/* ── Constantes ── */
const CC_RANGES = [
  { max: 125,      label: 'Urbana',            color: '#10B981' },
  { max: 200,      label: 'Semideportiva',     color: '#3B82F6' },
  { max: 400,      label: 'Deportiva',         color: '#F59E0B' },
  { max: 650,      label: 'Alto rendimiento',  color: '#FF8C00' },
  { max: Infinity, label: 'Supersport',        color: '#E11428' },
];
const getCCRange = (cc: number) => CC_RANGES.find(r => cc <= r.max) ?? CC_RANGES[CC_RANGES.length - 1];

const TIPO_COLOR: Record<string, string> = {
  Sport: '#FF3B47', Naked: '#FF8C00', Touring: '#00C9FF', Enduro: '#00E676',
  Scrambler: '#D4A017', Cruiser: '#BF5FFF', Scooter: '#29D9C2', Otro: '#8A8A9E',
};
const getTipoColor = (t: string) => TIPO_COLOR[t] ?? '#8A8A9E';

const PARTES_ICON: Record<string, LucideIcon> = {
  MOTOR: Cog, TRANSMISION: Link2, FRENOS: Shield, LLANTAS: Circle,
  SUSPENSION: ArrowUpDown, ELECTRICO: Zap, CARROCERIA: Bike, REFRIGERACION: Droplets,
};
const PARTES_LABEL: Record<string, string> = {
  MOTOR: 'Motor', TRANSMISION: 'Transmisión', FRENOS: 'Frenos', LLANTAS: 'Llantas',
  SUSPENSION: 'Suspensión', ELECTRICO: 'Eléctrico', CARROCERIA: 'Carrocería', REFRIGERACION: 'Refrigeración',
};

const ESTADO_CFG = {
  1: { label: 'Bueno',   color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.22)' },
  2: { label: 'Regular', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)' },
  3: { label: 'Malo',    color: '#E11428', bg: 'rgba(225,20,40,0.10)',   border: 'rgba(225,20,40,0.22)'  },
} as const;

/* ── Sub-componente: card de un diagnóstico ── */
function DiagCard({ d, usuarios }: { d: DiagnosticoMoto; usuarios: Usuario[] }) {
  const [open, setOpen] = useState(false);
  const mec  = usuarios.find(u => u.id_usuario === d.id_mecanico);
  const worst = (d.detalles ?? []).reduce((a, b) => Math.max(a, b.estado), 1) as 1 | 2 | 3;
  const ec   = ESTADO_CFG[worst];

  return (
    <div style={{ border: `1px solid ${ec.border}`, borderRadius: 12, overflow: 'hidden', background: '#0E0E14' }}>
      {/* Header colapsable */}
      <div
        style={{ padding: '13px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: ec.color, background: ec.bg, border: `1px solid ${ec.border}`, borderRadius: 99, padding: '2px 9px',
            }}>
              {ec.label}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />
              {d.fecha
                ? new Date(d.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—'
              }
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Gauge size={10} /> {d.kilometraje_ingreso?.toLocaleString() ?? '—'} km
            </span>
          </div>
          {d.observaciones_generales && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '5px 0 0', lineHeight: 1.55 }}>
              {d.observaciones_generales}
            </p>
          )}
          <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.22)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <User size={9} /> {mec?.nombre_completo ?? `Mecánico #${d.id_mecanico}`}
          </p>
        </div>
        {open ? <ChevronUp size={13} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={13} color="rgba(255,255,255,0.3)" />}
      </div>

      {/* Detalles expandidos */}
      {open && (d.detalles ?? []).length > 0 && (
        <div className="gm-respgrid" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 18px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 8 }}>
          {(d.detalles ?? []).map(det => {
            const pc   = ESTADO_CFG[det.estado as 1 | 2 | 3];
            const Icon = PARTES_ICON[det.parte] ?? Cog;
            const lbl  = PARTES_LABEL[det.parte] ?? det.parte;
            return (
              <div key={det.parte} style={{ background: pc.bg, border: `1px solid ${pc.border}`, borderRadius: 9, padding: '9px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <Icon size={13} color="rgba(255,255,255,0.4)" />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#EBEBEB' }}>{lbl}</span>
                  {det.estado === 1
                    ? <CheckCircle  size={11} color="#10B981" style={{ marginLeft: 'auto' }} />
                    : det.estado === 2
                      ? <AlertTriangle size={11} color="#F59E0B" style={{ marginLeft: 'auto' }} />
                      : <XCircle      size={11} color="#E11428" style={{ marginLeft: 'auto' }} />
                  }
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: pc.color }}>{pc.label}</span>
                {det.observacion && (
                  <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', margin: '5px 0 0', lineHeight: 1.4 }}>
                    {det.observacion}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function MotoPerfilPage() {
  const { id }                     = useParams<{ id: string }>();
  const navigate                   = useNavigate();
  const { isAdmin, isMecanico, isCliente, user: me } = useAuth();
  const canManage                  = isAdmin || isMecanico;

  const [moto,     setMoto]     = useState<Moto | null>(null);
  const [owner,    setOwner]    = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [historial,setHistorial]= useState<DiagnosticoMoto[]>([]);
  const [servicios,setServicios]= useState<RegistroDetalle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadDx,   setLoadDx]   = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!id) return;
    const motoId = parseInt(id);

    Promise.allSettled([
      motosApi.get(motoId),
      usuariosApi.list(),
    ]).then(([m, u]) => {
      if (m.status === 'rejected') { setError('Moto no encontrada'); setLoading(false); return; }
      const motoData = m.value.data as Moto;
      setMoto(motoData);

      /* Cliente: solo puede ver sus propias motos */
      if (isCliente && !canManage && me && motoData.id_usuario !== me.id_usuario) {
        setError('No tienes acceso a este perfil'); setLoading(false); return;
      }

      if (u.status === 'fulfilled') {
        const usrs = u.value.data as Usuario[];
        setUsuarios(usrs);
        setOwner(usrs.find(usr => usr.id_usuario === motoData.id_usuario) ?? null);
      }
      setLoading(false);
    });

    diagnosticosApi.byMoto(motoId)
      .then(({ data }) => setHistorial((data as DiagnosticoMoto[]).sort((a, b) => {
        return new Date(b.fecha ?? 0).getTime() - new Date(a.fecha ?? 0).getTime();
      })))
      .catch(() => setHistorial([]))
      .finally(() => setLoadDx(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Historial de servicios (órdenes) de esta moto — por placa */
  const cargarServicios = useCallback(async () => {
    if (!moto?.placa) return;
    try {
      const { data } = await registrosApi.list();
      setServicios((data as RegistroDetalle[])
        .filter(r => r.placa === moto.placa)
        .sort((a, b) => toIsoStr(b.fecha).localeCompare(toIsoStr(a.fecha))));
    } catch { /* silencioso */ }
  }, [moto?.placa]);

  useEffect(() => { cargarServicios(); }, [cargarServicios]);

  /* Refresco en tiempo real del historial de servicios */
  usePolling(cargarServicios, { intervalMs: 30_000 });

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3B82F6', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !moto) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>{error || 'Moto no encontrada'}</p>
        <button onClick={() => navigate('/motos')} style={{ marginTop: 18, fontSize: 13, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>
          Volver a motos
        </button>
      </div>
    );
  }

  const tc       = getTipoColor(moto.tipo_moto);
  const ccRange  = getCCRange(moto.cilindraje);
  const anioActual = new Date().getFullYear();
  const antiguedad = anioActual - moto.anio;

  const s: React.CSSProperties = {
    background: '#111117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px',
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* ── Back ── */}
      <button
        onClick={() => navigate('/motos')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 22, padding: 0 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#EBEBEB')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
      >
        <ArrowLeft size={14} /> Volver a motos
      </button>

      {/* ── Hero: foto + info principal ── */}
      <div style={{ ...s, marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        {/* Foto o placeholder */}
        {imagenMoto(moto) ? (
          <div style={{ width: '100%', height: 200, overflow: 'hidden', position: 'relative' }}>
            <img
              src={imagenMoto(moto)!}
              alt={`${moto.marca} ${moto.modelo}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, #111117 100%)' }} />
          </div>
        ) : (
          <div style={{ width: '100%', height: 120, background: `linear-gradient(135deg, ${tc}18, ${tc}08)`, borderBottom: `1px solid ${tc}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bike size={48} color={`${tc}40`} />
          </div>
        )}

        {/* Info */}
        <div style={{ padding: '18px 24px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              {/* Tipo badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: tc, background: `${tc}15`, border: `1px solid ${tc}30`, borderRadius: 99, padding: '3px 10px', marginBottom: 10 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: tc, flexShrink: 0 }} />
                {moto.tipo_moto}
              </div>

              {/* Placa + nombre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 8px' }}>
                  {moto.placa}
                </span>
              </div>
              <h1 style={{ color: '#EBEBEB', fontWeight: 800, fontSize: 24, margin: '0 0 2px', letterSpacing: '-0.03em' }}>
                {moto.marca} <span style={{ color: 'rgba(255,255,255,0.55)' }}>{moto.modelo}</span>
              </h1>
              {moto.nombre_moto && (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
                  "{moto.nombre_moto}"
                </p>
              )}
            </div>

            {/* Acciones */}
            {canManage && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Link
                  to={`/diagnostico?moto_id=${moto.id_moto}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#fff', background: '#3B82F6', border: 'none', borderRadius: 9, padding: '8px 16px', textDecoration: 'none', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Diagnóstico
                </Link>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 0, marginTop: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
            {[
              { icon: <Gauge size={13} />,    val: `${moto.cilindraje} cc`, lbl: 'Cilindraje' },
              { icon: <Zap size={13} />,      val: moto.kilometraje.toLocaleString('es-CO'), lbl: 'Kilómetros' },
              { icon: <Calendar size={13} />, val: moto.anio, lbl: antiguedad === 0 ? 'Nuevo' : `${antiguedad} años` },
            ].map((st, i) => (
              <div key={i} style={{ flex: 1, padding: '14px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{st.icon}</div>
                <p style={{ color: '#EBEBEB', fontWeight: 800, fontSize: 16, margin: 0, letterSpacing: '-0.02em' }}>{st.val}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10.5, margin: '2px 0 0' }}>{st.lbl}</p>
              </div>
            ))}
          </div>

          {/* CC range badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: ccRange.color, background: `${ccRange.color}15`,
              border: `1px solid ${ccRange.color}30`, borderRadius: 99, padding: '3px 10px',
            }}>
              {moto.cilindraje} cc — {ccRange.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Propietario ── */}
      <div style={{ ...s, marginBottom: 16 }}>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Propietario
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={18} color="rgba(255,255,255,0.4)" />
          </div>
          <div>
            <p style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 14, margin: 0 }}>
              {owner?.nombre_completo ?? '—'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '2px 0 0' }}>
              {owner?.correo ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Estado de mantenimiento en vivo ── */}
      <div style={{ ...s, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={17} color="#10B981" />
          </div>
          <div>
            <p style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 15, margin: 0 }}>Estado de mantenimiento</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '2px 0 0' }}>
              Calculado con {moto.kilometraje.toLocaleString('es-EC')} km actuales
            </p>
          </div>
        </div>
        <EstadoMotoLive moto={moto} />
      </div>

      {/* ── Estadísticas + historial de servicios ── */}
      <div style={s}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={17} color="#10B981" />
          </div>
          <div>
            <p style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 15, margin: 0 }}>Historial de servicios</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '2px 0 0' }}>
              {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} · en tiempo real
            </p>
          </div>
        </div>

        {/* Mini-estadísticas */}
        {(() => {
          const total    = servicios.reduce((acc, r) => acc + (r.costo_total ?? 0), 0);
          const completos= servicios.filter(r => r.estado >= 2).length;
          const ultimo   = servicios[0];
          const stat = (label: string, val: string, color: string) => (
            <div style={{ flex: 1, minWidth: 96, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{label}</p>
              <p style={{ margin: '5px 0 0', fontSize: 19, fontWeight: 900, color }}>{val}</p>
            </div>
          );
          return (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              {stat('Servicios', String(servicios.length), '#fff')}
              {stat('Completados', String(completos), '#10B981')}
              {stat('Invertido', fmtMoney(total), '#E11428')}
              {stat('Último', ultimo ? fmtDate(ultimo.fecha) : '—', '#3B82F6')}
            </div>
          );
        })()}

        {/* Línea de tiempo */}
        {servicios.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Aún no hay servicios registrados para esta moto
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {servicios.slice(0, 12).map(r => {
              const estColors: Record<number, string> = { 0: '#F59E0B', 1: '#3B82F6', 2: '#10B981', 3: '#8B5CF6', 4: '#14B8A6' };
              const estColor = estColors[r.estado] ?? '#94A3B8';
              const estLabel = ESTADO_REGISTRO[r.estado]?.label ?? '—';
              return (
                <div key={r.id_registro} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#0E0E14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 11 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: estColor, flexShrink: 0, boxShadow: `0 0 6px ${estColor}99` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{r.tipo_servicio ?? 'Servicio'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      {fmtDate(r.fecha)}{r.kilometraje ? ` · ${r.kilometraje.toLocaleString('es-EC')} km` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>{fmtMoney(r.costo_total ?? 0)}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, color: estColor }}>{estLabel}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Historial de diagnósticos ── */}
      <div style={s}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={17} color="#3B82F6" />
            </div>
            <div>
              <p style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 15, margin: 0 }}>
                Historial de diagnósticos
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '2px 0 0' }}>
                {loadDx ? '…' : `${historial.length} registro${historial.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          {canManage && (
            <Link
              to={`/diagnostico?moto_id=${moto.id_moto}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'rgba(59,130,246,0.8)', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '6px 14px', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.10)')}
            >
              <Plus size={11} /> Nuevo
            </Link>
          )}
        </div>

        {loadDx ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3B82F6', animation: 'spin .8s linear infinite' }} />
          </div>
        ) : historial.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px' }}>
            <ClipboardList size={32} color="rgba(255,255,255,0.1)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>
              Sin diagnósticos registrados
            </p>
            <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, margin: '0 0 18px' }}>
              {canManage
                ? 'Crea el primer diagnóstico para esta moto.'
                : 'El taller aún no ha registrado un diagnóstico para tu moto.'
              }
            </p>
            {canManage && (
              <Link
                to={`/diagnostico?moto_id=${moto.id_moto}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#fff', background: '#3B82F6', borderRadius: 9, padding: '9px 20px', textDecoration: 'none' }}
              >
                <Plus size={13} /> Crear diagnóstico
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historial.map(d => (
              <DiagCard key={d.id_diagnostico ?? `${d.id_moto}-${d.fecha}`} d={d} usuarios={usuarios} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
