/* ─────────────────────────────────────────────
   GORILA MOTOS — Ficha de Empleado / Mecánico
   Tabs: Resumen financiero · Pagos · Permisos
   ───────────────────────────────────────────── */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import {
  ChevronLeft, Wrench, DollarSign, ShieldCheck, Plus, Trash2,
  TrendingUp, BarChart2, Calendar, FileText, CheckSquare, Square,
} from 'lucide-react';
import { usuariosApi, pagosEmpleadoApi, type PagoEmpleadoAPI } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { fmtDate, fmtMoney, initials, getErrorMsg, parsePermisos, setPermisos } from '../../lib/utils';
import { MODULOS, type ModuloKey, type PermisosEmpleado } from '../../lib/finanzasEmpleado';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import type { Usuario } from '../../types';

type Tab = 'resumen' | 'pagos' | 'permisos';

type ConceptoPago = 'Sueldo' | 'Bono' | 'Comisión' | 'Anticipo' | 'Otro';
const CONCEPTOS: ConceptoPago[] = ['Sueldo', 'Bono', 'Comisión', 'Anticipo', 'Otro'];
const MES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/* ─── Mini bar chart SVG ─── */
function BarChart({ data }: { data: { mes: number; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map(({ mes, total }) => {
        const h = Math.max((total / max) * 100, total > 0 ? 8 : 2);
        return (
          <div key={mes} className="flex-1 flex flex-col items-center gap-1 group" title={`${MES_LABELS[mes]}: ${fmtMoney(total)}`}>
            <div
              className="w-full rounded-t-sm transition-all duration-700"
              style={{
                height: `${h}%`,
                background: total > 0
                  ? 'linear-gradient(to top, rgba(225,20,40,0.8), rgba(225,20,40,0.3))'
                  : 'rgba(255,255,255,0.04)',
                boxShadow: total > 0 ? '0 0 8px rgba(225,20,40,0.3)' : undefined,
              }}
            />
            <span className="text-[9px] text-white/20 group-hover:text-white/50 transition-colors">
              {MES_LABELS[mes].slice(0, 1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Tab: Resumen ─── */
function TabResumen({ idEmpleado }: { idEmpleado: number }) {
  const [pagos, setPagos] = useState<PagoEmpleadoAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const anio = new Date().getFullYear();

  useEffect(() => {
    pagosEmpleadoApi.listByEmployee(idEmpleado)
      .then(({ data }) => setPagos(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [idEmpleado]);

  const delAnio = pagos.filter(p => p.fecha.startsWith(String(anio)));
  const porMes  = Array.from({ length: 12 }, (_, m) => ({
    mes: m,
    total: delAnio
      .filter(p => Number(p.fecha.slice(5, 7)) === m + 1)
      .reduce((s, p) => s + Number(p.monto), 0),
  }));
  const totalYTD       = delAnio.reduce((s, p) => s + Number(p.monto), 0);
  const mesActual      = new Date().getMonth() + 1;
  const totalMesActual = delAnio
    .filter(p => Number(p.fecha.slice(5, 7)) === mesActual)
    .reduce((s, p) => s + Number(p.monto), 0);
  const promedio       = delAnio.length ? totalYTD / delAnio.length : 0;
  const ultimo         = pagos[0] ?? null;

  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="gm-card-d rounded-2xl p-5 h-20 skeleton-d" />)}
      </div>
    );
  }

  const KPIs = [
    { label: 'Total YTD',    value: fmtMoney(totalYTD),       icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Mes actual',   value: fmtMoney(totalMesActual), icon: Calendar,   color: 'text-blue-400'    },
    { label: 'Nº de pagos',  value: String(delAnio.length),   icon: FileText,   color: 'text-amber-400'   },
    { label: 'Promedio',     value: fmtMoney(promedio),       icon: BarChart2,  color: 'text-violet-400'  },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPIs.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="gm-card-d rounded-2xl p-5">
            <Icon size={16} className={`${color} mb-3`} />
            <p className="text-xl font-black text-white/90 tabular-nums">{value}</p>
            <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="gm-card-d rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-bold text-white/85">Distribución {anio}</p>
            <p className="text-[11px] text-white/30 mt-0.5">Total pagado por mes</p>
          </div>
          <span className="text-[10px] tracking-[0.25em] uppercase text-white/25 font-semibold">12 meses</span>
        </div>
        <BarChart data={porMes} />
      </div>

      {ultimo && (
        <div className="gm-card-d rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gm-red/10 border border-gm-red/20 flex items-center justify-center shrink-0">
            <DollarSign size={16} className="text-gm-red" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-white/30 mb-0.5">Último pago registrado</p>
            <p className="text-sm font-bold text-white/85">
              {fmtMoney(Number(ultimo.monto))} — {ultimo.concepto}
            </p>
            <p className="text-[11px] text-white/35">{fmtDate(ultimo.fecha)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tab: Pagos ─── */
function TabPagos({ idEmpleado }: { idEmpleado: number }) {
  const toast   = useToast();
  const [pagos, setPagos]   = useState<PagoEmpleadoAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fecha:    new Date().toISOString().slice(0, 10),
    concepto: 'Sueldo' as ConceptoPago,
    monto:    '',
    notas:    '',
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await pagosEmpleadoApi.listByEmployee(idEmpleado);
      setPagos(Array.isArray(data) ? data : []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [idEmpleado]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleGuardar = async () => {
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) { toast.error('Ingresa un monto válido'); return; }
    setSaving(true);
    try {
      await pagosEmpleadoApi.create({
        id_empleado: idEmpleado,
        fecha:    form.fecha,
        concepto: form.concepto,
        monto,
        notas: form.notas || undefined,
      });
      toast.success('Pago registrado');
      setModal(false);
      setForm({ fecha: new Date().toISOString().slice(0, 10), concepto: 'Sueldo', monto: '', notas: '' });
      cargar();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSaving(false); }
  };

  const handleEliminar = async (id: number) => {
    try {
      await pagosEmpleadoApi.remove(id);
      setPagos(prev => prev.filter(p => p.id_pago !== id));
      toast.success('Pago eliminado');
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const VARIANT_CONCEPTO: Record<string, string> = {
    Sueldo:   'text-emerald-400',
    Bono:     'text-amber-400',
    Comisión: 'text-blue-400',
    Anticipo: 'text-violet-400',
    Otro:     'text-white/45',
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={<Plus size={14} />} onClick={() => setModal(true)}>Registrar pago</Button>
      </div>

      <div className="gm-card-d rounded-2xl overflow-hidden">
        <div className="overflow-x-auto dark-scroll">
          <table className="gm-table-d">
            <thead>
              <tr>
                <th>Fecha</th><th>Concepto</th><th>Monto</th><th>Notas</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i}>{[60,80,80,120,40].map((w,j) => (
                    <td key={j} className="px-4 py-3.5"><div className="skeleton-d h-3.5 rounded" style={{width:w}} /></td>
                  ))}</tr>
                ))
              ) : pagos.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="py-14 text-center flex flex-col items-center gap-3">
                      <DollarSign size={28} className="text-white/12" />
                      <p className="text-sm text-white/25">Sin pagos registrados</p>
                    </div>
                  </td>
                </tr>
              ) : pagos.map((p) => (
                <tr key={p.id_pago}>
                  <td className="text-white/35 text-xs whitespace-nowrap">{fmtDate(p.fecha)}</td>
                  <td>
                    <span className={`text-sm font-semibold ${VARIANT_CONCEPTO[p.concepto] ?? 'text-white/45'}`}>
                      {p.concepto}
                    </span>
                  </td>
                  <td className="font-black text-white/85 tabular-nums">{fmtMoney(Number(p.monto))}</td>
                  <td className="text-white/35 text-xs max-w-[180px] truncate">{p.notas ?? '—'}</td>
                  <td>
                    <button
                      onClick={() => handleEliminar(p.id_pago)}
                      className="icon-btn danger"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Registrar pago"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleGuardar}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Concepto</label>
            <select
              className="gm-select-d w-full"
              value={form.concepto}
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value as ConceptoPago }))}
            >
              {CONCEPTOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Fecha</label>
            <input
              type="date"
              className="gm-input-d"
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Monto ($)</label>
            <input
              type="number"
              className="gm-input-d"
              placeholder="0.00"
              step="0.01"
              value={form.monto}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Notas (opcional)</label>
            <input
              type="text"
              className="gm-input-d"
              placeholder="Nota interna..."
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Tab: Permisos ─── */
function TabPermisos({
  empleado,
  onUpdate,
}: {
  empleado: Usuario;
  onUpdate: (desc: string) => void;
}) {
  const toast    = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  /* Leer permisos actuales desde descripcion del backend */
  const getInitial = (): PermisosEmpleado => {
    const lista = parsePermisos(empleado.descripcion);
    const base  = {} as PermisosEmpleado;
    for (const { key } of MODULOS) {
      base[key as ModuloKey] = lista ? lista.includes(key) : true;
    }
    return base;
  };
  const [permisos, setPermisoState] = useState<PermisosEmpleado>(getInitial);

  const todosActivos   = MODULOS.every(({ key }) => permisos[key as ModuloKey]);
  const ningunoActivo  = MODULOS.every(({ key }) => !permisos[key as ModuloKey]);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const modulos    = MODULOS.filter(({ key }) => permisos[key as ModuloKey]).map(m => m.key);
      const nuevaDesc  = setPermisos(empleado.descripcion, modulos);
      await usuariosApi.update(empleado.id_usuario, { descripcion: nuevaDesc });
      onUpdate(nuevaDesc);
      toast.success('Permisos guardados — el mecánico debe cerrar sesión para que tomen efecto');
      navigate('/perfiles');
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">
          Activa o desactiva el acceso a cada módulo del sistema para este empleado.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              const all = {} as PermisosEmpleado;
              MODULOS.forEach(({ key }) => { all[key as ModuloKey] = true; });
              setPermisoState(all);
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.18]"
          >
            <CheckSquare size={12} /> Seleccionar todo
          </button>
          <button
            onClick={() => {
              const none = {} as PermisosEmpleado;
              MODULOS.forEach(({ key }) => { none[key as ModuloKey] = false; });
              setPermisoState(none);
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/[0.18]"
          >
            <Square size={12} /> Quitar todo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULOS.map(({ key, label }) => {
          const enabled = permisos[key as ModuloKey];
          return (
            <button
              key={key}
              onClick={() => setPermisoState(p => ({ ...p, [key as ModuloKey]: !p[key as ModuloKey] }))}
              className={`gm-card-d rounded-xl p-4 flex items-center gap-4 text-left transition-all duration-200 ${
                enabled ? 'border-gm-red/35 bg-gm-red/[0.05]' : 'hover:border-white/[0.1]'
              }`}
            >
              <div className={`w-10 h-6 rounded-full relative transition-all duration-300 ${
                enabled ? 'bg-gm-red shadow-[0_0_12px_rgba(225,20,40,0.5)]' : 'bg-white/[0.08]'
              }`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                  enabled ? 'left-5' : 'left-1'
                }`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${enabled ? 'text-white/90' : 'text-white/40'}`}>{label}</p>
                <p className="text-[11px] text-white/25">{enabled ? 'Con acceso' : 'Sin acceso'}</p>
              </div>
            </button>
          );
        })}
      </div>

      {(todosActivos || ningunoActivo) && (
        <div className={`rounded-xl px-4 py-2.5 text-[11px] font-semibold ${
          ningunoActivo
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
        }`}>
          {ningunoActivo
            ? '⚠ Sin ningún permiso el mecánico no podrá acceder a ningún módulo.'
            : '✓ Acceso completo a todos los módulos activado.'}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button loading={saving} onClick={handleGuardar}>
          <ShieldCheck size={14} /> Guardar permisos
        </Button>
      </div>
    </div>
  );
}

/* ─── Página principal ─── */
export default function EmpleadoDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast    = useToast();
  const pageRef  = useRef<HTMLDivElement>(null);

  const idEmpleado = Number(id);
  const [empleado, setEmpleado] = useState<Usuario | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>('resumen');

  useEffect(() => {
    usuariosApi.get(idEmpleado)
      .then(({ data }) => setEmpleado(data as Usuario))
      .catch(() => { toast.error('Empleado no encontrado'); navigate('/perfiles'); })
      .finally(() => setLoading(false));
  }, [idEmpleado, navigate, toast]);

  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.header-enter', { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.06, ease: 'power3.out', overwrite: 'auto' });
      gsap.fromTo('.section-enter', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', delay: 0.2, overwrite: 'auto' });
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Wrench size={28} className="mx-auto text-gm-red animate-spin" />
          <p className="text-white/30 text-sm">Cargando ficha...</p>
        </div>
      </div>
    );
  }

  if (!empleado) return null;

  const TABS: { id: Tab; label: string; icon: typeof Wrench }[] = [
    { id: 'resumen',  label: 'Resumen',  icon: BarChart2   },
    { id: 'pagos',    label: 'Pagos',    icon: DollarSign  },
    { id: 'permisos', label: 'Permisos', icon: ShieldCheck },
  ];

  return (
    <div ref={pageRef} className="space-y-7 pb-8">

      {/* ─── Back + Header ─── */}
      <div className="header-enter">
        <Link
          to="/perfiles"
          className="inline-flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors font-semibold tracking-wide mb-4"
        >
          <ChevronLeft size={13} /> Volver a Perfiles
        </Link>

        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black border shrink-0"
            style={{
              background: 'rgba(225,20,40,0.12)',
              borderColor: 'rgba(225,20,40,0.3)',
              color: '#E11428',
              boxShadow: '0 0 30px rgba(225,20,40,0.15)',
            }}
          >
            {initials(empleado.nombre_completo)}
          </div>

          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 font-semibold mb-1">Ficha de empleado</p>
            <h1 className="text-2xl font-black text-white leading-tight">{empleado.nombre_completo}</h1>
            <p className="text-white/40 text-sm mt-0.5 flex items-center gap-2">
              <Wrench size={11} className="text-gm-red" /> Mecánico · {empleado.correo}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="section-enter tab-nav max-w-sm">
        {TABS.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={`tab-btn flex items-center justify-center gap-1.5 ${tab === tabId ? 'active' : ''}`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Contenido de tab ─── */}
      <div className="section-enter">
        {tab === 'resumen'  && <TabResumen  idEmpleado={idEmpleado} />}
        {tab === 'pagos'    && <TabPagos    idEmpleado={idEmpleado} />}
        {tab === 'permisos' && (
          <TabPermisos
            empleado={empleado}
            onUpdate={desc => setEmpleado(e => e ? { ...e, descripcion: desc } : e)}
          />
        )}
      </div>
    </div>
  );
}
