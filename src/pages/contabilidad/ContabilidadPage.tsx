/* ─────────────────────────────────────────────
   GORILA MOTOS — Contabilidad del Negocio
   Filtros: Día · Semana · Mes · Año · Todo
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, DollarSign, Wallet, Plus, Trash2,
  ArrowUpRight, ArrowDownRight, BarChart2, Receipt, Calendar,
} from 'lucide-react';
import { registrosApi, pagosEmpleadoApi, usuariosApi, type PagoEmpleadoAPI } from '../../lib/api';
import { fmtMoney, fmtDate, getErrorMsg, toIsoStr } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import type { RegistroDetalle, Usuario } from '../../types';
import { usePageEntrance } from '../../hooks/useGsap';

const MES_LABELS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MES_SHORT  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const CONCEPTOS_GASTO = ['Compra inventario', 'Sueldo', 'Bono', 'Anticipo', 'Servicio externo', 'Alquiler', 'Otro'];

type FiltroTipo = 'dia' | 'semana' | 'mes' | 'anio' | 'todo';

function getWeekRange(dateStr: string): [string, string] {
  const d   = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
}

function weekLabel(dateStr: string): string {
  const [mon, sun] = getWeekRange(dateStr);
  const fm = new Date(mon + 'T12:00:00');
  const fs = new Date(sun + 'T12:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${fm.toLocaleDateString('es-EC', opts)} – ${fs.toLocaleDateString('es-EC', opts)}`;
}

/* ─── Mini bar chart doble (CSS puro, labels variables) ─── */
function DualBar({ ingresos, gastos, labels }: { ingresos: number[]; gastos: number[]; labels: string[] }) {
  const max = Math.max(...ingresos, ...gastos, 1);
  const hasData = ingresos.some(v=>v>0) || gastos.some(v=>v>0);
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: 96 }}>
        {labels.map((label, i) => {
          const hi = Math.max((ingresos[i] / max) * 100, ingresos[i] > 0 ? 6 : 0);
          const hg = Math.max((gastos[i]   / max) * 100, gastos[i]   > 0 ? 6 : 0);
          const tooltipTxt = `${label}: +${fmtMoney(ingresos[i])} / -${fmtMoney(gastos[i])}`;
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={tooltipTxt}>
              <div className="w-full flex gap-[1px] items-end" style={{ height: 90 }}>
                <div className="flex-1 rounded-t-[3px] transition-all duration-700"
                  style={{ height:`${hi}%`, minHeight: ingresos[i]>0 ? 3 : 0,
                    background:'linear-gradient(to top,rgba(16,185,129,0.85),rgba(16,185,129,0.25))' }} />
                <div className="flex-1 rounded-t-[3px] transition-all duration-700"
                  style={{ height:`${hg}%`, minHeight: gastos[i]>0 ? 3 : 0,
                    background:'linear-gradient(to top,rgba(225,20,40,0.85),rgba(225,20,40,0.25))' }} />
              </div>
              <span className="text-[8px]" style={{ color:'rgba(255,255,255,0.2)' }}>{label.slice(0,1)}</span>
            </div>
          );
        })}
      </div>
      {!hasData && (
        <p className="text-center text-xs mt-2" style={{ color:'rgba(255,255,255,0.2)' }}>Sin datos para este período</p>
      )}
    </div>
  );
}

/* ─── Label del filtro activo ─── */
function filtroLabel(tipo: FiltroTipo, fecha: string, mes: number, anio: number): string {
  switch (tipo) {
    case 'dia':    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-EC', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    case 'semana': return `Semana del ${weekLabel(fecha)}`;
    case 'mes':    return `${MES_LABELS[mes-1]} ${anio}`;
    case 'anio':   return `Año ${anio}`;
    case 'todo':   return 'Todos los registros';
  }
}

export default function ContabilidadPage() {
  const toast   = useToast();
  const pageRef = usePageEntrance();

  const [registros,   setRegistros]   = useState<RegistroDetalle[]>([]);
  const [gastos,      setGastos]      = useState<PagoEmpleadoAPI[]>([]);
  const [empleados,   setEmpleados]   = useState<Usuario[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modalGasto,  setModalGasto]  = useState(false);
  const [savingGasto, setSavingGasto] = useState(false);

  const hoy  = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual  = hoy.getMonth() + 1;
  const hoyStr     = hoy.toISOString().slice(0, 10);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('mes');
  const [filtroFecha, setFiltroFecha] = useState(hoyStr);
  const [filtroMes,   setFiltroMes]   = useState(mesActual);
  const [filtroAnio,  setFiltroAnio]  = useState(anioActual);

  const [form, setForm] = useState({
    concepto: 'Compra inventario',
    fecha:    hoyStr,
    monto:    '',
    notas:    '',
  });

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
  const filtrar = useCallback(<T extends { fecha: unknown }>(arr: T[]): T[] => {
    switch (filtroTipo) {
      case 'todo': return arr;
      case 'dia':  return arr.filter(x => toIsoStr(x.fecha) === filtroFecha);
      case 'semana': {
        const [mon, sun] = getWeekRange(filtroFecha);
        return arr.filter(x => { const f = toIsoStr(x.fecha); return f >= mon && f <= sun; });
      }
      case 'mes':  return arr.filter(x => {
        const [y, m] = toIsoStr(x.fecha).split('-').map(Number);
        return y === filtroAnio && m === filtroMes;
      });
      case 'anio': return arr.filter(x => toIsoStr(x.fecha).startsWith(String(filtroAnio)));
    }
  }, [filtroTipo, filtroFecha, filtroMes, filtroAnio]);

  /* ── KPIs ── */
  const ingresosPeriodo = useMemo(() => {
    const cobrados = registros.filter(r => r.estado === 4);
    return filtrar(cobrados.map(r => ({ ...r }))).reduce((s, r) => s + (r.costo_total ?? 0), 0);
  }, [registros, filtrar]);

  const gastosEmpleados = useMemo(
    () => filtrar(gastos.filter(g => g.id_empleado > 0)).reduce((s, g) => s + Number(g.monto), 0),
    [gastos, filtrar]
  );
  const gastosGenerales = useMemo(
    () => filtrar(gastos.filter(g => g.id_empleado === 0)).reduce((s, g) => s + Number(g.monto), 0),
    [gastos, filtrar]
  );
  const totalGastos = gastosEmpleados + gastosGenerales;
  const balance     = ingresosPeriodo - totalGastos;

  /* ── Chart adaptable al filtro activo ── */
  const { chartIngresos, chartGastos, chartLabels } = useMemo(() => {
    if (filtroTipo === 'mes' || filtroTipo === 'dia' || filtroTipo === 'semana') {
      // Mostrar los últimos 6 meses del año seleccionado
      const año = filtroAnio;
      const mesRef = filtroTipo === 'mes' ? filtroMes : new Date().getMonth() + 1;
      const meses = Array.from({ length: 6 }, (_, i) => {
        let m = mesRef - 5 + i;
        let y = año;
        if (m <= 0) { m += 12; y -= 1; }
        return { m, y };
      });
      const cobrados = registros.filter(r => r.estado === 4);
      const ing = meses.map(({ m, y }) =>
        cobrados.filter(r => { const f = toIsoStr(r.fecha); return f.startsWith(`${y}-${String(m).padStart(2,'0')}`); })
                .reduce((s, r) => s + (r.costo_total ?? 0), 0)
      );
      const gas = meses.map(({ m, y }) =>
        gastos.filter(g => { const f = toIsoStr(g.fecha); return f.startsWith(`${y}-${String(m).padStart(2,'0')}`); })
              .reduce((s, g) => s + Number(g.monto), 0)
      );
      return { chartIngresos: ing, chartGastos: gas, chartLabels: meses.map(({ m }) => MES_SHORT[m-1]) };
    }
    // Año completo (filtroTipo === 'anio' | 'todo')
    const año = filtroTipo === 'anio' ? filtroAnio : anioActual;
    const cobrados = registros.filter(r => r.estado === 4 && toIsoStr(r.fecha).startsWith(String(año)));
    const ing = Array.from({ length: 12 }, (_, m) =>
      cobrados.filter(r => Number(toIsoStr(r.fecha).slice(5,7)) === m+1).reduce((s,r) => s+(r.costo_total??0), 0)
    );
    const gas = Array.from({ length: 12 }, (_, m) =>
      gastos.filter(g => toIsoStr(g.fecha).startsWith(String(año)) && Number(toIsoStr(g.fecha).slice(5,7)) === m+1)
            .reduce((s,g) => s+Number(g.monto), 0)
    );
    return { chartIngresos: ing, chartGastos: gas, chartLabels: MES_SHORT };
  }, [registros, gastos, anioActual, filtroTipo, filtroMes, filtroAnio]);

  const nombreEmpleado = (idEmp: number) => {
    if (idEmp === 0) return 'Gasto general';
    const u = empleados.find(e => e.id_usuario === idEmp);
    return u ? u.nombre_completo.split(' ').slice(0,2).join(' ') : `Empleado #${idEmp}`;
  };

  const handleGuardarGasto = async () => {
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) { toast.error('Ingresa un monto válido'); return; }
    setSavingGasto(true);
    try {
      await pagosEmpleadoApi.create({ id_empleado:0, fecha:form.fecha, concepto:form.concepto, monto, notas:form.notas||undefined });
      toast.success('Gasto registrado');
      setModalGasto(false);
      setForm({ concepto:'Compra inventario', fecha:hoyStr, monto:'', notas:'' });
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

  const movimientos = useMemo(() => {
    const ing = filtrar(registros.filter(r => r.estado === 4))
      .map(r => ({ tipo:'ingreso' as const, fecha:toIsoStr(r.fecha), desc:`Servicio · ${r.placa}`, monto:r.costo_total??0, id:r.id_registro }));
    const gas = filtrar(gastos)
      .map(g => ({ tipo:'gasto' as const, fecha:toIsoStr(g.fecha), desc:`${g.concepto} — ${nombreEmpleado(g.id_empleado)}`, monto:Number(g.monto), id:g.id_pago, id_pago:g.id_pago }));
    return [...ing, ...gas].sort((a,b) => b.fecha.localeCompare(a.fecha)).slice(0, 30);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, gastos, empleados, filtrar]);

  const KPIs = [
    { label:'Ingresos',        value:fmtMoney(ingresosPeriodo), sub:'Servicios facturados',   icon:TrendingUp,    color:'#10B981', bg:'rgba(16,185,129,0.08)',  border:'rgba(16,185,129,0.2)'  },
    { label:'Gastos empleados',value:fmtMoney(gastosEmpleados), sub:'Sueldos, bonos, etc.',   icon:DollarSign,    color:'#F59E0B', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.2)'  },
    { label:'Gastos generales',value:fmtMoney(gastosGenerales), sub:'Compras, servicios ext.', icon:Receipt,       color:'#8B5CF6', bg:'rgba(139,92,246,0.08)', border:'rgba(139,92,246,0.2)'  },
    { label:'Balance neto',    value:fmtMoney(balance),         sub:balance>=0?'Ganancia':'Pérdida', icon:balance>=0?ArrowUpRight:ArrowDownRight,
      color:balance>=0?'#10B981':'#E11428', bg:balance>=0?'rgba(16,185,129,0.08)':'rgba(225,20,40,0.08)', border:balance>=0?'rgba(16,185,129,0.2)':'rgba(225,20,40,0.2)' },
  ];

  const FILTROS: { key: FiltroTipo; label: string }[] = [
    { key:'dia',    label:'Día'    },
    { key:'semana', label:'Semana' },
    { key:'mes',    label:'Mes'    },
    { key:'anio',   label:'Año'    },
    { key:'todo',   label:'Todo'   },
  ];

  const yearsOpts = [anioActual-2, anioActual-1, anioActual, anioActual+1].filter(y => y <= anioActual+1);

  return (
    <div ref={pageRef} className="space-y-7 pb-10">

      {/* ─── Encabezado + Filtros ─── */}
      <div className="header-enter flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-gm-red font-black uppercase mb-1">Taller · Finanzas</p>
            <h1 className="text-3xl font-black text-white">Contabilidad</h1>
            <p className="text-white/30 text-sm mt-1">Ingresos, gastos y balance del negocio</p>
          </div>
          <Button icon={<Plus size={14}/>} onClick={() => setModalGasto(true)}>
            Registrar gasto
          </Button>
        </div>

        {/* Filtros de fecha */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tabs de tipo */}
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08] shrink-0">
            {FILTROS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltroTipo(key)}
                className="px-3 py-2 text-[11px] font-bold tracking-wide transition-all"
                style={{
                  background: filtroTipo === key ? 'rgba(225,20,40,0.18)' : 'transparent',
                  color:      filtroTipo === key ? '#fff' : 'rgba(255,255,255,0.35)',
                  borderRight: key !== 'todo' ? '1px solid rgba(255,255,255,0.06)' : undefined,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Selector de fecha específica (día / semana) */}
          {(filtroTipo === 'dia' || filtroTipo === 'semana') && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-white/30 shrink-0" />
              <input
                type="date"
                value={filtroFecha}
                onChange={e => setFiltroFecha(e.target.value)}
                className="gm-select-d text-sm"
                style={{ height:36, paddingLeft:10, paddingRight:10 }}
              />
              {filtroTipo === 'semana' && (
                <span className="text-[11px] text-white/40 font-semibold">{weekLabel(filtroFecha)}</span>
              )}
            </div>
          )}

          {/* Selector mes + año */}
          {filtroTipo === 'mes' && (
            <div className="flex items-center gap-2">
              <select
                value={filtroMes}
                onChange={e => setFiltroMes(Number(e.target.value))}
                className="gm-select-d text-sm"
                style={{ height:36, minWidth:110 }}
              >
                {MES_LABELS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <select
                value={filtroAnio}
                onChange={e => setFiltroAnio(Number(e.target.value))}
                className="gm-select-d text-sm"
                style={{ height:36, width:80 }}
              >
                {yearsOpts.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {/* Selector año */}
          {filtroTipo === 'anio' && (
            <select
              value={filtroAnio}
              onChange={e => setFiltroAnio(Number(e.target.value))}
              className="gm-select-d text-sm"
              style={{ height:36, width:90 }}
            >
              {yearsOpts.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}

          {/* Label del filtro activo */}
          <span
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.07)' }}
          >
            {filtroLabel(filtroTipo, filtroFecha, filtroMes, filtroAnio)}
          </span>
        </div>
      </div>

      {/* ─── KPI cards ─── */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="gm-card-d rounded-2xl p-6 h-28 skeleton-d"/>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {KPIs.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
            <div key={label} className="rounded-2xl p-5 flex flex-col gap-3"
                 style={{ background:bg, border:`1px solid ${border}` }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[0.2em] uppercase font-black text-white/35">{label}</p>
                <Icon size={16} style={{ color }}/>
              </div>
              <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
              <p className="text-[11px] text-white/30">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Gráfico comparativo ─── */}
      <div className="section-enter gm-card-d rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-bold text-white/85 flex items-center gap-2">
              <BarChart2 size={15} className="text-gm-red"/>
              {filtroTipo === 'anio' ? `Comparativo ${filtroAnio}` :
               filtroTipo === 'todo' ? `Comparativo ${anioActual}` :
               `Últimos 6 meses`}
            </p>
            <p className="text-[11px] text-white/30 mt-0.5">Verde = ingresos · Rojo = gastos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background:'rgba(16,185,129,0.7)' }}/>
              <span className="text-[10px] text-white/30 font-semibold">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background:'rgba(225,20,40,0.7)' }}/>
              <span className="text-[10px] text-white/30 font-semibold">Gastos</span>
            </div>
          </div>
        </div>
        <DualBar ingresos={chartIngresos} gastos={chartGastos} labels={chartLabels}/>
      </div>

      {/* ─── Tabla de movimientos ─── */}
      <div className="section-enter gm-card-d rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-sm font-bold text-white/80">Movimientos</p>
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
                    <td key={j} className="px-4 py-3.5"><div className="skeleton-d h-3.5 rounded" style={{width:w}}/></td>
                  ))}</tr>
                ))
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="py-14 text-center flex flex-col items-center gap-3">
                      <Wallet size={28} className="text-white/12"/>
                      <p className="text-sm text-white/25">Sin movimientos para este período</p>
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
                        <ArrowUpRight size={10}/> Ingreso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                        <ArrowDownRight size={10}/> Gasto
                      </span>
                    )}
                  </td>
                  <td className={`text-right font-black tabular-nums text-sm ${m.tipo==='ingreso'?'text-emerald-400':'text-red-400'}`}>
                    {m.tipo==='ingreso'?'+':'-'}{fmtMoney(m.monto)}
                  </td>
                  <td>
                    {'id_pago' in m && (
                      <button onClick={() => handleEliminarGasto((m as { id_pago:number }).id_pago)}
                              className="icon-btn danger" title="Eliminar gasto">
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal: registrar gasto ─── */}
      <Modal open={modalGasto} onClose={() => setModalGasto(false)} title="Registrar gasto / compra" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalGasto(false)}>Cancelar</Button>
          <Button loading={savingGasto} onClick={handleGuardarGasto}>Guardar</Button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Concepto</label>
            <select className="gm-select-d w-full" value={form.concepto} onChange={e => setForm(f => ({...f,concepto:e.target.value}))}>
              {CONCEPTOS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Fecha</label>
            <input type="date" className="gm-input-d" value={form.fecha} onChange={e => setForm(f => ({...f,fecha:e.target.value}))}/>
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Monto ($)</label>
            <input type="number" className="gm-input-d" placeholder="0.00" step="0.01" value={form.monto} onChange={e => setForm(f => ({...f,monto:e.target.value}))}/>
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Descripción (opcional)</label>
            <input type="text" className="gm-input-d" placeholder="Ej: Aceite 10W40 x5 litros" value={form.notas} onChange={e => setForm(f => ({...f,notas:e.target.value}))}/>
          </div>
        </div>
      </Modal>
    </div>
  );
}
