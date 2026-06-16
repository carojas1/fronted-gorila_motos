/* ─────────────────────────────────────────────
   GORILA MOTOS — Registros de Servicio
   5 estados · Nueva Orden · Historial cliente
   Impresión · Teléfono admin · Km auto-llenado
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, Wrench, CheckCircle, Clock, Loader, ChevronRight,
  Plus, Printer, Phone, Package, FileText, History, X, Gauge,
  Bike, UserPlus, Zap, AlertTriangle,
} from 'lucide-react';
import gsap from 'gsap';
import { registrosApi, usuariosApi, motosApi, tiposApi, authApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  fmtDate, fmtMoney, getErrorMsg, ESTADO_REGISTRO, extractPhone, toIsoStr,
} from '../../lib/utils';
import { calcularEstadoLocal } from '../../lib/mantenimiento';
import type { RegistroDetalle, Usuario, Moto, Tipo } from '../../types';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

/* ─── Estados disponibles ─── */
const ESTADOS = [
  { value: -1, label: 'Todos',      icon: null         },
  { value: 0,  label: 'Pendiente',  icon: Clock        },
  { value: 1,  label: 'En proceso', icon: Loader       },
  { value: 2,  label: 'Completado', icon: CheckCircle  },
  { value: 3,  label: 'Entregado',  icon: Package      },
  { value: 4,  label: 'Facturado',  icon: FileText     },
];

type BadgeVar = 'warning' | 'info' | 'success' | 'purple' | 'teal' | 'default';
const VARIANT_MAP: Record<number, BadgeVar> = {
  0: 'warning', 1: 'info', 2: 'success', 3: 'purple', 4: 'teal',
};

/* Partes que el cliente puede reportar con falla al ingresar la moto */
const PARTES_FALLA = [
  'Motor', 'Frenos', 'Llantas', 'Transmisión / Cadena', 'Suspensión',
  'Sistema eléctrico', 'Carrocería', 'Refrigeración', 'Embrague',
  'Luces', 'Batería', 'Escape',
];

function SkeletonRow() {
  return (
    <tr>
      {[72, 130, 80, 110, 60, 70, 80, 90].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton-d h-3.5 rounded-md" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Buscador con dropdown ─── */
function SearchDropdown<T>({
  label, placeholder, items, selected, onSelect, getLabel, getSubLabel,
}: {
  label: string;
  placeholder: string;
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  getLabel: (item: T) => string;
  getSubLabel?: (item: T) => string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = items.filter((it) =>
    getLabel(it).toLowerCase().includes(q.toLowerCase()) ||
    (getSubLabel && getSubLabel(it).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="relative">
      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      {selected ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-gm-red/10 border border-gm-red/30">
          <div>
            <p className="text-sm font-bold text-white/90">{getLabel(selected)}</p>
            {getSubLabel && <p className="text-xs text-white/40">{getSubLabel(selected)}</p>}
          </div>
          <button onClick={() => { onSelect(null as unknown as T); setQ(''); }} className="text-white/30 hover:text-gm-red">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            className="gm-input-d w-full pr-8"
            placeholder={placeholder}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        </div>
      )}
      {open && !selected && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border border-white/[0.08] overflow-hidden dark-scroll max-h-48 overflow-y-auto"
          style={{ background: '#1C1C24', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {filtered.slice(0, 8).map((item, i) => (
            <button
              key={i}
              className="w-full text-left px-4 py-2.5 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0"
              onMouseDown={() => { onSelect(item); setQ(''); setOpen(false); }}
            >
              <p className="text-sm font-medium text-white/85">{getLabel(item)}</p>
              {getSubLabel && <p className="text-xs text-white/35">{getSubLabel(item)}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════ PÁGINA PRINCIPAL ══════════════════ */
export default function RecordsPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const toast   = useToast();
  const { user: me, isAdmin } = useAuth();

  /* ─── Estado principal ─── */
  const [registros,  setRegistros]  = useState<RegistroDetalle[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [estadoFlt,  setEstadoFlt]  = useState(-1);
  const [updating,   setUpdating]   = useState<number | null>(null);

  /* ─── Datos auxiliares ─── */
  const [usuarios,   setUsuarios]   = useState<Usuario[]>([]);
  const [tipos,      setTipos]      = useState<Tipo[]>([]);
  const [todasMotos, setTodasMotos] = useState<Moto[]>([]);

  /* ─── Nueva Orden ─── */
  const [newOrderOpen,   setNewOrderOpen]   = useState(false);
  const [nCliente,       setNCliente]       = useState<Usuario | null>(null);
  const [nMoto,          setNMoto]          = useState<Moto | null>(null);
  const [nTipo,          setNTipo]          = useState<Tipo | null>(null);
  const [nKm,            setNKm]            = useState('');
  const [nObs,           setNObs]           = useState('');
  const [nManCustom,     setNManCustom]     = useState('');
  const [nPartes,        setNPartes]        = useState<string[]>([]);
  const [creatingOrder,  setCreatingOrder]  = useState(false);

  /* ─── Búsqueda por placa + creación rápida ─── */
  const [plateQuery,    setPlateQuery]    = useState('');
  const [showQuick,     setShowQuick]     = useState(false);
  const [creatingQuick, setCreatingQuick] = useState(false);
  const [qNombre,       setQNombre]       = useState('');
  const [qTelefono,     setQTelefono]     = useState('');
  const [qCedula,       setQCedula]       = useState('');
  const [qMarca,        setQMarca]        = useState('');
  const [qModelo,       setQModelo]       = useState('');
  const [qCc,           setQCc]           = useState('');
  const [qTipoMoto,     setQTipoMoto]     = useState('Otro');

  /* ─── Completar con precio ─── */
  const [priceTarget,   setPriceTarget]   = useState<RegistroDetalle | null>(null);
  const [priceValue,    setPriceValue]    = useState('');
  const [savingPrice,   setSavingPrice]   = useState(false);

  /* ─── Historial cliente ─── */
  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [historyName,   setHistoryName]   = useState('');
  const [clientHistory, setClientHistory] = useState<RegistroDetalle[]>([]);

  /* ─── Carga de datos ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, uRes, mRes, tRes] = await Promise.allSettled([
        registrosApi.list(),
        usuariosApi.list(),
        motosApi.list(),
        tiposApi.list(),
      ]);
      if (rRes.status === 'fulfilled') setRegistros(rRes.value.data as RegistroDetalle[]);
      if (uRes.status === 'fulfilled') setUsuarios(uRes.value.data as Usuario[]);
      if (mRes.status === 'fulfilled') setTodasMotos(mRes.value.data as Moto[]);
      if (tRes.status === 'fulfilled') setTipos(tRes.value.data as Tipo[]);
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Animación ─── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo('.header-enter', { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05 })
        .fromTo('.card-enter',   { y: 32, opacity: 0, scale: 0.96 },
          { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.6, clearProps: 'transform' }, '-=0.25')
        .fromTo('.section-enter',{ y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3');
    }, pageRef);
    return () => ctx.revert();
  }, []);

  /* ─── Avanzar estado ─── */
  const cambiarEstado = async (id: number, nuevoEstado: number) => {
    // Al pasar a Completado (2): pedir el precio del servicio → genera la factura
    if (nuevoEstado === 2) {
      const reg = registros.find(r => r.id_registro === id);
      if (reg) {
        setPriceTarget(reg);
        setPriceValue(reg.costo_total ? String(reg.costo_total) : '');
        return;
      }
    }
    setUpdating(id);
    try {
      await registrosApi.estado(id, nuevoEstado);
      setRegistros((prev) =>
        prev.map((r) => r.id_registro === id ? { ...r, estado: nuevoEstado } : r),
      );
      toast.success('Estado actualizado');
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setUpdating(null); }
  };

  /* ─── Completar con precio → factura ─── */
  const confirmCompletar = async () => {
    if (!priceTarget) return;
    const precio = parseFloat(priceValue);
    if (isNaN(precio) || precio < 0) { toast.error('Ingresa un precio válido'); return; }
    setSavingPrice(true);
    try {
      // 1. Guardar el precio del servicio en la factura
      await registrosApi.update(priceTarget.id_registro, [
        { idProducto: null, cantidad: 1, descripcion: priceTarget.tipo_servicio || 'Servicio de taller', precioUnitario: precio },
      ] as unknown as Record<string, unknown>);
      // 2. Marcar como Completado
      await registrosApi.estado(priceTarget.id_registro, 2);
      setRegistros(prev => prev.map(r =>
        r.id_registro === priceTarget.id_registro ? { ...r, estado: 2, costo_total: precio } : r));
      toast.success('Servicio completado · factura lista para cobro');
      setPriceTarget(null); setPriceValue('');
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSavingPrice(false); }
  };

  /* ─── Crear nueva orden ─── */
  const resetNewOrder = () => {
    setNCliente(null); setNMoto(null); setNTipo(null);
    setNKm(''); setNObs(''); setNManCustom(''); setNPartes([]);
    setPlateQuery(''); setShowQuick(false);
    setQNombre(''); setQTelefono(''); setQCedula('');
    setQMarca(''); setQModelo(''); setQCc(''); setQTipoMoto('Otro');
  };

  const togglePartes = (parte: string) =>
    setNPartes(prev => prev.includes(parte) ? prev.filter(p => p !== parte) : [...prev, parte]);

  /* Selecciona una moto por placa → fija moto + su propietario */
  const selectMotoByPlate = (m: Moto) => {
    setNMoto(m);
    setNKm(String(m.kilometraje ?? ''));
    setNCliente(usuarios.find(u => u.id_usuario === m.id_usuario) ?? null);
    setPlateQuery('');
    setShowQuick(false);
  };

  /* Tipo por defecto cuando no se elige uno (DB exige id_tipo): Diagnóstico/Revisión/primero */
  const tipoPorDefecto = (): Tipo | null => {
    if (!tipos.length) return null;
    const pref = ['diagn', 'revis', 'general', 'mantenim'];
    for (const p of pref) {
      const t = tipos.find(x => x.nombre.toLowerCase().includes(p));
      if (t) return t;
    }
    return tipos[0];
  };

  /* Crear cliente + moto al instante (cliente sin tiempo) */
  const crearRapido = async () => {
    if (!plateQuery.trim() || !qNombre.trim() || !qMarca.trim() || !qModelo.trim() || !qCc) {
      toast.error('Completa: placa, nombre del cliente, marca, modelo y cilindraje');
      return;
    }
    setCreatingQuick(true);
    try {
      const base = (qNombre.trim().split(' ')[0] || 'cliente').toLowerCase().replace(/[^a-z0-9]/gi, '').slice(0, 12);
      const correo = `${base}.${plateQuery.trim().toLowerCase().replace(/[^a-z0-9]/gi, '')}@gmotors.local`;
      const pass   = qCedula.trim() || qTelefono.trim() || 'gorila123';

      // 1. Crear cliente
      await authApi.register({
        nombre_completo: qNombre.trim(),
        nombre_usuario:  `${base}_${Math.floor(Math.random() * 9000 + 1000)}`,
        correo,
        contrasena:      pass,
        descripcion:     `CEDULA: ${qCedula.trim() || 'N/A'} | TELEFONO: ${qTelefono.trim() || 'N/A'}`,
        pais: 'Ecuador', ciudad: 'Ecuador',
      });

      // 2. Recuperar el nuevo cliente
      const { data: freshUsers } = await usuariosApi.list();
      const nuevo = (freshUsers as Usuario[]).find(u => u.correo === correo);
      if (!nuevo?.id_usuario) throw new Error('No se pudo crear el cliente');

      // 3. Crear la moto a su nombre
      const { data: nuevaMoto } = await motosApi.create({
        placa:       plateQuery.trim().toUpperCase(),
        marca:       qMarca.trim(),
        modelo:      qModelo.trim(),
        anio:        new Date().getFullYear(),
        tipo_moto:   qTipoMoto,
        cilindraje:  parseInt(qCc, 10),
        kilometraje: 0,
        id_usuario:  nuevo.id_usuario,
      });

      toast.success('Cliente y moto creados — el cliente puede completar sus datos luego');
      // Refrescar listas y seleccionar
      const [uRes, mRes] = await Promise.allSettled([usuariosApi.list(), motosApi.list()]);
      if (uRes.status === 'fulfilled') setUsuarios(uRes.value.data as Usuario[]);
      if (mRes.status === 'fulfilled') setTodasMotos(mRes.value.data as Moto[]);
      setNMoto(nuevaMoto as Moto);
      setNCliente(nuevo);
      setNKm('0');
      setShowQuick(false);
      setPlateQuery('');
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setCreatingQuick(false); }
  };

  const createOrder = async () => {
    if (!nMoto || !nKm || !me) {
      toast.error('Selecciona una moto (por placa) e ingresa el kilometraje');
      return;
    }
    const cliente = nCliente ?? usuarios.find(u => u.id_usuario === nMoto.id_usuario);
    const tipo    = nTipo ?? tipoPorDefecto();
    if (!cliente || !tipo) {
      toast.error('Falta el propietario de la moto o no hay tipos de servicio configurados');
      return;
    }
    setCreatingOrder(true);
    try {
      const fallaTxt = nPartes.length ? `Fallas reportadas: ${nPartes.join(', ')}.` : '';
      const descripcionDetalle = nManCustom
        ? `${tipo.nombre} — ${nManCustom}`
        : (nTipo ? tipo.nombre : 'Ingreso / diagnóstico');
      const obsFinal = [fallaTxt, (nObs || nManCustom)].filter(Boolean).join(' ')
        || 'Sin observaciones adicionales';

      await registrosApi.create({
        idCliente:   cliente.id_usuario,
        idEncargado: me.id_usuario,
        idMoto:      nMoto.id_moto,
        idTipo:      tipo.id_tipo,
        estado:      1, // arranca En proceso — el precio se agrega después
        observaciones: obsFinal,
        kilometraje: parseInt(nKm, 10),
        detalles: [{
          cantidad:        1,
          idProducto:      null,
          descripcion:     fallaTxt ? `${descripcionDetalle} (${nPartes.join(', ')})` : descripcionDetalle,
          precioUnitario:  0,
        }],
      });
      toast.success('Orden creada · En proceso');
      setNewOrderOpen(false);
      resetNewOrder();
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setCreatingOrder(false); }
  };

  /* ─── Imprimir orden ─── */
  const printOrder = (r: RegistroDetalle) => {
    const w = window.open('', '_blank', 'width=820,height=700');
    if (!w) { toast.error('Activa las ventanas emergentes para imprimir'); return; }
    w.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <title>GMotors — Orden #${r.id_registro}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;color:#111;background:#fff}
        .brand{font-size:26px;font-weight:900;color:#E11428;letter-spacing:-0.5px}
        .subtitle{font-size:13px;color:#888;margin-top:2px}
        .divider{border:none;border-top:3px solid #E11428;margin:16px 0}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px}
        .field{background:#f5f5f5;border-radius:8px;padding:12px 14px}
        .field label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#999;display:block;margin-bottom:4px}
        .field span{font-size:15px;font-weight:700;color:#111}
        .full{grid-column:1/-1}
        .plate{font-family:monospace;font-size:18px;font-weight:900;letter-spacing:2px;background:#111;color:#fff;padding:4px 10px;border-radius:6px}
        .total-row{display:flex;justify-content:space-between;align-items:center;border-top:2px solid #E11428;padding-top:16px;margin-top:4px}
        .total-label{font-size:14px;color:#666}
        .total-val{font-size:30px;font-weight:900;color:#E11428}
        .footer{margin-top:28px;text-align:center;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:14px}
        @media print{body{padding:14px}}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><div class="brand">GMotors</div><div class="subtitle">Taller de Servicio Técnico</div></div>
        <div style="text-align:right"><div style="font-size:11px;color:#999">Orden de servicio</div>
          <div style="font-size:22px;font-weight:900">#${r.id_registro}</div>
          <div style="font-size:13px;color:#555">${fmtDate(r.fecha)}</div>
        </div>
      </div>
      <hr class="divider"/>
      <div class="grid">
        <div class="field"><label>Cliente</label><span>${r.nombre_cliente}</span></div>
        <div class="field"><label>Placa</label><span class="plate">${r.placa}</span></div>
        <div class="field"><label>Vehículo</label><span>${r.marca_moto ?? ''} ${r.modelo_moto ?? ''}</span></div>
        <div class="field"><label>Tipo de servicio</label><span>${r.tipo_servicio}</span></div>
        ${r.kilometraje ? `<div class="field"><label>Kilometraje al ingreso</label><span>${r.kilometraje.toLocaleString('es-EC')} km</span></div>` : ''}
        <div class="field"><label>Estado</label><span>${ESTADO_REGISTRO[r.estado]?.label ?? '—'}</span></div>
        ${r.descripcion ? `<div class="field full"><label>Observaciones</label><span style="font-weight:400;font-size:13px">${r.descripcion}</span></div>` : ''}
      </div>
      <div class="total-row">
        <span class="total-label">Total del servicio</span>
        <span class="total-val">${fmtMoney(r.costo_total ?? 0)}</span>
      </div>
      <div class="footer">GMotors · Servicio de calidad con garantía · Gracias por su preferencia</div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  /* ─── Historial cliente ─── */
  const openHistory = (nombre: string) => {
    const hist = registros.filter((r) => r.nombre_cliente === nombre);
    setHistoryName(nombre);
    setClientHistory(hist);
    setHistoryOpen(true);
  };

  /* ─── Filtro ─── */
  const filtered = registros.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.nombre_cliente ?? '').toLowerCase().includes(q) ||
      (r.placa ?? '').toLowerCase().includes(q) ||
      (r.tipo_servicio ?? '').toLowerCase().includes(q)
    ) && (estadoFlt === -1 || r.estado === estadoFlt);
  });

  /* ─── Conteos ─── */
  const counts = {
    0: registros.filter((r) => r.estado === 0).length,
    1: registros.filter((r) => r.estado === 1).length,
    2: registros.filter((r) => r.estado === 2).length,
    3: registros.filter((r) => r.estado === 3).length,
    4: registros.filter((r) => r.estado === 4).length,
  };

  /* ─── Motos filtradas por cliente seleccionado ─── */
  const clientMotos = nCliente
    ? todasMotos.filter((m) => m.id_usuario === nCliente.id_usuario)
    : [];

  const clientPhone = isAdmin && nCliente ? extractPhone(nCliente.descripcion) : null;

  /* Motos que coinciden con la placa buscada */
  const plateMatches = plateQuery.trim().length >= 2
    ? todasMotos.filter(m => m.placa.toLowerCase().includes(plateQuery.trim().toLowerCase())).slice(0, 6)
    : [];

  /* Mantenimientos recomendados (vencidos/próximos) para la moto seleccionada */
  const recomendaciones = nMoto
    ? calcularEstadoLocal(nMoto.cilindraje, nMoto.kilometraje)
        .filter(e => e.estado !== 'OK')
        .sort((a, b) => b.porcentajeDesgaste - a.porcentajeDesgaste)
    : [];

  /* ─── Status cards config ─── */
  const STATUS_CARDS = [
    { estado: 0, label: 'Pendientes',  icon: Clock,       color: 'text-amber-400',   glow: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
    { estado: 1, label: 'En proceso',  icon: Loader,      color: 'text-blue-400',    glow: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' },
    { estado: 2, label: 'Completados', icon: CheckCircle, color: 'text-emerald-400', glow: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
    { estado: 3, label: 'Entregados',  icon: Package,     color: 'text-purple-400',  glow: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)' },
    { estado: 4, label: 'Facturados',  icon: FileText,    color: 'text-teal-400',    glow: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.35)' },
  ];

  return (
    <div ref={pageRef} className="space-y-7 pb-8">

      {/* ─── Header ─── */}
      <div className="header-enter flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 font-semibold mb-2 flex items-center gap-2">
            <Wrench size={10} className="text-gm-red" />
            Taller · Servicios
          </p>
          <h1 className="text-[1.9rem] font-black text-white leading-tight tracking-tight">
            Registros de servicio
          </h1>
          <p className="text-white/35 text-sm mt-1">{registros.length} órdenes en total</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setNewOrderOpen(true)}>
          Nueva orden
        </Button>
      </div>

      {/* ─── Status cards (5 estados) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {STATUS_CARDS.map(({ estado: e, label, icon: Icon, color, glow, border }) => {
          const isActive = estadoFlt === e;
          return (
            <button
              key={e}
              onClick={() => setEstadoFlt(isActive ? -1 : e)}
              className="card-enter gm-card-d rounded-2xl p-4 text-left transition-all duration-200 group"
              style={isActive ? { borderColor: border, boxShadow: `0 0 0 1px ${border}40, 0 0 40px ${glow}` } : {}}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={16} className={isActive ? color : 'text-white/25 group-hover:text-white/50'} />
                {isActive && <span className="text-[9px] tracking-[0.2em] uppercase font-bold" style={{ color: border }}>Activo</span>}
              </div>
              <p className={`text-2xl font-black mb-0.5 ${isActive ? color : 'text-white'}`}>{counts[e as keyof typeof counts]}</p>
              <p className="text-[11px] text-white/40 font-medium">{label}</p>
            </button>
          );
        })}
      </div>

      {/* ─── Búsqueda + filtros ─── */}
      <div className="section-enter flex flex-wrap gap-3 items-center">
        <div className="search-d">
          <Search size={14} />
          <input
            className="gm-input-d w-64"
            placeholder="Cliente, placa, tipo de servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ESTADOS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setEstadoFlt(value)}
              className={`filter-chip ${estadoFlt === value ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-white/25">{filtered.length} resultado(s)</span>
      </div>

      {/* ─── Tabla ─── */}
      <div className="section-enter gm-card-d rounded-2xl overflow-hidden">
        <div className="overflow-x-auto dark-scroll">
          <table className="gm-table-d">
            <thead>
              <tr>
                {['Fecha','Cliente','Placa','Servicio','Km','Total','Estado','Acciones'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="py-16 text-center flex flex-col items-center gap-3">
                          <Wrench size={32} className="text-white/12" />
                          <p className="text-sm text-white/25">Sin registros que mostrar</p>
                        </div>
                      </td>
                    </tr>
                  )
                  : filtered.map((r) => {
                    const est     = ESTADO_REGISTRO[r.estado] ?? ESTADO_REGISTRO[0];
                    const variant = VARIANT_MAP[r.estado] ?? 'default';
                    const nextEst = r.estado < 4 ? r.estado + 1 : null;
                    const canPrint = r.estado >= 2;

                    return (
                      <tr key={r.id_registro}>
                        <td className="text-white/35 text-xs whitespace-nowrap">{fmtDate(r.fecha)}</td>
                        <td>
                          <button
                            className="font-semibold text-white/85 hover:text-gm-red transition-colors flex items-center gap-1 group"
                            onClick={() => openHistory(r.nombre_cliente)}
                            title="Ver historial del cliente"
                          >
                            {r.nombre_cliente}
                            <History size={11} className="text-white/20 group-hover:text-gm-red/60" />
                          </button>
                        </td>
                        <td><span className="plate-tag">{r.placa}</span></td>
                        <td className="text-white/45 max-w-[140px] truncate">{r.tipo_servicio}</td>
                        <td className="text-white/40 text-xs tabular-nums whitespace-nowrap">
                          {r.kilometraje ? `${r.kilometraje.toLocaleString('es-EC')} km` : '—'}
                        </td>
                        <td className="font-bold text-white/85 tabular-nums">{fmtMoney(r.costo_total ?? 0)}</td>
                        <td><Badge variant={variant} dot>{est.label}</Badge></td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {nextEst !== null && (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={updating === r.id_registro}
                                onClick={() => cambiarEstado(r.id_registro, nextEst)}
                                iconRight={<ChevronRight size={12} />}
                              >
                                {ESTADO_REGISTRO[nextEst]?.label}
                              </Button>
                            )}
                            {canPrint && (
                              <button
                                onClick={() => printOrder(r)}
                                className="icon-btn"
                                title="Imprimir orden"
                              >
                                <Printer size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════ MODAL NUEVA ORDEN ══════ */}
      <Modal
        open={newOrderOpen}
        onClose={() => { setNewOrderOpen(false); resetNewOrder(); }}
        title="Nueva orden de servicio"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setNewOrderOpen(false); resetNewOrder(); }}>
              Cancelar
            </Button>
            <Button
              onClick={createOrder}
              loading={creatingOrder}
              disabled={!nMoto || !nKm}
            >
              <Plus size={14} /> Crear orden
            </Button>
          </>
        }
      >
        <div className="space-y-5">

          {/* 1 · Buscar moto por PLACA (lo que manda) */}
          {!nMoto ? (
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
                1 · Placa de la moto <span className="text-gm-red">*</span>
                <span className="text-white/25 normal-case font-normal ml-2">lo principal — busca o registra al instante</span>
              </label>
              <div className="relative">
                <Gauge size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                <input
                  className="gm-input-d w-full pl-8 uppercase"
                  placeholder="Ej. ABC-1234"
                  value={plateQuery}
                  onChange={(e) => { setPlateQuery(e.target.value); setShowQuick(false); }}
                  autoFocus
                />
              </div>

              {/* Resultados por placa */}
              {plateQuery.trim().length >= 2 && (
                <div className="mt-2 space-y-2">
                  {plateMatches.length > 0 ? (
                    plateMatches.map((m) => {
                      const owner = usuarios.find(u => u.id_usuario === m.id_usuario);
                      return (
                        <button
                          key={m.id_moto}
                          onClick={() => selectMotoByPlate(m)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all bg-white/[0.02] border-white/[0.06] hover:border-gm-red/40"
                        >
                          <span className="plate-tag text-[11px]">{m.placa}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white/85 truncate">{m.marca} {m.modelo}</p>
                            <p className="text-[11px] text-white/35 truncate">
                              {m.cilindraje}cc · {owner?.nombre_completo ?? 'Sin propietario'}
                            </p>
                          </div>
                          <ChevronRight size={15} className="text-white/25 shrink-0" />
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02]">
                      <p className="text-[12px] text-white/40 mb-2">
                        No existe ninguna moto con placa <strong className="text-white/70">{plateQuery.toUpperCase()}</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setShowQuick(true); setQNombre(''); }}
                        className="flex items-center gap-2 text-[12px] font-bold px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(225,20,40,0.12)', border: '1px solid rgba(225,20,40,0.35)', color: '#FF6470' }}
                      >
                        <UserPlus size={13} /> Registrar moto y cliente al instante
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Creación rápida (cliente sin tiempo) */}
              {showQuick && (
                <div className="mt-3 p-4 rounded-xl space-y-3" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="flex items-center gap-2 text-[12px] font-bold text-blue-300">
                    <Zap size={13} /> Registro rápido — placa {plateQuery.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-white/40 -mt-1">
                    Crea la moto y un cliente básico ahora. El cliente podrá completar sus datos después con calma.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="gm-input-d" placeholder="Nombre del cliente *" value={qNombre} onChange={e => setQNombre(e.target.value)} />
                    <input className="gm-input-d" placeholder="Teléfono / WhatsApp" value={qTelefono} onChange={e => setQTelefono(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="gm-input-d" placeholder="Cédula (opcional)" value={qCedula} onChange={e => setQCedula(e.target.value)} />
                    <select className="gm-select-d" value={qTipoMoto} onChange={e => setQTipoMoto(e.target.value)}>
                      {['Sport','Naked','Touring','Enduro','Scrambler','Cruiser','Scooter','Otro'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input className="gm-input-d" placeholder="Marca *" value={qMarca} onChange={e => setQMarca(e.target.value)} />
                    <input className="gm-input-d" placeholder="Modelo *" value={qModelo} onChange={e => setQModelo(e.target.value)} />
                    <input className="gm-input-d" type="number" placeholder="Cilindraje *" value={qCc} onChange={e => setQCc(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowQuick(false)}
                      className="text-[12px] font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                      Cancelar
                    </button>
                    <button type="button" onClick={crearRapido} disabled={creatingQuick}
                      className="flex items-center gap-2 text-[12px] font-bold px-4 py-2 rounded-lg text-white"
                      style={{ background: creatingQuick ? 'rgba(59,130,246,0.4)' : '#3B82F6' }}>
                      {creatingQuick
                        ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> Creando…</>
                        : <><Plus size={13} /> Crear y continuar</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Moto seleccionada — tarjeta de confirmación */
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gm-red/[0.07] border border-gm-red/25">
              <span className="plate-tag text-[12px]">{nMoto.placa}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white/90 truncate">{nMoto.marca} {nMoto.modelo} · {nMoto.cilindraje}cc</p>
                <p className="text-[11px] text-white/40 flex items-center gap-2">
                  <span>{nCliente?.nombre_completo ?? 'Sin propietario'}</span>
                  {isAdmin && clientPhone && <span className="flex items-center gap-1"><Phone size={9} /> {clientPhone}</span>}
                </p>
              </div>
              <button onClick={() => { setNMoto(null); setNCliente(null); setNKm(''); setNPartes([]); }}
                className="text-[11px] text-white/40 hover:text-white/80 flex items-center gap-1">
                <X size={12} /> Cambiar
              </button>
            </div>
          )}

          {/* Recomendaciones de mantenimiento según km (upsell) */}
          {nMoto && recomendaciones.length > 0 && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p className="flex items-center gap-2 text-[12px] font-bold text-amber-300 mb-2">
                <AlertTriangle size={13} /> Recomendado para esta moto ({nMoto.kilometraje.toLocaleString('es-EC')} km)
              </p>
              <div className="flex flex-wrap gap-2">
                {recomendaciones.map(r => {
                  const active = nPartes.includes(r.label);
                  return (
                    <button key={r.tipo} type="button" onClick={() => togglePartes(r.label)}
                      className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg border transition-all"
                      style={active
                        ? { background: 'rgba(245,158,11,0.2)', borderColor: 'rgba(245,158,11,0.5)', color: '#FBBF24' }
                        : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(245,158,11,0.25)', color: 'rgba(251,191,36,0.75)' }}>
                      {r.label} · {r.estado === 'VENCIDO' ? 'vencido' : `${r.porcentajeDesgaste}%`}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10.5px] text-white/30 mt-2">Toca para sumarlos al servicio sugerido al cliente.</p>
            </div>
          )}

          {/* Partes con falla reportada */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              3 · ¿Qué presenta falla? <span className="text-white/25 normal-case font-normal">(toca las partes reportadas por el cliente)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PARTES_FALLA.map((parte) => {
                const active = nPartes.includes(parte);
                return (
                  <button
                    key={parte}
                    type="button"
                    onClick={() => togglePartes(parte)}
                    className="text-[12px] font-bold px-3 py-1.5 rounded-lg border transition-all"
                    style={active
                      ? { background: 'rgba(225,20,40,0.14)', borderColor: 'rgba(225,20,40,0.45)', color: '#FF6470' }
                      : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
                  >
                    {parte}
                  </button>
                );
              })}
            </div>
            {nPartes.length > 0 && (
              <p className="text-[11px] text-white/35 mt-2">
                {nPartes.length} parte{nPartes.length !== 1 ? 's' : ''} con falla: <span className="text-white/55 font-semibold">{nPartes.join(', ')}</span>
              </p>
            )}
          </div>

          {/* Tipo de mantenimiento — OPCIONAL (se puede definir después) */}
          <SearchDropdown
            label="4 · Tipo de servicio (opcional — se define después)"
            placeholder="Buscar servicio..."
            items={tipos}
            selected={nTipo}
            onSelect={setNTipo}
            getLabel={(t) => t.nombre}
            getSubLabel={(t) => t.descripcion}
          />

          {/* Mantenimiento personalizado */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              5 · Descripción específica <span className="text-white/25 normal-case font-normal">(opcional)</span>
            </label>
            <input
              className="gm-input-d w-full"
              placeholder="Ej: cambio aceite + revisión frenos traseros..."
              value={nManCustom}
              onChange={(e) => setNManCustom(e.target.value)}
            />
          </div>

          {/* Kilometraje — obligatorio */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              6 · Kilometraje actual <span className="text-gm-red">*</span>
              {nMoto && <span className="text-white/25 normal-case font-normal ml-2">(moto registrada: {nMoto.kilometraje.toLocaleString('es-EC')} km)</span>}
            </label>
            <div className="relative">
              <Gauge size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                type="number"
                className="gm-input-d w-full pl-8"
                placeholder="Kilometraje al momento del ingreso"
                value={nKm}
                onChange={(e) => setNKm(e.target.value)}
                min={0}
                required
              />
            </div>
          </div>

          {/* Observaciones generales */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              7 · Observaciones generales <span className="text-white/25 normal-case font-normal">(opcional)</span>
            </label>
            <textarea
              className="gm-input-d w-full resize-none"
              rows={2}
              placeholder="Notas adicionales para el técnico..."
              value={nObs}
              onChange={(e) => setNObs(e.target.value)}
            />
          </div>

        </div>
      </Modal>

      {/* ══════ MODAL COMPLETAR CON PRECIO ══════ */}
      <Modal
        open={!!priceTarget}
        onClose={() => { setPriceTarget(null); setPriceValue(''); }}
        title="Completar servicio"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setPriceTarget(null); setPriceValue(''); }}>Cancelar</Button>
            <Button onClick={confirmCompletar} loading={savingPrice} disabled={!priceValue}>
              <CheckCircle size={14} /> Completar y facturar
            </Button>
          </>
        }
      >
        {priceTarget && (
          <div className="space-y-4">
            <p className="text-[12px] text-white/45 leading-relaxed">
              Ingresa el <strong className="text-white/70">precio del servicio</strong>. Con esto se genera la factura
              a nombre de <strong className="text-white/70">{priceTarget.nombre_cliente}</strong>.
            </p>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[13px] font-bold text-white/85">{priceTarget.marca_moto} {priceTarget.modelo_moto}</p>
              <p className="text-[11px] text-white/40 mt-0.5">
                <span className="plate-tag">{priceTarget.placa}</span> · {priceTarget.tipo_servicio}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">Precio del servicio (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
                <input
                  type="number" min={0} step="0.01" autoFocus
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  placeholder="0.00"
                  className="gm-input-d w-full pl-7"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ══════ MODAL HISTORIAL CLIENTE ══════ */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Historial: ${historyName}`}
        size="xl"
        footer={<Button variant="secondary" onClick={() => setHistoryOpen(false)}>Cerrar</Button>}
      >
        <div className="space-y-2">
          {clientHistory.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8">Sin registros para este cliente</p>
          ) : (
            clientHistory.map((r) => {
              const est     = ESTADO_REGISTRO[r.estado] ?? ESTADO_REGISTRO[0];
              const variant = VARIANT_MAP[r.estado] ?? 'default';
              return (
                <div key={r.id_registro} className="flex items-center gap-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider">{new Date(toIsoStr(r.fecha)+'T00:00:00').toLocaleDateString('es-ES', { month: 'short' })}</p>
                    <p className="text-lg font-black text-white/80">{new Date(toIsoStr(r.fecha)+'T00:00:00').getDate()}</p>
                    <p className="text-[10px] text-white/25">{new Date(toIsoStr(r.fecha)+'T00:00:00').getFullYear()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/85">{r.tipo_servicio}</p>
                    <p className="text-xs text-white/35 truncate mt-0.5">
                      <span className="plate-tag text-[10px] py-0.5 px-1.5 mr-1">{r.placa}</span>
                      {r.descripcion}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-white/80 tabular-nums">{fmtMoney(r.costo_total ?? 0)}</p>
                    <div className="mt-1">
                      <Badge variant={variant} dot>{est.label}</Badge>
                    </div>
                  </div>
                  <button onClick={() => printOrder(r)} className="icon-btn shrink-0" title="Imprimir">
                    <Printer size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Modal>

    </div>
  );
}
