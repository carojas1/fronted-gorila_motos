/* ─────────────────────────────────────────────
   GMotors — Portal del Cliente
   Vista personalizada: mis motos, historial,
   puntos y alertas de mantenimiento
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike, Star, Wrench, Clock, AlertTriangle,
  CheckCircle, ChevronRight, Phone, MapPin, Mail,
} from 'lucide-react';
import { motosApi, registrosApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { Moto, RegistroDetalle } from '../../types';
import { fmtDate, fmtMoney } from '../../lib/utils';

const TALLER = {
  nombre:    'Gorila Motos',
  direccion: 'Av. 6 de Diciembre N24-253, Quito',
  telefono:  '(02) 234-5678',
  whatsapp:  '593987654321',
  email:     'info@gorilamoto.com',
  horario:   'Lun–Vie 8:00–18:00 · Sáb 9:00–14:00',
};

const PTS_TABLE = [125, 200, 400, 650].map((max, i) => ({
  max, pts: [5, 8, 12, 18, 25][i],
}));
function ptsForCc(cc: number) { return PTS_TABLE.find(r => cc <= r.max)?.pts ?? 25; }

function oilThreshold(cc: number) { return cc >= 300 ? 5000 : 1000; }

const URGENCY_CFG = {
  overdue: { label: 'Vencido',  color: '#EF4444', bg: 'rgba(239,68,68,0.10)' },
  due:     { label: 'Urgente',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  soon:    { label: 'Próximo',  color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
  ok:      { label: 'Al día',   color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
};

function getUrgency(kmSince: number | null, thr: number) {
  if (!kmSince) return 'ok';
  if (kmSince >= thr)        return 'overdue';
  if (kmSince >= thr * 0.8)  return 'due';
  if (kmSince >= thr * 0.6)  return 'soon';
  return 'ok';
}

export default function PortalClientePage() {
  const { user } = useAuth();
  const [motos,    setMotos]    = useState<Moto[]>([]);
  const [registros,setRegistros]= useState<RegistroDetalle[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<'historial' | 'alertas' | 'puntos'>('historial');
  const [filterPlaca, setFilterPlaca] = useState('');

  useEffect(() => {
    Promise.allSettled([motosApi.list(), registrosApi.list()]).then(([mr, rr]) => {
      const allMotos:    Moto[]            = mr.status === 'fulfilled' ? mr.value.data : [];
      const allRegistros:RegistroDetalle[] = rr.status === 'fulfilled' ? rr.value.data : [];

      const myMotos    = allMotos.filter(m => m.id_usuario === user?.id_usuario);
      const myPlacas   = new Set(myMotos.map(m => m.placa));
      const myRegistros= allRegistros.filter(r => myPlacas.has(r.placa))
                                     .sort((a,b) => b.fecha.localeCompare(a.fecha));

      setMotos(myMotos);
      setRegistros(myRegistros);
      setLoading(false);
    });
  }, [user]);

  /* Puntos totales */
  const puntosTotales = useMemo(() => {
    const motoMap = new Map(motos.map(m => [m.placa, m]));
    return registros.reduce((sum, r) => {
      const cc = motoMap.get(r.placa)?.cilindraje ?? 125;
      const oilBonus = ['aceite','cambio de aceite'].some(k =>
        r.tipo_servicio?.toLowerCase().includes(k)) ? 3 : 0;
      return sum + ptsForCc(cc) + oilBonus;
    }, 0);
  }, [registros, motos]);

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
            {user?.nombre_completo?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest">Mi portal</p>
            <h1 className="text-2xl font-black text-white leading-tight">
              {user?.nombre_completo ?? 'Mi cuenta'}
            </h1>
            <p className="text-white/35 text-sm mt-0.5">{user?.correo}</p>
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
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">{label}</span>
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
          <h2 className="text-base font-black text-white/80">Mis motos</h2>
          <Link to="/motos" className="text-[11px] text-gm-red font-bold hover:text-gm-red-lt flex items-center gap-1">
            Administrar <ChevronRight size={11} />
          </Link>
        </div>
        {motos.length === 0 ? (
          <div className="gm-card-d rounded-2xl py-10 text-center">
            <Bike size={28} className="mx-auto mb-2 text-white/15" />
            <p className="text-white/30 text-sm">Sin motos registradas</p>
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
                  <p className="text-white/85 font-black text-sm">{m.marca} {m.modelo}</p>
                  <p className="text-white/35 text-xs mt-0.5">{m.anio} · {m.cilindraje}cc · {m.tipo_moto}</p>
                  <p className="text-white/50 text-xs mt-1">
                    {m.kilometraje.toLocaleString()} km totales
                  </p>
                  {/* Barra aceite */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-white/30 mb-1">
                      <span>Próximo cambio de aceite</span>
                      <span style={{ color: cfg.color }}>{pct}%</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-bar-fill" style={{
                        width: `${pct}%`, background: cfg.color, boxShadow: `0 0 6px ${cfg.color}50`,
                      }} />
                    </div>
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
              <p className="text-[11px] tracking-[0.28em] uppercase text-white/28 font-bold">
                Historial · {registros.length} servicios
              </p>
              <p className="text-xs text-white/30 mt-0.5">
                Total gastado: <span className="text-white/60 font-bold">{fmtMoney(gastoTotal)}</span>
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
            <div className="py-12 text-center text-white/25 text-sm">Sin registros</div>
          ) : (
            <table className="gm-table-d">
              <thead>
                <tr>
                  <th>Fecha</th><th>Placa</th><th>Servicio</th>
                  <th className="text-right">Costo</th><th>Estado</th><th>Factura</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id_registro}>
                    <td className="text-white/45 text-xs">{fmtDate(r.fecha)}</td>
                    <td><span className="plate-tag">{r.placa}</span></td>
                    <td className="text-white/65 text-sm">{r.tipo_servicio ?? '—'}</td>
                    <td className="text-right text-emerald-400 font-bold text-sm">{fmtMoney(r.costo_total)}</td>
                    <td>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
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
                              className="text-gm-red text-xs font-bold hover:text-gm-red-lt">
                          Ver →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <p className="text-white/60 text-xs mt-1">
                    {m.marca} {m.modelo} · {m.cilindraje}cc
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black">{m.kilometraje.toLocaleString()} km</p>
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
              <p className="text-white/30 text-sm">Sin motos registradas</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Puntos ── */}
      {tab === 'puntos' && (
        <div className="space-y-4">
          <div className="gm-card-d rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold mb-1">Balance de puntos</p>
              <p className="text-5xl font-black text-white">{puntosTotales}</p>
              <p className="text-white/40 text-sm mt-1">
                Equivalen a <span className="text-emerald-400 font-bold">{fmtMoney(Math.floor(puntosTotales / 100) * 5)}</span> de descuento
              </p>
            </div>
            <Link to="/puntos"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'rgba(225,20,40,0.15)', border: '1px solid rgba(225,20,40,0.35)' }}>
              <Star size={14} className="text-gm-red" /> Ver programa completo
            </Link>
          </div>
          <div className="gm-card-d rounded-2xl p-4">
            <p className="text-[10px] tracking-[0.28em] uppercase text-white/25 font-bold mb-3">
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
                    <p className="text-xs font-semibold text-white/60">{r.tipo_servicio ?? '—'}</p>
                    <p className="text-[11px] text-white/30">{fmtDate(r.fecha)} · {r.placa}</p>
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
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/28 font-bold">Contáctanos</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{label}</p>
                <p className="text-[12px] text-white/65 font-semibold mt-0.5">{val}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="mt-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-white/30" />
            <span className="text-[11px] text-white/35 font-semibold">{TALLER.horario}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
