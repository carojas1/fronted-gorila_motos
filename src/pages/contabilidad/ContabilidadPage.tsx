/* ─────────────────────────────────────────────
   GORILA MOTOS — Contabilidad del Negocio
   Ingresos · Gastos empleados · Gastos generales · Balance
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, Plus, Trash2,
  ArrowUpRight, ArrowDownRight, BarChart2, Receipt,
} from 'lucide-react';
import { registrosApi, pagosEmpleadoApi, usuariosApi, type PagoEmpleadoAPI } from '../../lib/api';
import { fmtMoney, fmtDate, getErrorMsg, toIsoStr } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import type { RegistroDetalle, Usuario } from '../../types';
import { usePageEntrance } from '../../hooks/useGsap';

const MES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const CONCEPTOS_GASTO = ['Compra inventario', 'Sueldo', 'Bono', 'Anticipo', 'Servicio externo', 'Alquiler', 'Otro'];

type Periodo = 'mes' | 'anio' | 'todo';

/* ─── Mini bar chart doble ─── */
function DualBar({ ingresos, gastos }: { ingresos: number[]; gastos: number[] }) {
  const max = Math.max(...ingresos, ...gastos, 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {MES_LABELS.map((mes, i) => {
        const hi = Math.max((ingresos[i] / max) * 100, ingresos[i] > 0 ? 6 : 1);
        const hg = Math.max((gastos[i]   / max) * 100, gastos[i]   > 0 ? 6 : 1);
        return (
          <div key={mes} className="flex-1 flex flex-col items-center gap-0.5 group">
            <div className="w-full flex gap-0.5 items-end"
                 title={`${mes}: +${fmtMoney(ingresos[i])} / -${fmtMoney(gastos[i])}`}>
              <div
                className="flex-1 rounded-t-sm transition-all duration-700"
                style={{
                  height: `${hi}%`,
                  minHeight: 2,
                  background: ingresos[i] > 0
                    ? 'linear-gradient(to top,rgba(16,185,129,0.8),rgba(16,185,129,0.3))'
                    : 'rgba(255,255,255,0.03)',
                }}
              />
              <div
                className="flex-1 rounded-t-sm transition-all duration-700"
                style={{
                  height: `${hg}%`,
                  minHeight: 2,
                  background: gastos[i] > 0
                    ? 'linear-gradient(to top,rgba(225,20,40,0.8),rgba(225,20,40,0.3))'
                    : 'rgba(255,255,255,0.03)',
                }}
              />
            </div>
            <span className="text-[8px] text-white/20">{mes.slice(0,1)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ContabilidadPage() {
  const toast   = useToast();
  const pageRef = usePageEntrance();

  const [registros,   setRegistros]   = useState<RegistroDetalle[]>([]);
  const [gastos,      setGastos]      = useState<PagoEmpleadoAPI[]>([]);
  const [empleados,   setEmpleados]   = useState<Usuario[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [periodo,     setPeriodo]     = useState<Periodo>('anio');
  const [modalGasto,  setModalGasto]  = useState(false);
  const [savingGasto, setSavingGasto] = useState(false);
  const [form, setForm] = useState({
    concepto: 'Compra inventario',
    fecha:    new Date().toISOString().slice(0, 10),
    monto:    '',
    notas:    '',
  });

  const anio = new Date().getFullYear();
  const mes  = new Date().getMonth() + 1;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, gRes, uRes] = await Promise.all([
        registrosApi.list(),
        pagosEmpleadoApi.listAll(),
        usuariosApi.list(),
      ]);
      setRegistros(Array.isArray(rRes.data) ? rRes.data : []);
      setGastos(Array.isArray(gRes.data) ? gRes.data : []);
      setEmpleados(Array.isArray(uRes.data) ? uRes.data : []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── filtrado por periodo ── */
  const filtrar = <T extends { fecha: unknown }>(arr: T[]): T[] => {
    if (periodo === 'todo') return arr;
    if (periodo === 'anio') return arr.filter(x => toIsoStr(x.fecha).startsWith(String(anio)));
    return arr.filter(x => {
      const [y, m] = toIsoStr(x.fecha).split('-').map(Number);
      return y === anio && m === mes;
    });
  };

  /* ── ingresos: registros estado=4 ── */
  const ingresosPeriodo  = useMemo(() => {
    const cobrados = registros.filter(r => r.estado === 4);
    return filtrar(cobrados.map(r => ({ ...r, fecha: r.fecha }))).reduce((s, r) => s + (r.costo_total ?? 0), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, periodo]);

  /* ── gastos empleados (id_empleado > 0) ── */
  const gastosEmpleados = useMemo(
    () => filtrar(gastos.filter(g => g.id_empleado > 0)).reduce((s, g) => s + Number(g.monto), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gastos, periodo]
  );

  /* ── gastos generales (id_empleado === 0) ── */
  const gastosGenerales = useMemo(
    () => filtrar(gastos.filter(g => g.id_empleado === 0)).reduce((s, g) => s + Number(g.monto), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gastos, periodo]
  );

  const totalGastos = gastosEmpleados + gastosGenerales;
  const balance     = ingresosPeriodo - totalGastos;

  /* ── datos mensuales para el chart ── */
  const { chartIngresos, chartGastos } = useMemo(() => {
    const cobrados = registros.filter(r => r.estado === 4 && toIsoStr(r.fecha).startsWith(String(anio)));
    const ing  = Array.from({ length: 12 }, (_, m) =>
      cobrados.filter(r => Number(toIsoStr(r.fecha).slice(5,7)) === m + 1).reduce((s,r) => s + (r.costo_total??0), 0)
    );
    const gas  = Array.from({ length: 12 }, (_, m) =>
      gastos.filter(g => toIsoStr(g.fecha).startsWith(String(anio)) && Number(toIsoStr(g.fecha).slice(5,7)) === m + 1)
             .reduce((s,g) => s + Number(g.monto), 0)
    );
    return { chartIngresos: ing, chartGastos: gas };
  }, [registros, gastos, anio]);

  /* ── nombre empleado helper ── */
  const nombreEmpleado = (idEmp: number) => {
    if (idEmp === 0) return 'Gasto general';
    const u = empleados.find(e => e.id_usuario === idEmp);
    return u ? u.nombre_completo.split(' ').slice(0,2).join(' ') : `Empleado #${idEmp}`;
  };

  /* ── Registrar gasto general ── */
  const handleGuardarGasto = async () => {
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) { toast.error('Ingresa un monto válido'); return; }
    setSavingGasto(true);
    try {
      await pagosEmpleadoApi.create({
        id_empleado: 0,
        fecha:    form.fecha,
        concepto: form.concepto,
        monto,
        notas: form.notas || undefined,
      });
      toast.success('Gasto registrado');
      setModalGasto(false);
      setForm({ concepto: 'Compra inventario', fecha: new Date().toISOString().slice(0,10), monto: '', notas: '' });
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSavingGasto(false); }
  };

  const handleEliminarGasto = async (id: number) => {
    try {
      await pagosEmpleadoApi.remove(id);
      setGastos(prev => prev.filter(g => g.id_pago !== id));
      toast.success('Gasto eliminado');
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  /* ─── Últimos movimientos: mezcla ingresos + gastos ordenados por fecha ─── */
  const movimientos = useMemo(() => {
    const ing = registros
      .filter(r => r.estado === 4)
      .map(r => ({ tipo: 'ingreso' as const, fecha: toIsoStr(r.fecha), desc: `Servicio · ${r.placa}`, monto: r.costo_total ?? 0, id: r.id_registro }))
      .slice(0, 20);
    const gas = gastos
      .map(g => ({ tipo: 'gasto' as const, fecha: toIsoStr(g.fecha), desc: `${g.concepto} — ${nombreEmpleado(g.id_empleado)}`, monto: Number(g.monto), id: g.id_pago, id_pago: g.id_pago }))
      .slice(0, 20);
    return [...ing, ...gas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 25);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, gastos, empleados]);

  const PERIODO_OPTS: { key: Periodo; label: string }[] = [
    { key: 'mes',  label: 'Este mes' },
    { key: 'anio', label: String(anio) },
    { key: 'todo', label: 'Todo' },
  ];

  const KPIs = [
    {
      label:   'Ingresos',
      value:   fmtMoney(ingresosPeriodo),
      sub:     'Servicios facturados',
      icon:    TrendingUp,
      color:   '#10B981',
      bg:      'rgba(16,185,129,0.08)',
      border:  'rgba(16,185,129,0.2)',
    },
    {
      label:   'Gastos empleados',
      value:   fmtMoney(gastosEmpleados),
      sub:     'Sueldos, bonos, etc.',
      icon:    DollarSign,
      color:   '#F59E0B',
      bg:      'rgba(245,158,11,0.08)',
      border:  'rgba(245,158,11,0.2)',
    },
    {
      label:   'Gastos generales',
      value:   fmtMoney(gastosGenerales),
      sub:     'Compras, servicios ext.',
      icon:    Receipt,
      color:   '#8B5CF6',
      bg:      'rgba(139,92,246,0.08)',
      border:  'rgba(139,92,246,0.2)',
    },
    {
      label:   'Balance neto',
      value:   fmtMoney(balance),
      sub:     balance >= 0 ? 'Ganancia' : 'Pérdida',
      icon:    balance >= 0 ? ArrowUpRight : ArrowDownRight,
      color:   balance >= 0 ? '#10B981' : '#E11428',
      bg:      balance >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(225,20,40,0.08)',
      border:  balance >= 0 ? 'rgba(16,185,129,0.2)'  : 'rgba(225,20,40,0.2)',
    },
  ];

  return (
    <div ref={pageRef} className="space-y-7 pb-10">

      {/* ─── Encabezado ─── */}
      <div className="header-enter flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-gm-red font-black uppercase mb-1">
            Taller · Finanzas
          </p>
          <h1 className="text-3xl font-black text-white">Contabilidad</h1>
          <p className="text-white/30 text-sm mt-1">Ingresos, gastos y balance del negocio</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro periodo */}
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
            {PERIODO_OPTS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriodo(key)}
                className="px-3 py-1.5 text-[11px] font-bold tracking-wide transition-all"
                style={{
                  background: periodo === key ? 'rgba(225,20,40,0.15)' : 'transparent',
                  color:      periodo === key ? '#fff' : 'rgba(255,255,255,0.35)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <Button icon={<Plus size={14} />} onClick={() => setModalGasto(true)}>
            Registrar gasto
          </Button>
        </div>
      </div>

      {/* ─── KPI cards ─── */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="gm-card-d rounded-2xl p-6 h-28 skeleton-d" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {KPIs.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
            <div key={label} className="rounded-2xl p-5 flex flex-col gap-3"
                 style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[0.2em] uppercase font-black text-white/35">{label}</p>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
              <p className="text-[11px] text-white/30">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Gráfico mensual ─── */}
      <div className="section-enter gm-card-d rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-bold text-white/85 flex items-center gap-2">
              <BarChart2 size={15} className="text-gm-red" /> Comparativo mensual {anio}
            </p>
            <p className="text-[11px] text-white/30 mt-0.5">Verde = ingresos · Rojo = gastos</p>
          </div>
        </div>
        <DualBar ingresos={chartIngresos} gastos={chartGastos} />
        {/* Leyenda */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(16,185,129,0.7)' }} />
            <span className="text-[10px] text-white/30 font-semibold">Ingresos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(225,20,40,0.7)' }} />
            <span className="text-[10px] text-white/30 font-semibold">Gastos</span>
          </div>
        </div>
      </div>

      {/* ─── Últimos movimientos ─── */}
      <div className="section-enter gm-card-d rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-sm font-bold text-white/80">Últimos movimientos</p>
          <span className="text-[10px] text-white/25 font-semibold">{movimientos.length} registros</span>
        </div>
        <div className="overflow-x-auto dark-scroll">
          <table className="gm-table-d">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th className="text-right">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}>{[70,160,80,80,30].map((w,j) => (
                    <td key={j} className="px-4 py-3.5"><div className="skeleton-d h-3.5 rounded" style={{width:w}} /></td>
                  ))}</tr>
                ))
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="py-14 text-center flex flex-col items-center gap-3">
                      <Wallet size={28} className="text-white/12" />
                      <p className="text-sm text-white/25">Sin movimientos registrados</p>
                    </div>
                  </td>
                </tr>
              ) : movimientos.map((m, idx) => (
                <tr key={`${m.tipo}-${m.id}-${idx}`}>
                  <td className="text-white/35 text-xs whitespace-nowrap">{fmtDate(m.fecha)}</td>
                  <td className="text-white/70 text-sm max-w-[220px] truncate">{m.desc}</td>
                  <td>
                    {m.tipo === 'ingreso' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <ArrowUpRight size={10} /> Ingreso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                        <ArrowDownRight size={10} /> Gasto
                      </span>
                    )}
                  </td>
                  <td className={`text-right font-black tabular-nums text-sm ${
                    m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {m.tipo === 'ingreso' ? '+' : '-'}{fmtMoney(m.monto)}
                  </td>
                  <td>
                    {'id_pago' in m && (
                      <button
                        onClick={() => handleEliminarGasto((m as { id_pago: number }).id_pago)}
                        className="icon-btn danger"
                        title="Eliminar gasto"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal: registrar gasto general ─── */}
      <Modal
        open={modalGasto}
        onClose={() => setModalGasto(false)}
        title="Registrar gasto / compra"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalGasto(false)}>Cancelar</Button>
            <Button loading={savingGasto} onClick={handleGuardarGasto}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Concepto</label>
            <select
              className="gm-select-d w-full"
              value={form.concepto}
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
            >
              {CONCEPTOS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Fecha</label>
            <input
              type="date"
              className="gm-input-d"
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Monto ($)</label>
            <input
              type="number"
              className="gm-input-d"
              placeholder="0.00"
              step="0.01"
              value={form.monto}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Descripción (opcional)</label>
            <input
              type="text"
              className="gm-input-d"
              placeholder="Ej: Aceite 10W40 x5 litros"
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
