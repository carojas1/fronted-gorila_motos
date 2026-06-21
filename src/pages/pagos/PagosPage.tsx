/* ─────────────────────────────────────────────
   GMotors — Módulo de Pagos
   3 secciones: En taller · Por cobrar · Cobrado
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard, Clock, CheckCircle, AlertCircle,
  FileText, ChevronRight, Search, Banknote, Receipt,
  TrendingUp,
} from 'lucide-react';
import { registrosApi } from '../../lib/api';
import { fmtMoney, fmtDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import type { RegistroDetalle } from '../../types';

const TABS = [
  {
    key:    'activo',
    label:  'En taller',
    estados: [0, 1, 2],
    color:  '#3B82F6',
    icon:   Clock,
    desc:   'Órdenes activas en proceso',
  },
  {
    key:    'cobrar',
    label:  'Por cobrar',
    estados: [3],
    color:  '#F59E0B',
    icon:   AlertCircle,
    desc:   'Entregados · pendiente de pago',
  },
  {
    key:    'cobrado',
    label:  'Cobrado',
    estados: [4],
    color:  '#10B981',
    icon:   CheckCircle,
    desc:   'Facturados y pagados',
  },
] as const;

type TabKey = typeof TABS[number]['key'];

const ESTADO_COLOR: Record<number, string> = {
  0: '#F59E0B', 1: '#3B82F6', 2: '#10B981', 3: '#8B5CF6', 4: '#14B8A6',
};
const ESTADO_LABEL = ['Pendiente', 'En proceso', 'Completado', 'Entregado', 'Facturado'];

function SkeletonRow() {
  return (
    <tr>
      {[50, 80, 130, 120, 90, 80, 60, 60].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton-d h-3.5 rounded-md" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

export default function PagosPage() {
  const { isAdmin } = useAuth();

  const [registros, setRegistros] = useState<RegistroDetalle[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('activo');
  const [search,    setSearch]    = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await registrosApi.list();
      setRegistros(Array.isArray(data) ? data : []);
    } catch { /* render dormido */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tab = TABS.find(t => t.key === activeTab)!;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return registros
      .filter(r => (tab.estados as readonly number[]).includes(r.estado))
      .filter(r =>
        !q ||
        (r.placa?.toLowerCase().includes(q)) ||
        (r.nombre_cliente?.toLowerCase().includes(q)) ||
        (r.tipo_servicio?.toLowerCase().includes(q))
      );
  }, [registros, tab, search]);

  const sums = useMemo(() => {
    const result = {} as Record<TabKey, { count: number; total: number }>;
    TABS.forEach(t => {
      const group = registros.filter(r => (t.estados as readonly number[]).includes(r.estado));
      result[t.key] = {
        count: group.length,
        total: group.reduce((s, r) => s + (r.costo_total ?? 0), 0),
      };
    });
    return result;
  }, [registros]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, r) => s + (r.costo_total ?? 0), 0),
    [filtered]
  );

  const colSpan = isAdmin ? 8 : 7;

  return (
    <div className="space-y-6 pb-8">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 font-semibold mb-2 flex items-center gap-2">
            <CreditCard size={10} className="text-gm-red" /> Facturación · Cobros
          </p>
          <h1 className="text-[1.9rem] font-black text-white leading-tight tracking-tight">
            Módulo de <span className="text-gradient-red">Pagos</span>
          </h1>
          <p className="text-white/35 text-sm mt-1">{registros.length} órdenes en total</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
               style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <TrendingUp size={14} className="text-emerald-400" />
            <div>
              <p className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-wider">Total cobrado</p>
              <p className="text-base font-black text-emerald-400">{fmtMoney(sums.cobrado.total)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── KPI Tabs cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TABS.map(t => {
          const s      = sums[t.key];
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="gm-card-d rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-1 w-full"
              style={{
                borderColor:  active ? `${t.color}50` : 'rgba(255,255,255,0.05)',
                boxShadow:    active ? `0 0 0 1px ${t.color}20, 0 0 40px ${t.color}10` : 'none',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                       style={{ background: `${t.color}15`, border: `1px solid ${t.color}25` }}>
                    <t.icon size={14} style={{ color: t.color }} />
                  </div>
                  <span className="text-[10px] tracking-[0.2em] uppercase font-black"
                        style={{ color: `${t.color}cc` }}>{t.label}</span>
                </div>
                <span className="text-[22px] font-black" style={{ color: t.color }}>{s.count}</span>
              </div>
              {isAdmin
                ? <p className="text-2xl font-black" style={{ color: t.color }}>{fmtMoney(s.total)}</p>
                : <p className="text-base font-bold text-white/50">{s.count} {s.count === 1 ? 'orden' : 'órdenes'}</p>
              }
              <p className="text-[11px] text-white/25 mt-1">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* ─── Tabs bar ─── */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.05]">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[12px] font-bold transition-all duration-150"
            style={{
              background:   activeTab === t.key ? `${t.color}18` : 'transparent',
              color:        activeTab === t.key ? t.color : 'rgba(255,255,255,0.35)',
              borderBottom: activeTab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
            }}
          >
            <t.icon size={12} />
            {t.label}
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: `${t.color}20`, color: t.color }}>
              {sums[t.key].count}
            </span>
          </button>
        ))}
      </div>

      {/* ─── Búsqueda ─── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="gm-input-d pl-9 w-full"
            placeholder="Buscar placa, cliente o servicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-[11px] text-white/25">{filtered.length} resultado(s)</span>
      </div>

      {/* ─── Tabla ─── */}
      <div className="gm-card-d rounded-2xl overflow-hidden">
        <div className="overflow-x-auto dark-scroll">
          <table className="gm-table-d">
            <thead>
              <tr>
                <th>#</th>
                <th>Placa</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Estado</th>
                {isAdmin && <th>Total</th>}
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={colSpan}>
                        <div className="py-16 text-center">
                          <Receipt size={32} className="text-white/12 mx-auto mb-3" />
                          <p className="text-sm font-bold text-white/30">Sin registros en esta sección</p>
                          <p className="text-[11px] text-white/18 mt-1">
                            {search ? 'Intenta con otra búsqueda' : 'No hay órdenes con este estado'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                  : filtered.map(r => (
                    <tr key={r.id_registro}>
                      <td>
                        <span className="font-mono text-[11px] text-white/35">#{r.id_registro}</span>
                      </td>
                      <td>
                        <span className="font-black text-white/85 tracking-wide">{r.placa}</span>
                      </td>
                      <td>
                        <span className="text-white/60 text-[12px]">{r.nombre_cliente}</span>
                      </td>
                      <td>
                        <span className="text-white/50 text-[12px] truncate max-w-[150px] block">{r.tipo_servicio}</span>
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black whitespace-nowrap"
                          style={{ background: `${ESTADO_COLOR[r.estado]}18`, color: ESTADO_COLOR[r.estado] }}
                        >
                          {ESTADO_LABEL[r.estado]}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="font-bold text-white/80 tabular-nums text-sm">
                          {fmtMoney(r.costo_total ?? 0)}
                        </td>
                      )}
                      <td className="text-white/30 text-[11px] tabular-nums whitespace-nowrap">
                        {fmtDate(r.fecha as unknown as string)}
                      </td>
                      <td>
                        {r.estado === 4 ? (
                          <Link
                            to={`/invoice/${r.id_registro}`}
                            className="flex items-center gap-1 text-[11px] font-bold text-gm-red hover:text-gm-red-lt transition-colors whitespace-nowrap"
                          >
                            <FileText size={11} /> Factura <ChevronRight size={9} />
                          </Link>
                        ) : (
                          <span className="text-[11px] text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Footer con total */}
        {!loading && filtered.length > 0 && (
          <div className="border-t border-white/[0.05] px-5 py-3 flex items-center justify-between">
            <span className="text-[11px] text-white/30 font-bold">
              {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'} · {tab.label}
            </span>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Banknote size={12} style={{ color: tab.color }} />
                <span className="text-sm font-black" style={{ color: tab.color }}>
                  {fmtMoney(filteredTotal)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
