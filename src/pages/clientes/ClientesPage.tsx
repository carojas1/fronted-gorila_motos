/* ─────────────────────────────────────────────
   GORILA MOTOS — Gestión de Clientes
   Historial · Datos privados con re-autenticación
   Diseño profesional oscuro
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search, Users, Phone, MapPin, Mail,
  Lock, Unlock, ChevronRight, Wrench,
  Shield, ArrowLeft, CreditCard, TrendingUp,
  Calendar, Bike, Activity, CheckCircle,
  Clock, Package, FileText, Star, Eye,
} from 'lucide-react';
import gsap from 'gsap';
import { usuariosApi, registrosApi, authApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { fmtDate, fmtMoney, ESTADO_REGISTRO, extractPhone, extractCedula, initials, toIsoStr } from '../../lib/utils';
import type { Usuario } from '../../types';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

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
         style={{ background:`${bg}1E`, border:`2px solid ${bd}45`, color:bg }}>
      {initials(name)}
    </div>
  );
}

function StatChip({ icon:Icon, label, value, color='#3B82F6' }:{
  icon:React.ElementType; label:string; value:string|number; color?:string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background:`${color}0D`, border:`1px solid ${color}22` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
           style={{ background:`${color}18` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-black leading-none" style={{ color }}>{value}</p>
        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ═══ HISTORIAL PANEL ═════════════════════════ */
function HistoryPanel({ client, regs, unlocked, onBack, onUnlock }: {
  client: Usuario; regs: Reg[]; unlocked: boolean;
  onBack: ()=>void; onUnlock: (e:React.MouseEvent)=>void;
}) {
  const phone  = unlocked ? extractPhone(client.descripcion)  : null;
  const cedula = unlocked ? extractCedula(client.descripcion) : null;
  const total  = regs.reduce((s,r)=>s+r.costo_total, 0);
  const done   = regs.filter(r=>r.estado>=2).length;
  const pending= regs.filter(r=>r.estado<2).length;
  const lastKm = regs.find(r=>r.kilometraje)?.kilometraje ?? null;

  return (
    <div className="space-y-6">
      {/* Botón volver */}
      <button onClick={onBack}
        className="flex items-center gap-2 text-[13px] text-white/35 hover:text-white/80 font-semibold transition-colors group">
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Volver a clientes
      </button>

      {/* Tarjeta de perfil */}
      <div className="gm-card-d rounded-2xl overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-gm-red via-gm-red/50 to-transparent" />
        <div className="p-6">

          {/* Header */}
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

              {/* Datos públicos */}
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

              {/* Datos privados */}
              <div className="mt-3">
                {unlocked ? (
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5">
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
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[12px] text-white/35 hover:text-gm-red hover:border-gm-red/25 hover:bg-gm-red/[0.05] transition-all font-semibold">
                    <Lock size={11} />
                    Ver cédula y teléfono — requiere verificación
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/[0.05]">
            <StatChip icon={Wrench}      label="Visitas"    value={regs.length} color="#E11428" />
            <StatChip icon={CheckCircle} label="Completos"  value={done}        color="#10B981" />
            <StatChip icon={Clock}       label="Pendientes" value={pending}     color="#F59E0B" />
            <StatChip icon={TrendingUp}  label="Gastado"    value={fmtMoney(total)} color="#8B5CF6" />
          </div>
        </div>
      </div>

      {/* Timeline */}
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
      {/* Accent */}
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
              className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-gm-red transition-colors font-semibold py-0.5"
            >
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
            Ver historial <ChevronRight size={11} />
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

  const [clientes,  setClientes]  = useState<Usuario[]>([]);
  const [regs,      setRegs]      = useState<Reg[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]       = useState<Usuario | null>(null);
  const [pendingSelect, setPendingSelect] = useState<Usuario | null>(null);

  /* Re-auth */
  const [reAuthOpen,    setReAuthOpen]    = useState(false);
  const [reAuthTarget,  setReAuthTarget]  = useState<Usuario | null>(null);
  const [reAuthPwd,     setReAuthPwd]     = useState('');
  const [reAuthLoading, setReAuthLoading] = useState(false);
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.allSettled([
        usuariosApi.list(),
        registrosApi.list(),
      ]);
      if (uRes.status === 'fulfilled') {
        const all = uRes.value.data as Usuario[];
        setClientes(all.filter(u => getRolName(u.roles as unknown[]) === 'CLIENTE'));
      }
      if (rRes.status === 'fulfilled') {
        setRegs((rRes.value.data as Record<string,unknown>[]).map(normalizeReg));
      }
    } catch { toast.error('Error cargando datos'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* GSAP entrada de cards */
  useEffect(() => {
    if (loading || selected) return;
    gsap.fromTo('.cl-card',
      { y:20, opacity:0, scale:0.97 },
      { y:0, opacity:1, scale:1, stagger:0.06, duration:0.45, ease:'power3.out', clearProps:'transform' }
    );
  }, [loading, selected]);

  /* Registros de un cliente por nombre */
  const regsOf = useCallback((nombre: string) =>
    regs.filter(r => r.nombre_cliente === nombre), [regs]);

  /* Búsqueda */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(c => {
      const cedula = extractCedula(c.descripcion) ?? '';
      const phone  = extractPhone(c.descripcion) ?? '';
      return (
        c.nombre_completo.toLowerCase().includes(q) ||
        c.correo.toLowerCase().includes(q) ||
        c.nombre_usuario.toLowerCase().includes(q) ||
        cedula.includes(q) ||
        phone.includes(q) ||
        (c.ciudad ?? '').toLowerCase().includes(q)
      );
    });
  }, [clientes, search]);

  /* KPIs */
  const clienteNombres = useMemo(() => new Set(clientes.map(c=>c.nombre_completo)), [clientes]);
  const totalVisitas = regs.filter(r=>clienteNombres.has(r.nombre_cliente)).length;
  const now = new Date();
  const visitasMes = regs.filter(r => {
    const d = new Date(toIsoStr(r.fecha) + 'T00:00:00');
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear() && clienteNombres.has(r.nombre_cliente);
  }).length;

  /* Seleccionar cliente: pide contraseña si no está desbloqueado */
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

  /* Re-auth */
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
      // Si venía de un clic en la tarjeta, abrir el historial ahora
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
                placeholder="Nombre, cédula, teléfono, correo o ciudad..."
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
                  {search ? 'Prueba con nombre, cédula o teléfono' : 'Registra clientes desde la sección Perfiles'}
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
          {/* Banner de advertencia */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-gm-red/[0.07] border border-gm-red/20">
            <Shield size={20} className="text-gm-red shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-black text-gm-red mb-1">
                Datos protegidos
              </p>
              <p className="text-[12px] text-white/45 leading-relaxed">
                Para ver el historial completo, cédula y teléfono de{' '}
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
    </div>
  );
}
