/* ─────────────────────────────────────────────
   GMotors — Portal del Cliente
   Vista personalizada: mis motos, historial,
   puntos y alertas de mantenimiento
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike, Star, Wrench, Clock, AlertTriangle,
  CheckCircle, ChevronRight, Phone, MapPin, Mail, Fuel, Gift, Copy,
} from 'lucide-react';
import { motosApi, registrosApi, combustibleApi, usuariosApi } from '../../lib/api';
import { usePolling } from '../../hooks/usePolling';
import { useAuth } from '../../contexts/AuthContext';
import type { Moto, RegistroDetalle, CargaCombustible, Usuario } from '../../types';
import { fmtDate, fmtMoney, toIsoStr } from '../../lib/utils';
import { WORKSHOP_CONTACT } from '../../lib/constants';

const TALLER = {
  nombre:    WORKSHOP_CONTACT.nombre,
  direccion: `${WORKSHOP_CONTACT.direccion}, ${WORKSHOP_CONTACT.ciudad}`,
  telefono:  WORKSHOP_CONTACT.telefono,
  whatsapp:  WORKSHOP_CONTACT.whatsapp,
  email:     WORKSHOP_CONTACT.email,
  horario:   WORKSHOP_CONTACT.horario,
};

const PTS_TABLE = [125, 200, 400, 650].map((max, i) => ({
  max, pts: [5, 8, 12, 18, 25][i],
}));
function ptsForCc(cc: number) { return PTS_TABLE.find(r => cc <= r.max)?.pts ?? 25; }

function oilThreshold(cc: number) { return cc >= 300 ? 5000 : 1000; }

const URGENCY_CFG = {
  overdue: { label: 'Vencido',      color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
  due:     { label: 'Urgente',      color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  soon:    { label: 'Próximo',      color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  ok:      { label: 'Al día',       color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  unknown: { label: 'Sin historial',color: '#6B7280', bg: 'rgba(107,114,128,0.10)' },
};

function getUrgency(kmSince: number | null, thr: number) {
  if (kmSince === null) return 'unknown';
  if (kmSince >= thr)       return 'overdue';
  if (kmSince >= thr * 0.8) return 'due';
  if (kmSince >= thr * 0.6) return 'soon';
  return 'ok';
}

export default function PortalClientePage() {
  const { user } = useAuth();
  const [motos,    setMotos]    = useState<Moto[]>([]);
  const [registros,setRegistros]= useState<RegistroDetalle[]>([]);
  const [combustible, setCombustible] = useState<CargaCombustible[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<'historial' | 'alertas' | 'puntos'>('historial');
  const [filterPlaca, setFilterPlaca] = useState('');
  const [puntosBonus,    setPuntosBonus]    = useState(0);
  const [codigoReferido, setCodigoReferido] = useState<string | null>(null);
  const [codigoInput,    setCodigoInput]    = useState('');
  const [referidoLoading,setReferidoLoading]= useState(false);
  const [referidoMsg,    setReferidoMsg]    = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const uid = user?.id_usuario;
    const [mr, rr, cr, ur] = await Promise.allSettled([
      motosApi.list(), registrosApi.list(), combustibleApi.list(),
      uid ? usuariosApi.get(uid) : Promise.resolve({ data: null }),
    ]);
    const allMotos:    Moto[]            = mr.status === 'fulfilled' ? mr.value.data : [];
    const allRegistros:RegistroDetalle[] = rr.status === 'fulfilled' ? rr.value.data : [];
    const allCargas:   CargaCombustible[] = cr.status === 'fulfilled' ? cr.value.data : [];
    if (ur.status === 'fulfilled' && ur.value.data) {
      const u = ur.value.data as Usuario;
      setPuntosBonus(u.puntosBonus ?? 0);
      setCodigoReferido(u.codigoReferido ?? null);
    }

    const myMotos    = allMotos.filter(m => m.id_usuario === uid);
    const myPlacas   = new Set(myMotos.map(m => m.placa));
    const myRegistros= allRegistros.filter(r => myPlacas.has(r.placa))
                                   .sort((a,b) => toIsoStr(b.fecha).localeCompare(toIsoStr(a.fecha)));

    setMotos(myMotos);
    setRegistros(myRegistros);
    setCombustible(allCargas.filter(c => myPlacas.has(c.placa ?? '')));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /* Refresco en tiempo real: el cliente ve nuevos servicios/km sin recargar */
  usePolling(load, { intervalMs: 25_000 });

  /* Puntos por combustible: 2 pts por cada día único con carga (igual que PuntosPage) */
  const ptsCombustible = useMemo(() => {
    const dias = new Set(combustible.map(c => String(c.fecha).slice(0, 10)));
    return dias.size * 2;
  }, [combustible]);

  /* Puntos por servicios */
  const ptsServicios = useMemo(() => {
    const motoMap = new Map(motos.map(m => [m.placa, m]));
    return registros.reduce((sum, r) => {
      const cc = motoMap.get(r.placa)?.cilindraje ?? 125;
      const oilBonus = ['aceite','cambio de aceite'].some(k =>
        r.tipo_servicio?.toLowerCase().includes(k)) ? 3 : 0;
      return sum + ptsForCc(cc) + oilBonus;
    }, 0);
  }, [registros, motos]);

  /* Puntos totales = servicios + combustible + bonus de referidos */
  const puntosTotales = ptsServicios + ptsCombustible + puntosBonus;

  const handleUsarReferido = async () => {
    if (!codigoInput.trim() || !user?.id_usuario) return;
    setReferidoLoading(true);
    setReferidoMsg(null);
    try {
      await usuariosApi.usarReferido(user.id_usuario, codigoInput.trim());
      setReferidoMsg({ ok: true, text: '¡Listo! 50 puntos acreditados a tu cuenta y a la de tu referente.' });
      setCodigoInput('');
      load(); // refresca puntosBonus y codigoReferido
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: unknown } })?.response?.data;
      setReferidoMsg({ ok: false, text: typeof msg === 'string' ? msg : 'Código no válido o ya usado.' });
    } finally { setReferidoLoading(false); }
  };

  /* Alertas de aceite por moto */
  const oilAlerts = useMemo(() => motos.map(m => {
    const oilRecs = registros
      .filter(r => r.placa === m.placa &&
        ['aceite','cambio de aceite'].some(k => r.tipo_servicio?.toLowerCase().includes(k)))
      .filter(r => r.kilometraje != null)
      .sort((a,b) => (b.kilometraje ?? 0) - (a.kilometraje ?? 0));
    const lastKm = oilRecs[0]?.kilometraje ?? null;
    const thr    = oilThreshold(m.cilindraje);
    const kmSince = lastKm != null ? m.kilometraje - lastKm : null;
    return { moto: m, kmSince, thr, urgency: getUrgency(kmSince, thr) };
  }), [motos, registros]);

  const gastoTotal = registros.reduce((s, r) => s + (r.costo_total ?? 0), 0);

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="skeleton-d h-24 rounded-2xl" />)}
    </div>
  );

  const filtered = filterPlaca
    ? registros.filter(r => r.placa.toLowerCase().includes(filterPlaca.toLowerCase()))
    : registros;

  return (
    <div className="space-y-6 pb-8">

      {/* ── Hero del cliente ── */}
      <div className="gm-card-d rounded-3xl p-6 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #17171E 0%, rgba(225,20,40,0.06) 100%)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(225,20,40,0.08) 0%, transparent 70%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0"
               style={{ background: 'rgba(225,20,40,0.12)', border: '2px solid rgba(225,20,40,0.25)', color: '#E11428' }}>
            {user?.nombre_completo?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1">
            <p className="text-[11px] dark:text-white/30 text-slate-900/30 font-bold uppercase tracking-widest">Mi portal</p>
            <h1 className="text-2xl font-black dark:text-white text-slate-900 leading-tight">
              {user?.nombre_completo ?? 'Mi cuenta'}
            </h1>
            <p className="dark:text-white/35 text-slate-900/35 text-sm mt-0.5">{user?.correo}</p>
          </div>
          {/* KPIs rápidos */}
          <div className="flex items-center gap-0 bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
            {[
              { label: 'Motos',    value: motos.length,      color: '#3B82F6' },
              { label: 'Servicios',value: registros.length,  color: '#E11428' },
              { label: 'Puntos',   value: puntosTotales,     color: '#F59E0B' },
            ].map(({ label, value, color }, i, arr) => (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center gap-0.5 px-5 py-3">
                  <span className="text-xl font-black" style={{ color }}>{value}</span>
                  <span className="text-[9px] font-bold dark:text-white/30 text-slate-900/30 uppercase tracking-wider">{label}</span>
                </div>
                {i < arr.length - 1 && <div className="w-px h-8 bg-white/[0.07]" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mis motos ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black dark:text-white/80 text-slate-900/80">Mis motos</h2>
          <Link to="/motos" className="text-[11px] text-gm-red font-bold hover:text-gm-red-lt flex items-center gap-1">
            Administrar <ChevronRight size={11} />
          </Link>
        </div>
        {motos.length === 0 ? (
          <div className="gm-card-d rounded-2xl py-10 text-center">
            <Bike size={28} className="mx-auto mb-2 dark:text-white/15 text-slate-900/15" />
            <p className="dark:text-white/30 text-slate-900/30 text-sm">Sin motos registradas</p>
            <Link to="/motos" className="mt-3 inline-flex text-gm-red text-sm font-bold">
              Registrar mi moto →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {motos.map(m => {
              const alert = oilAlerts.find(a => a.moto.id_moto === m.id_moto);
              const cfg   = URGENCY_CFG[alert?.urgency ?? 'ok'];
              const pct   = alert?.kmSince != null
                ? Math.min(Math.round((alert.kmSince / alert.thr) * 100), 100) : 0;
              return (
                <div key={m.id_moto} className="gm-card-d rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="plate-tag">{m.placa}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="dark:text-white/85 text-slate-900/85 font-black text-sm">{m.marca} {m.modelo}</p>
                  <p className="dark:text-white/35 text-slate-900/35 text-xs mt-0.5">{m.anio} · {m.cilindraje}cc · {m.tipo_moto}</p>
                  <p className="dark:text-white/50 text-slate-900/50 text-xs mt-1">
                    {(m.kilometraje ?? 0).toLocaleString()} km totales
                  </p>
                  {/* Barra aceite */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] dark:text-white/30 text-slate-900/30 mb-1">
                      <span>Próximo cambio de aceite</span>
                      {alert?.urgency === 'unknown'
                        ? <span style={{ color: cfg.color }}>—</span>
                        : <span style={{ color: cfg.color }}>{pct}%</span>}
                    </div>
                    {alert?.urgency === 'unknown' ? (
                      <p className="text-[10px]" style={{ color: '#6B7280' }}>
                        Sin historial de aceite — el mecánico lo registrará en el próximo servicio
                      </p>
                    ) : (
                      <div className="prog-bar">
                        <div className="prog-bar-fill" style={{
                          width: `${pct}%`, background: cfg.color, boxShadow: `0 0 6px ${cfg.color}50`,
                        }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="tab-nav">
        <button className={`tab-btn ${tab === 'historial' ? 'active' : ''}`} onClick={() => setTab('historial')}>
          Historial de servicios
        </button>
        <button className={`tab-btn ${tab === 'alertas'  ? 'active' : ''}`} onClick={() => setTab('alertas')}>
          Alertas
        </button>
        <button className={`tab-btn ${tab === 'puntos'   ? 'active' : ''}`} onClick={() => setTab('puntos')}>
          Mis puntos
        </button>
      </div>

      {/* ── Tab: Historial ── */}
      {tab === 'historial' && (
        <div className="gm-card-d rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] tracking-[0.28em] uppercase dark:text-white/28 text-slate-900/28 font-bold">
                Historial · {registros.length} servicios
              </p>
              <p className="text-xs dark:text-white/30 text-slate-900/30 mt-0.5">
                Total gastado: <span className="dark:text-white/60 text-slate-900/60 font-bold">{fmtMoney(gastoTotal)}</span>
              </p>
            </div>
            <input
              className="gm-input-d text-xs"
              style={{ width: 200 }}
              placeholder="Filtrar por placa…"
              value={filterPlaca}
              onChange={e => setFilterPlaca(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <div className="py-12 text-center dark:text-white/25 text-slate-900/25 text-sm">Sin registros</div>
          ) : (
            <div className="overflow-x-auto dark-scroll">
              <table className="gm-table-d" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Placa</th><th>Servicio</th>
                    <th className="text-right">Costo</th><th>Estado</th><th>Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id_registro}>
                      <td className="dark:text-white/45 text-slate-900/45 text-xs whitespace-nowrap">{fmtDate(r.fecha)}</td>
                      <td><span className="plate-tag">{r.placa}</span></td>
                      <td className="dark:text-white/65 text-slate-900/65 text-sm">{r.tipo_servicio ?? '—'}</td>
                      <td className="text-right text-emerald-400 font-bold text-sm whitespace-nowrap">{fmtMoney(r.costo_total)}</td>
                      <td>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{
                                background: r.estado >= 3 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                color:      r.estado >= 3 ? '#10B981' : '#F59E0B',
                              }}>
                          {['Pendiente','En proceso','Completado','Entregado','Facturado'][r.estado] ?? '—'}
                        </span>
                      </td>
                      <td>
                        {r.id_factura > 0 && (
                          <Link to={`/invoice/${r.id_registro}`}
                                className="text-gm-red text-xs font-bold hover:text-gm-red-lt whitespace-nowrap">
                            Ver →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Alertas ── */}
      {tab === 'alertas' && (
        <div className="space-y-3">
          {oilAlerts.map(({ moto: m, kmSince, thr, urgency }) => {
            const cfg = URGENCY_CFG[urgency];
            return (
              <div key={m.id_moto} className="gm-card-d rounded-2xl p-4 flex items-center gap-4"
                   style={{ borderColor: urgency !== 'ok' ? cfg.color + '30' : undefined }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: cfg.bg }}>
                  {urgency === 'ok'
                    ? <CheckCircle size={18} style={{ color: cfg.color }} />
                    : <AlertTriangle size={18} style={{ color: cfg.color }} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="plate-tag">{m.placa}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <p className="dark:text-white/60 text-slate-900/60 text-xs mt-1">
                    {m.marca} {m.modelo} · {m.cilindraje}cc
                  </p>
                </div>
                <div className="text-right">
                  <p className="dark:text-white text-slate-900 font-black">{(m.kilometraje ?? 0).toLocaleString()} km</p>
                  {kmSince != null && (
                    <p className="text-[11px] mt-0.5" style={{ color: cfg.color }}>
                      {kmSince >= thr
                        ? `+${(kmSince - thr).toLocaleString()} km vencido`
                        : `Faltan ${(thr - kmSince).toLocaleString()} km`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {oilAlerts.length === 0 && (
            <div className="gm-card-d rounded-2xl py-12 text-center">
              <CheckCircle size={28} className="mx-auto mb-2 text-emerald-400/30" />
              <p className="dark:text-white/30 text-slate-900/30 text-sm">Sin motos registradas</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Puntos ── */}
      {tab === 'puntos' && (
        <div className="space-y-4">
          <div className="gm-card-d rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <p className="text-[11px] dark:text-white/30 text-slate-900/30 uppercase tracking-widest font-bold mb-1">Balance de puntos</p>
              <p className="text-5xl font-black dark:text-white text-slate-900">{puntosTotales}</p>
              <p className="dark:text-white/40 text-slate-900/40 text-sm mt-1">
                Equivalen a <span className="text-emerald-400 font-bold">{fmtMoney(Math.floor(puntosTotales / 100) * 5)}</span> de descuento
              </p>
            </div>
            <Link to="/puntos"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm dark:text-white text-slate-900"
                  style={{ background: 'rgba(225,20,40,0.15)', border: '1px solid rgba(225,20,40,0.35)' }}>
              <Star size={14} className="text-gm-red" /> Ver programa completo
            </Link>
          </div>

          {/* Desglose: servicios, combustible y referidos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="gm-card-d rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Wrench size={16} className="text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] dark:text-white/30 text-slate-900/30 uppercase tracking-wider font-bold">Por servicios</p>
                <p className="text-2xl font-black dark:text-white text-slate-900">{ptsServicios}<span className="text-xs dark:text-white/30 text-slate-900/30 ml-1">pts</span></p>
              </div>
            </div>
            <div className="gm-card-d rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <Fuel size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] dark:text-white/30 text-slate-900/30 uppercase tracking-wider font-bold">Por combustible</p>
                <p className="text-2xl font-black dark:text-white text-slate-900">{ptsCombustible}<span className="text-xs dark:text-white/30 text-slate-900/30 ml-1">pts</span></p>
                <p className="text-[10px] dark:text-white/25 text-slate-900/25">2 pts por día con carga</p>
              </div>
            </div>
            <div className="gm-card-d rounded-2xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
                <Gift size={16} style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <p className="text-[10px] dark:text-white/30 text-slate-900/30 uppercase tracking-wider font-bold">Por referidos</p>
                <p className="text-2xl font-black dark:text-white text-slate-900">{puntosBonus}<span className="text-xs dark:text-white/30 text-slate-900/30 ml-1">pts</span></p>
                <p className="text-[10px] dark:text-white/25 text-slate-900/25">50 pts por código canjeado</p>
              </div>
            </div>
          </div>

          {/* Código de referido */}
          <div className="gm-card-d rounded-2xl p-5 space-y-4">
            {/* Tu código */}
            <div>
              <p className="text-[10px] dark:text-white/30 text-slate-900/30 uppercase tracking-widest font-bold mb-2">Tu código de referido</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-2.5 rounded-xl font-black text-lg tracking-widest text-gm-red"
                     style={{ background: 'rgba(225,20,40,0.08)', border: '1px solid rgba(225,20,40,0.2)' }}>
                  {user?.nombre_usuario ?? '—'}
                </div>
                <button
                  className="p-2.5 rounded-xl transition-all"
                  style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)' }}
                  onClick={() => {
                    navigator.clipboard.writeText(user?.nombre_usuario ?? '').catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}>
                  <Copy size={15} style={{ color: copied ? '#10B981' : 'rgba(255,255,255,0.4)' }} />
                </button>
              </div>
              <p className="text-[11px] dark:text-white/25 text-slate-900/25 mt-1.5">
                Compártelo — tu amigo gana 50 pts y tú también
              </p>
            </div>

            {/* Ingresar código ajeno */}
            {codigoReferido ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
                   style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Gift size={14} style={{ color: '#8B5CF6' }} />
                <p className="text-sm dark:text-white/60 text-slate-900/60">
                  Código canjeado de <span className="font-black text-purple-400">@{codigoReferido}</span> · +50 pts acreditados
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] dark:text-white/30 text-slate-900/30 uppercase tracking-widest font-bold mb-2">¿Tienes un código?</p>
                <div className="flex gap-2">
                  <input
                    className="gm-input-d flex-1 text-sm"
                    placeholder="Nombre de usuario del referente…"
                    value={codigoInput}
                    onChange={e => setCodigoInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUsarReferido()}
                    disabled={referidoLoading}
                  />
                  <button
                    onClick={handleUsarReferido}
                    disabled={referidoLoading || !codigoInput.trim()}
                    className="px-4 py-2 rounded-xl text-sm font-black transition-all"
                    style={{
                      background: codigoInput.trim() ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      color: codigoInput.trim() ? '#A78BFA' : 'rgba(255,255,255,0.2)',
                    }}>
                    {referidoLoading ? '…' : 'Canjear'}
                  </button>
                </div>
                {referidoMsg && (
                  <p className="text-xs mt-2" style={{ color: referidoMsg.ok ? '#10B981' : '#F43F5E' }}>
                    {referidoMsg.text}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="gm-card-d rounded-2xl p-4">
            <p className="text-[10px] tracking-[0.28em] uppercase dark:text-white/25 text-slate-900/25 font-bold mb-3">
              Últimos 5 servicios
            </p>
            {registros.slice(0, 5).map(r => {
              const cc  = motos.find(m => m.placa === r.placa)?.cilindraje ?? 125;
              const pts = ptsForCc(cc) + (['aceite','cambio de aceite'].some(k =>
                r.tipo_servicio?.toLowerCase().includes(k)) ? 3 : 0);
              return (
                <div key={r.id_registro}
                     className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                  <div>
                    <p className="text-xs font-semibold dark:text-white/60 text-slate-900/60">{r.tipo_servicio ?? '—'}</p>
                    <p className="text-[11px] dark:text-white/30 text-slate-900/30">{fmtDate(r.fecha)} · {r.placa}</p>
                  </div>
                  <span className="text-yellow-400 font-black">+{pts} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Info del taller ── */}
      <div className="gm-card-d rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wrench size={13} className="text-gm-red/60" />
          <p className="text-[10px] tracking-[0.3em] uppercase dark:text-white/28 text-slate-900/28 font-bold">Contáctanos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Phone,  label: 'Teléfono',   val: TALLER.telefono,  href: `tel:${TALLER.telefono}` },
            { icon: Phone,  label: 'WhatsApp',   val: 'Enviar mensaje', href: `https://wa.me/${TALLER.whatsapp}` },
            { icon: Mail,   label: 'Email',      val: TALLER.email,     href: `mailto:${TALLER.email}` },
            { icon: MapPin, label: 'Dirección',  val: TALLER.direccion, href: '#' },
          ].map(({ icon: Icon, label, val, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer"
               className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-all">
              <div className="w-8 h-8 rounded-lg bg-gm-red/10 border border-gm-red/15 flex items-center justify-center shrink-0">
                <Icon size={14} className="text-gm-red" />
              </div>
              <div>
                <p className="text-[10px] dark:text-white/30 text-slate-900/30 font-bold uppercase tracking-wider">{label}</p>
                <p className="text-[12px] dark:text-white/65 text-slate-900/65 font-semibold mt-0.5">{val}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Clock size={12} className="dark:text-white/30 text-slate-900/30" />
            <span className="text-[11px] dark:text-white/35 text-slate-900/35 font-semibold">{TALLER.horario}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
