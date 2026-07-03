/* ─────────────────────────────────────────────
   GMotors — Dashboard Enterprise v3
   KPIs reales · Recharts · Multi-rol
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Package, Bike, Users, ArrowRight,
  TrendingUp, TrendingDown, Clock, Zap, Activity,
  Bell, Star, AlertTriangle, ChevronRight, Printer,
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ComposedChart, Bar, Line, ReferenceLine,
} from 'recharts';
import ContabilidadChart from '../../components/charts/ContabilidadChart';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../lib/theme';
import { motosApi, registrosApi, productosApi, usuariosApi, combustibleApi, pagosEmpleadoApi, facturasApi, type PagoEmpleadoAPI } from '../../lib/api';
import { fmtDate, fmtMoney, parsePermisos } from '../../lib/utils';
import { usePolling } from '../../hooks/usePolling';
import { useCountUp } from '../../hooks/useGsap';
import type { RegistroDetalle, Moto, Producto } from '../../types';
import { isNativeApp } from '../../lib/platform';
import MobileDashboard from '../../components/mobile/MobileDashboard';
import TermsModal from '../../components/ui/TermsModal';



/* ── Tooltip para recharts (theme-aware) ── */
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
         style={{
           background: isDark ? 'rgba(20,20,30,0.97)' : '#FFFFFF',
           border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E4E7EC',
           boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.5)' : '0 12px 32px rgba(0,0,0,0.12)',
         }}>
      {label && <p className="dark:text-white/40 text-slate-900/40 font-bold mb-1">{label}</p>}
      {payload.map(p => (
        <p key={p.name} className="font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? fmtMoney(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

/* ── Hook: mide el ancho explícito de un contenedor (px) ──
   En el APK (Android WebView) ResponsiveContainer recibe ancho 0 y el chart
   no se ve / lanza "width(-1)…". Medimos con ResizeObserver + useLayoutEffect
   (mismo patrón que ContabilidadPage) y renderizamos solo cuando cw>0.        */
function useChartWidth() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || el.offsetWidth || el.getBoundingClientRect().width;
      if (w > 0) setCw(Math.floor(w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    /* Fallback: si el layout del WebView no dispara ResizeObserver de inmediato */
    const t = setTimeout(measure, 120);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);
  return { wrapRef, cw };
}

/* ── AreaChart: actividad últimos 7 días (ancho explícito) ── */
function ActivityAreaChart({ data, isAdmin, isDark }: {
  data: { day: string; ordenes: number; ingresos: number }[];
  isAdmin: boolean; isDark: boolean;
}) {
  const { wrapRef, cw } = useChartWidth();
  const tickColor = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(21,21,27,0.45)';
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
  const H = 208;
  return (
    <div ref={wrapRef} className="recharts-custom" style={{ width: '100%', height: H }}>
      {cw > 0 && (
        <AreaChart width={cw} height={H} data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradOrdenes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#E11428" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#E11428" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="day" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<DarkTooltip />} />
          <Area type="monotone" dataKey="ordenes" name="Órdenes" stroke="#E11428" strokeWidth={2} fill="url(#gradOrdenes)" dot={false} />
          {isAdmin && <Area type="monotone" dataKey="ingresos" name="Ingresos $" stroke="#10B981" strokeWidth={2} fill="url(#gradIngresos)" dot={false} />}
        </AreaChart>
      )}
    </div>
  );
}

/* ── Donut estados (ancho explícito) ── */
function EstadosPieChart({ data, isDark }: {
  data: { name: string; value: number; color: string }[]; isDark: boolean;
}) {
  const { wrapRef, cw } = useChartWidth();
  const stroke = isDark ? 'rgba(0,0,0,0.5)' : '#FFFFFF';
  const H = 144;
  return (
    <div ref={wrapRef} className="recharts-custom w-36 h-36 shrink-0" style={{ height: H }}>
      {cw > 0 && (
        <PieChart width={cw} height={H}>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={2} stroke={stroke}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip content={<DarkTooltip />} />
        </PieChart>
      )}
    </div>
  );
}

/* ── KPI Card animado ── */
function KpiCard({ icon: Icon, label, target, sub, to, color, trend }: {
  icon: React.ElementType; label: string; target: number;
  sub: string; to: string; color: string; trend?: number;
}) {
  const ref = useCountUp<HTMLParagraphElement>(target, 1.6);
  const up  = (trend ?? 0) >= 0;
  return (
    <Link to={to} className="metric-card gm-pressable group block" style={{ '--metric-color': color } as React.CSSProperties}>
      <div className="absolute top-3 right-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="metric-num" ref={ref}>0</p>
      <p className="metric-label">{label}</p>
      <p className="text-[11px] dark:text-white/22 text-slate-900/22 mt-0.5">{sub}</p>
      {trend !== undefined && (
        <div className={`mt-2 ${up ? 'stat-trend-up' : 'stat-trend-down'}`}>
          {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {Math.abs(trend)}% este mes
        </div>
      )}
    </Link>
  );
}

/* ── Estado badge map ── */
const ESTADO_COLORS: Record<number, string> = {
  0: '#F59E0B', 1: '#3B82F6', 2: '#10B981', 3: '#8B5CF6', 4: '#14B8A6',
};
const ESTADO_LABELS = ['Pendiente', 'En proceso', 'Completado', 'Entregado', 'Facturado'];

/* En el APK se usa el dashboard móvil premium; en web, el dashboard completo.
   Se separa en dos componentes para no llamar hooks tras un return condicional. */
export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (user && !isAdmin) {
      const accepted = localStorage.getItem(`terms_accepted_${user.id_usuario}`);
      if (!accepted) setShowTerms(true);
    }
  }, [user, isAdmin]);

  const handleAcceptTerms = () => {
    if (user) {
      localStorage.setItem(`terms_accepted_${user.id_usuario}`, 'true');
    }
    setShowTerms(false);
  };

  return (
    <>
      {isNativeApp ? <MobileDashboard /> : <WebDashboard />}
      {showTerms && <TermsModal onAccept={handleAcceptTerms} />}
    </>
  );
}

function WebDashboard() {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const { user, isAdmin, isMecanico, isCliente } = useAuth();

  const [motos,       setMotos]       = useState<Moto[]>([]);
  const [registros,   setRegistros]   = useState<RegistroDetalle[]>([]);
  const [productos,   setProductos]   = useState<Producto[]>([]);
  const [usuarios,    setUsuarios]    = useState<unknown[]>([]);
  const [combustible, setCombustible] = useState<{ id_carga:number; fecha:string; costo_total:number }[]>([]);
  const [gastos,      setGastos]      = useState<PagoEmpleadoAPI[]>([]);
  const [facturas,    setFacturas]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.nombre_completo?.split(' ')[0] ?? 'Equipo';
  const isOpen   = hour >= 8 && hour < 18;

  const load = useCallback(async () => {
    const promises = [
      motosApi.list(), 
      registrosApi.list(), 
      productosApi.list(), 
      combustibleApi.list(),
      isAdmin ? usuariosApi.list() : Promise.resolve({ data: [] }),
      isAdmin ? pagosEmpleadoApi.listAll() : Promise.resolve({ data: [] }),
      isAdmin ? facturasApi.list() : Promise.resolve({ data: [] })
    ];
    const [m, r, p, c, u, g, f] = await Promise.allSettled(promises);
    
    if (m.status === 'fulfilled') setMotos(m.value.data);
    if (r.status === 'fulfilled') setRegistros(r.value.data);
    if (p.status === 'fulfilled') setProductos(p.value.data);
    if (c.status === 'fulfilled') setCombustible(Array.isArray(c.value.data) ? c.value.data : []);
    if (u.status === 'fulfilled') setUsuarios(u.value.data);
    if (g.status === 'fulfilled') setGastos(g.value.data);
    if (f.status === 'fulfilled') setFacturas(f.value.data);
    
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  /* Refresco en tiempo real: cada 25 s y al volver a la pestaña */
  usePolling(load, { intervalMs: 25_000 });

  /* ── Métricas derivadas ── */
  const ingresosTotal = useMemo(() =>
    facturas.reduce((s, f) => s + (f.costo_total ?? 0), 0)
  , [facturas]);

  const stockCritico = useMemo(() =>
    productos.filter(p => p.stock <= 3).length
  , [productos]);

  const activas = useMemo(() =>
    registros.filter(r => r.estado < 3).length
  , [registros]);

  /* ── Normaliza fecha a string ISO "yyyy-MM-dd" sin importar formato del backend ── */
  const toIsoDate = (fecha: unknown): string => {
    if (!fecha) return '';
    if (typeof fecha === 'string') return fecha.slice(0, 10);
    if (Array.isArray(fecha)) {
      const [y, m, d] = fecha as number[];
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return String(fecha).slice(0, 10);
  };

  /* ── Datos para AreaChart (registros últimos 7 días) ── */
  const areaData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    return days.map(day => {
      const dayRegs = registros.filter(r => toIsoDate(r.fecha).startsWith(day));
      return {
        day: day.slice(5),
        ordenes: dayRegs.length,
        ingresos: dayRegs.reduce((s, r) => s + (r.costo_total ?? 0), 0),
      };
    });
  }, [registros]);

  /* ── Datos para Área Contable (últimos 7 días) ── */
  const contabilidadData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    return days.map(day => {
      const dayRegs = registros.filter(r => toIsoDate(r.fecha).startsWith(day) && r.estado === 4); // Sólo ingresos facturados
      const dayGastos = gastos.filter(g => toIsoDate(g.fecha).startsWith(day));
      
      const ingresosDia = dayRegs.reduce((s, r) => s + (r.costo_total ?? 0), 0);
      const gastosDia   = dayGastos.reduce((s, g) => s + (g.monto ?? 0), 0);
      
      return {
        name: day.slice(5),
        Ingresos: ingresosDia,
        Gastos: gastosDia,
        Balance: ingresosDia - gastosDia,
      };
    });
  }, [registros, gastos]);

  /* ── PieChart: distribución de estados ── */
  const pieData = useMemo(() =>
    ESTADO_LABELS.map((name, i) => ({
      name, value: registros.filter(r => r.estado === i).length, color: ESTADO_COLORS[i],
    })).filter(d => d.value > 0)
  , [registros]);

  /* ── Actividad reciente ── */
  const recientes = registros.slice(0, 8);

  /* ── Reporte semanal imprimible (admin) ── */
  const printWeeklyReport = () => {
    const hoy = new Date();
    const hace7 = new Date(); hace7.setDate(hoy.getDate() - 6);
    const inicioStr = hace7.toISOString().slice(0, 10);
    const enRango = (f: unknown) => toIsoDate(f) >= inicioStr;

    const regsWeek      = registros.filter(r => enRango(r.fecha));
    const completadas   = regsWeek.filter(r => r.estado >= 2).length;
    const facturadas    = regsWeek.filter(r => r.estado === 4);
    const ingresosWeek  = facturadas.reduce((s, r) => s + (r.costo_total ?? 0), 0);
    const nuevasMotos   = motos.length;
    const ticketProm    = facturadas.length ? ingresosWeek / facturadas.length : 0;

    const tiposWeek: Record<string, number> = {};
    regsWeek.forEach(r => { const t = r.tipo_servicio ?? 'Otro'; tiposWeek[t] = (tiposWeek[t] ?? 0) + 1; });
    const topTipos = Object.entries(tiposWeek).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const bajos = productos.filter(p => p.stock <= 3).sort((a, b) => a.stock - b.stock);

    const rango = `${hace7.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })} – ${hoy.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const w = window.open('', '_blank', 'width=900,height=760');
    if (!w) return;
    const kpi = (label: string, val: string, color: string) =>
      `<div style="flex:1;min-width:120px;background:#F8FAFC;border:1px solid #EEF1F5;border-radius:12px;padding:14px 16px">
        <p style="margin:0;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#94A3B8;font-weight:700">${label}</p>
        <p style="margin:6px 0 0;font-size:26px;font-weight:900;color:${color};letter-spacing:-1px">${val}</p>
      </div>`;
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>GMotors — Reporte semanal ${rango}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#0F172A;background:#fff;padding:32px}
        .head{background:linear-gradient(135deg,#0C0C10,#1A1A22);border-radius:16px;padding:24px 28px;color:#fff;display:flex;justify-content:space-between;align-items:center}
        .brand{font-size:26px;font-weight:900;letter-spacing:-.5px}
        .brand span{color:#E11428}
        .tag{font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-top:4px}
        .badge{background:rgba(225,20,40,.15);border:1px solid rgba(225,20,40,.35);border-radius:10px;padding:8px 14px;text-align:right}
        .badge p{margin:0;color:#E11428;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
        .badge span{color:rgba(255,255,255,.7);font-size:12px;font-weight:700}
        h3{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#94A3B8;margin:26px 0 12px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{text-align:left;color:#64748B;font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:8px 10px;border-bottom:2px solid #EEF1F5}
        td{padding:9px 10px;border-bottom:1px solid #F1F5F9}
        .r{text-align:right}.b{font-weight:800}
        .foot{margin-top:30px;text-align:center;font-size:11px;color:#CBD5E1;border-top:1px solid #EEF1F5;padding-top:14px}
        @media print{body{padding:14px}}
      </style></head><body>
      <div class="head">
        <div><div class="brand">Gorila <span>Motos</span></div><div class="tag">Reporte semanal · Cuenca, Ecuador</div></div>
        <div class="badge"><p>Periodo</p><span>${rango}</span></div>
      </div>

      <h3>Resumen de la semana</h3>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${kpi('Órdenes', String(regsWeek.length), '#0F172A')}
        ${kpi('Completadas', String(completadas), '#10B981')}
        ${kpi('Facturadas', String(facturadas.length), '#14B8A6')}
        ${kpi('Ingresos', fmtMoney(ingresosWeek), '#E11428')}
        ${kpi('Ticket prom.', fmtMoney(ticketProm), '#8B5CF6')}
        ${kpi('Motos totales', String(nuevasMotos), '#3B82F6')}
      </div>

      <h3>Servicios de la semana (${regsWeek.length})</h3>
      <table><thead><tr><th>Fecha</th><th>Cliente</th><th>Placa</th><th>Servicio</th><th class="r">Total</th></tr></thead><tbody>
        ${regsWeek.slice(0, 30).map(r => `<tr>
          <td>${fmtDate(r.fecha)}</td>
          <td>${r.nombre_cliente ?? '—'}</td>
          <td>${r.placa ?? '—'}</td>
          <td>${r.tipo_servicio ?? '—'}</td>
          <td class="r b">${fmtMoney(r.costo_total ?? 0)}</td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:18px">Sin servicios esta semana</td></tr>'}
      </tbody></table>

      <div style="display:flex;gap:28px;flex-wrap:wrap">
        <div style="flex:1;min-width:240px">
          <h3>Servicios más solicitados</h3>
          <table><tbody>
            ${topTipos.map(([t, n]) => `<tr><td>${t}</td><td class="r b">${n}</td></tr>`).join('') || '<tr><td style="color:#94A3B8">—</td></tr>'}
          </tbody></table>
        </div>
        <div style="flex:1;min-width:240px">
          <h3>Stock crítico (≤3)</h3>
          <table><tbody>
            ${bajos.slice(0, 8).map(p => `<tr><td>${p.nombre}</td><td class="r b" style="color:${p.stock === 0 ? '#E11428' : '#F59E0B'}">${p.stock} u.</td></tr>`).join('') || '<tr><td style="color:#10B981">Todo en orden ✓</td></tr>'}
          </tbody></table>
        </div>
      </div>

      <div class="foot">Generado el ${hoy.toLocaleString('es-EC')} · Gorila Motos · Sistema de gestión</div>
    </body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  /* ── Vista cliente — cualquier usuario que NO sea admin ni mecánico ── */
  if (!isAdmin && !isMecanico) {
    const myMotos   = motos.filter(m => m.id_usuario === user?.id_usuario);
    const myPlacas  = new Set(myMotos.map(m => m.placa));
    const myRegs    = registros.filter(r => myPlacas.has(r.placa));
    const myPuntos  = myRegs.length * 8;
    return (
      <div className="space-y-6 pb-8">
        <div className="gm-card-d rounded-3xl p-6" style={{ background: 'linear-gradient(135deg,#17171E,rgba(225,20,40,0.06))' }}>
          <p className="text-[11px] dark:text-white/30 text-slate-900/30 font-bold uppercase tracking-widest">{greeting}</p>
          <h1 className="text-3xl font-black dark:text-white text-slate-900 mt-1">{firstName}</h1>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="text-center"><p className="text-2xl font-black dark:text-white text-slate-900">{myMotos.length}</p><p className="text-xs dark:text-white/35 text-slate-900/35">Motos</p></div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center"><p className="text-2xl font-black dark:text-white text-slate-900">{myRegs.length}</p><p className="text-xs dark:text-white/35 text-slate-900/35">Servicios</p></div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center"><p className="text-2xl font-black text-yellow-400">{myPuntos}</p><p className="text-xs dark:text-white/35 text-slate-900/35">Puntos</p></div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Mis motos',    to: '/mi-moto',     color: '#3B82F6', icon: Bike   },
            { label: 'Mis puntos',   to: '/puntos',      color: '#F59E0B', icon: Star   },
            { label: 'Mi portal',    to: '/portal',      color: '#10B981', icon: Users  },
            { label: 'Combustible',  to: '/combustible', color: '#8B5CF6', icon: Zap    },
          ].map(({ label, to, color, icon: Icon }) => (
            <Link key={to} to={to}
                  className="gm-card-d rounded-2xl p-4 flex items-center gap-3 hover:border-gm-red/30 transition-all">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <span className="dark:text-white/70 text-slate-900/70 font-bold text-sm">{label}</span>
              <ChevronRight size={13} className="dark:text-white/20 text-slate-900/20 ml-auto" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* ── Vista Admin / Mecánico ── */
  if (loading) return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton-d h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton-d h-64 rounded-2xl" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="skeleton-d h-52 rounded-2xl" />
        <div className="skeleton-d h-52 rounded-2xl" />
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] dark:text-white/28 text-slate-900/28 font-bold uppercase tracking-widest">{greeting}, {firstName}</p>
          <h1 className="text-[1.85rem] font-black dark:text-white text-slate-900 leading-tight tracking-tight">
            Panel de <span className="text-gradient-red">Control</span>
          </h1>
          <p className="dark:text-white/30 text-slate-900/30 text-sm mt-0.5">{new Date().toLocaleDateString('es-EC', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={printWeeklyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:bg-white/[0.04]"
              style={{ background: 'rgba(225,20,40,0.07)', borderColor: 'rgba(225,20,40,0.25)' }}
              title="Generar e imprimir el reporte semanal del negocio"
            >
              <Printer size={13} className="text-gm-red" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-gm-red">Reporte semanal</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
               style={{
                 background: isOpen ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                 borderColor: isOpen ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
               }}>
            <span className="w-2 h-2 rounded-full" style={{
              background: isOpen ? '#10B981' : '#EF4444',
              boxShadow: `0 0 6px ${isOpen ? 'rgba(52,211,153,0.8)' : 'rgba(239,68,68,0.8)'}`,
            }} />
            <span className="text-[11px] font-bold tracking-wider uppercase"
                  style={{ color: isOpen ? '#10B981' : '#EF4444' }}>
              {isOpen ? 'Taller abierto' : 'Fuera de horario'}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={Bike}    label="Motos registradas" target={motos.length}    sub="vehículos totales"   to="/motos"      color="#3B82F6" />
        <KpiCard icon={Wrench}  label="Órdenes activas"   target={activas}         sub="en proceso/pendiente" to="/registros"  color="#E11428" />
        <KpiCard icon={Package} label="Stock crítico"      target={stockCritico}   sub="productos ≤3 unidades" to="/inventario" color="#F59E0B" />
        {isAdmin && <KpiCard icon={Users} label="Usuarios" target={usuarios.length} sub="cuentas del sistema" to="/perfiles"   color="#8B5CF6" />}
      </div>

      {/* ── Panel general de módulos (SOLO admin/mecánico · sin Contabilidad) ── */}
      {(isAdmin || isMecanico) && !loading && (() => {
        const hoyStr  = new Date().toISOString().slice(0, 7); // yyyy-MM
        const combMes = combustible.filter(c => String(c.fecha ?? '').slice(0, 7) === hoyStr).length;
        
        // Comparativa semanal combustible
        const now = new Date();
        const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const combThisWeek = combustible.filter(c => new Date(c.fecha) >= startOfThisWeek).reduce((s, c) => s + (c.costo_total ?? 0), 0);
        const combLastWeek = combustible.filter(c => {
            const d = new Date(c.fecha);
            return d >= startOfLastWeek && d < startOfThisWeek;
        }).reduce((s, c) => s + (c.costo_total ?? 0), 0);
        
        let combTrend = '—';
        let combColor = '#8B5CF6';
        if (combLastWeek > 0) {
            const diff = ((combThisWeek - combLastWeek) / combLastWeek) * 100;
            combTrend = `${diff > 0 ? '+' : ''}${diff.toFixed(1)}% vs sem. ant.`;
            combColor = diff > 0 ? '#F43F5E' : '#10B981'; // Más gasto es rojo, menos es verde
        } else if (combThisWeek > 0) {
            combTrend = 'Gasto iniciado';
        }

        const facturados = registros.filter(r => r.estado === 4).length;
        const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

        const MODS: {
          to: string; label: string; icon: React.ElementType;
          color: string; val: number; sub: string; pct?: number;
        }[] = [
          { to:'/registros',   label:'Registros',   icon:Wrench,      color:'#E11428',
            val: registros.length,  sub:`${activas} activos · ${facturados} facturados`,
            pct: pct(facturados, registros.length) },
          { to:'/motos',       label:'Motos',        icon:Bike,        color:'#3B82F6',
            val: motos.length,      sub:`vehículos registrados`, pct: 100 },
          { to:'/inventario',  label:'Inventario',   icon:Package,     color:'#F59E0B',
            val: productos.length,  sub:`${stockCritico} con stock crítico`,
            pct: productos.length > 0 ? Math.round(((productos.length - stockCritico) / productos.length) * 100) : 100 },
          { to:'/combustible', label:'Combustible',  icon:Zap,         color: combColor,
            val: combustible.length, sub:`${combTrend}`, pct: 100 },
          { to:'/clientes',    label:'Clientes',     icon:Users,       color:'#10B981',
            val: usuarios.length,   sub:`usuarios del sistema`, pct: 100 },
          ...(isAdmin ? [
            { to:'/perfiles',  label:'Perfiles',     icon:Star,        color:'#14B8A6',
              val: usuarios.length, sub:`cuentas activas`, pct: 100 },
          ] : []),
        ];

        /* Respetar los permisos del mecánico: solo módulos a los que el admin le dio acceso */
        const mecPermisos = isMecanico ? parsePermisos(user?.descripcion) : null;
        const puedeMod = (to: string) => {
          if (isAdmin || !isMecanico || !mecPermisos) return true;
          return mecPermisos.includes(to.replace('/', ''));
        };
        const MODS_VISIBLES = MODS.filter(m => puedeMod(m.to));

        return (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-3"
               style={{ color:'rgba(255,255,255,0.22)' }}>
              Panel general · haz clic para ir al módulo
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {MODS_VISIBLES.map(({ to, label, icon: Icon, color, val, sub, pct: p }) => (
                <Link key={to} to={to}
                  className="gm-mod-card rounded-xl p-3.5 text-center block"
                  style={{ textDecoration:'none' }}
                >
                  <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center"
                       style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
                    <Icon size={14} style={{ color }} />
                  </div>
                  <p className="text-xl font-black tabular-nums" style={{ color }}>{val}</p>
                  <p className="gm-mod-label mt-0.5">{label}</p>
                  <p className="gm-mod-sub mt-0.5 leading-tight">{sub}</p>
                  {p !== undefined && (
                    <div className="gm-mod-track">
                      <div className="h-full rounded-full transition-all duration-700"
                           style={{ width:`${Math.max(p, 4)}%`, background: color, opacity: 0.7 }} />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Gráfica principal: órdenes + ingresos ── */}
      <div className="gm-card-d rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gm-red/10 border border-gm-red/15 flex items-center justify-center">
              <Activity size={14} className="text-gm-red" />
            </div>
            <div>
              <h2 className="text-sm font-black dark:text-white/90 text-slate-900/90">Actividad últimos 7 días</h2>
              <p className="text-[11px] dark:text-white/28 text-slate-900/28 mt-0.5">Órdenes e ingresos diarios</p>
            </div>
          </div>
          <Link to="/registros" className="text-[11px] text-gm-red hover:text-gm-red-lt font-bold flex items-center gap-1">
            Ver registros <ArrowRight size={11} />
          </Link>
        </div>
        <div className="recharts-custom h-52">
          <ActivityAreaChart data={areaData} isAdmin={isAdmin} isDark={isDark} />
        </div>
      </div>

      {/* ── Row: BarChart + PieChart ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Resumen Contable */}
        <div className="gm-card-d rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-gm-red/60" />
              <p className="text-[10px] tracking-[0.28em] uppercase dark:text-white/28 text-slate-900/28 font-bold">Rendimiento (7 días)</p>
            </div>
            <Link to="/contabilidad" className="text-[10px] text-gm-red hover:text-gm-red-lt font-semibold">
              Ver finanzas
            </Link>
          </div>
          <ContabilidadChart data={contabilidadData} isDark={isDark} />
        </div>

        {/* Donut estados */}
        <div className="gm-card-d rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={13} className="text-gm-red/60" />
            <p className="text-[10px] tracking-[0.28em] uppercase dark:text-white/28 text-slate-900/28 font-bold">Estado de órdenes</p>
          </div>
          <div className="flex items-center gap-4">
            <EstadosPieChart data={pieData} isDark={isDark} />
            <div className="flex-1 space-y-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-[12px] dark:text-white/50 text-slate-900/50 font-medium">{d.name}</span>
                  </div>
                  <span className="text-[13px] font-black" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Actividad reciente + Acciones rápidas ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* Actividad */}
        <div className="xl:col-span-3 gm-card-d rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gm-red/10 border border-gm-red/15 flex items-center justify-center">
                <Clock size={13} className="text-gm-red" />
              </div>
              <div>
                <h2 className="text-sm font-black dark:text-white/90 text-slate-900/90">Actividad reciente</h2>
                <p className="text-[11px] dark:text-white/28 text-slate-900/28 mt-0.5">Últimas órdenes de servicio</p>
              </div>
            </div>
            <Link to="/registros" className="text-[11px] text-gm-red hover:text-gm-red-lt font-bold flex items-center gap-1">
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          <div className="px-4 py-1">
            {recientes.length === 0 ? (
              <div className="py-12 text-center dark:text-white/25 text-slate-900/25 text-sm">Sin actividad</div>
            ) : recientes.map(r => (
              <div key={r.id_registro}
                   className="flex items-center gap-3 py-3 border-b border-white/[0.035] last:border-0">
                <div className="w-9 h-9 rounded-xl bg-gm-red/8 border border-gm-red/12 flex items-center justify-center shrink-0">
                  <Wrench size={13} className="text-gm-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold dark:text-white/80 text-slate-900/80 truncate">{r.nombre_cliente}</p>
                  <p className="text-[11px] dark:text-white/32 text-slate-900/32 font-mono tracking-wider truncate">
                    {r.placa} · {fmtDate(r.fecha)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {isAdmin && <p className="text-sm font-black dark:text-white/70 text-slate-900/70">{fmtMoney(r.costo_total)}</p>}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${ESTADO_COLORS[r.estado] ?? '#6B7280'}18`,
                          color: ESTADO_COLORS[r.estado] ?? '#6B7280',
                        }}>
                    {ESTADO_LABELS[r.estado] ?? '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones + Alertas */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Ingresos totales facturados — solo Admin */}
          {isAdmin && (
            <div className="gm-card-d rounded-2xl p-5"
                 style={{ background: 'linear-gradient(135deg, #17171E, rgba(16,185,129,0.06))' }}>
              <p className="text-[10px] tracking-[0.28em] uppercase dark:text-white/28 text-slate-900/28 font-bold mb-2">Ingresos facturados</p>
              <p className="kpi-mega text-3xl">{fmtMoney(ingresosTotal)}</p>
              <p className="text-xs dark:text-white/30 text-slate-900/30 mt-1">Total acumulado · {registros.filter(r=>r.estado===4).length} facturas</p>
            </div>
          )}

          {/* Alertas rápidas */}
          {stockCritico > 0 && (
            <Link to="/inventario"
                  className="gm-card-d rounded-2xl p-4 flex items-center gap-3 border-amber-500/25 hover:border-amber-500/40 transition-all"
                  style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertTriangle size={15} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold dark:text-white/80 text-slate-900/80">{stockCritico} producto{stockCritico > 1 ? 's' : ''} con stock bajo</p>
                <p className="text-[11px] dark:text-white/35 text-slate-900/35">Reponer inventario</p>
              </div>
              <ChevronRight size={13} className="dark:text-white/25 text-slate-900/25" />
            </Link>
          )}

          {/* Acciones rápidas */}
          <div className="gm-card-d rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} className="text-gm-red/60" />
              <p className="text-[10px] tracking-[0.3em] uppercase dark:text-white/25 text-slate-900/25 font-bold">Acciones rápidas</p>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Nueva orden',    icon: Wrench,  to: '/registros',   desc: 'Crear servicio'   },
                { label: 'Registrar moto', icon: Bike,    to: '/motos',       desc: 'Nuevo vehículo'   },
                { label: 'Ver alertas',    icon: Bell,    to: '/alertas',     desc: 'Mantenimientos'   },
                ...(isAdmin ? [
                  { label: 'Pagos',         icon: Activity, to: '/pagos',     desc: 'Cobros y facturas' },
                  { label: 'Perfiles',      icon: Users,    to: '/perfiles',  desc: 'Equipo' },
                ] : []),
              ].map(({ label, icon: Icon, to, desc }) => (
                <Link key={to} to={to}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/[0.06]">
                  <div className="w-7 h-7 rounded-lg bg-gm-red/8 border border-gm-red/12 flex items-center justify-center shrink-0 group-hover:bg-gm-red group-hover:border-gm-red transition-all">
                    <Icon size={12} className="text-gm-red group-hover:dark:text-white text-slate-900 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold dark:text-white/65 text-slate-900/65 group-hover:dark:text-white/90 text-slate-900/90 transition-colors">{label}</p>
                    <p className="text-[10px] dark:text-white/25 text-slate-900/25">{desc}</p>
                  </div>
                  <ArrowRight size={11} className="dark:text-white/18 text-slate-900/18 group-hover:text-gm-red transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
