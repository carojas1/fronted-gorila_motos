/* ─────────────────────────────────────────────
   GMotors — Rastreador de Combustible (galones)
   Tipos: Extra / Super / Eco / Diésel (Ecuador)
   km_anterior se auto-llena del km del moto
   km_actual es opcional; si se da, actualiza el km de la moto
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Fuel, Plus, Trash2, TrendingDown, DollarSign, Gauge, X,
  AlertTriangle, TrendingUp, Activity, Wrench, Search, Users, Mail, Star,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { motosApi, combustibleApi, usuariosApi } from '../../lib/api';
import { usePolling } from '../../hooks/usePolling';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg, fmtDate, fmtMoney } from '../../lib/utils';
import type { Moto, CargaCombustible, Usuario } from '../../types';

/* ── Tipos de combustible Ecuador (precios controlados 2026) ── */
const COMBUSTIBLES = [
  { tipo: 'extra',  label: 'Extra (regular)',  precio: 2.72, color: '#3B82F6' },
  { tipo: 'super',  label: 'Super (premium)',  precio: 3.30, color: '#F59E0B' },
  { tipo: 'eco',    label: 'Eco / EcoPaís',   precio: 2.72, color: '#10B981' },
  { tipo: 'diesel', label: 'Diésel',           precio: 1.03, color: '#6B7280' },
];

function precioXTipo(tipo: string) {
  return COMBUSTIBLES.find(c => c.tipo === tipo)?.precio ?? 2.72;
}
function colorXTipo(tipo: string) {
  return COMBUSTIBLES.find(c => c.tipo === tipo)?.color ?? '#3B82F6';
}

interface FormState {
  id_moto:          string;
  fecha:            string;
  tipo_combustible: string;
  litros:           string;
  costo_total:      string;
  km_actual:        string;
  km_anterior:      string;
  notas:            string;
}

function emptyForm(): FormState {
  return {
    id_moto: '', fecha: new Date().toISOString().slice(0, 10),
    tipo_combustible: 'extra', litros: '', costo_total: '',
    km_actual: '', km_anterior: '', notas: '',
  };
}

export default function CombustiblePage() {
  const { user, isAdmin, isMecanico } = useAuth();
  const canManage = isAdmin || isMecanico;
  const toast = useToast();
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const [motos,    setMotos]    = useState<Moto[]>([]);
  const [logs,     setLogs]     = useState<CargaCombustible[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState<FormState>(emptyForm());
  const [selMoto, setSelMoto] = useState<number | null>(null);
  const [month,   setMonth]   = useState(() => new Date().toISOString().slice(0, 7));
  const [precios, setPrecios] = useState<Record<string, number>>(() => Object.fromEntries(COMBUSTIBLES.map(c => [c.tipo, c.precio])));
  const [editPrecios, setEditPrecios] = useState(false);
  const [savingPrecio, setSavingPrecio] = useState<string | null>(null);
  /* Admin: buscador global (usuario, correo, placa) y vista de todos los registros */
  const [adminSearch, setAdminSearch] = useState('');

  const cargarLogs = useCallback((misMotos: Moto[]) => {
    if (isAdmin || isMecanico) {
      combustibleApi.list().then(r => setLogs(r.data as CargaCombustible[])).catch(() => {});
    } else {
      Promise.allSettled(misMotos.map(m => combustibleApi.byMoto(m.id_moto)))
        .then(res => {
          const all: CargaCombustible[] = [];
          res.forEach(r => { if (r.status === 'fulfilled') all.push(...(r.value.data as CargaCombustible[])); });
          setLogs(all);
        });
    }
  }, [isAdmin, isMecanico]);

  const recargar = useCallback(async () => {
    try {
      const r = await motosApi.list();
      const all: Moto[] = r.data;
      const mine = (isAdmin || isMecanico) ? all : all.filter(m => m.id_usuario === user?.id_usuario);
      setMotos(mine);
      // Preserva la moto ya seleccionada (no pisa la elección del usuario en cada poll)
      setSelMoto(prev => prev ?? (mine.length > 0 ? mine[0].id_moto : null));
      cargarLogs(mine);
    } catch { /* silencioso */ }
    if (isAdmin || isMecanico) {
      usuariosApi.list().then(r => setUsuarios(r.data as Usuario[])).catch(() => {});
    }
  }, [user, isAdmin, isMecanico, cargarLogs]);

  useEffect(() => { recargar(); }, [recargar]);

  useEffect(() => {
    combustibleApi.precios()
      .then(r => setPrecios(prev => ({ ...prev, ...(r.data as Record<string, number>) })))
      .catch(() => {});
  }, []);

  /* Refresco en tiempo real de cargas de combustible */
  usePolling(recargar, { intervalMs: 30_000 });

  /* Dueño (nombre + correo) por id_moto — para la vista de admin */
  const ownerByMoto = useMemo(() => {
    const uById = new Map(usuarios.map(u => [u.id_usuario, u]));
    const map = new Map<number, { nombre: string; correo: string }>();
    motos.forEach(m => {
      const u = uById.get(m.id_usuario);
      map.set(m.id_moto, { nombre: u?.nombre_completo ?? '—', correo: u?.correo ?? '—' });
    });
    return map;
  }, [motos, usuarios]);

  /* Todos los registros enriquecidos con dueño (admin) — con buscador */
  const adminRows = useMemo(() => {
    const q = adminSearch.toLowerCase().trim();
    return logs
      .map(l => ({ ...l, owner: ownerByMoto.get(l.id_moto) ?? { nombre: '—', correo: '—' } }))
      .filter(r => {
        if (!q) return true;
        return (
          r.owner.nombre.toLowerCase().includes(q) ||
          r.owner.correo.toLowerCase().includes(q) ||
          (r.placa ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [logs, ownerByMoto, adminSearch]);

  /* ── Manejadores del formulario ── */
  const f = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.value;
      setForm(prev => {
        const next = { ...prev, [k]: val };
        /* Auto-calcular costo si cambian galones o tipo */
        if ((k === 'litros' || k === 'tipo_combustible') && next.litros) {
          const est = (Number(next.litros) * (precios[next.tipo_combustible] ?? precioXTipo(next.tipo_combustible))).toFixed(2);
          next.costo_total = est;
        }
        return next;
      });
    };

  /* Al cambiar moto en el form: pre-llenar km_anterior con el km actual de esa moto */
  const onMotoChange = (motoId: string) => {
    const moto = motos.find(m => m.id_moto === Number(motoId));
    setForm(prev => ({
      ...prev,
      id_moto: motoId,
      km_anterior: moto && moto.kilometraje > 0 ? String(moto.kilometraje) : prev.km_anterior,
    }));
  };

  const abrirModal = () => {
    const nuevoForm = emptyForm();
    /* Pre-seleccionar la moto del filtro activo */
    if (selMoto) {
      const moto = motos.find(m => m.id_moto === selMoto);
      nuevoForm.id_moto = String(selMoto);
      if (moto && moto.kilometraje > 0) nuevoForm.km_anterior = String(moto.kilometraje);
    }
    setForm(nuevoForm);
    setOpen(true);
  };

  const addLog = async () => {
    if (!form.id_moto || !form.fecha || !form.litros) {
      toast.error('Completa: moto, fecha y galones cargados');
      return;
    }
    const moto = motos.find(m => m.id_moto === Number(form.id_moto));
    const galones   = Number(form.litros);
    const costoFinal = form.costo_total
      ? Number(form.costo_total)
      : galones * (precios[form.tipo_combustible] ?? precioXTipo(form.tipo_combustible));
    const kmActual   = form.km_actual   ? Number(form.km_actual)   : undefined;
    const kmAnterior = form.km_anterior ? Number(form.km_anterior) : 0;

    setSaving(true);
    try {
      await combustibleApi.create({
        id_moto:          Number(form.id_moto),
        placa:            moto?.placa ?? '—',
        fecha:            form.fecha,
        litros:           galones,
        costo_total:      costoFinal,
        km_actual:        kmActual ?? 0,
        km_anterior:      kmAnterior,
        notas:            `[${form.tipo_combustible.toUpperCase()}] ${form.notas || ''}`.trim(),
      });

      /* Actualizar km de la moto si se ingresó km_actual.
         Enviamos SOLO el kilometraje (update parcial en el backend) para nunca
         arrastrar datos viejos ni la foto — el backend conserva el resto. */
      if (moto && kmActual && kmActual > 0) {
        await motosApi.update(moto.id_moto, { kilometraje: kmActual }).catch(() => {});
        /* Actualizar lista local de motos con el nuevo km */
        setMotos(prev => prev.map(m => m.id_moto === moto.id_moto ? { ...m, kilometraje: kmActual } : m));
      }

      const kmRec = kmActual && kmAnterior ? kmActual - kmAnterior : null;
      const rend  = kmRec && galones > 0 ? (kmRec / galones).toFixed(1) : null;
      // Verificar si es la primera carga del día para este usuario
      const today = new Date().toISOString().slice(0, 10);
      const yaHayCargaHoy = logs.some(l => String(l.fecha).slice(0, 10) === today);
      if (!yaHayCargaHoy && !canManage) {
        toast.success('¡+2 puntos! Primera carga del día registrada 🌟');
      } else {
        toast.success(
          rend
            ? `Carga guardada · ${rend} km/gal · $${costoFinal.toFixed(2)}`
            : `Carga guardada · $${costoFinal.toFixed(2)}`
        );
      }
      setOpen(false);
      setForm(emptyForm());
      cargarLogs(motos);
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  /* ── Datos filtrados ── */
  const filtered = useMemo(() => logs.filter(l => {
    const motoOk  = selMoto == null || l.id_moto === selMoto;
    const monthOk = !month || (typeof l.fecha === 'string' && l.fecha.startsWith(month));
    return motoOk && monthOk;
  }).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))), [logs, selMoto, month]);

  /* ── Métricas ── */
  const metrics = useMemo(() => {
    if (filtered.length < 2) return null;
    const totalGal   = filtered.reduce((s, l) => s + l.litros, 0);
    const totalCosto = filtered.reduce((s, l) => s + l.costo_total, 0);
    const maxKm = Math.max(...filtered.map(l => l.km_actual));
    const minKm = Math.min(...filtered.map(l => l.km_anterior ?? 0));
    const kmRec = maxKm - minKm;
    const kmGal = totalGal > 0 && kmRec > 0 ? kmRec / totalGal : 0;
    const cpkm  = kmRec > 0 ? totalCosto / kmRec : 0;
    return { totalGal, totalCosto, kmRec, kmGal, cpkm };
  }, [filtered]);

  /* ── Gráfica ── */
  const chartData = useMemo(() => [...filtered]
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
    .map(l => {
      const km = l.km_actual - (l.km_anterior ?? 0);
      const rendimiento = (km > 0 && l.litros > 0) ? +(km / l.litros).toFixed(1) : null;
      return { fecha: fmtDate(l.fecha), rendimiento, costo: +l.costo_total.toFixed(2), galones: +l.litros.toFixed(1) };
    }), [filtered]);

  /* ── Anomalía de rendimiento ── */
  const anomaly = useMemo(() => {
    const rend = chartData.map(d => d.rendimiento).filter((v): v is number => v != null && v > 0);
    if (rend.length < 3) return null;
    const last = rend[rend.length - 1];
    const avg  = rend.slice(0, -1).reduce((s, v) => s + v, 0) / (rend.length - 1);
    if (avg <= 0) return null;
    const drop = ((avg - last) / avg) * 100;
    return drop >= 15 ? { last: +last.toFixed(1), avg: +avg.toFixed(1), pct: Math.round(drop) } : null;
  }, [chartData]);

  /* ── Desglose por tipo de combustible (gráfica de torta) ── */
  const tipoBreakdown = useMemo(() => {
    const acc = new Map<string, { tipo: string; label: string; galones: number; costo: number; color: string }>();
    filtered.forEach(l => {
      const notas = l.notas ?? '';
      const c = COMBUSTIBLES.find(cc => notas.startsWith(`[${cc.tipo.toUpperCase()}]`));
      const key = c?.tipo ?? 'otro';
      const prev = acc.get(key) ?? {
        tipo: key, label: c ? c.label.split(' ')[0] : 'Otro',
        galones: 0, costo: 0, color: c?.color ?? '#6B7280',
      };
      prev.galones += l.litros;
      prev.costo   += l.costo_total;
      acc.set(key, prev);
    });
    return Array.from(acc.values()).sort((a, b) => b.costo - a.costo);
  }, [filtered]);

  /* ── Puntos por combustible: 2 pts por día único con carga (máx 1 por día) ── */
  const puntosGasolina = useMemo(() => {
    if (canManage) return null;
    const dias = new Set(logs.map(l => String(l.fecha).slice(0, 10)));
    return dias.size * 2;
  }, [logs, canManage]);

  const removeLog = async (id: number) => {
    try { await combustibleApi.remove(id); cargarLogs(motos); }
    catch (err) { toast.error(getErrorMsg(err)); }
  };

  const guardarPrecio = async (tipo: string) => {
    const precio = Number(precios[tipo] ?? 0);
    if (!precio || precio <= 0) { toast.error('Precio invalido'); return; }
    setSavingPrecio(tipo);
    try {
      await combustibleApi.updatePrecio(tipo, precio);
      // Actualizar también el estado local para que el display se refresque de inmediato
      setPrecios(prev => ({ ...prev, [tipo]: precio }));
      // Refrescar desde backend para asegurar sincronía con todos los usuarios
      try {
        const r = await combustibleApi.precios();
        setPrecios(prev => ({ ...prev, ...(r.data as Record<string, number>) }));
      } catch { /* continúa con el valor local ya actualizado */ }
      toast.success(`Precio de ${tipo} actualizado: $${precio.toFixed(2)}/gal · visible en toda la app`);
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSavingPrecio(null);
    }
  };

  const selectedMoto = motos.find(m => m.id_moto === selMoto);
  const costoEst = form.litros
    ? (Number(form.litros) * (precios[form.tipo_combustible] ?? precioXTipo(form.tipo_combustible))).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Fuel size={13} className="text-gm-red/60" />
            <span className="text-[10px] tracking-[0.3em] uppercase dark:text-white/28 text-slate-900/28 font-bold">
              Gorila Motos · Combustible
            </span>
          </div>
          <h1 className="text-[2rem] font-black dark:text-white text-slate-900 leading-tight tracking-tight">
            Rastreador de <span className="text-gradient-red">Combustible</span>
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {COMBUSTIBLES.map(c => (
              <span key={c.tipo} className="text-[11px] font-bold" style={{ color: c.color }}>
                {c.label}: ${Number(precios[c.tipo] ?? c.precio).toFixed(2)}/gal
              </span>
            ))}
          </div>
          {canManage && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setEditPrecios(v => !v)}
                className="text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(225,20,40,0.12)', color: '#E11428', border: '1px solid rgba(225,20,40,0.25)' }}
              >
                {editPrecios ? 'Cerrar precios' : 'Modificar precios'}
              </button>
              {editPrecios && (
                <div className="mt-4 p-4 rounded-xl border" style={{ background: 'rgba(225,20,40,0.05)', borderColor: 'rgba(225,20,40,0.15)' }}>
                  <div className="flex items-start gap-2 mb-4">
                    <AlertTriangle size={16} className="text-gm-red mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gm-red">Aviso importante</p>
                      <p className="text-[11px] dark:text-white/60 text-slate-900/60 mt-0.5">
                        Al modificar estos precios, el cálculo de costo se actualizará automáticamente para todos los usuarios y en toda la app.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {COMBUSTIBLES.map(c => (
                      <div key={c.tipo} className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold dark:text-white/70 text-slate-900/70 uppercase tracking-wider pl-1">
                          {c.label}
                        </label>
                        <div className="flex gap-1">
                          <input
                            className="gm-input-d"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={precios[c.tipo] ?? c.precio}
                            onChange={e => setPrecios(prev => ({ ...prev, [c.tipo]: Number(e.target.value) }))}
                            aria-label={`Precio ${c.label}`}
                          />
                          <button
                            className="px-2 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                            style={{ background: c.color, color: '#fff' }}
                            disabled={savingPrecio === c.tipo}
                            onClick={() => guardarPrecio(c.tipo)}
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          onClick={abrirModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm dark:text-white text-slate-900"
          style={{ background: '#E11428', boxShadow: '0 0 20px rgba(225,20,40,0.35)' }}
        >
          <Plus size={16} /> Registrar carga
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="gm-select-d"
          value={selMoto ?? ''}
          onChange={e => setSelMoto(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Todas las motos</option>
          {motos.map(m => (
            <option key={m.id_moto} value={m.id_moto}>
              {m.placa} — {m.marca} {m.modelo}
            </option>
          ))}
        </select>
        <input
          type="month" className="gm-input-d gm-wfull-m" style={{ width: 180 }}
          value={month} onChange={e => setMonth(e.target.value)}
        />
      </div>

      {/* ── ADMIN: registros de TODOS los usuarios (usuario · correo · placa) ── */}
      {canManage && (
        <div className="gm-card-d rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-gm-red/70" />
              <p className="text-[11px] tracking-[0.28em] uppercase dark:text-white/28 text-slate-900/28 font-bold">
                Todos los usuarios ({adminRows.length})
              </p>
            </div>
            <div className="search-d" style={{ minWidth: 240 }}>
              <Search size={14} />
              <input
                className="gm-input-d"
                placeholder="Buscar por usuario, correo o placa…"
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
              />
            </div>
          </div>
          {adminRows.length === 0 ? (
            <div className="py-12 text-center">
              <Fuel size={28} className="mx-auto mb-2 dark:text-white/10 text-slate-900/10" />
              <p className="dark:text-white/30 text-slate-900/30 text-sm">
                {adminSearch ? 'Sin coincidencias para esa búsqueda' : 'Aún no hay cargas registradas'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto dark-scroll" style={{ maxHeight: 380 }}>
              <table className="gm-table-d" style={{ minWidth: 820 }}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th className="text-right">Galones</th>
                    <th className="text-right">Costo</th>
                    <th className="text-right">Rendimiento</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {adminRows.map(r => {
                    const notas = r.notas ?? '';
                    const tipoM = COMBUSTIBLES.find(c => notas.startsWith(`[${c.tipo.toUpperCase()}]`));
                    const km    = r.km_actual > 0 && r.km_anterior ? r.km_actual - r.km_anterior : 0;
                    const rend  = (km > 0 && r.litros > 0) ? (km / r.litros).toFixed(1) : '—';
                    return (
                      <tr key={r.id}>
                        <td className="dark:text-white/50 text-slate-900/50 text-[12px]">{fmtDate(r.fecha)}</td>
                        <td className="dark:text-white/85 text-slate-900/85 font-semibold text-[12px]">
                          <span className="flex items-center gap-1.5"><Users size={11} className="dark:text-white/25 text-slate-900/25" />{r.owner.nombre}</span>
                        </td>
                        <td className="dark:text-white/40 text-slate-900/40 text-[12px]">
                          <span className="flex items-center gap-1.5"><Mail size={10} className="dark:text-white/20 text-slate-900/20" />{r.owner.correo}</span>
                        </td>
                        <td><span className="plate-tag">{r.placa}</span></td>
                        <td>
                          {tipoM ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: `${colorXTipo(tipoM.tipo)}18`, color: colorXTipo(tipoM.tipo), border: `1px solid ${colorXTipo(tipoM.tipo)}35` }}>
                              {tipoM.label.split(' ')[0]}
                            </span>
                          ) : <span className="dark:text-white/30 text-slate-900/30 text-[11px]">—</span>}
                        </td>
                        <td className="text-right text-blue-400 font-bold">{r.litros.toFixed(1)}</td>
                        <td className="text-right text-emerald-400 font-bold">{fmtMoney(r.costo_total)}</td>
                        <td className="text-right text-yellow-400 font-bold">{rend !== '—' ? `${rend} km/gal` : '—'}</td>
                        <td>
                          <button onClick={() => removeLog(r.id)} className="icon-btn danger ml-auto block">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Métricas ── */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Fuel,         label: 'Galones cargados',    val: `${metrics.totalGal.toFixed(1)} gal`,   color: '#3B82F6' },
            { icon: DollarSign,   label: 'Gasto en combustible', val: fmtMoney(metrics.totalCosto),           color: '#10B981' },
            { icon: Gauge,        label: 'Rendimiento',          val: `${metrics.kmGal.toFixed(1)} km/gal`,   color: '#F59E0B' },
            { icon: TrendingDown, label: 'Costo por km',         val: `$${metrics.cpkm.toFixed(3)}/km`,       color: '#8B5CF6' },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="gm-card-d rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                   style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-xl font-black dark:text-white text-slate-900">{val}</p>
              <p className="text-[11px] dark:text-white/35 text-slate-900/35 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Puntos por combustible ── */}
      {puntosGasolina !== null && puntosGasolina > 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-4"
             style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.10) 0%,rgba(245,158,11,0.04) 100%)',
                      border: '1px solid rgba(245,158,11,0.28)' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Star size={20} color="#F59E0B" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-black" style={{ color: '#F59E0B' }}>
              {puntosGasolina} puntos acumulados por combustible
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'rgba(245,158,11,0.6)' }}>
              2 pts por cada día que registras combustible · {Math.floor(puntosGasolina / 100) > 0 ? `${Math.floor(puntosGasolina / 100)} descuento(s) de $5 disponibles` : `${100 - puntosGasolina} pts más para tu primer descuento de $5`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black" style={{ color: '#F59E0B' }}>{puntosGasolina}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(245,158,11,0.5)' }}>pts</p>
          </div>
        </div>
      )}

      {/* ── Alerta anomalía ── */}
      {anomaly && (
        <div className="rounded-2xl p-4 flex items-start gap-3"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)' }}>
          <AlertTriangle size={17} color="#F59E0B" className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13.5px] font-black dark:text-white/90 text-slate-900/90 flex items-center gap-2">
              El rendimiento bajó — posible falla
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                −{anomaly.pct}%
              </span>
            </p>
            <p className="text-[12px] dark:text-white/45 text-slate-900/45 mt-1 leading-relaxed">
              Última carga: <b style={{ color: '#F59E0B' }}>{anomaly.last} km/gal</b> vs. promedio de{' '}
              <b className="dark:text-white/70 text-slate-900/70">{anomaly.avg} km/gal</b>. Revisar llantas, filtro de aire, bujía.
            </p>
            {selMoto && (
              <Link to={`/motos/${selMoto}`}
                className="inline-flex items-center gap-1.5 mt-2 text-[12px] font-bold"
                style={{ color: '#F59E0B' }}>
                <Wrench size={12} /> Ver salud de esta moto →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Gráfica rendimiento ── */}
      {chartData.filter(d => d.rendimiento != null).length >= 2 && (
        <div className="gm-card-d rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-gm-red/70" />
            <p className="text-[11px] tracking-[0.28em] uppercase dark:text-white/28 text-slate-900/28 font-bold">
              Rendimiento (km / galón)
            </p>
          </div>
          <div style={{ width: '100%', height: 220, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradConsumo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#F59E0B" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#E4E7EC'} vertical={false} />
                <XAxis dataKey="fecha" tick={{ fill: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.42)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : '#E4E7EC' }} />
                <YAxis tick={{ fill: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.42)', fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip
                  contentStyle={{ background: isDark ? '#16161E' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E4E7EC', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(21,21,27,0.6)' }}
                  itemStyle={{ color: '#F59E0B' }}
                  formatter={(v: number) => [`${v} km/gal`, 'Rendimiento']}
                />
                <Area type="monotone" dataKey="rendimiento" stroke="#F59E0B" strokeWidth={2.5}
                      fill="url(#gradConsumo)" connectNulls dot={{ r: 3, fill: '#F59E0B' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] dark:text-white/30 text-slate-900/30 mt-2 flex items-center gap-1.5">
            <TrendingUp size={11} /> Mayor es mejor. Caída sostenida → revisar mantenimiento.
          </p>
        </div>
      )}

      {/* ── Gasto por carga + desglose por tipo ── */}
      {filtered.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Gasto por carga */}
          <div className="gm-card-d rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={15} className="text-emerald-400/80" />
              <p className="text-[11px] tracking-[0.28em] uppercase dark:text-white/28 text-slate-900/28 font-bold">
                Gasto en combustible por carga
              </p>
            </div>
            <div style={{ width: '100%', height: 220, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <AreaChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradGasto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#E4E7EC'} vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fill: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.42)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : '#E4E7EC' }} />
                  <YAxis tick={{ fill: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.42)', fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
                  <Tooltip
                    contentStyle={{ background: isDark ? '#16161E' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E4E7EC', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(21,21,27,0.6)' }}
                    itemStyle={{ color: '#10B981' }}
                    formatter={(v: number) => [fmtMoney(v), 'Gasto']}
                  />
                  <Area type="monotone" dataKey="costo" stroke="#10B981" strokeWidth={2.5}
                        fill="url(#gradGasto)" dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Desglose por tipo */}
          <div className="gm-card-d rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Fuel size={15} className="text-gm-red/70" />
              <p className="text-[11px] tracking-[0.28em] uppercase dark:text-white/28 text-slate-900/28 font-bold">
                Gasto por tipo
              </p>
            </div>
            <div style={{ width: '100%', height: 220, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <PieChart>
                  <Pie data={tipoBreakdown} dataKey="costo" nameKey="label"
                       cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {tipoBreakdown.map((t) => <Cell key={t.tipo} fill={t.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: isDark ? '#16161E' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E4E7EC', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number, _n, p) => [fmtMoney(v), (p?.payload as { label?: string })?.label ?? '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(21,21,27,0.6)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabla registros ── */}
      <div className="gm-card-d rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <p className="text-[11px] tracking-[0.28em] uppercase dark:text-white/28 text-slate-900/28 font-bold">
            Registros ({filtered.length})
          </p>
          {selectedMoto && <span className="plate-tag">{selectedMoto.placa}</span>}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Fuel size={32} className="mx-auto mb-3 dark:text-white/10 text-slate-900/10" />
            <p className="dark:text-white/30 text-slate-900/30 text-sm font-semibold">Sin registros para este período</p>
            <button onClick={abrirModal}
              className="mt-4 text-gm-red text-sm font-bold hover:text-gm-red-lt transition-colors">
              Agregar primera carga →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto dark-scroll">
            <table className="gm-table-d" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Placa</th>
                  <th>Tipo</th>
                  <th className="text-right">Galones</th>
                  <th className="text-right">Costo</th>
                  <th className="text-right">Km ant.</th>
                  <th className="text-right">Km act.</th>
                  <th className="text-right">Rendimiento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const notas = l.notas ?? '';
                  const tipoM = COMBUSTIBLES.find(c => notas.startsWith(`[${c.tipo.toUpperCase()}]`));
                  const km    = l.km_actual > 0 && l.km_anterior ? l.km_actual - l.km_anterior : 0;
                  const rend  = (km > 0 && l.litros > 0) ? (km / l.litros).toFixed(1) : '—';
                  return (
                    <tr key={l.id}>
                      <td className="dark:text-white/50 text-slate-900/50 text-[12px]">{fmtDate(l.fecha)}</td>
                      <td><span className="plate-tag">{l.placa}</span></td>
                      <td>
                        {tipoM ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: `${colorXTipo(tipoM.tipo)}18`, color: colorXTipo(tipoM.tipo), border: `1px solid ${colorXTipo(tipoM.tipo)}35` }}>
                            {tipoM.label.split(' ')[0]}
                          </span>
                        ) : <span className="dark:text-white/30 text-slate-900/30 text-[11px]">—</span>}
                      </td>
                      <td className="text-right text-blue-400 font-bold">{l.litros.toFixed(1)} gal</td>
                      <td className="text-right text-emerald-400 font-bold">{fmtMoney(l.costo_total)}</td>
                      <td className="text-right dark:text-white/40 text-slate-900/40">{l.km_anterior ? l.km_anterior.toLocaleString() : '—'}</td>
                      <td className="text-right dark:text-white/75 text-slate-900/75 font-bold">{l.km_actual > 0 ? l.km_actual.toLocaleString() : '—'}</td>
                      <td className="text-right text-yellow-400 font-bold">{rend !== '—' ? `${rend} km/gal` : '—'}</td>
                      <td>
                        <button onClick={() => removeLog(l.id)} className="icon-btn danger ml-auto block">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Registrar carga ── */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-3xl p-6"
               style={{
                 background: isDark ? 'linear-gradient(150deg, #1E1E28 0%, #161620 100%)' : '#FFFFFF',
                 border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC',
                 boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.6)' : '0 24px 60px rgba(0,0,0,0.12)',
               }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black dark:text-white text-slate-900">Registrar carga</h2>
                <p className="text-[12px] dark:text-white/35 text-slate-900/35">Nuevo registro de combustible</p>
              </div>
              <button onClick={() => setOpen(false)} className="icon-btn"><X size={16} /></button>
            </div>

            <div className="space-y-3">

              {/* Fila 1: Moto + Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] dark:text-white/40 text-slate-900/40 font-bold uppercase tracking-wider mb-1.5">Moto *</label>
                  <select className="gm-select-d w-full" value={form.id_moto}
                    onChange={e => onMotoChange(e.target.value)}>
                    <option value="">Seleccionar</option>
                    {motos.map(m => <option key={m.id_moto} value={m.id_moto}>{m.placa} — {m.marca}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] dark:text-white/40 text-slate-900/40 font-bold uppercase tracking-wider mb-1.5">Fecha *</label>
                  <input type="date" className="gm-input-d w-full" value={form.fecha} onChange={f('fecha')} />
                </div>
              </div>

              {/* Fila 2: Tipo combustible */}
              <div>
                <label className="block text-[11px] dark:text-white/40 text-slate-900/40 font-bold uppercase tracking-wider mb-1.5">
                  Tipo de combustible *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COMBUSTIBLES.map(c => (
                    <button
                      key={c.tipo}
                      type="button"
                      onClick={() => f('tipo_combustible')({ target: { value: c.tipo } } as React.ChangeEvent<HTMLSelectElement>)}
                      className="py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center leading-tight"
                      style={form.tipo_combustible === c.tipo
                        ? { background: `${c.color}25`, color: c.color, border: `1px solid ${c.color}60` }
                        : isDark
                          ? { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }
                          : { background: 'rgba(0,0,0,0.03)', color: 'rgba(21,21,27,0.6)', border: '1px solid #E4E7EC' }
                      }
                    >
                      {c.label.split(' ')[0]}<br/>
                      <span className="text-[10px] opacity-75">${Number(precios[c.tipo] ?? c.precio).toFixed(2)}/gal</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fila 3: Galones + Costo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] dark:text-white/40 text-slate-900/40 font-bold uppercase tracking-wider mb-1.5">Galones *</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 2.5"
                    className="gm-input-d w-full" value={form.litros} onChange={f('litros')} />
                </div>
                <div>
                  <label className="block text-[11px] dark:text-white/40 text-slate-900/40 font-bold uppercase tracking-wider mb-1.5">
                    Costo total USD
                    {form.litros && (
                      <span className="dark:text-white/25 text-slate-900/25 normal-case font-normal ml-1">
                        (est. ${costoEst})
                      </span>
                    )}
                  </label>
                  <input type="number" step="0.01" min="0" placeholder={costoEst}
                    className="gm-input-d w-full" value={form.costo_total} onChange={f('costo_total')} />
                </div>
              </div>

              {/* Fila 4: Km anterior + Km actual */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] dark:text-white/40 text-slate-900/40 font-bold uppercase tracking-wider mb-1.5">
                    Km anterior
                    <span className="text-[10px] text-emerald-400/70 font-normal normal-case ml-1">(auto)</span>
                  </label>
                  <input type="number" min="0" placeholder="0"
                    className="gm-input-d w-full"
                    value={form.km_anterior} onChange={f('km_anterior')} />
                </div>
                <div>
                  <label className="block text-[11px] dark:text-white/40 text-slate-900/40 font-bold uppercase tracking-wider mb-1.5">
                    Km actual
                    <span className="text-[10px] dark:text-white/25 text-slate-900/25 font-normal normal-case ml-1">(odómetro)</span>
                  </label>
                  <input type="number" min="0" placeholder="Leer del odómetro"
                    className="gm-input-d w-full" value={form.km_actual} onChange={f('km_actual')} />
                </div>
              </div>
              {form.km_anterior && form.km_actual && Number(form.km_actual) > Number(form.km_anterior) && (
                <p className="text-[11px] text-emerald-400/70 -mt-1">
                  Recorridos: <b>{(Number(form.km_actual) - Number(form.km_anterior)).toLocaleString()} km</b>
                  {form.litros && Number(form.litros) > 0 && (
                    <span className="dark:text-white/40 text-slate-900/40 ml-2">
                      → <b className="text-yellow-400">{((Number(form.km_actual) - Number(form.km_anterior)) / Number(form.litros)).toFixed(1)} km/gal</b>
                    </span>
                  )}
                </p>
              )}

              {/* Notas */}
              <div>
                <label className="block text-[11px] dark:text-white/40 text-slate-900/40 font-bold uppercase tracking-wider mb-1.5">Notas</label>
                <input type="text" placeholder="Gasolinera, observaciones…"
                  className="gm-input-d w-full" value={form.notas} onChange={f('notas')} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm dark:text-white/40 text-slate-900/40 border border-white/[0.08] hover:border-white/15 transition-all">
                Cancelar
              </button>
              <button
                onClick={addLog}
                disabled={saving || !form.id_moto || !form.fecha || !form.litros}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm dark:text-white text-slate-900 transition-all disabled:opacity-40"
                style={{ background: '#E11428' }}
              >
                {saving ? 'Guardando…' : 'Guardar registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
