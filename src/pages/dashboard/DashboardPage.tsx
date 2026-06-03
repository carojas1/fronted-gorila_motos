/* ─────────────────────────────────────────────
   GORILA MOTOS — Dashboard
   Layout profesional: módulos densos, sin 3D,
   carga instantánea, estilo industrial
   ───────────────────────────────────────────── */

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Package, Bike, Users, ArrowRight, ChevronRight,
  Clock, Zap, Activity, Shield, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motosApi, registrosApi, productosApi, usuariosApi } from '../../lib/api';
import { fmtDate, ESTADO_REGISTRO } from '../../lib/utils';
import { useCountUp } from '../../hooks/useGsap';
import Badge from '../../components/ui/Badge';
import type { RegistroDetalle } from '../../types';

/* ─── Stat card compacto ─── */
function StatCard({
  icon: Icon, label, target, sublabel, linkTo, color, index,
}: {
  icon: React.ElementType; label: string; target: number;
  sublabel: string; linkTo: string; color: string; index: number;
}) {
  const countRef = useCountUp(target, 1.4);

  return (
    <Link
      to={linkTo}
      className="gm-card-d rounded-2xl p-5 group hover:border-white/[0.12] transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <ChevronRight
          size={13}
          className="text-white/15 group-hover:text-gm-red transition-all group-hover:translate-x-0.5 mt-1"
        />
      </div>
      <p className="text-[2rem] font-black text-white leading-none mb-1 tabular-nums">
        <span ref={countRef}>0</span>
      </p>
      <p className="text-[13px] font-bold text-white/75 mb-0.5">{label}</p>
      <p className="text-[11px] text-white/30 tracking-wide uppercase">{sublabel}</p>
      <div className="mt-3 h-px" style={{ background: `linear-gradient(90deg, ${color}40, ${color}10, transparent)` }} />
    </Link>
  );
}

/* ─── Fila de registro reciente ─── */
function RecordRow({ r, idx }: { r: RegistroDetalle; idx: number }) {
  const est = ESTADO_REGISTRO[r.estado] ?? ESTADO_REGISTRO[0];
  const variantMap: Record<number, 'warning' | 'info' | 'success'> = {
    0: 'warning', 1: 'info', 2: 'success',
  };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0 group">
      <div className="w-9 h-9 rounded-xl bg-gm-red/10 border border-gm-red/15 flex items-center justify-center shrink-0">
        <Wrench size={14} className="text-gm-red" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/85 truncate">{r.nombre_cliente}</p>
        <p className="text-[11px] text-white/35 font-mono tracking-wider">
          {r.placa} <span className="text-white/20">·</span> {fmtDate(r.fecha)}
        </p>
      </div>
      <Badge variant={variantMap[r.estado] ?? 'default'} dot>
        {est.label}
      </Badge>
    </div>
  );
}

/* ─── Skeleton row ─── */
function SkeletonRecordRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className="skeleton-d w-9 h-9 rounded-xl shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton-d h-3.5 w-36" />
        <div className="skeleton-d h-3 w-24" />
      </div>
      <div className="skeleton-d h-5 w-20 rounded-full" />
    </div>
  );
}

export default function DashboardPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const { user, isAdmin, isMecanico } = useAuth();

  const [counts, setCounts]     = useState({ motos: 0, registros: 0, productos: 0, usuarios: 0 });
  const [recientes, setRecientes] = useState<RegistroDetalle[]>([]);
  const [loadingRows, setLoading] = useState(true);

  const now     = new Date();
  const hour    = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.nombre_completo?.split(' ')[0] ?? 'Admin';

  /* Carga de datos */
  useEffect(() => {
    Promise.allSettled([
      motosApi.list(), registrosApi.list(), productosApi.list(), usuariosApi.list(),
    ]).then(([m, r, p, u]) => {
      setCounts({
        motos:    m.status === 'fulfilled' ? (m.value.data as unknown[])?.length ?? 0 : 0,
        registros:r.status === 'fulfilled' ? (r.value.data as unknown[])?.length ?? 0 : 0,
        productos:p.status === 'fulfilled' ? (p.value.data as unknown[])?.length ?? 0 : 0,
        usuarios: u.status === 'fulfilled' ? (u.value.data as unknown[])?.length ?? 0 : 0,
      });
      if (r.status === 'fulfilled') {
        setRecientes((r.value.data as RegistroDetalle[]).slice(0, 7));
      }
      setLoading(false);
    });
  }, []);

  /* Stat cards según rol */
  const ALL_STATS = [
    { icon: Bike,    label: 'Motos',     target: counts.motos,     sublabel: 'vehículos',       linkTo: '/motos',      color: '#3B82F6' },
    { icon: Wrench,  label: 'Registros', target: counts.registros, sublabel: 'órdenes totales', linkTo: '/registros',  color: '#E11428' },
    { icon: Package, label: 'Productos', target: counts.productos, sublabel: 'en inventario',   linkTo: '/inventario', color: '#10B981' },
    { icon: Users,   label: 'Usuarios',  target: counts.usuarios,  sublabel: 'cuentas activas', linkTo: '/perfiles',   color: '#8B5CF6' },
  ];
  const visibleStats = isAdmin ? ALL_STATS : ALL_STATS.slice(0, 3);

  /* Contadores de estado */
  const pendientes  = recientes.filter((r) => r.estado === 0).length;
  const enProceso   = recientes.filter((r) => r.estado === 1).length;
  const completados = recientes.filter((r) => r.estado === 2).length;
  const entregados  = recientes.filter((r) => r.estado === 3).length;
  const facturados  = recientes.filter((r) => r.estado === 4).length;
  const totalLocal  = pendientes + enProceso + completados + entregados + facturados || 1;

  const QUICK_LINKS = [
    { label: 'Nueva orden',  icon: Wrench,  to: '/registros', desc: 'Crear servicio'   },
    { label: 'Agregar moto', icon: Bike,    to: '/motos',     desc: 'Nuevo vehículo'   },
    { label: 'Inventario',   icon: Package, to: '/inventario',desc: 'Ver productos'    },
    ...(isAdmin ? [{ label: 'Empleados', icon: Users, to: '/perfiles', desc: 'Gestionar equipo' }] : []),
  ];

  return (
    <div ref={pageRef} className="space-y-6 pb-8">


      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {visibleStats.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} />
        ))}
      </div>

      {/* ─── Sección principal 2 columnas ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* Actividad reciente — col 3/5 */}
        <div className="xl:col-span-3 gm-card-d rounded-2xl overflow-hidden">
          {/* Head */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gm-red/10 border border-gm-red/15 flex items-center justify-center">
                <Activity size={14} className="text-gm-red" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white/90">Actividad reciente</h2>
                <p className="text-[11px] text-white/30 mt-0.5">Últimas órdenes de servicio</p>
              </div>
            </div>
            <Link
              to="/registros"
              className="flex items-center gap-1 text-[11px] text-gm-red hover:text-gm-red-lt transition-colors font-bold tracking-wide"
            >
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>

          {/* Rows */}
          <div className="px-5 py-1">
            {loadingRows
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRecordRow key={i} />)
              : recientes.length === 0
                ? (
                  <div className="py-14 text-center">
                    <Clock size={30} className="mx-auto text-white/15 mb-3" />
                    <p className="text-sm text-white/25">Sin actividad reciente</p>
                  </div>
                )
                : recientes.map((r, i) => <RecordRow key={r.id_registro} r={r} idx={i} />)
            }
          </div>
        </div>

        {/* Columna derecha — col 2/5 */}
        <div className="xl:col-span-2 flex flex-col gap-5">

          {/* Status de órdenes */}
          <div className="gm-card-d rounded-2xl p-5 flex-1">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={13} className="text-gm-red/60" />
              <p className="text-[10px] tracking-[0.32em] uppercase text-white/35 font-bold">
                Estado de órdenes
              </p>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Pendientes',  count: pendientes,  color: '#F59E0B', pct: Math.round((pendientes  / totalLocal) * 100) },
                { label: 'En proceso',  count: enProceso,   color: '#3B82F6', pct: Math.round((enProceso   / totalLocal) * 100) },
                { label: 'Completadas', count: completados, color: '#10B981', pct: Math.round((completados / totalLocal) * 100) },
                { label: 'Entregadas',  count: entregados,  color: '#A855F7', pct: Math.round((entregados  / totalLocal) * 100) },
                { label: 'Facturadas',  count: facturados,  color: '#14B8A6', pct: Math.round((facturados  / totalLocal) * 100) },
              ].map(({ label, count, color, pct }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] text-white/55 font-medium">{label}</span>
                    <span className="text-[13px] font-black" style={{ color }}>{count}</span>
                  </div>
                  <div className="prog-bar">
                    <div
                      className="prog-bar-fill"
                      style={{ width: `${pct}%`, background: color, boxShadow: `0 0 12px ${color}50` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="gm-card-d rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={13} className="text-gm-red/60" />
              <p className="text-[10px] tracking-[0.32em] uppercase text-white/35 font-bold">
                Acciones rápidas
              </p>
            </div>
            <div className="space-y-1.5">
              {QUICK_LINKS.map(({ label, icon: Icon, to, desc }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gm-red/10 border border-gm-red/15 flex items-center justify-center shrink-0 group-hover:bg-gm-red group-hover:border-gm-red transition-all duration-200">
                    <Icon size={14} className="text-gm-red group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white/75 group-hover:text-white/95 transition-colors">{label}</p>
                    <p className="text-[11px] text-white/28">{desc}</p>
                  </div>
                  <ArrowRight size={12} className="text-white/20 group-hover:text-gm-red group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
