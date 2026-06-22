/* ─────────────────────────────────────────────
   GORILA MOTOS — Gestión de Clientes
   Vista 360: servicios, motos, compras, puntos, combustible
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search, Users, Phone, MapPin, Mail,
  Lock, Unlock, ChevronRight, Wrench,
  Shield, ArrowLeft, CreditCard, TrendingUp,
  Calendar, Bike, Activity, CheckCircle,
  Clock, Package, Star,
  ChevronDown, ChevronUp, Fuel, Gift,
  Gauge, Zap, Send,
} from 'lucide-react';
import gsap from 'gsap';
import {
  usuariosApi, registrosApi, motosApi,
  combustibleApi, facturasApi, detallesFacturaApi, authApi, ofertaApi,
} from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { fmtDate, fmtMoney, ESTADO_REGISTRO, extractPhone, extractCedula, initials, toIsoStr } from '../../lib/utils';
import { imagenMoto } from '../../lib/fotos';
import type { Usuario, Moto, CargaCombustible, Factura, DetalleFactura } from '../../types';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useTheme } from '../../lib/theme';

/* ═══ PUNTOS (misma lógica que PuntosPage) ═══ */
const POINTS_TABLE = [
  { max: 125,   pts: 5  },
  { max: 200,   pts: 8  },
  { max: 400,   pts: 12 },
  { max: 650,   pts: 18 },
  { max: 99999, pts: 25 },
];
function ptsForCc(cc: number) { return POINTS_TABLE.find(r => cc <= r.max)?.pts ?? 5; }
const OIL_KW = ['cambio de aceite', 'aceite', 'oil'];
function isOilChange(tipo: string, desc: string) {
  return OIL_KW.some(k => tipo?.toLowerCase().includes(k) || desc?.toLowerCase().includes(k));
}
const LEVELS: { min: number; label: string; color: string; icon: string }[] = [
  { min: 0,   label: 'Rookie',   color: '#9CA3AF', icon: '🔩' },
  { min: 50,  label: 'Mecánico', color: '#10B981', icon: '🔧' },
  { min: 150, label: 'Experto',  color: '#3B82F6', icon: '⚙️' },
  { min: 300, label: 'Pro',      color: '#8B5CF6', icon: '🏆' },
  { min: 600, label: 'Élite',    color: '#F59E0B', icon: '👑' },
];
function getLevel(pts: number) { return [...LEVELS].reverse().find(l => pts >= l.min) ?? LEVELS[0]; }
function nextLevelOf(pts: number) {
  const idx = LEVELS.findIndex(l => l === getLevel(pts));
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

/* ═══ TIPOS ═══════════════════════════════════ */
interface Reg {
  id: number;
  nombre_cliente: string;
  placa: string;
  tipo_servicio: string;
  costo_total: number;
  estado: number;
  fecha: string;
  descripcion: string;
  kilometraje?: number | null;
}

type BV = 'warning'|'info'|'success'|'purple'|'teal'|'default';
const VARIANT_MAP: Record<number, BV> = { 0:'warning', 1:'info', 2:'success', 3:'purple', 4:'teal' };
type DetailTab = 'servicios' | 'motos' | 'compras' | 'puntos' | 'combustible';

/* ═══ HELPERS ═════════════════════════════════ */
function normalizeReg(r: Record<string,unknown>): Reg {
  return {
    id:             Number(r.id_registro  ?? r.idRegistro  ?? 0),
    nombre_cliente: String(r.nombre_cliente ?? r.nombreCliente ?? ''),
    placa:          String(r.placa ?? r.placaMoto ?? ''),
    tipo_servicio:  String(r.tipo_servicio ?? r.tipoMantenimiento ?? ''),
    costo_total:    Number(r.costo_total ?? r.costoTotal ?? 0),
    estado:         Number(r.estado ?? 0),
    fecha:          String(r.fecha ?? ''),
    descripcion:    String(r.descripcion ?? ''),
    kilometraje:    r.kilometraje != null ? Number(r.kilometraje) : null,
  };
}

function getRolName(roles: unknown[] | null | undefined): string {
  if (!roles || roles.length === 0) return '';
  const r = roles[0];
  const raw = typeof r === 'string'
    ? r
    : ((r as {nombre?:string;rol?:{nombre?:string}}).rol?.nombre
        ?? (r as {nombre?:string}).nombre ?? '');
  return raw.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* ═══ COMPONENTES PEQUEÑOS ════════════════════ */
function Avatar({ name, size='md' }: { name:string; size?:'sm'|'md'|'lg'|'xl' }) {
  const palette:[string,string][] = [
    ['#3B82F6','#1D4ED8'],['#8B5CF6','#6D28D9'],['#10B981','#047857'],
    ['#F59E0B','#B45309'],['#E11428','#9E0E1B'],['#06B6D4','#0E7490'],
  ];
  const [bg, bd] = palette[name.charCodeAt(0) % palette.length];
  const sz = { sm:'w-9 h-9 text-xs', md:'w-11 h-11 text-sm', lg:'w-14 h-14 text-base', xl:'w-16 h-16 text-lg' }[size];
  return (
    <div className={`${sz} rounded-2xl flex items-center justify-center font-black shrink-0 select-none`}
         style={{ background:`${bg}30`, border:`2px solid ${bd}60`, color:bg }}>
      {initials(name)}
    </div>
  );
}

function StatChip({ icon:Icon, label, value, color='#3B82F6' }:{
  icon:React.ElementType; label:string; value:string|number; color?:string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background:`${color}12`, border:`1px solid ${color}28` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
           style={{ background:`${color}20` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-black leading-none" style={{ color }}>{value}</p>
        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ═══ HISTORIAL PANEL — 360° ══════════════════ */
function HistoryPanel({ client, regs, motos, combustible, facturas, unlocked, onBack, onUnlock }: {
  client: Usuario;
  regs: Reg[];
  motos: Moto[];
  combustible: CargaCombustible[];
  facturas: Factura[];
  unlocked: boolean;
  onBack: ()=>void;
  onUnlock: (e:React.MouseEvent)=>void;
}) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const [tab, setTab]               = useState<DetailTab>('servicios');
  const [expandedFac, setExpandedFac] = useState<number | null>(null);
  const [facDetalles, setFacDetalles] = useState<Record<number, DetalleFactura[]>>({});
  const [loadingFac, setLoadingFac]   = useState<number | null>(null);

  const phone  = unlocked ? extractPhone(client.descripcion)  : null;
  const cedula = unlocked ? extractCedula(client.descripcion) : null;
  const total  = regs.reduce((s,r)=>s+r.costo_total, 0);
  const done   = regs.filter(r=>r.estado>=2).length;
  const pending= regs.filter(r=>r.estado<2).length;

  /* ── Puntos ── */
  const motoMap = useMemo(() => new Map(motos.map(m => [m.placa, m])), [motos]);
  const pointsHist = useMemo(() => regs.map(r => {
    const moto = motoMap.get(r.placa);
    const cc   = moto?.cilindraje ?? 125;
    const pts  = ptsForCc(cc);
    const bono = isOilChange(r.tipo_servicio, r.descripcion) ? 3 : 0;
    return { ...r, pts, bono, ptTotal: pts + bono };
  }), [regs, motoMap]);
  const totalPts = pointsHist.reduce((s,h)=>s+h.ptTotal, 0);
  const nivel    = getLevel(totalPts);
  const nextLvl  = nextLevelOf(totalPts);
  const lvlPct   = nextLvl ? Math.round(((totalPts - nivel.min) / (nextLvl.min - nivel.min)) * 100) : 100;

  /* ── Compras: toggle expand ── */
  const toggleFac = async (facId: number) => {
    if (expandedFac === facId) { setExpandedFac(null); return; }
    setExpandedFac(facId);
    if (!facDetalles[facId]) {
      setLoadingFac(facId);
      try {
        const res = await detallesFacturaApi.byFactura(facId);
        setFacDetalles(prev => ({ ...prev, [facId]: res.data as DetalleFactura[] }));
      } catch { /* silent */ }
      finally { setLoadingFac(null); }
    }
  };

  const TABS: { id: DetailTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id:'servicios',   label:'Servicios',   icon:Wrench,  count:regs.length },
    { id:'motos',       label:'Motos',       icon:Bike,    count:motos.length },
    { id:'compras',     label:'Compras',     icon:Package, count:facturas.length },
    { id:'puntos',      label:'Puntos',      icon:Star },
    { id:'combustible', label:'Combustible', icon:Fuel,    count:combustible.length },
  ];

  return (
    <div className="space-y-6">
      {/* Volver */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-[13px] text-white/35 hover:text-white/80 font-semibold transition-colors group">
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Volver a clientes
      </button>

      {/* Tarjeta de perfil */}
      <div className="gm-card-d rounded-2xl overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-gm-red via-gm-red/50 to-transparent" />
        <div className="p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar name={client.nombre_completo} size="xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-black text-white/95 leading-tight">{client.nombre_completo}</h2>
                  <p className="text-sm text-white/30 mt-0.5">@{client.nombre_usuario}</p>
                </div>
                <Badge variant="success">Cliente activo</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
                <span className="flex items-center gap-1.5 text-[12px] text-white/40">
                  <Mail size={11} className="text-white/20" />{client.correo}
                </span>
                {client.ciudad && (
                  <span className="flex items-center gap-1.5 text-[12px] text-white/40">
                    <MapPin size={11} className="text-white/20" />{client.ciudad}, {client.pais}
                  </span>
                )}
              </div>

              {/* Datos privados con fondo */}
              <div className="mt-3">
                {unlocked ? (
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-3 py-2.5 rounded-xl"
                       style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.18)' }}>
                    {cedula && (
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <CreditCard size={11} className="text-gm-red" />
                        <span className="text-white/40">C.I.</span>
                        <span className="font-mono font-black text-white/85 tracking-widest">{cedula}</span>
                      </span>
                    )}
                    {phone && (
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <Phone size={11} className="text-gm-red" />
                        <span className="font-mono font-black text-white/85 tracking-widest">{phone}</span>
                      </span>
                    )}
                    {!cedula && !phone && (
                      <span className="text-[11px] text-white/25 italic">Sin datos de contacto en descripción</span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400/70">
                      <Unlock size={10} /> Datos verificados
                    </span>
                  </div>
                ) : (
                  <button onClick={onUnlock}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.45)' }}
                    onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(225,20,40,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(225,20,40,0.25)'; (e.currentTarget as HTMLButtonElement).style.color='#E11428'; }}
                    onMouseOut={e  => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,0.10)'; (e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,0.45)'; }}>
                    <Shield size={12} />
                    Ver cédula y teléfono — requiere verificación
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-white/[0.05]">
            <StatChip icon={Wrench}      label="Servicios"  value={regs.length}     color="#E11428" />
            <StatChip icon={CheckCircle} label="Completos"  value={done}            color="#10B981" />
            <StatChip icon={Clock}       label="Pendientes" value={pending}         color="#F59E0B" />
            <StatChip icon={TrendingUp}  label="Gastado"    value={fmtMoney(total)} color="#8B5CF6" />
            <StatChip icon={Star}        label="Puntos"     value={totalPts}        color={nivel.color} />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth:'none' }}>
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-black whitespace-nowrap transition-all ${
              tab === t.id
                ? 'bg-gm-red text-white shadow-lg'
                : 'text-white/40 hover:text-white/70 border border-white/[0.07]'
            }`}
            style={tab !== t.id ? { background:'rgba(255,255,255,0.03)' } : {}}>
            <t.icon size={12} />
            {t.label}
            {t.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                tab === t.id ? 'bg-white/20 text-white' : 'bg-white/[0.08] text-white/35'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: SERVICIOS ── */}
      {tab === 'servicios' && (
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 font-black mb-3 flex items-center gap-2">
            <Activity size={10} className="text-gm-red" />
            Historial de servicios ({regs.length})
          </p>
          {regs.length === 0 ? (
            <div className="gm-card-d rounded-2xl py-16 text-center">
              <Wrench size={28} className="mx-auto text-white/10 mb-3" />
              <p className="text-white/25 text-sm">Sin registros de servicio aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {regs.map((r, i) => {
                const est = ESTADO_REGISTRO[r.estado] ?? ESTADO_REGISTRO[0];
                const v   = VARIANT_MAP[r.estado] ?? 'default';
                return (
                  <div key={r.id || i}
                       className="gm-card-d rounded-2xl p-4 flex items-center gap-4 hover:border-white/[0.10] transition-all">
                    <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-black"
                         style={{ background:'rgba(225,20,40,0.1)', color:'#E11428', border:'1px solid rgba(225,20,40,0.2)' }}>
                      {regs.length - i}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-bold text-white/85">{r.tipo_servicio || 'Servicio'}</p>
                        {r.placa && <span className="plate-tag py-0 text-[10px]">{r.placa}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[11px] text-white/30">
                        <span className="flex items-center gap-1"><Calendar size={9} />{fmtDate(r.fecha)}</span>
                        {r.kilometraje ? <span className="flex items-center gap-1"><Bike size={9} />{r.kilometraje.toLocaleString('es-EC')} km</span> : null}
                        {r.descripcion ? <span className="italic truncate max-w-[160px]">{r.descripcion}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={v} dot>{est.label}</Badge>
                      <p className="text-sm font-bold text-white/75 tabular-nums">{fmtMoney(r.costo_total)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: MOTOS ── */}
      {tab === 'motos' && (
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 font-black mb-3 flex items-center gap-2">
            <Bike size={10} className="text-gm-red" />
            Motocicletas registradas ({motos.length})
          </p>
          {motos.length === 0 ? (
            <div className="gm-card-d rounded-2xl py-16 text-center">
              <Bike size={28} className="mx-auto text-white/10 mb-3" />
              <p className="text-white/25 text-sm">Sin motos registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {motos.map(m => (
                <div key={m.id_moto} className="gm-card-d rounded-2xl overflow-hidden">
                  <div className="h-[2px] bg-gradient-to-r from-blue-500/50 to-transparent" />
                  <div className="p-4 flex gap-4">
                    {imagenMoto(m) ? (
                      <img src={imagenMoto(m)!} alt={m.placa}
                           className="w-20 h-16 rounded-xl object-cover shrink-0 border border-white/[0.08]" />
                    ) : (
                      <div className="w-20 h-16 rounded-xl shrink-0 flex items-center justify-center"
                           style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.15)' }}>
                        <Bike size={22} style={{ color:'#3B82F6' }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-[14px] font-black text-white/90">
                          {m.marca} {m.modelo}
                        </p>
                        <span className="plate-tag text-[10px] py-0">{m.placa}</span>
                      </div>
                      {m.nombre_moto && (
                        <p className="text-[11px] text-white/35 italic mb-1">"{m.nombre_moto}"</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/35">
                        <span className="flex items-center gap-1"><Calendar size={9} />{m.anio}</span>
                        <span className="flex items-center gap-1"><Gauge size={9} />{m.kilometraje.toLocaleString('es-EC')} km</span>
                        <span className="flex items-center gap-1"><Zap size={9} />{m.cilindraje} cc</span>
                        <span className="capitalize">{m.tipo_moto}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: COMPRAS ── */}
      {tab === 'compras' && (
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 font-black mb-3 flex items-center gap-2">
            <Package size={10} className="text-gm-red" />
            Compras en inventario ({facturas.length})
          </p>
          {facturas.length === 0 ? (
            <div className="gm-card-d rounded-2xl py-16 text-center">
              <Package size={28} className="mx-auto text-white/10 mb-3" />
              <p className="text-white/25 text-sm">Sin compras registradas</p>
              <p className="text-white/15 text-[11px] mt-1">Las ventas directas de inventario aparecen aquí</p>
            </div>
          ) : (
            <div className="space-y-2">
              {facturas
                .slice()
                .sort((a,b)=> toIsoStr(b.fecha_emision).localeCompare(toIsoStr(a.fecha_emision)))
                .map((f, i) => {
                  const isExpanded = expandedFac === f.id_factura;
                  const detalles   = facDetalles[f.id_factura];
                  const isLoading  = loadingFac === f.id_factura;
                  return (
                    <div key={f.id_factura} className="gm-card-d rounded-2xl overflow-hidden">
                      <button
                        onClick={() => toggleFac(f.id_factura)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left">
                        <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-black"
                             style={{ background:'rgba(139,92,246,0.12)', color:'#8B5CF6', border:'1px solid rgba(139,92,246,0.22)' }}>
                          {facturas.length - i}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-white/85">Nota de venta #{f.id_factura}</p>
                          <p className="text-[11px] text-white/30 flex items-center gap-1 mt-0.5">
                            <Calendar size={9} />{fmtDate(f.fecha_emision)}
                          </p>
                        </div>
                        <p className="text-sm font-black text-purple-400 tabular-nums shrink-0 mr-2">
                          {fmtMoney(f.costo_total)}
                        </p>
                        {isExpanded
                          ? <ChevronUp size={14} className="text-white/30 shrink-0" />
                          : <ChevronDown size={14} className="text-white/30 shrink-0" />
                        }
                      </button>

                      {isExpanded && (
                        <div className="border-t border-white/[0.05] px-4 pb-4 pt-3">
                          {isLoading ? (
                            <div className="space-y-2">
                              {[1,2].map(k => (
                                <div key={k} className="skeleton-d h-8 rounded-lg" />
                              ))}
                            </div>
                          ) : detalles && detalles.length > 0 ? (
                            <table className="w-full text-[12px]">
                              <thead>
                                <tr className="text-[10px] text-white/25 uppercase tracking-wider">
                                  <th className="text-left pb-2 font-black">Producto</th>
                                  <th className="text-center pb-2 font-black w-16">Cant.</th>
                                  <th className="text-right pb-2 font-black">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.04]">
                                {detalles.map(d => (
                                  <tr key={d.id_detalle}>
                                    <td className="py-1.5 text-white/70">
                                      {d.descripcion || `Producto #${d.id_producto}`}
                                    </td>
                                    <td className="py-1.5 text-center text-white/40">{d.cantidad}</td>
                                    <td className="py-1.5 text-right font-bold text-white/75 tabular-nums">
                                      {fmtMoney(d.subtotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-white/[0.08]">
                                  <td colSpan={2} className="pt-2 text-[11px] text-white/30 font-black uppercase tracking-wider">Total</td>
                                  <td className="pt-2 text-right font-black text-purple-400 tabular-nums">{fmtMoney(f.costo_total)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          ) : (
                            <p className="text-[11px] text-white/25 italic">Sin detalles disponibles</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: PUNTOS ── */}
      {tab === 'puntos' && (
        <div className="space-y-4">
          {/* Hero nivel */}
          <div className="gm-card-d rounded-2xl p-6 text-center relative overflow-hidden"
               style={{
                 background:`linear-gradient(135deg, #17171E 0%, ${nivel.color}10 60%, #111115 100%)`,
                 borderColor:`${nivel.color}28`,
               }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 rounded-full opacity-10"
                   style={{ background:`radial-gradient(circle, ${nivel.color}30 0%, transparent 70%)` }} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl"
                   style={{ background:`${nivel.color}18`, border:`2px solid ${nivel.color}35` }}>
                {nivel.icon}
              </div>
              <p className="text-[11px] tracking-[0.3em] uppercase font-black mb-1" style={{ color:`${nivel.color}80` }}>
                Nivel actual
              </p>
              <p className="font-black text-2xl mt-0.5" style={{ color:nivel.color }}>
                {nivel.icon} {nivel.label}
              </p>
              <p className="text-4xl font-black text-white mt-3">{totalPts}</p>
              <p className="text-[12px] text-white/30 mt-1">puntos acumulados · {fmtMoney(totalPts / 20)} en cashback</p>

              {nextLvl && (
                <div className="mt-4 max-w-xs mx-auto">
                  <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
                    <span>{totalPts} pts</span>
                    <span>{nextLvl.min} pts para {nextLvl.icon} {nextLvl.label}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                         style={{ width:`${lvlPct}%`, background:nivel.color, boxShadow:`0 0 8px ${nivel.color}50` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats de puntos */}
          <div className="grid grid-cols-3 gap-3">
            <div className="gm-card-d rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white/80">{totalPts}</p>
              <p className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">Ganados</p>
            </div>
            <div className="gm-card-d rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white/80">0</p>
              <p className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">Canjeados</p>
            </div>
            <div className="gm-card-d rounded-xl p-3 text-center">
              <p className="text-xl font-black" style={{ color:nivel.color }}>{totalPts}</p>
              <p className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">Disponibles</p>
            </div>
          </div>

          {/* Historial de puntos */}
          {pointsHist.length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 font-black mb-3 flex items-center gap-2">
                <Gift size={10} className="text-gm-red" />
                Historial de puntos
              </p>
              <div className="space-y-1.5">
                {pointsHist.map((h, i) => (
                  <div key={i} className="gm-card-d rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[12px]"
                         style={{ background:`${nivel.color}15`, border:`1px solid ${nivel.color}25` }}>
                      <Star size={13} style={{ color:nivel.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-white/80 truncate">{h.tipo_servicio || 'Servicio'}</p>
                      <p className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
                        <Calendar size={8} />{fmtDate(h.fecha)}
                        {h.placa && <><span>·</span><span className="plate-tag text-[9px] py-0">{h.placa}</span></>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-black" style={{ color:nivel.color }}>+{h.ptTotal}</p>
                      {h.bono > 0 && (
                        <p className="text-[9px] text-emerald-400/70">+{h.bono} bono aceite</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: COMBUSTIBLE ── */}
      {tab === 'combustible' && (
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/20 font-black mb-3 flex items-center gap-2">
            <Fuel size={10} className="text-gm-red" />
            Historial de combustible ({combustible.length})
          </p>
          {combustible.length === 0 ? (
            <div className="gm-card-d rounded-2xl py-16 text-center">
              <Fuel size={28} className="mx-auto text-white/10 mb-3" />
              <p className="text-white/25 text-sm">Sin registros de combustible</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="gm-card-d rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-amber-400">
                    {combustible.reduce((s,c)=>s+c.litros, 0).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">Litros</p>
                </div>
                <div className="gm-card-d rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-orange-400">
                    {fmtMoney(combustible.reduce((s,c)=>s+c.costo_total, 0))}
                  </p>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">Gastado</p>
                </div>
                <div className="gm-card-d rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-white/70">{combustible.length}</p>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">Cargas</p>
                </div>
              </div>

              {combustible
                .slice()
                .sort((a,b)=>toIsoStr(b.fecha).localeCompare(toIsoStr(a.fecha)))
                .map((c, i) => {
                  const recorrido = c.km_actual && c.km_anterior ? c.km_actual - c.km_anterior : null;
                  const rendimiento = recorrido && c.litros > 0 ? (recorrido / c.litros).toFixed(1) : null;
                  return (
                    <div key={c.id || i} className="gm-card-d rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                           style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)' }}>
                        <Fuel size={15} style={{ color:'#F59E0B' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-bold text-white/85">
                            {c.litros} L
                            {(c as unknown as Record<string, unknown>).tipo_combustible
                              ? ` · ${(c as unknown as Record<string, unknown>).tipo_combustible}`
                              : c.marca_aceite ? ` · ${c.marca_aceite}` : ''}
                          </p>
                          {c.placa && <span className="plate-tag text-[10px] py-0">{c.placa}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[11px] text-white/30">
                          <span className="flex items-center gap-1"><Calendar size={9} />{fmtDate(c.fecha)}</span>
                          {c.km_actual ? <span className="flex items-center gap-1"><Gauge size={9} />{c.km_actual.toLocaleString('es-EC')} km</span> : null}
                          {rendimiento && <span className="flex items-center gap-1"><Zap size={9} />{rendimiento} km/L</span>}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-amber-400 tabular-nums shrink-0">{fmtMoney(c.costo_total)}</p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══ TARJETA CLIENTE ═════════════════════════ */
function ClienteCard({ client, regs, unlocked, onSelect, onUnlock }: {
  client: Usuario; regs: Reg[]; unlocked: boolean;
  onSelect: ()=>void; onUnlock: (e:React.MouseEvent)=>void;
}) {
  const phone  = unlocked ? extractPhone(client.descripcion)  : null;
  const cedula = unlocked ? extractCedula(client.descripcion) : null;
  const total  = regs.reduce((s,r)=>s+r.costo_total, 0);
  const last   = regs[0] ?? null;

  return (
    <div
      onClick={onSelect}
      className="gm-card-d rounded-2xl overflow-hidden flex flex-col cursor-pointer group"
      style={{ transition:'border-color 200ms, box-shadow 200ms, transform 200ms' }}
    >
      <div className="h-[2px] bg-gradient-to-r from-gm-red/40 via-gm-red/20 to-transparent group-hover:from-gm-red/70 transition-all duration-300" />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar name={client.nombre_completo} />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black text-white/90 truncate">{client.nombre_completo}</p>
            <p className="text-[11px] text-white/30 mt-0.5">@{client.nombre_usuario}</p>
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <Badge variant="success">Cliente</Badge>
              {regs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-gm-red/10 border border-gm-red/20 text-gm-red">
                  {regs.length} visita{regs.length!==1?'s':''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info pública */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[12px] text-white/40">
            <Mail size={11} className="text-white/20 shrink-0" />
            <span className="truncate">{client.correo}</span>
          </div>
          {client.ciudad && (
            <div className="flex items-center gap-2 text-[12px] text-white/40">
              <MapPin size={11} className="text-white/20 shrink-0" />
              <span>{client.ciudad}</span>
            </div>
          )}
        </div>

        {/* Datos privados */}
        <div className="border-t border-white/[0.04] pt-3">
          {unlocked ? (
            <div className="space-y-1">
              {cedula && (
                <div className="flex items-center gap-2 text-[12px]">
                  <CreditCard size={11} className="text-gm-red shrink-0" />
                  <span className="text-white/35">C.I.</span>
                  <span className="font-mono font-black text-white/85 tracking-widest">{cedula}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2 text-[12px]">
                  <Phone size={11} className="text-gm-red shrink-0" />
                  <span className="font-mono font-black text-white/85 tracking-widest">{phone}</span>
                </div>
              )}
              {!cedula && !phone && (
                <p className="text-[11px] text-white/20 italic">Sin datos privados registrados</p>
              )}
            </div>
          ) : (
            <button
              onClick={onUnlock}
              className="flex items-center gap-1.5 text-[11px] font-semibold py-0.5 transition-colors"
              style={{ color:'rgba(255,255,255,0.30)' }}
              onMouseOver={e=>(e.currentTarget as HTMLButtonElement).style.color='#E11428'}
              onMouseOut={e=>(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,0.30)'}>
              <Lock size={10} />
              Ver cédula y teléfono
            </button>
          )}
        </div>

        {/* Stats */}
        {regs.length > 0 && (
          <div className="grid grid-cols-2 gap-2 border-t border-white/[0.04] pt-3">
            <div className="text-center rounded-xl py-2 bg-white/[0.025] border border-white/[0.04]">
              <p className="text-[15px] font-black text-white/75">{regs.length}</p>
              <p className="text-[10px] text-white/25 uppercase tracking-wider">Visitas</p>
            </div>
            <div className="text-center rounded-xl py-2 bg-gm-red/[0.06] border border-gm-red/[0.12]">
              <p className="text-[15px] font-black text-gm-red">{fmtMoney(total)}</p>
              <p className="text-[10px] text-white/25 uppercase tracking-wider">Gastado</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1">
          {last
            ? <p className="text-[11px] text-white/22 flex items-center gap-1"><Clock size={9} />Última: {fmtDate(last.fecha)}</p>
            : <p className="text-[11px] text-white/20 italic">Sin visitas aún</p>
          }
          <span className="flex items-center gap-1 text-[11px] text-gm-red/40 group-hover:text-gm-red font-bold transition-colors">
            Ver detalle <ChevronRight size={11} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══ SKELETON ════════════════════════════════ */
function SkeletonCard() {
  return (
    <div className="gm-card-d rounded-2xl p-5 space-y-4">
      <div className="flex gap-3">
        <div className="skeleton-d w-11 h-11 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton-d h-3.5 w-36" />
          <div className="skeleton-d h-3 w-24" />
          <div className="skeleton-d h-5 w-16 rounded-full mt-1" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="skeleton-d h-3 w-44" />
        <div className="skeleton-d h-3 w-28" />
      </div>
      <div className="skeleton-d h-px w-full" />
      <div className="skeleton-d h-3 w-32" />
      <div className="grid grid-cols-2 gap-2">
        <div className="skeleton-d h-12 rounded-xl" />
        <div className="skeleton-d h-12 rounded-xl" />
      </div>
    </div>
  );
}

/* ═══ PÁGINA PRINCIPAL ════════════════════════ */
export default function ClientesPage() {
  const toast = useToast();
  const { user: me } = useAuth();

  const [clientes,    setClientes]    = useState<Usuario[]>([]);
  const [regs,        setRegs]        = useState<Reg[]>([]);
  const [motos,       setMotos]       = useState<Moto[]>([]);
  const [combustible, setCombustible] = useState<CargaCombustible[]>([]);
  const [facturas,    setFacturas]    = useState<Factura[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [selected,    setSelected]         = useState<Usuario | null>(null);
  const [pendingSelect, setPendingSelect]  = useState<Usuario | null>(null);

  /* Re-auth */
  const [reAuthOpen,    setReAuthOpen]    = useState(false);
  const [reAuthTarget,  setReAuthTarget]  = useState<Usuario | null>(null);
  const [reAuthPwd,     setReAuthPwd]     = useState('');
  const [reAuthLoading, setReAuthLoading] = useState(false);
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set());

  /* Ofertas / email masivo */
  const [ofertaOpen,    setOfertaOpen]    = useState(false);
  const [ofertaAsunto,  setOfertaAsunto]  = useState('');
  const [ofertaMensaje, setOfertaMensaje] = useState('');
  const [ofertaRoles,   setOfertaRoles]   = useState<number[]>([2]);
  const [ofertaLoading, setOfertaLoading] = useState(false);

  const enviarOferta = async () => {
    if (!ofertaAsunto.trim() || !ofertaMensaje.trim()) { toast.error('Completa asunto y mensaje'); return; }
    setOfertaLoading(true);
    try {
      const r = await ofertaApi.enviar(ofertaAsunto.trim(), ofertaMensaje.trim(), ofertaRoles);
      const d = r.data as { enviados: number; total: number };
      toast.success(`${d.enviados} de ${d.total} correos enviados correctamente`);
      setOfertaOpen(false);
      setOfertaAsunto('');
      setOfertaMensaje('');
      setOfertaRoles([2]);
    } catch {
      toast.error('Error al enviar la campaña');
    } finally { setOfertaLoading(false); }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes, mRes, cRes, fRes] = await Promise.allSettled([
        usuariosApi.list(),
        registrosApi.list(),
        motosApi.list(),
        combustibleApi.list(),
        facturasApi.list(),
      ]);
      if (uRes.status === 'fulfilled') {
        const all = uRes.value.data as Usuario[];
        setClientes(all.filter(u => getRolName(u.roles as unknown[]) === 'CLIENTE'));
      }
      if (rRes.status === 'fulfilled') {
        setRegs((rRes.value.data as Record<string,unknown>[]).map(normalizeReg));
      }
      if (mRes.status === 'fulfilled') setMotos(mRes.value.data as Moto[]);
      if (cRes.status === 'fulfilled') setCombustible(cRes.value.data as CargaCombustible[]);
      if (fRes.status === 'fulfilled') setFacturas(fRes.value.data as Factura[]);
    } catch { toast.error('Error cargando datos'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* GSAP entrada */
  useEffect(() => {
    if (loading || selected) return;
    gsap.fromTo('.cl-card',
      { y:20, opacity:0, scale:0.97 },
      { y:0, opacity:1, scale:1, stagger:0.06, duration:0.45, ease:'power3.out', clearProps:'transform' }
    );
  }, [loading, selected]);

  /* Helpers: datos del cliente */
  const regsOf = useCallback((nombre: string) =>
    regs.filter(r => r.nombre_cliente === nombre), [regs]);

  const motosOf = useCallback((uid: number) =>
    motos.filter(m => m.id_usuario === uid), [motos]);

  const combustibleOf = useCallback((uid: number) => {
    const placas = new Set(motos.filter(m => m.id_usuario === uid).map(m => m.placa));
    return combustible.filter(c => placas.has(c.placa));
  }, [motos, combustible]);

  const facturasOf = useCallback((uid: number) =>
    facturas.filter(f => f.id_usuario === uid), [facturas]);

  /* Búsqueda */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(c => {
      const cedula = extractCedula(c.descripcion) ?? '';
      const phone  = extractPhone(c.descripcion) ?? '';
      const placas = motos.filter(m => m.id_usuario === c.id_usuario).map(m => m.placa.toLowerCase());
      return (
        c.nombre_completo.toLowerCase().includes(q) ||
        c.correo.toLowerCase().includes(q) ||
        c.nombre_usuario.toLowerCase().includes(q) ||
        cedula.includes(q) ||
        phone.includes(q) ||
        (c.ciudad ?? '').toLowerCase().includes(q) ||
        placas.some(p => p.includes(q))
      );
    });
  }, [clientes, search, motos]);

  /* KPIs */
  const clienteNombres = useMemo(() => new Set(clientes.map(c=>c.nombre_completo)), [clientes]);
  const totalVisitas = regs.filter(r=>clienteNombres.has(r.nombre_cliente)).length;
  const now = new Date();
  const visitasMes = regs.filter(r => {
    const d = new Date(toIsoStr(r.fecha) + 'T00:00:00');
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear() && clienteNombres.has(r.nombre_cliente);
  }).length;

  /* Seleccionar cliente */
  const handleSelectClient = (client: Usuario) => {
    if (unlocked.has(client.id_usuario)) {
      setSelected(client);
    } else {
      setPendingSelect(client);
      setReAuthTarget(client);
      setReAuthPwd('');
      setReAuthOpen(true);
    }
  };

  const openReAuth = (client: Usuario, e: React.MouseEvent) => {
    e.stopPropagation();
    if (unlocked.has(client.id_usuario)) return;
    setReAuthTarget(client);
    setReAuthPwd('');
    setReAuthOpen(true);
  };

  const verifyPassword = async () => {
    if (!reAuthTarget || !me) return;
    setReAuthLoading(true);
    try {
      await authApi.login(me.correo, reAuthPwd);
      const newUnlocked = new Set([...unlocked, reAuthTarget.id_usuario]);
      setUnlocked(newUnlocked);
      toast.success('Identidad verificada');
      setReAuthOpen(false);
      setReAuthPwd('');
      if (pendingSelect) {
        setSelected(pendingSelect);
        setPendingSelect(null);
      }
    } catch {
      toast.error('Contraseña incorrecta');
    } finally { setReAuthLoading(false); }
  };

  /* ── RENDER ── */
  return (
    <div className="space-y-7 pb-10">

      {selected ? (
        <HistoryPanel
          client={selected}
          regs={regsOf(selected.nombre_completo)}
          motos={motosOf(selected.id_usuario)}
          combustible={combustibleOf(selected.id_usuario)}
          facturas={facturasOf(selected.id_usuario)}
          unlocked={unlocked.has(selected.id_usuario)}
          onBack={() => setSelected(null)}
          onUnlock={(e) => openReAuth(selected, e)}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
            <div>
              <p className="text-[10px] tracking-[0.35em] uppercase text-white/20 font-black mb-2 flex items-center gap-2">
                <Users size={10} className="text-gm-red" /> Taller · Gestión de clientes
              </p>
              <h1 className="text-[1.9rem] font-black text-white leading-tight">Clientes</h1>
              <p className="text-white/30 text-sm mt-1">
                {clientes.length} clientes · {totalVisitas} visitas en total
              </p>
            </div>
            <button
              onClick={() => setOfertaOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background:'rgba(225,20,40,0.1)', color:'#E11428', border:'1px solid rgba(225,20,40,0.25)' }}
            >
              <Send size={14} /> Enviar oferta a clientes
            </button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Total clientes',    value:clientes.length, icon:Users,      color:'#3B82F6' },
              { label:'Visitas totales',   value:totalVisitas,    icon:Wrench,     color:'#E11428' },
              { label:'Activos este mes',  value:visitasMes,      icon:TrendingUp, color:'#10B981' },
            ].map(({ label, value, icon:Icon, color }) => (
              <div key={label} className="gm-card-d rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                       style={{ background:`${color}18`, border:`1px solid ${color}28` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-[10px] text-white/30 font-black tracking-[0.15em] uppercase">{label}</span>
                </div>
                <p className="text-3xl font-black" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="search-d flex-1 min-w-[220px] max-w-md">
              <Search size={14} />
              <input
                className="gm-input-d w-full"
                placeholder="Nombre, cédula, teléfono, correo, ciudad o placa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {search && (
              <button onClick={() => setSearch('')}
                className="text-[11px] text-white/30 hover:text-white/60 transition-colors font-semibold">
                Limpiar
              </button>
            )}
            <span className="text-[11px] text-white/20">{filtered.length} resultado(s)</span>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_,i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                <Users size={26} className="text-white/15" />
              </div>
              <div>
                <p className="text-sm font-bold text-white/35">
                  {search ? 'Sin resultados para esa búsqueda' : 'No hay clientes registrados'}
                </p>
                <p className="text-[11px] text-white/20 mt-1">
                  {search ? 'Prueba con nombre, cédula, teléfono o placa' : 'Registra clientes desde la sección Perfiles'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(client => (
                <div key={client.id_usuario} className="cl-card">
                  <ClienteCard
                    client={client}
                    regs={regsOf(client.nombre_completo)}
                    unlocked={unlocked.has(client.id_usuario)}
                    onSelect={() => handleSelectClient(client)}
                    onUnlock={(e) => openReAuth(client, e)}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal re-autenticación */}
      <Modal
        open={reAuthOpen}
        onClose={() => { setReAuthOpen(false); setReAuthPwd(''); }}
        title="Verificación de identidad"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setReAuthOpen(false); setReAuthPwd(''); }}>
              Cancelar
            </Button>
            <Button onClick={verifyPassword} loading={reAuthLoading} disabled={!reAuthPwd.trim()}>
              <Shield size={14} /> Confirmar identidad
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gm-red/[0.07] border border-gm-red/20">
            <Shield size={20} className="text-gm-red shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-black text-gm-red mb-1">
                Datos protegidos
              </p>
              <p className="text-[12px] text-white/45 leading-relaxed">
                Para ver el perfil completo de{' '}
                <strong className="text-white/82">{reAuthTarget?.nombre_completo}</strong>{' '}
                confirma tu contraseña de administrador. La sesión no se cierra.
              </p>
            </div>
          </div>

          <Input
            label="Tu contraseña"
            type="password"
            placeholder="••••••••"
            value={reAuthPwd}
            onChange={e => setReAuthPwd(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && reAuthPwd.trim() && !reAuthLoading) verifyPassword(); }}
            autoFocus
          />

          <p className="text-[11px] text-white/20 flex items-center gap-1.5">
            <Lock size={9} />
            El desbloqueo dura toda la sesión — no tendrás que volver a verificar
          </p>
        </div>
      </Modal>

      {/* ── Modal: Enviar oferta por email ── */}
      <Modal
        open={ofertaOpen}
        onClose={() => { setOfertaOpen(false); setOfertaAsunto(''); setOfertaMensaje(''); setOfertaRoles([2]); }}
        title="Enviar oferta a clientes"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOfertaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarOferta} loading={ofertaLoading} disabled={!ofertaAsunto.trim() || !ofertaMensaje.trim()}>
              <Send size={14} /> Enviar campaña
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Preview estadístico */}
          <div className="flex items-center gap-3 p-4 rounded-xl"
               style={{ background:'rgba(225,20,40,0.06)', border:'1px solid rgba(225,20,40,0.15)' }}>
            <Mail size={18} className="text-gm-red shrink-0" />
            <div>
              <p className="text-[12px] font-black text-white/80">
                Se enviará a {clientes.filter(c =>
                  !c.correo?.endsWith('@gmotors.local') && ofertaRoles.includes(2)
                ).length} clientes con correo real
              </p>
              <p className="text-[11px] text-white/35 mt-0.5">
                Los correos @gmotors.local (seed) se omiten automáticamente
              </p>
            </div>
          </div>

          {/* Destinatarios */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.15em] text-white/35 mb-2">Destinatarios</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: 2, label: 'Clientes',   color: '#3B82F6' },
                { id: 3, label: 'Mecánicos',  color: '#10B981' },
              ].map(({ id, label, color }) => {
                const active = ofertaRoles.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => setOfertaRoles(prev =>
                      active ? prev.filter(r => r !== id) : [...prev, id]
                    )}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                    style={{
                      background: active ? `${color}18` : 'rgba(255,255,255,0.04)',
                      color:      active ? color          : 'rgba(255,255,255,0.35)',
                      border:     `1px solid ${active ? `${color}35` : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Asunto del correo"
            placeholder="Ej: ¡20% de descuento en cambio de aceite este mes!"
            value={ofertaAsunto}
            onChange={e => setOfertaAsunto(e.target.value)}
          />

          <div>
            <label className="block text-[11px] font-black uppercase tracking-[0.15em] text-white/35 mb-2">
              Mensaje (HTML permitido)
            </label>
            <textarea
              rows={6}
              placeholder="Escribe el cuerpo del correo. Puedes usar HTML para dar formato: <b>negrita</b>, <br> para saltos de línea, etc."
              value={ofertaMensaje}
              onChange={e => setOfertaMensaje(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-1"
              style={{
                background:'rgba(255,255,255,0.04)',
                border:'1px solid rgba(255,255,255,0.1)',
                color:'rgba(255,255,255,0.8)',
                lineHeight:'1.6',
              }}
            />
          </div>

          <p className="text-[10px] text-white/20 leading-relaxed">
            El email se envía con la plantilla oficial de Gorila Motos. Incluye el asunto como título
            y un botón "Ver portal" al final. El sistema retoma intentos fallidos — si Render está dormido
            puede tardar hasta 60 s.
          </p>
        </div>
      </Modal>
    </div>
  );
}
