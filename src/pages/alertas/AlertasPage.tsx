/* ─────────────────────────────────────────────
   GMotors — Alertas de Mantenimiento
   Monitoreo de cambios de aceite por moto
   Pequeñas (<300cc): cada 1000 km
   Grandes (≥300cc): cada 5000 km
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCircle, Bike, Search, RefreshCw } from 'lucide-react';
import { motosApi, registrosApi, usuariosApi } from '../../lib/api';
import { usePolling } from '../../hooks/usePolling';
import type { Moto, RegistroDetalle, Usuario, MotoAlerta } from '../../types';
import { fmtDate } from '../../lib/utils';

/* ── Lógica de alertas ─────────────────────── */
const OIL_KEYWORDS = ['cambio de aceite', 'aceite', 'oil', 'mantenimiento preventivo'];

function getThreshold(cc: number) { return cc >= 300 ? 5000 : 1000; }

function getUrgency(km: number | null, thr: number): MotoAlerta['urgency'] {
  if (km === null) return 'ok';
  if (km >= thr)        return 'overdue';
  if (km >= thr * 0.8)  return 'due';
  if (km >= thr * 0.6)  return 'soon';
  return 'ok';
}

const URGENCY: Record<MotoAlerta['urgency'], { label: string; color: string; bg: string; border: string }> = {
  overdue: { label: 'Vencido',   color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.28)'  },
  due:     { label: 'Urgente',   color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.28)' },
  soon:    { label: 'Próximo',   color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.28)' },
  ok:      { label: 'Al día',    color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.28)' },
};

const ORDER: Record<MotoAlerta['urgency'], number> = { overdue: 0, due: 1, soon: 2, ok: 3 };

/* ── Componente ─────────────────────────────── */
export default function AlertasPage() {
  const [alertas,     setAlertas]     = useState<MotoAlerta[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<'all' | MotoAlerta['urgency']>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, rr, ur] = await Promise.allSettled([
        motosApi.list(), registrosApi.list(), usuariosApi.list(),
      ]);
      const motos: Moto[]               = mr.status === 'fulfilled' ? mr.value.data  : [];
      const records: RegistroDetalle[]  = rr.status === 'fulfilled' ? rr.value.data  : [];
      const users: Usuario[]            = ur.status === 'fulfilled' ? ur.value.data  : [];

      const userMap = new Map(users.map(u => [u.id_usuario, u.nombre_completo]));

      const list: MotoAlerta[] = motos.map(moto => {
        const motoRecs = records.filter(r => r.placa === moto.placa);
        const oilRecs  = motoRecs.filter(r =>
          OIL_KEYWORDS.some(kw =>
            r.tipo_servicio?.toLowerCase().includes(kw) ||
            r.descripcion?.toLowerCase().includes(kw)
          )
        ).filter(r => r.kilometraje != null);

        oilRecs.sort((a, b) => (b.kilometraje ?? 0) - (a.kilometraje ?? 0));
        const last    = oilRecs[0] ?? null;
        const thr     = getThreshold(moto.cilindraje);
        const kmSince = last?.kilometraje != null ? moto.kilometraje - last.kilometraje : null;
        const urgency = getUrgency(kmSince, thr);
        const pct     = kmSince != null ? Math.min(Math.round((kmSince / thr) * 100), 130) : 0;

        return {
          moto,
          ownerName:   userMap.get(moto.id_usuario) ?? '—',
          lastOilKm:   last?.kilometraje ?? null,
          lastOilDate: last?.fecha ?? null,
          kmSinceOil:  kmSince,
          threshold:   thr,
          urgency,
          pct,
        };
      });

      list.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency]);
      setAlertas(list);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Refresco en tiempo real: alertas reflejan servicios recién registrados */
  usePolling(load, { intervalMs: 30_000 });

  const counts = {
    overdue: alertas.filter(a => a.urgency === 'overdue').length,
    due:     alertas.filter(a => a.urgency === 'due').length,
    soon:    alertas.filter(a => a.urgency === 'soon').length,
    ok:      alertas.filter(a => a.urgency === 'ok').length,
  };

  const visible = alertas
    .filter(a => filter === 'all' || a.urgency === filter)
    .filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      return a.moto.placa.toLowerCase().includes(q)
          || a.moto.marca.toLowerCase().includes(q)
          || a.moto.modelo.toLowerCase().includes(q)
          || a.ownerName.toLowerCase().includes(q);
    });

  /* ── Skeleton ── */
  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton-d h-8 w-56 rounded-xl" />
      {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-d h-24 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={13} className="text-gm-red/60" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-white/28 font-bold">
              Gorila Motos · Alertas
            </span>
          </div>
          <h1 className="text-[2rem] font-black text-white leading-tight tracking-tight">
            Alertas de <span className="text-gradient-red">Mantenimiento</span>
          </h1>
          <p className="text-white/35 text-sm mt-1">
            Cambios de aceite · {alertas.length} motos monitoreadas
          </p>
        </div>

        {/* Refresh + KPI */}
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: loading ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)' }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            {lastUpdated ? `Actualizado ${lastUpdated.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}` : 'Actualizar'}
          </button>
          <div className="flex items-center bg-white/[0.025] border border-white/[0.06] rounded-2xl overflow-hidden">
          {([
            ['overdue', 'Vencidos', counts.overdue, '#EF4444'],
            ['due',     'Urgentes', counts.due,     '#F59E0B'],
            ['soon',    'Próximos', counts.soon,    '#3B82F6'],
            ['ok',      'Al día',   counts.ok,      '#10B981'],
          ] as const).map(([key, lbl, cnt, col], i, arr) => (
            <div key={key} className="flex items-center">
              <div className="flex flex-col items-center gap-0.5 px-5 py-3">
                <span className="text-xl font-black" style={{ color: col }}>{cnt}</span>
                <span className="text-[9px] font-bold text-white/28 uppercase tracking-wider">{lbl}</span>
              </div>
              {i < arr.length - 1 && <div className="w-px h-8 bg-white/[0.07]" />}
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* ── Controles ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="search-d">
          <Search size={14} />
          <input
            className="gm-input-d"
            style={{ width: 280 }}
            placeholder="Placa, marca, propietario…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            ['all',     'Todas'],
            ['overdue', 'Vencidas'],
            ['due',     'Urgentes'],
            ['soon',    'Próximas'],
            ['ok',      'Al día'],
          ] as const).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`filter-chip ${filter === val ? 'active' : ''}`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista ── */}
      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="gm-card-d rounded-2xl py-16 text-center">
            <CheckCircle size={32} className="mx-auto mb-3 text-emerald-400/30" />
            <p className="text-white/35 font-semibold text-sm">Sin alertas en esta categoría</p>
          </div>
        ) : visible.map(a => {
          const cfg = URGENCY[a.urgency];
          const kmLeft = a.urgency !== 'overdue' && a.kmSinceOil != null
            ? a.threshold - a.kmSinceOil
            : null;
          const kmOver = a.urgency === 'overdue' && a.kmSinceOil != null
            ? a.kmSinceOil - a.threshold
            : null;

          return (
            <div
              key={a.moto.id_moto}
              className="gm-card-d rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5"
              style={{ borderColor: a.urgency !== 'ok' ? cfg.border : undefined }}
            >
              {/* Ícono + info moto */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                >
                  <Bike size={20} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="plate-tag">{a.moto.placa}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-white/85 font-bold text-sm truncate">
                    {a.moto.marca} {a.moto.modelo} {a.moto.anio}
                  </p>
                  <p className="text-white/35 text-xs truncate">
                    {a.ownerName} · {a.moto.cilindraje} cc
                  </p>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="flex-1 min-w-0 sm:max-w-[280px]">
                <div className="flex justify-between text-[12px] mb-1.5">
                  <span className="text-white/40 truncate">
                    {a.kmSinceOil != null
                      ? `${a.kmSinceOil.toLocaleString()} km desde último cambio`
                      : 'Sin registro de cambio de aceite'}
                  </span>
                  <span className="font-black ml-2 shrink-0" style={{ color: cfg.color }}>
                    {a.pct}%
                  </span>
                </div>
                <div className="prog-bar">
                  <div
                    className="prog-bar-fill"
                    style={{
                      width: `${Math.min(a.pct, 100)}%`,
                      background: cfg.color,
                      boxShadow: `0 0 8px ${cfg.color}55`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/22 mt-1.5">
                  <span>0 km</span>
                  <span>Límite: {a.threshold.toLocaleString()} km</span>
                </div>
                {a.lastOilDate && (
                  <p className="text-[11px] text-white/25 mt-1.5">
                    Último cambio: {fmtDate(a.lastOilDate)}
                  </p>
                )}
              </div>

              {/* Km info */}
              <div className="shrink-0 text-right min-w-[100px]">
                <p className="text-[11px] text-white/28 mb-0.5">Km actual</p>
                <p className="text-2xl font-black text-white leading-none">
                  {a.moto.kilometraje.toLocaleString()}
                </p>
                {kmOver != null && (
                  <p className="text-[11px] font-black mt-1" style={{ color: cfg.color }}>
                    +{kmOver.toLocaleString()} km de retraso
                  </p>
                )}
                {kmLeft != null && a.urgency !== 'ok' && (
                  <p className="text-[11px] font-bold mt-1" style={{ color: cfg.color }}>
                    Faltan {kmLeft.toLocaleString()} km
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Leyenda ── */}
      <div className="gm-card-d rounded-2xl p-5">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/28 font-bold mb-4">
          Reglas de mantenimiento
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { range: '≤ 125 cc',    km: '1.000 km',  color: '#E11428' },
            { range: '126–200 cc',  km: '1.000 km',  color: '#F59E0B' },
            { range: '201–299 cc',  km: '1.000 km',  color: '#3B82F6' },
            { range: '≥ 300 cc',    km: '5.000 km',  color: '#10B981' },
          ].map(r => (
            <div key={r.range}
                 className="flex items-center gap-3 px-4 py-3 rounded-xl"
                 style={{ background: `${r.color}0A`, border: `1px solid ${r.color}20` }}>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
              <div>
                <p className="text-[12px] font-bold text-white/80">{r.range}</p>
                <p className="text-[11px] text-white/35">Cambio cada {r.km}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
