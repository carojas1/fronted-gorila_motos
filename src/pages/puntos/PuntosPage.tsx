/* ─────────────────────────────────────────────
   GMotors — Sistema de Gamificación / Puntos
   Puntos por servicio según cilindraje
   100 puntos = USD 5 de descuento (cashback)
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo } from 'react';
import { Star, Gift, Trophy, Zap, TrendingUp, Award, Users } from 'lucide-react';
import { registrosApi, motosApi, usuariosApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { RegistroDetalle, Moto, Usuario } from '../../types';
import { fmtDate, fmtMoney, toIsoStr } from '../../lib/utils';

/* ── Tabla de puntos por cilindraje ── */
const POINTS_TABLE: { max: number; pts: number; label: string; color: string }[] = [
  { max: 125,  pts: 5,  label: '≤ 125 cc',   color: '#10B981' },
  { max: 200,  pts: 8,  label: '126–200 cc',  color: '#3B82F6' },
  { max: 400,  pts: 12, label: '201–400 cc',  color: '#8B5CF6' },
  { max: 650,  pts: 18, label: '401–650 cc',  color: '#F59E0B' },
  { max: 99999,pts: 25, label: '651 cc +',    color: '#EF4444' },
];

function ptsForCc(cc: number): number {
  return POINTS_TABLE.find(r => cc <= r.max)?.pts ?? 5;
}

/* Bono por cambio de aceite */
const OIL_KEYWORDS = ['cambio de aceite', 'aceite', 'oil'];
function isOilChange(tipo: string, desc: string): boolean {
  return OIL_KEYWORDS.some(k =>
    tipo?.toLowerCase().includes(k) || desc?.toLowerCase().includes(k)
  );
}

/* Nivel según puntos */
const LEVELS: { min: number; label: string; color: string; icon: string }[] = [
  { min: 0,   label: 'Rookie',    color: '#9CA3AF', icon: '🔩' },
  { min: 50,  label: 'Mecánico',  color: '#10B981', icon: '🔧' },
  { min: 150, label: 'Experto',   color: '#3B82F6', icon: '⚙️' },
  { min: 300, label: 'Pro',       color: '#8B5CF6', icon: '🏆' },
  { min: 600, label: 'Élite',     color: '#F59E0B', icon: '👑' },
];
function getLevel(pts: number) {
  return [...LEVELS].reverse().find(l => pts >= l.min) ?? LEVELS[0];
}
function nextLevel(pts: number) {
  const idx = LEVELS.findIndex(l => l === getLevel(pts));
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

/* ── Tipos locales ── */
interface HistItem {
  id_registro: number;
  fecha: string;
  moto: string;
  placa: string;
  tipo: string;
  pts: number;
  bono: number;
  total: number;
}

interface UserPoints {
  usuario: Usuario;
  motos: Moto[];
  historia: HistItem[];
  totales: number;
  canjeados: number;
}

export default function PuntosPage() {
  const { user, isAdmin, isMecanico } = useAuth();
  const [data,    setData]    = useState<UserPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [selUser, setSelUser] = useState<number | null>(null);
  const [tab,     setTab]     = useState<'resumen' | 'historia' | 'reglas' | 'ranking'>('resumen');

  useEffect(() => {
    async function load() {
      const [rr, mr, ur] = await Promise.allSettled([
        registrosApi.list(), motosApi.list(), usuariosApi.list(),
      ]);
      const records: RegistroDetalle[] = rr.status === 'fulfilled' ? rr.value.data : [];
      const motos:   Moto[]            = mr.status === 'fulfilled' ? mr.value.data : [];
      const users:   Usuario[]         = ur.status === 'fulfilled' ? ur.value.data : [];

      const motoMap = new Map(motos.map(m => [m.placa, m]));

      /* Calcular puntos por usuario cliente */
      const clienteUsers = (isAdmin || isMecanico) ? users : users.filter(u => u.id_usuario === user?.id_usuario);

      const userPoints: UserPoints[] = clienteUsers.map(u => {
        const userMotos = motos.filter(m => m.id_usuario === u.id_usuario);
        const userPlacas = new Set(userMotos.map(m => m.placa));

        const historia: HistItem[] = records
          .filter(r => userPlacas.has(r.placa))
          .map(r => {
            const moto   = motoMap.get(r.placa);
            const cc     = moto?.cilindraje ?? 125;
            const pts    = ptsForCc(cc);
            const bono   = isOilChange(r.tipo_servicio ?? '', r.descripcion ?? '') ? 3 : 0;
            return {
              id_registro: r.id_registro,
              fecha:       r.fecha,
              moto:        `${r.marca_moto} ${r.modelo_moto}`,
              placa:       r.placa,
              tipo:        r.tipo_servicio ?? '—',
              pts,
              bono,
              total: pts + bono,
            };
          })
          .sort((a, b) => toIsoStr(b.fecha).localeCompare(toIsoStr(a.fecha)));

        const totales = historia.reduce((s, h) => s + h.total, 0);
        return { usuario: u, motos: userMotos, historia, totales, canjeados: 0 };
      });

      userPoints.sort((a, b) => b.totales - a.totales);
      setData(userPoints);
      if (userPoints.length > 0) setSelUser(userPoints[0].usuario.id_usuario);
      setLoading(false);
    }
    load();
  }, [user, isAdmin, isMecanico]);

  const selected = useMemo(() => data.find(d => d.usuario.id_usuario === selUser) ?? data[0], [data, selUser]);
  const disponibles = (selected?.totales ?? 0) - (selected?.canjeados ?? 0);
  const nivel       = getLevel(disponibles);
  const next        = nextLevel(disponibles);
  const lvlPct      = next ? Math.round(((disponibles - nivel.min) / (next.min - nivel.min)) * 100) : 100;
  const cashback    = Math.floor(disponibles / 100) * 5;

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton-d h-8 w-48 rounded-xl" />
      {[1, 2, 3].map(i => <div key={i} className="skeleton-d h-32 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Star size={13} className="text-gm-red/60" />
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/28 font-bold">
            Gorila Motos · Puntos
          </span>
        </div>
        <h1 className="text-[2rem] font-black text-white leading-tight tracking-tight">
          Sistema de <span className="text-gradient-red">Puntos</span>
        </h1>
        <p className="text-white/35 text-sm mt-1">
          Gana puntos en cada servicio · 100 pts = USD 5 de descuento
        </p>
      </div>

      {/* ── Selector de usuario (solo admin/mec) ── */}
      {(isAdmin || isMecanico) && data.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] text-white/35 font-bold uppercase tracking-wider">Cliente:</span>
          {data.map(d => (
            <button
              key={d.usuario.id_usuario}
              onClick={() => setSelUser(d.usuario.id_usuario)}
              className={`filter-chip ${selUser === d.usuario.id_usuario ? 'active' : ''}`}
            >
              {d.usuario.nombre_completo.split(' ')[0]} · {d.totales} pts
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          {/* ── Hero card: nivel + puntos ── */}
          <div
            className="gm-card-d rounded-3xl p-7 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, #17171E 0%, ${nivel.color}12 60%, #111115 100%)`,
              borderColor: `${nivel.color}30`,
            }}
          >
            {/* Glow decorativo */}
            <div
              className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${nivel.color}15 0%, transparent 70%)` }}
            />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Avatar nivel */}
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shrink-0"
                style={{ background: `${nivel.color}18`, border: `2px solid ${nivel.color}35` }}
              >
                {nivel.icon}
              </div>
              {/* Puntos */}
              <div className="flex-1">
                <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest mb-1">
                  {selected.usuario.nombre_completo}
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="text-5xl font-black text-white">{disponibles}</p>
                  <p className="text-xl text-white/40 font-bold">pts</p>
                </div>
                <p className="font-black text-lg mt-0.5" style={{ color: nivel.color }}>
                  Nivel {nivel.label}
                </p>
                {next && (
                  <div className="mt-3 max-w-xs">
                    <div className="flex justify-between text-[11px] text-white/35 mb-1">
                      <span>Hacia {next.label}</span>
                      <span>{next.min - disponibles} pts más</span>
                    </div>
                    <div className="prog-bar">
                      <div
                        className="prog-bar-fill"
                        style={{ width: `${lvlPct}%`, background: nivel.color, boxShadow: `0 0 10px ${nivel.color}50` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/* Cashback */}
              <div className="shrink-0 text-center px-6 py-4 rounded-2xl"
                   style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Gift size={20} className="mx-auto mb-1 text-emerald-400" />
                <p className="text-3xl font-black text-emerald-400">{fmtMoney(cashback)}</p>
                <p className="text-[11px] text-white/35 mt-0.5">Cashback disponible</p>
                <p className="text-[10px] text-emerald-400/50 mt-1">{Math.floor(disponibles / 100) * 100} pts listos</p>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="tab-nav">
            <button className={`tab-btn ${tab === 'resumen'  ? 'active' : ''}`} onClick={() => setTab('resumen')}>
              Resumen
            </button>
            <button className={`tab-btn ${tab === 'historia' ? 'active' : ''}`} onClick={() => setTab('historia')}>
              Historial
            </button>
            {(isAdmin || isMecanico) && (
              <button className={`tab-btn ${tab === 'ranking' ? 'active' : ''}`} onClick={() => setTab('ranking')}>
                Ranking
              </button>
            )}
            <button className={`tab-btn ${tab === 'reglas'   ? 'active' : ''}`} onClick={() => setTab('reglas')}>
              Reglas
            </button>
          </div>

          {/* ── Tab: Resumen ── */}
          {tab === 'resumen' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Zap,       label: 'Puntos ganados',   value: selected.totales,    color: '#F59E0B', unit: 'pts'  },
                { icon: TrendingUp,label: 'Servicios totales',value: selected.historia.length, color: '#3B82F6', unit: 'svc' },
                { icon: Award,     label: 'Cashback total',   value: cashback,             color: '#10B981', unit: 'USD' },
              ].map(({ icon: Icon, label, value, color, unit }) => (
                <div key={label} className="gm-card-d rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                       style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <p className="text-3xl font-black text-white">
                    {unit === 'USD' ? fmtMoney(value) : value.toLocaleString()}
                    {unit !== 'USD' && <span className="text-base text-white/35 ml-1">{unit}</span>}
                  </p>
                  <p className="text-[12px] text-white/40 mt-1">{label}</p>
                </div>
              ))}

              {/* Motos del cliente */}
              <div className="sm:col-span-3 gm-card-d rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={13} className="text-gm-red/60" />
                  <p className="text-[10px] tracking-[0.3em] uppercase text-white/28 font-bold">Motos registradas</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selected.motos.map(m => {
                    const cc  = m.cilindraje;
                    const pts = ptsForCc(cc);
                    const row = POINTS_TABLE.find(r => cc <= r.max);
                    return (
                      <div key={m.id_moto} className="rounded-xl px-3 py-2.5"
                           style={{ background: `${row?.color ?? '#fff'}0A`, border: `1px solid ${row?.color ?? '#fff'}18` }}>
                        <span className="plate-tag text-[10px]">{m.placa}</span>
                        <p className="text-white/80 font-bold text-xs mt-1.5 truncate">{m.marca} {m.modelo}</p>
                        <p className="text-[11px] font-black mt-0.5" style={{ color: row?.color }}>
                          +{pts} pts / servicio
                        </p>
                      </div>
                    );
                  })}
                  {selected.motos.length === 0 && (
                    <p className="text-white/25 text-sm col-span-4">Sin motos registradas</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Tab: Historial ── */}
          {tab === 'historia' && (
            <div className="gm-card-d rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-[11px] tracking-[0.28em] uppercase text-white/28 font-bold">
                  Historial de puntos ({selected.historia.length})
                </p>
                <p className="text-[11px] text-white/35">Total: <span className="text-white/70 font-bold">{selected.totales} pts</span></p>
              </div>
              {selected.historia.length === 0 ? (
                <div className="py-14 text-center text-white/25 text-sm">Sin servicios registrados aún</div>
              ) : (
                <div className="overflow-x-auto dark-scroll">
                <table className="gm-table-d" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Moto</th>
                      <th>Servicio</th>
                      <th className="text-right">Pts base</th>
                      <th className="text-right">Bono aceite</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.historia.map(h => (
                      <tr key={h.id_registro}>
                        <td className="text-white/50 text-[12px]">{fmtDate(h.fecha)}</td>
                        <td>
                          <span className="plate-tag">{h.placa}</span>
                          <span className="text-white/45 text-xs ml-2">{h.moto}</span>
                        </td>
                        <td className="text-white/65 text-[13px]">{h.tipo}</td>
                        <td className="text-right text-yellow-400 font-bold">+{h.pts}</td>
                        <td className="text-right text-emerald-400 font-bold">
                          {h.bono > 0 ? `+${h.bono}` : '—'}
                        </td>
                        <td className="text-right text-white font-black">+{h.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Ranking ── */}
          {tab === 'ranking' && (isAdmin || isMecanico) && (
            <div className="gm-card-d rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-gm-red/60" />
                  <p className="text-[11px] tracking-[0.28em] uppercase text-white/28 font-bold">
                    Ranking de clientes ({data.length})
                  </p>
                </div>
                <p className="text-[11px] text-white/35">
                  Total puntos en circulación: <span className="text-white/70 font-bold">{data.reduce((s, d) => s + d.totales, 0)}</span>
                </p>
              </div>
              {data.length === 0 ? (
                <div className="py-14 text-center text-white/25 text-sm">Sin clientes registrados</div>
              ) : (
                <div className="overflow-x-auto dark-scroll">
                  <table className="gm-table-d" style={{ minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th>Cliente</th>
                        <th>Nivel</th>
                        <th className="text-right">Puntos</th>
                        <th className="text-right">Servicios</th>
                        <th className="text-right">Cashback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d, i) => {
                        const lvl      = getLevel(d.totales);
                        const cb       = Math.floor(d.totales / 100) * 5;
                        const isActive = d.usuario.id_usuario === selUser;
                        return (
                          <tr
                            key={d.usuario.id_usuario}
                            className="cursor-pointer"
                            style={isActive ? { background: 'rgba(225,20,40,0.06)' } : undefined}
                            onClick={() => { setSelUser(d.usuario.id_usuario); setTab('resumen'); }}
                          >
                            <td>
                              <span className="text-[12px] font-black" style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.25)' }}>
                                {i + 1}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                                     style={{ background: `${lvl.color}18`, color: lvl.color }}>
                                  {d.usuario?.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
                                </div>
                                <div>
                                  <p className="text-[13px] font-bold text-white/85 leading-tight">
                                    {d.usuario.nombre_completo}
                                  </p>
                                  <p className="text-[10px] text-white/30">{d.usuario.correo}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                                    style={{ background: `${lvl.color}18`, color: lvl.color }}>
                                {lvl.icon} {lvl.label}
                              </span>
                            </td>
                            <td className="text-right">
                              <span className="text-base font-black text-white">{d.totales}</span>
                              <span className="text-[11px] text-white/30 ml-1">pts</span>
                            </td>
                            <td className="text-right text-white/55 font-semibold">{d.historia.length}</td>
                            <td className="text-right text-emerald-400 font-black">${cb}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="px-5 py-3 border-t border-white/[0.04]">
                <p className="text-[10px] text-white/22">Haz clic en un cliente para ver su detalle completo</p>
              </div>
            </div>
          )}

          {/* ── Tab: Reglas ── */}
          {tab === 'reglas' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="gm-card-d rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={13} className="text-gm-red/60" />
                  <p className="text-[10px] tracking-[0.3em] uppercase text-white/28 font-bold">Puntos por servicio</p>
                </div>
                <div className="space-y-2.5">
                  {POINTS_TABLE.map(r => (
                    <div key={r.label}
                         className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                         style={{ background: `${r.color}0A`, border: `1px solid ${r.color}20` }}>
                      <span className="text-[13px] text-white/70 font-semibold">{r.label}</span>
                      <span className="font-black text-lg" style={{ color: r.color }}>+{r.pts} pts</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                       style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span className="text-[13px] text-white/70 font-semibold">Bono cambio aceite</span>
                    <span className="font-black text-lg text-emerald-400">+3 pts</span>
                  </div>
                </div>
              </div>

              <div className="gm-card-d rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Gift size={13} className="text-gm-red/60" />
                  <p className="text-[10px] tracking-[0.3em] uppercase text-white/28 font-bold">Canje de puntos</p>
                </div>
                <div className="space-y-3">
                  {[
                    { pts: 100,  val: 5,  desc: 'Descuento en siguiente servicio' },
                    { pts: 200,  val: 10, desc: 'Descuento en repuestos' },
                    { pts: 500,  val: 25, desc: 'Servicio de mantenimiento' },
                    { pts: 1000, val: 55, desc: 'Kit de mantenimiento completo' },
                  ].map(c => (
                    <div key={c.pts}
                         className="flex items-center justify-between px-4 py-3 rounded-xl"
                         style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <p className="text-[13px] text-white/75 font-semibold">{c.pts} pts</p>
                        <p className="text-[11px] text-white/30">{c.desc}</p>
                      </div>
                      <span className="text-emerald-400 font-black text-lg">= ${c.val}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-white/25 mt-4 leading-relaxed">
                  Los puntos no tienen fecha de vencimiento. Aplica para servicios de taller.
                  Consulta condiciones con el personal del taller.
                </p>
              </div>

              {/* Niveles */}
              <div className="sm:col-span-2 gm-card-d rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Award size={13} className="text-gm-red/60" />
                  <p className="text-[10px] tracking-[0.3em] uppercase text-white/28 font-bold">Niveles de membresía</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {LEVELS.map(l => (
                    <div key={l.label}
                         className={`text-center py-4 px-2 rounded-2xl transition-all ${disponibles >= l.min ? 'opacity-100' : 'opacity-40'}`}
                         style={{ background: `${l.color}0E`, border: `1.5px solid ${l.color}${disponibles >= l.min ? '35' : '15'}` }}>
                      <div className="text-3xl mb-2">{l.icon}</div>
                      <p className="font-black text-sm" style={{ color: l.color }}>{l.label}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{l.min}+ pts</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
