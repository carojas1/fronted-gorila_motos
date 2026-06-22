/* ─────────────────────────────────────────────
   GMotors — Dashboard MÓVIL (solo APK)
   Estilo premium tipo app nativa. Usa los datos reales del taller.
   La versión web (DashboardPage) queda intacta.
   ───────────────────────────────────────────── */
import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Package, Bike, Users, Activity, Bell, Star, Zap,
  AlertTriangle, ChevronRight, TrendingUp, DollarSign,
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { motosApi, registrosApi, productosApi, usuariosApi } from '../../lib/api';
import { fmtMoney, fmtDate, toIsoStr } from '../../lib/utils';
import { usePolling } from '../../hooks/usePolling';
import { useTheme } from '../../lib/theme';
import type { RegistroDetalle, Moto, Producto } from '../../types';

const ESTADO_COLORS: Record<number, string> = {
  0: '#F59E0B', 1: '#3B82F6', 2: '#10B981', 3: '#8B5CF6', 4: '#14B8A6',
};
const ESTADO_LABELS = ['Pendiente', 'En proceso', 'Completado', 'Entregado', 'Facturado'];

/* Tarjeta KPI premium */
function Kpi({ icon: Icon, value, label, color, to }: {
  icon: typeof Bike; value: string | number; label: string; color: string; to: string;
}) {
  return (
    <Link to={to} className="m-kpi" style={{ '--c': color } as React.CSSProperties}>
      <div className="m-kpi-ico" style={{ background: `${color}1c`, border: `1px solid ${color}33` }}>
        <Icon size={17} style={{ color }} />
      </div>
      <p className="m-kpi-val">{value}</p>
      <p className="m-kpi-lbl">{label}</p>
    </Link>
  );
}

/* ─── Gráfica de actividad (7 días) ───
   Usa ancho explícito medido con ResizeObserver para garantizar
   visibilidad en Android WebView (Capacitor APK) donde
   ResponsiveContainer a veces recibe ancho 0 (error "width(-1) of chart"). */
function ActivityChart({ areaData }: {
  areaData: { day: string; ordenes: number; ingresos: number }[];
}) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';

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

  return (
    <div ref={wrapRef} style={{ width: '100%', height: 150, marginTop: 6 }}>
      {cw > 0 ? (
        <AreaChart width={cw} height={150} data={areaData} margin={{ top: 5, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="mGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E11428" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#E11428" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fill: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: isDark ? 'rgba(20,20,30,0.97)' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E4E7EC',
              borderRadius: 12,
              fontSize: 12,
              boxShadow: isDark ? undefined : '0 8px 24px rgba(0,0,0,0.12)',
            }}
            labelStyle={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(21,21,27,0.6)' }}
          />
          <Area type="monotone" dataKey="ordenes" name="Órdenes" stroke="#FF3B47" strokeWidth={2.5} fill="url(#mGrad)" dot={false} />
        </AreaChart>
      ) : null}
    </div>
  );
}

export default function MobileDashboard() {
  const { user, isAdmin, isMecanico, isCliente } = useAuth();

  const [motos,     setMotos]     = useState<Moto[]>([]);
  const [registros, setRegistros] = useState<RegistroDetalle[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [usuarios,  setUsuarios]  = useState<unknown[]>([]);
  const [loading,   setLoading]   = useState(true);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.nombre_completo?.split(' ')[0] ?? 'Equipo';
  const isOpen    = hour >= 8 && hour < 18;

  const load = useCallback(async () => {
    const [m, r, p, u] = await Promise.allSettled([
      motosApi.list(), registrosApi.list(), productosApi.list(), usuariosApi.list(),
    ]);
    if (m.status === 'fulfilled') setMotos(m.value.data);
    if (r.status === 'fulfilled') setRegistros(r.value.data);
    if (p.status === 'fulfilled') setProductos(p.value.data);
    if (u.status === 'fulfilled') setUsuarios(u.value.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  usePolling(load, { intervalMs: 25_000 });

  const ingresosTotal = useMemo(() =>
    registros.filter(r => r.estado === 4).reduce((s, r) => s + (r.costo_total ?? 0), 0), [registros]);
  const stockCritico  = useMemo(() => productos.filter(p => p.stock <= 3).length, [productos]);
  const activas       = useMemo(() => registros.filter(r => r.estado < 3).length, [registros]);

  const areaData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    return days.map(day => {
      const dr = registros.filter(r => toIsoStr(r.fecha).startsWith(day));
      return { day: day.slice(5), ordenes: dr.length, ingresos: dr.reduce((s, r) => s + (r.costo_total ?? 0), 0) };
    });
  }, [registros]);

  const recientes = registros.slice(0, 6);

  /* ════════ Skeleton ════════ */
  if (loading) {
    return (
      <div className="m-dash">
        <div className="skeleton-d" style={{ height: 110, borderRadius: 22 }} />
        <div className="m-kpi-grid">{[1,2,3,4].map(i => <div key={i} className="skeleton-d" style={{ height: 104, borderRadius: 18 }} />)}</div>
        <div className="skeleton-d" style={{ height: 190, borderRadius: 20 }} />
      </div>
    );
  }

  /* ════════ Vista CLIENTE (cualquier usuario que NO sea admin ni mecánico) ════════ */
  if (!isAdmin && !isMecanico) {
    const myMotos  = motos.filter(m => m.id_usuario === user?.id_usuario);
    const myPlacas = new Set(myMotos.map(m => m.placa));
    const myRegs   = registros.filter(r => myPlacas.has(r.placa));
    const myPuntos = myRegs.length * 8;
    return (
      <div className="m-dash">
        <div className="m-hero">
          <p className="m-hero-greet">{greeting}</p>
          <h1 className="m-hero-name">{firstName}</h1>
          <div className="m-hero-stats">
            <div><p className="m-hs-num">{myMotos.length}</p><p className="m-hs-lbl">Motos</p></div>
            <span className="m-hs-sep" />
            <div><p className="m-hs-num">{myRegs.length}</p><p className="m-hs-lbl">Servicios</p></div>
            <span className="m-hs-sep" />
            <div><p className="m-hs-num" style={{ color: '#FBBF24' }}>{myPuntos}</p><p className="m-hs-lbl">Puntos</p></div>
          </div>
        </div>

        <div className="m-section-t">Accesos</div>
        <div className="m-mods">
          {[
            { label: 'Mi Moto',     desc: 'Estado y mantenimiento', to: '/mi-moto',     color: '#3B82F6', icon: Bike  },
            { label: 'Combustible', desc: 'Cargas y rendimiento',   to: '/combustible', color: '#8B5CF6', icon: Zap   },
            { label: 'Mis Puntos',  desc: 'Recompensas',            to: '/puntos',      color: '#F59E0B', icon: Star  },
            { label: 'Alertas',     desc: 'Avisos de servicio',     to: '/alertas',     color: '#E11428', icon: Bell  },
          ].map(({ label, desc, to, color, icon: Icon }) => (
            <Link key={to} to={to} className="m-mod">
              <div className="m-mod-ico" style={{ background: `${color}1c`, border: `1px solid ${color}33` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div className="m-mod-tx">
                <p className="m-mod-lbl">{label}</p>
                <p className="m-mod-desc">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-white/25" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* ════════ Vista ADMIN / MECÁNICO ════════ */
  return (
    <div className="m-dash">
      {/* Hero */}
      <div className="m-hero">
        <div className="flex items-center justify-between">
          <div>
            <p className="m-hero-greet">{greeting}, {firstName}</p>
            <h1 className="m-hero-name">Panel</h1>
          </div>
          <span className="m-chip" style={{
            background: isOpen ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            borderColor: isOpen ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
            color: isOpen ? '#10B981' : '#EF4444',
          }}>
            <span className="m-dot" style={{ background: isOpen ? '#10B981' : '#EF4444' }} />
            {isOpen ? 'Abierto' : 'Cerrado'}
          </span>
        </div>
        {isAdmin && (
          <div className="m-hero-income">
            <DollarSign size={15} style={{ color: '#10B981' }} />
            <div>
              <p className="m-hero-income-val">{fmtMoney(ingresosTotal)}</p>
              <p className="m-hero-income-lbl">Ingresos facturados</p>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="m-kpi-grid">
        <Kpi icon={Bike}    value={motos.length}  label="Motos"          color="#3B82F6" to="/motos" />
        <Kpi icon={Wrench}  value={activas}        label="Órdenes activas" color="#E11428" to="/registros" />
        <Kpi icon={Package} value={stockCritico}  label="Stock crítico"  color="#F59E0B" to="/inventario" />
        {isAdmin
          ? <Kpi icon={Users} value={usuarios.length} label="Usuarios" color="#8B5CF6" to="/perfiles" />
          : <Kpi icon={Activity} value={registros.length} label="Órdenes totales" color="#14B8A6" to="/registros" />}
      </div>

      {/* Alerta stock */}
      {stockCritico > 0 && (
        <Link to="/inventario" className="m-alert">
          <div className="m-alert-ico"><AlertTriangle size={16} style={{ color: '#F59E0B' }} /></div>
          <div className="flex-1">
            <p className="m-alert-t">{stockCritico} producto{stockCritico > 1 ? 's' : ''} con stock bajo</p>
            <p className="m-alert-s">Toca para reponer inventario</p>
          </div>
          <ChevronRight size={16} className="text-white/25" />
        </Link>
      )}

      {/* Gráfica actividad */}
      <div className="m-card">
        <div className="m-card-head">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: '#FF3B47' }} />
            <p className="m-card-t">Actividad · 7 días</p>
          </div>
          <Link to="/registros" className="m-card-link">Ver todo</Link>
        </div>
        <ActivityChart areaData={areaData} />
      </div>

      {/* Actividad reciente */}
      <div className="m-card">
        <div className="m-card-head">
          <p className="m-card-t">Actividad reciente</p>
          <Link to="/registros" className="m-card-link">Ver todas</Link>
        </div>
        <div style={{ marginTop: 4 }}>
          {recientes.length === 0 ? (
            <p className="text-center text-white/25 text-sm" style={{ padding: '24px 0' }}>Sin actividad</p>
          ) : recientes.map(r => (
            <div key={r.id_registro} className="m-act">
              <div className="m-act-ico"><Wrench size={14} style={{ color: '#FF3B47' }} /></div>
              <div className="flex-1 min-w-0">
                <p className="m-act-t">{r.nombre_cliente}</p>
                <p className="m-act-s">{r.placa} · {fmtDate(r.fecha)}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {isAdmin && <p className="m-act-money">{fmtMoney(r.costo_total)}</p>}
                <span className="m-act-badge" style={{
                  background: `${ESTADO_COLORS[r.estado] ?? '#6B7280'}1c`,
                  color: ESTADO_COLORS[r.estado] ?? '#6B7280',
                }}>{ESTADO_LABELS[r.estado] ?? '—'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
