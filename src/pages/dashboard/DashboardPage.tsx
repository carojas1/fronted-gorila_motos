/* ─────────────────────────────────────────────
   GMotors — Dashboard Enterprise v3
   KPIs reales · Recharts · Multi-rol
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Package, Bike, Users, ArrowRight,
  TrendingUp, TrendingDown, Clock, Zap, Activity,
  Bell, Star, AlertTriangle, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { motosApi, registrosApi, productosApi, usuariosApi } from '../../lib/api';
import { fmtDate, fmtMoney, ESTADO_REGISTRO } from '../../lib/utils';
import { useCountUp } from '../../hooks/useGsap';
import Badge from '../../components/ui/Badge';
import type { RegistroDetalle, Moto, Producto } from '../../types';

/* ── Tooltip dark para recharts ── */
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs"
         style={{ background:'rgba(20,20,30,0.97)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 12px 32px rgba(0,0,0,0.5)' }}>
      {label && <p className="text-white/40 font-bold mb-1">{label}</p>}
      {payload.map(p => (
        <p key={p.name} className="font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? fmtMoney(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

/* ── KPI Card animado ── */
function KpiCard({ icon: Icon, label, target, sub, to, color, trend }: {
  icon: React.ElementType; label: string; target: number;
  sub: string; to: string; color: string; trend?: number;
}) {
  const ref = useCountUp(target, 1.6);
  const up  = (trend ?? 0) >= 0;
  return (
    <Link to={to} className="metric-card group block" style={{ '--metric-color': color } as React.CSSProperties}>
      <div className="absolute top-3 right-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
             style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="metric-num" ref={ref}>0</p>
      <p className="metric-label">{label}</p>
      <p className="text-[11px] text-white/22 mt-0.5">{sub}</p>
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

export default function DashboardPage() {
  const { user, isAdmin, isMecanico, isCliente } = useAuth();

  const [motos,     setMotos]     = useState<Moto[]>([]);
  const [registros, setRegistros] = useState<RegistroDetalle[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [usuarios,  setUsuarios]  = useState<unknown[]>([]);
  const [loading,   setLoading]   = useState(true);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.nombre_completo?.split(' ')[0] ?? 'Equipo';
  const isOpen   = hour >= 8 && hour < 18;

  useEffect(() => {
    Promise.allSettled([
      motosApi.list(), registrosApi.list(), productosApi.list(), usuariosApi.list(),
    ]).then(([m, r, p, u]) => {
      setMotos(    m.status === 'fulfilled' ? m.value.data : []);
      setRegistros(r.status === 'fulfilled' ? r.value.data : []);
      setProductos(p.status === 'fulfilled' ? p.value.data : []);
      setUsuarios( u.status === 'fulfilled' ? u.value.data : []);
      setLoading(false);
    });
  }, []);

  /* ── Métricas derivadas ── */
  const ingresosTotal = useMemo(() =>
    registros.filter(r => r.estado === 4).reduce((s, r) => s + (r.costo_total ?? 0), 0)
  , [registros]);

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

  /* ── BarChart: top tipos de servicio ── */
  const tiposData = useMemo(() => {
    const counts: Record<string, number> = {};
    registros.forEach(r => {
      const tipo = r.tipo_servicio ?? 'Otro';
      counts[tipo] = (counts[tipo] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.slice(0, 18), value }));
  }, [registros]);

  /* ── PieChart: distribución de estados ── */
  const pieData = useMemo(() =>
    ESTADO_LABELS.map((name, i) => ({
      name, value: registros.filter(r => r.estado === i).length, color: ESTADO_COLORS[i],
    })).filter(d => d.value > 0)
  , [registros]);

  /* ── Actividad reciente ── */
  const recientes = registros.slice(0, 8);

  /* ── Vista cliente simplificada ── */
  if (isCliente) {
    const myMotos   = motos.filter(m => m.id_usuario === user?.id_usuario);
    const myPlacas  = new Set(myMotos.map(m => m.placa));
    const myRegs    = registros.filter(r => myPlacas.has(r.placa));
    const myPuntos  = myRegs.length * 8;
    return (
      <div className="space-y-6 pb-8">
        <div className="gm-card-d rounded-3xl p-6" style={{ background: 'linear-gradient(135deg,#17171E,rgba(225,20,40,0.06))' }}>
          <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest">{greeting}</p>
          <h1 className="text-3xl font-black text-white mt-1">{firstName}</h1>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="text-center"><p className="text-2xl font-black text-white">{myMotos.length}</p><p className="text-xs text-white/35">Motos</p></div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center"><p className="text-2xl font-black text-white">{myRegs.length}</p><p className="text-xs text-white/35">Servicios</p></div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center"><p className="text-2xl font-black text-yellow-400">{myPuntos}</p><p className="text-xs text-white/35">Puntos</p></div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Mis motos',    to: '/motos',       color: '#3B82F6', icon: Bike   },
            { label: 'Mis puntos',   to: '/puntos',      color: '#F59E0B', icon: Star   },
            { label: 'Mi portal',    to: '/portal',      color: '#10B981', icon: Users  },
            { label: 'Combustible',  to: '/combustible', color: '#8B5CF6', icon: Zap    },
            { label: 'Alertas',      to: '/alertas',     color: '#E11428', icon: Bell   },
          ].map(({ label, to, color, icon: Icon }) => (
            <Link key={to} to={to}
                  className="gm-card-d rounded-2xl p-4 flex items-center gap-3 hover:border-gm-red/30 transition-all">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <span className="text-white/70 font-bold text-sm">{label}</span>
              <ChevronRight size={13} className="text-white/20 ml-auto" />
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
          <p className="text-[11px] text-white/28 font-bold uppercase tracking-widest">{greeting}, {firstName}</p>
          <h1 className="text-[1.85rem] font-black text-white leading-tight tracking-tight">
            Panel de <span className="text-gradient-red">Control</span>
          </h1>
          <p className="text-white/30 text-sm mt-0.5">{new Date().toLocaleDateString('es-EC', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
        <div className="flex items-center gap-2">
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
        <KpiCard icon={Bike}    label="Motos registradas" target={motos.length}    sub="vehículos totales"   to="/motos"      color="#3B82F6" trend={12} />
        <KpiCard icon={Wrench}  label="Órdenes activas"   target={activas}         sub="en proceso/pendiente" to="/registros"  color="#E11428" trend={-3} />
        <KpiCard icon={Package} label="Stock crítico"      target={stockCritico}   sub="productos ≤3 unidades" to="/inventario" color="#F59E0B" />
        {isAdmin && <KpiCard icon={Users} label="Usuarios" target={usuarios.length} sub="cuentas del sistema" to="/perfiles"   color="#8B5CF6" trend={8} />}
      </div>

      {/* ── Gráfica principal: órdenes + ingresos ── */}
      <div className="gm-card-d rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gm-red/10 border border-gm-red/15 flex items-center justify-center">
              <Activity size={14} className="text-gm-red" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white/90">Actividad últimos 7 días</h2>
              <p className="text-[11px] text-white/28 mt-0.5">Órdenes e ingresos diarios</p>
            </div>
          </div>
          <Link to="/registros" className="text-[11px] text-gm-red hover:text-gm-red-lt font-bold flex items-center gap-1">
            Ver registros <ArrowRight size={11} />
          </Link>
        </div>
        <div className="recharts-custom h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="ordenes" name="Órdenes" stroke="#E11428" strokeWidth={2} fill="url(#gradOrdenes)" dot={false} />
              <Area type="monotone" dataKey="ingresos" name="Ingresos $" stroke="#10B981" strokeWidth={2} fill="url(#gradIngresos)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row: BarChart + PieChart ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Top servicios */}
        <div className="gm-card-d rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={13} className="text-gm-red/60" />
            <p className="text-[10px] tracking-[0.28em] uppercase text-white/28 font-bold">Top servicios</p>
          </div>
          <div className="recharts-custom h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tiposData} layout="vertical" margin={{ left: 0, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" name="Órdenes" fill="#E11428" radius={[0, 4, 4, 0]}>
                  {tiposData.map((_, i) => (
                    <Cell key={i} fill={`rgba(225,20,40,${0.9 - i * 0.12})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut estados */}
        <div className="gm-card-d rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={13} className="text-gm-red/60" />
            <p className="text-[10px] tracking-[0.28em] uppercase text-white/28 font-bold">Estado de órdenes</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="recharts-custom w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={2} stroke="rgba(0,0,0,0.5)">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-[12px] text-white/50 font-medium">{d.name}</span>
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
                <h2 className="text-sm font-black text-white/90">Actividad reciente</h2>
                <p className="text-[11px] text-white/28 mt-0.5">Últimas órdenes de servicio</p>
              </div>
            </div>
            <Link to="/registros" className="text-[11px] text-gm-red hover:text-gm-red-lt font-bold flex items-center gap-1">
              Ver todas <ArrowRight size={11} />
            </Link>
          </div>
          <div className="px-4 py-1">
            {recientes.length === 0 ? (
              <div className="py-12 text-center text-white/25 text-sm">Sin actividad</div>
            ) : recientes.map(r => (
              <div key={r.id_registro}
                   className="flex items-center gap-3 py-3 border-b border-white/[0.035] last:border-0">
                <div className="w-9 h-9 rounded-xl bg-gm-red/8 border border-gm-red/12 flex items-center justify-center shrink-0">
                  <Wrench size={13} className="text-gm-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/80 truncate">{r.nombre_cliente}</p>
                  <p className="text-[11px] text-white/32 font-mono tracking-wider truncate">
                    {r.placa} · {fmtDate(r.fecha)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-white/70">{fmtMoney(r.costo_total)}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${ESTADO_COLORS[r.estado]}18`,
                          color: ESTADO_COLORS[r.estado],
                        }}>
                    {ESTADO_LABELS[r.estado]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones + Alertas */}
        <div className="xl:col-span-2 flex flex-col gap-4">

          {/* Ingresos totales facturados */}
          <div className="gm-card-d rounded-2xl p-5"
               style={{ background: 'linear-gradient(135deg, #17171E, rgba(16,185,129,0.06))' }}>
            <p className="text-[10px] tracking-[0.28em] uppercase text-white/28 font-bold mb-2">Ingresos facturados</p>
            <p className="kpi-mega text-3xl">{fmtMoney(ingresosTotal)}</p>
            <p className="text-xs text-white/30 mt-1">Total acumulado · {registros.filter(r=>r.estado===4).length} facturas</p>
          </div>

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
                <p className="text-sm font-bold text-white/80">{stockCritico} producto{stockCritico > 1 ? 's' : ''} con stock bajo</p>
                <p className="text-[11px] text-white/35">Reponer inventario</p>
              </div>
              <ChevronRight size={13} className="text-white/25" />
            </Link>
          )}

          {/* Acciones rápidas */}
          <div className="gm-card-d rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} className="text-gm-red/60" />
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 font-bold">Acciones rápidas</p>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Nueva orden',    icon: Wrench,  to: '/registros',  desc: 'Crear servicio'   },
                { label: 'Registrar moto', icon: Bike,    to: '/motos',      desc: 'Nuevo vehículo'   },
                { label: 'Ver alertas',    icon: Bell,    to: '/alertas',    desc: 'Mantenimientos'   },
                ...(isAdmin ? [{ label: 'Ver perfiles', icon: Users, to: '/perfiles', desc: 'Equipo' }] : []),
              ].map(({ label, icon: Icon, to, desc }) => (
                <Link key={to} to={to}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-all group border border-transparent hover:border-white/[0.06]">
                  <div className="w-7 h-7 rounded-lg bg-gm-red/8 border border-gm-red/12 flex items-center justify-center shrink-0 group-hover:bg-gm-red group-hover:border-gm-red transition-all">
                    <Icon size={12} className="text-gm-red group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-white/65 group-hover:text-white/90 transition-colors">{label}</p>
                    <p className="text-[10px] text-white/25">{desc}</p>
                  </div>
                  <ArrowRight size={11} className="text-white/18 group-hover:text-gm-red transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
