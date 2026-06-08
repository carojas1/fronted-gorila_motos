/* ─────────────────────────────────────────────
   GMotors — Rastreador de Combustible
   Registros en localStorage por moto
   Calcula: litros/100km, costo/km, gasto mensual
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo } from 'react';
import { Fuel, Plus, Trash2, TrendingDown, DollarSign, Gauge, X } from 'lucide-react';
import { motosApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { Moto, CargaCombustible } from '../../types';
import { fmtDate, fmtMoney } from '../../lib/utils';

const STORAGE_KEY = 'gm_fuel_logs';
const PRICE_PER_L  = 0.74; // precio extra gasolina Ecuador (USD/litro)

function loadLogs(): CargaCombustible[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}
function saveLogs(logs: CargaCombustible[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface FormState {
  id_moto:     string;
  fecha:       string;
  litros:      string;
  costo_total: string;
  km_actual:   string;
  km_anterior: string;
  notas:       string;
}

const EMPTY: FormState = {
  id_moto: '', fecha: '', litros: '', costo_total: '', km_actual: '', km_anterior: '', notas: '',
};

export default function CombustiblePage() {
  const { user, isAdmin, isMecanico } = useAuth();
  const [motos,   setMotos]   = useState<Moto[]>([]);
  const [logs,    setLogs]    = useState<CargaCombustible[]>(loadLogs());
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState<FormState>(EMPTY);
  const [selMoto, setSelMoto] = useState<number | null>(null);
  const [month,   setMonth]   = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    motosApi.list().then(r => {
      const all: Moto[] = r.data;
      /* Clientes ven solo sus motos */
      const mine = (isAdmin || isMecanico)
        ? all
        : all.filter(m => m.id_usuario === user?.id_usuario);
      setMotos(mine);
      if (mine.length > 0) setSelMoto(mine[0].id_moto);
    }).catch(() => {});
  }, [user, isAdmin, isMecanico]);

  /* Persist on change */
  useEffect(() => { saveLogs(logs); }, [logs]);

  /* Logs filtrados por moto y mes */
  const filtered = useMemo(() => logs.filter(l => {
    const motoOk  = selMoto == null || l.id_moto === selMoto;
    const monthOk = !month   || l.fecha.startsWith(month);
    return motoOk && monthOk;
  }).sort((a, b) => b.fecha.localeCompare(a.fecha)), [logs, selMoto, month]);

  /* Métricas */
  const metrics = useMemo(() => {
    if (filtered.length < 2) return null;
    const totalLitros = filtered.reduce((s, l) => s + l.litros, 0);
    const totalCosto  = filtered.reduce((s, l) => s + l.costo_total, 0);
    const maxKm = Math.max(...filtered.map(l => l.km_actual));
    const minKm = Math.min(...filtered.map(l => l.km_anterior));
    const kmRec = maxKm - minKm;
    const lx100 = kmRec > 0 ? (totalLitros / kmRec) * 100 : 0;
    const cpkm  = kmRec > 0 ? totalCosto / kmRec : 0;
    return { totalLitros, totalCosto, kmRec, lx100, cpkm };
  }, [filtered]);

  const addLog = () => {
    if (!form.id_moto || !form.fecha || !form.litros || !form.km_actual) return;
    const moto = motos.find(m => m.id_moto === Number(form.id_moto));
    const entry: CargaCombustible = {
      id:          uid(),
      id_moto:     Number(form.id_moto),
      placa:       moto?.placa ?? '—',
      fecha:       form.fecha,
      litros:      Number(form.litros),
      costo_total: form.costo_total
        ? Number(form.costo_total)
        : Number(form.litros) * PRICE_PER_L,
      km_actual:   Number(form.km_actual),
      km_anterior: form.km_anterior ? Number(form.km_anterior) : 0,
      notas:       form.notas || undefined,
    };
    setLogs(p => [entry, ...p]);
    setForm(EMPTY);
    setOpen(false);
  };

  const removeLog = (id: string) => setLogs(p => p.filter(l => l.id !== id));

  const f = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const selectedMoto = motos.find(m => m.id_moto === selMoto);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Fuel size={13} className="text-gm-red/60" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-white/28 font-bold">
              Gorila Motos · Combustible
            </span>
          </div>
          <h1 className="text-[2rem] font-black text-white leading-tight tracking-tight">
            Rastreador de <span className="text-gradient-red">Combustible</span>
          </h1>
          <p className="text-white/35 text-sm mt-1">
            Precio referencia gasolina Ecuador: USD {PRICE_PER_L}/litro
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
          style={{ background: '#E11428', boxShadow: '0 0 20px rgba(225,20,40,0.35)' }}
        >
          <Plus size={16} /> Registrar carga
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="gm-select-d"
          value={selMoto ?? ''}
          onChange={e => setSelMoto(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Todas las motos</option>
          {motos.map(m => (
            <option key={m.id_moto} value={m.id_moto}>
              {m.placa} — {m.marca} {m.modelo}
            </option>
          ))}
        </select>
        <input
          type="month"
          className="gm-input-d"
          style={{ width: 180 }}
          value={month}
          onChange={e => setMonth(e.target.value)}
        />
      </div>

      {/* ── Métricas ── */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Fuel,         label: 'Litros cargados',  val: `${metrics.totalLitros.toFixed(1)} L`,       color: '#3B82F6' },
            { icon: DollarSign,   label: 'Gasto en combustible', val: fmtMoney(metrics.totalCosto),              color: '#10B981' },
            { icon: Gauge,        label: 'Consumo',           val: `${metrics.lx100.toFixed(1)} L/100km`,     color: '#F59E0B' },
            { icon: TrendingDown, label: 'Costo por km',      val: `$${metrics.cpkm.toFixed(3)}/km`,          color: '#8B5CF6' },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="gm-card-d rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                   style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-xl font-black text-white">{val}</p>
              <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="gm-card-d rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <p className="text-[11px] tracking-[0.28em] uppercase text-white/28 font-bold">
            Registros de combustible ({filtered.length})
          </p>
          {selectedMoto && (
            <span className="plate-tag">{selectedMoto.placa}</span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Fuel size={32} className="mx-auto mb-3 text-white/10" />
            <p className="text-white/30 text-sm font-semibold">Sin registros para este período</p>
            <button
              onClick={() => setOpen(true)}
              className="mt-4 text-gm-red text-sm font-bold hover:text-gm-red-lt transition-colors"
            >
              Agregar primera carga →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto dark-scroll">
          <table className="gm-table-d" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Placa</th>
                <th className="text-right">Litros</th>
                <th className="text-right">Costo</th>
                <th className="text-right">Km anterior</th>
                <th className="text-right">Km actual</th>
                <th className="text-right">Km recorridos</th>
                <th className="text-right">Consumo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const km   = l.km_actual - (l.km_anterior ?? 0);
                const cons = km > 0 ? (l.litros / km * 100).toFixed(1) : '—';
                return (
                  <tr key={l.id}>
                    <td className="text-white/50 text-[12px]">{fmtDate(l.fecha)}</td>
                    <td><span className="plate-tag">{l.placa}</span></td>
                    <td className="text-right text-blue-400 font-bold">{l.litros.toFixed(1)} L</td>
                    <td className="text-right text-emerald-400 font-bold">{fmtMoney(l.costo_total)}</td>
                    <td className="text-right text-white/45">{(l.km_anterior ?? 0).toLocaleString()}</td>
                    <td className="text-right text-white/75 font-bold">{l.km_actual.toLocaleString()}</td>
                    <td className="text-right text-white/60">{km > 0 ? `${km.toLocaleString()} km` : '—'}</td>
                    <td className="text-right text-yellow-400 font-bold">{cons !== '—' ? `${cons} L/100` : '—'}</td>
                    <td>
                      <button onClick={() => removeLog(l.id)} className="icon-btn danger ml-auto block">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Modal Agregar ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-6"
            style={{
              background: 'linear-gradient(150deg, #1E1E28 0%, #161620 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-white">Registrar carga</h2>
                <p className="text-[12px] text-white/35">Nuevo registro de combustible</p>
              </div>
              <button onClick={() => setOpen(false)} className="icon-btn"><X size={16} /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1.5">Moto *</label>
                  <select className="gm-select-d w-full" value={form.id_moto} onChange={f('id_moto')}>
                    <option value="">Seleccionar</option>
                    {motos.map(m => <option key={m.id_moto} value={m.id_moto}>{m.placa} — {m.marca}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1.5">Fecha *</label>
                  <input type="date" className="gm-input-d w-full" value={form.fecha} onChange={f('fecha')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1.5">Litros *</label>
                  <input type="number" step="0.1" placeholder="Ej. 5.5" className="gm-input-d w-full" value={form.litros} onChange={f('litros')} />
                </div>
                <div>
                  <label className="block text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1.5">
                    Costo total USD <span className="text-white/25">(auto)</span>
                  </label>
                  <input type="number" step="0.01" placeholder={`~${form.litros ? (Number(form.litros) * PRICE_PER_L).toFixed(2) : '0.00'}`}
                         className="gm-input-d w-full" value={form.costo_total} onChange={f('costo_total')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1.5">Km anterior</label>
                  <input type="number" placeholder="0" className="gm-input-d w-full" value={form.km_anterior} onChange={f('km_anterior')} />
                </div>
                <div>
                  <label className="block text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1.5">Km actual *</label>
                  <input type="number" placeholder="Odómetro actual" className="gm-input-d w-full" value={form.km_actual} onChange={f('km_actual')} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1.5">Notas</label>
                <input type="text" placeholder="Gasolinera, observaciones…" className="gm-input-d w-full" value={form.notas} onChange={f('notas')} />
              </div>

              {/* Preview del costo si no se ingresó */}
              {form.litros && !form.costo_total && (
                <p className="text-[11px] text-yellow-400/60">
                  Costo estimado: USD {(Number(form.litros) * PRICE_PER_L).toFixed(2)}
                  <span className="text-white/25 ml-1">(precio gasolina extra Ecuador)</span>
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white/40 border border-white/[0.08] hover:border-white/[0.15] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={addLog}
                disabled={!form.id_moto || !form.fecha || !form.litros || !form.km_actual}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40"
                style={{ background: '#E11428' }}
              >
                Guardar registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
