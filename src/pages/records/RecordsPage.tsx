/* ─────────────────────────────────────────────
   GORILA MOTOS — Registros de Servicio
   5 estados · Nueva Orden · Historial cliente
   Impresión · Teléfono admin · Km auto-llenado
   ───────────────────────────────────────────── */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Search, Wrench, CheckCircle, Clock, Loader, ChevronRight,
  Plus, Printer, Phone, Package, FileText, History, X, Gauge,
  UserPlus, Zap, AlertTriangle, CreditCard, MapPin,
} from 'lucide-react';
import gsap from 'gsap';
import { registrosApi, usuariosApi, motosApi, tiposApi, authApi, mantenimientosApi, productosApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../lib/theme';
import {
  fmtDate, fmtMoney, getErrorMsg, ESTADO_REGISTRO, extractPhone, extractCedula, toIsoStr,
} from '../../lib/utils';
import { calcularEstadoLocal } from '../../lib/mantenimiento';
import { WORKSHOP_CONTACT } from '../../lib/constants';
import { usePolling } from '../../hooks/usePolling';
import type { RegistroDetalle, Usuario, Moto, Tipo, Producto } from '../../types';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FacturaEditor from '../../components/registros/FacturaEditor';

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
  const [theme] = useTheme();
  const isDark  = theme === 'dark';
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
        <div className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden dark-scroll max-h-48 overflow-y-auto"
          style={{
            background: isDark ? '#1C1C24' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC',
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.12)',
          }}>
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
  const [theme] = useTheme();
  const isDark  = theme === 'dark';

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
  const [productos,  setProductos]  = useState<Producto[]>([]);

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
  const [qCorreo,       setQCorreo]       = useState('');
  const [qTelefono,     setQTelefono]     = useState('');
  const [qCedula,       setQCedula]       = useState('');
  const [qDireccion,    setQDireccion]    = useState('');
  const [qMarca,        setQMarca]        = useState('');
  const [qModelo,       setQModelo]       = useState('');
  const [qCc,           setQCc]           = useState('');
  const [qTipoMoto,     setQTipoMoto]     = useState('Otro');
  const [nMotoServicios, setNMotoServicios] = useState<Record<string, number>>({});

  /* ─── Editor de factura (mano de obra + repuestos) ─── */
  const [facturaTarget,  setFacturaTarget]  = useState<RegistroDetalle | null>(null);
  const [facturaCompletar, setFacturaCompletar] = useState(false);

  /* ─── Historial cliente ─── */
  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [historyName,   setHistoryName]   = useState('');
  const [clientHistory, setClientHistory] = useState<RegistroDetalle[]>([]);

  /* ─── Estado de impresión (evita doble clic y muestra feedback) ─── */
  const [printingId,     setPrintingId]     = useState<number | null>(null);

  /* ─── Expandir info de cliente ─── */
  const [expandedRecords, setExpandedRecords] = useState<number[]>([]);

  /* ─── Carga de datos ─── */
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [rRes, uRes, mRes, tRes, pRes] = await Promise.allSettled([
        registrosApi.list(),
        usuariosApi.list(),
        motosApi.list(),
        tiposApi.list(),
        productosApi.list(),
      ]);
      if (rRes.status === 'fulfilled') setRegistros(rRes.value.data as RegistroDetalle[]);
      if (uRes.status === 'fulfilled') setUsuarios(uRes.value.data as Usuario[]);
      if (mRes.status === 'fulfilled') setTodasMotos(mRes.value.data as Moto[]);
      if (tRes.status === 'fulfilled') setTipos(tRes.value.data as Tipo[]);
      if (pRes.status === 'fulfilled') setProductos(pRes.value.data as Producto[]);
    } catch (err) { if (!silent) toast.error(getErrorMsg(err)); }
    finally { if (!silent) setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchData(false); }, [fetchData]);

  /* Refresco silencioso: actualiza datos sin re-animar la UI */
  usePolling(() => fetchData(true), { intervalMs: 20_000 });

  /* Mantenimientos (nube) de la moto seleccionada → para las recomendaciones por km */
  useEffect(() => {
    if (!nMoto) { setNMotoServicios({}); return; }
    mantenimientosApi.byMoto(nMoto.id_moto)
      .then(({ data }) => {
        const sm: Record<string, number> = {};
        (data as { tipo: string; kmServicio: number }[]).forEach(x => {
          sm[x.tipo] = Math.max(sm[x.tipo] ?? 0, x.kmServicio);
        });
        setNMotoServicios(sm);
      })
      .catch(() => setNMotoServicios({}));
  }, [nMoto?.id_moto]);

  /* ─── Animación ─── */
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      const headers  = gsap.utils.toArray<HTMLElement>('.header-enter');
      const cards    = gsap.utils.toArray<HTMLElement>('.card-enter');
      const sections = gsap.utils.toArray<HTMLElement>('.section-enter');
      if (headers.length)  gsap.fromTo(headers,  { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out', overwrite: 'auto' });
      if (cards.length)    gsap.fromTo(cards,    { y: 32, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.6, ease: 'power3.out', clearProps: 'transform', overwrite: 'auto', delay: 0.1 });
      if (sections.length) gsap.fromTo(sections, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', overwrite: 'auto', delay: 0.2 });
    }, pageRef);
    return () => ctx.revert();
  }, [loading]);

  /* ─── Avanzar estado ─── */
  const cambiarEstado = async (id: number, nuevoEstado: number) => {
    // Al pasar a Completado (2): abrir el editor de factura (mano de obra + repuestos)
    if (nuevoEstado === 2) {
      const reg = registros.find(r => r.id_registro === id);
      if (reg) { setFacturaTarget(reg); setFacturaCompletar(true); return; }
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

  /* ─── Abrir editor de factura (agregar/editar repuestos en cualquier momento) ─── */
  const abrirFactura = (reg: RegistroDetalle, completar = false) => {
    setFacturaTarget(reg); setFacturaCompletar(completar);
  };

  /* ─── Tras guardar la factura ─── */
  const onFacturaGuardada = (total: number, completo: boolean) => {
    const id = facturaTarget?.id_registro;
    setRegistros(prev => prev.map(r =>
      r.id_registro === id
        ? { ...r, costo_total: total, estado: completo && r.estado < 2 ? 2 : r.estado }
        : r));
    setFacturaTarget(null); setFacturaCompletar(false);
    fetchData();   // refrescar stock/totales reales del backend
  };

  /* ─── Crear nueva orden ─── */
  const resetNewOrder = () => {
    setNCliente(null); setNMoto(null); setNTipo(null);
    setNKm(''); setNObs(''); setNManCustom(''); setNPartes([]);
    setPlateQuery(''); setShowQuick(false);
    setQNombre(''); setQCorreo(''); setQTelefono(''); setQCedula(''); setQDireccion('');
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
    if (!plateQuery.trim() || !qNombre.trim() || !qMarca.trim() || !qModelo.trim() || !qCc || !qTelefono.trim() || !qCedula.trim() || !qDireccion.trim()) {
      toast.error('Nombre, Cédula, Teléfono, Dirección, Placa, Marca, Modelo y Cilindraje son obligatorios');
      return;
    }
    setCreatingQuick(true);
    try {
      const base = (qNombre.trim().split(' ')[0] || 'cliente').toLowerCase().replace(/[^a-z0-9]/gi, '').slice(0, 12);
      /* Si el admin tiene el correo REAL del cliente, se usa ese → el cliente
         podrá iniciar sesión y recuperar su cuenta. Si no, correo interno. */
      const correoReal = qCorreo.trim().toLowerCase();
      const esCorreoValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correoReal);
      const correo = esCorreoValido
        ? correoReal
        : `${base}.${plateQuery.trim().toLowerCase().replace(/[^a-z0-9]/gi, '')}@gmotors.local`;
      const pass   = qCedula.trim() || qTelefono.trim() || 'gorila123';

      // 1. Crear cliente
      await authApi.register({
        nombre_completo: qNombre.trim(),
        nombre_usuario:  `${base}_${Math.floor(Math.random() * 9000 + 1000)}`,
        correo,
        contrasena:      pass,
        descripcion:     `CEDULA: ${qCedula.trim()} | TELEFONO: ${qTelefono.trim()}`,
        direccion:       qDireccion.trim(),
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

  /* ─── Nota de venta profesional ─── */
  const printOrder = async (r: RegistroDetalle) => {
    if (printingId !== null) return;            // evitar doble clic
    setPrintingId(r.id_registro);
    const w = window.open('', '_blank', 'width=900,height=760');
    if (!w) { toast.error('Activa las ventanas emergentes para imprimir'); setPrintingId(null); return; }

    // Datos del cliente
    const cli  = usuarios.find(u => u.nombre_completo === r.nombre_cliente);
    const mec  = usuarios.find(u => u.nombre_completo === r.nombre_encargado);
    const ciCli = cli ? extractCedula(cli.descripcion) : null;
    const telCli = cli ? extractPhone(cli.descripcion) : null;

    // Cargar detalles para desglose mano/repuesto
    let detalles: Array<{descripcion:string|null;subtotal:number;idProducto?:number|null;cantidad?:number}> = [];
    try { const res = await registrosApi.detalles(r.id_factura); detalles = (res.data as typeof detalles) ?? []; } catch { /* sin desglose */ }

    let manoRows = '', repRows = '', manoTotal = 0, repTotal = 0;
    for (const d of detalles) {
      const sub = Number(d.subtotal ?? 0);
      const desc = (d.descripcion ?? '').replace(/^\[MANO\]\s*/i,'').replace(/^\[REP\|?[^\]]*\]\s*/i,'');
      const cant = Number(d.cantidad ?? 1);
      const isRep = d.idProducto != null || /^\[REP/i.test(d.descripcion ?? '');
      if (isRep) {
        repTotal += sub;
        repRows += `<tr><td>${desc}</td><td class="num">${cant}</td><td class="num">${fmtMoney(sub/cant)}</td><td class="num"><b>${fmtMoney(sub)}</b></td></tr>`;
      } else {
        manoTotal += sub;
        manoRows += `<tr><td>${desc}</td><td class="num">${cant}</td><td class="num">${fmtMoney(sub/cant)}</td><td class="num"><b>${fmtMoney(sub)}</b></td></tr>`;
      }
    }

    // Convertir logo a base64 data-URL para que funcione en APK (donde origin = https://localhost
    // y el print window es un WebView separado sin acceso al servidor Capacitor local).
    let logoUrl = `${window.location.origin}/brand/gorila-logo.png`;
    try {
      const logoResp = await fetch(`${window.location.origin}/brand/gorila-logo.png`);
      if (logoResp.ok) {
        const blob = await logoResp.blob();
        logoUrl = await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload  = () => res(fr.result as string);
          fr.onerror = rej;
          fr.readAsDataURL(blob);
        });
      }
    } catch { /* keep URL fallback */ }
    const estLabel = ESTADO_REGISTRO[r.estado]?.label ?? '—';
    const hasDesglose = manoRows || repRows;

    w.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <title>Gorila Motos — Nota de Venta #${r.id_registro}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        body{font-family:'Inter',sans-serif;background:#fff;color:#0F172A;max-width:800px;margin:0 auto;padding:28px 32px}
        /* ── BOTON CERRAR MÓVIL ── */
        .close-btn { position:fixed; top:16px; left:16px; background:rgba(12,12,16,0.9); color:#fff; border:none; padding:10px 16px; border-radius:12px; font-weight:800; font-size:13px; z-index:9999; display:flex; align-items:center; gap:6px; font-family:'Inter',sans-serif; cursor:pointer; box-shadow:0 8px 20px rgba(0,0,0,0.3); }
        .close-btn:active { transform:scale(0.95); }
        /* ── HEADER ── */
        .header{background:linear-gradient(135deg,#0C0C10 0%,#1A1A22 100%);border-radius:18px;padding:22px 28px;display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:20px;}
        .logo-wrap{display:flex;align-items:center;gap:16px}
        .logo-wrap img{width:70px;height:70px;object-fit:contain;filter:brightness(1.15) drop-shadow(0 0 12px rgba(225,20,40,0.5))}
        .brand-text{}
        .brand-name{font-family:'Playfair Display',serif;font-size:28px;font-weight:900;color:#fff;line-height:1}
        .brand-name em{color:#E11428;font-style:normal}
        .brand-sub{font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-top:5px}
        .nota-badge{text-align:right}
        .nota-badge .nota-label{font-family:'Playfair Display',serif;font-size:13px;font-weight:700;color:#F59E0B;letter-spacing:.08em;text-transform:uppercase}
        .nota-badge .nota-num{font-size:26px;font-weight:900;color:#fff;line-height:1.1}
        .nota-badge .nota-date{font-size:10px;color:rgba(255,255,255,.4);margin-top:4px}
        /* ── ESTADO ── */
        .estado-bar{display:flex;align-items:center;justify-content:space-between;background:#F8FAFC;border:1px solid #EEF1F5;border-radius:10px;padding:10px 18px;margin:16px 0}
        .estado-chip{font-size:11px;font-weight:800;padding:4px 12px;border-radius:99px;background:rgba(16,185,129,.12);color:#059669;border:1px solid rgba(16,185,129,.2)}
        /* ── GRID INFO ── */
        .section-title{font-size:10px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#94A3B8;margin:18px 0 8px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
        .info-field{background:#F8FAFC;border:1px solid #EEF1F5;border-radius:10px;padding:11px 14px}
        .info-field label{font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#94A3B8;display:block;margin-bottom:4px;font-weight:700}
        .info-field span{font-size:14px;font-weight:800;color:#0F172A}
        .full{grid-column:1/-1}
        .plate{font-family:'Courier New',monospace;font-size:15px;font-weight:900;letter-spacing:2.5px;background:#0C0C10;color:#fff;padding:3px 10px;border-radius:5px;display:inline-block}
        /* ── TABLA SERVICIOS ── */
        .sec-header{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px 8px 0 0;margin-top:14px}
        .sec-header.mo{background:linear-gradient(90deg,rgba(59,130,246,.15),rgba(59,130,246,.04))}
        .sec-header.rep{background:linear-gradient(90deg,rgba(245,158,11,.15),rgba(245,158,11,.04))}
        .sec-icon{width:8px;height:20px;border-radius:3px}
        .sec-icon.mo{background:#3B82F6}
        .sec-icon.rep{background:#F59E0B}
        .sec-label{font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
        .sec-label.mo{color:#3B82F6}
        .sec-label.rep{color:#F59E0B}
        .sec-sub{font-size:11px;font-weight:700;margin-left:auto}
        .sec-sub.mo{color:#3B82F6}
        .sec-sub.rep{color:#F59E0B}
        table{width:100%;border-collapse:collapse;font-size:12px}
        thead th{font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#94A3B8;padding:6px 10px;text-align:left;border-bottom:1px solid #EEF1F5}
        thead th.num{text-align:right}
        tbody tr td{padding:7px 10px;border-bottom:1px dashed #F1F5F9;color:#0F172A}
        tbody tr:last-child td{border-bottom:none}
        .num{text-align:right}
        tbody tr.mo-row td:first-child{border-left:3px solid #3B82F6;padding-left:9px}
        tbody tr.rep-row td:first-child{border-left:3px solid #F59E0B;padding-left:9px}
        /* ── TOTALES ── */
        .totals-wrap{margin-top:16px;display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:10px}
        .total-box{border-radius:12px;padding:14px 16px}
        .total-box.mo{background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.2)}
        .total-box.rep{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.2)}
        .total-box.grand{background:linear-gradient(135deg,#E11428,#B91C1C);border:none}
        .total-box .tlabel{font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;opacity:.65;color:#0F172A}
        .total-box.grand .tlabel{color:#fff}
        .total-box .tval{font-size:20px;font-weight:900;margin-top:4px}
        .total-box.mo .tval{color:#3B82F6}
        .total-box.rep .tval{color:#F59E0B}
        .total-box.grand .tval{color:#fff;font-size:26px}
        /* ── MECÁNICO ── */
        .mec-bar{display:flex;align-items:center;gap:12px;background:#F8FAFC;border:1px solid #EEF1F5;border-radius:10px;padding:11px 16px;margin-top:14px}
        .mec-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#E11428,#B91C1C);display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;font-weight:900;flex-shrink:0}
        .mec-info{}
        .mec-role{font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;color:#94A3B8}
        .mec-name{font-size:14px;font-weight:800;color:#0F172A}
        .mec-email{font-size:11px;color:#64748B;margin-top:1px}
        /* ── THANKS ── */
        .thanks{margin-top:22px;text-align:center;padding:18px 20px;background:linear-gradient(135deg,#0C0C10,#1A1A22);border-radius:12px}
        .thanks-main{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:#F59E0B;letter-spacing:.04em}
        .thanks-sub{font-size:11px;color:rgba(255,255,255,.4);margin-top:4px}
        /* ── FOOTER ── */
        .foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid #EEF1F5;font-size:10px;color:#CBD5E1}
      @media print{ body{padding:12px;margin-top:0} @page{margin:.5cm;size:A4} .no-print{display:none !important} .header{margin-top:0} }
      </style></head><body>

      <!-- BOTON CERRAR PARA APK -->
      <button class="close-btn no-print" onclick="window.close(); if(window.history.length>1) window.history.back();">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg> Volver
      </button>

      <!-- HEADER -->
      <div class="header">
        <div class="logo-wrap">
          <img src="${logoUrl}" alt="Gorila Motos">
          <div class="brand-text">
            <div class="brand-name">Gorila <em>Motos</em></div>
            <div class="brand-sub">Cuenca · Ecuador · Est. 2022</div>
          </div>
        </div>
        <div class="nota-badge">
          <div class="nota-label">Nota de Venta</div>
          <div class="nota-num">#${r.id_registro}</div>
          <div class="nota-date">${fmtDate(r.fecha)}</div>
        </div>
      </div>

      <!-- FOTO MOTO + PLACA -->
      ${r.ruta_imagen_moto ? `
      <div style="position:relative;border-radius:14px;overflow:hidden;height:140px;margin:14px 0;border:1px solid #EEF1F5">
        <img src="${r.ruta_imagen_moto}" alt="${r.placa}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentElement.style.display='none'">
        <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(12,12,16,0.85) 0%,rgba(12,12,16,0.3) 60%,transparent 100%)"></div>
        <div style="position:absolute;inset:0;padding:16px 20px;display:flex;flex-direction:column;justify-content:flex-end">
          <span style="font-family:'Courier New',monospace;font-size:20px;font-weight:900;letter-spacing:3px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.5)">${r.placa ?? '—'}</span>
          <span style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.75);margin-top:3px">${r.marca_moto ?? ''} ${r.modelo_moto ?? ''} · ${r.tipo_servicio ?? 'Servicio'}</span>
        </div>
        <span style="position:absolute;top:14px;right:14px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:99px;background:rgba(12,12,16,0.6);color:rgba(255,255,255,0.75);letter-spacing:.1em;text-transform:uppercase;backdrop-filter:blur(4px)">${estLabel}</span>
      </div>
      ` : `
      <div class="estado-bar">
        <span style="font-size:12px;font-weight:700;color:#64748B">${r.tipo_servicio ?? 'Servicio de taller'}</span>
        <span class="plate">${r.placa ?? '—'}</span>
        <span class="estado-chip">${estLabel}</span>
      </div>`}

      <!-- DATOS CLIENTE -->
      <div class="section-title">Información del cliente</div>
      <div class="info-grid">
        <div class="info-field"><label>Cliente</label><span style="font-size:15px">${r.nombre_cliente ?? '—'}</span></div>
        <div class="info-field"><label>Vehículo</label><span>${r.marca_moto ?? ''} ${r.modelo_moto ?? ''}</span></div>
        ${ciCli ? `<div class="info-field"><label>Cédula / RUC</label><span>${ciCli}</span></div>` : ''}
        ${telCli ? `<div class="info-field"><label>Teléfono</label><span>${telCli}</span></div>` : ''}
        ${r.kilometraje ? `<div class="info-field"><label>Kilometraje</label><span>${r.kilometraje.toLocaleString('es-EC')} km</span></div>` : ''}
        ${r.descripcion ? `<div class="info-field full"><label>Fallas reportadas</label><span style="font-weight:500;font-size:12px;line-height:1.5">${r.descripcion}</span></div>` : ''}
      </div>

      <!-- DETALLE DE SERVICIOS -->
      ${hasDesglose ? `
      <div class="section-title">Detalle del servicio</div>
      ${manoRows ? `
      <div class="sec-header mo">
        <div class="sec-icon mo"></div>
        <span class="sec-label mo">Mano de obra</span>
        <span class="sec-sub mo">${fmtMoney(manoTotal)}</span>
      </div>
      <table><thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">P. Unit.</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${manoRows.replace(/<tr>/g,'<tr class="mo-row">')}</tbody></table>` : ''}
      ${repRows ? `
      <div class="sec-header rep">
        <div class="sec-icon rep"></div>
        <span class="sec-label rep">Repuestos</span>
        <span class="sec-sub rep">${fmtMoney(repTotal)}</span>
      </div>
      <table><thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">P. Unit.</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${repRows.replace(/<tr>/g,'<tr class="rep-row">')}</tbody></table>` : ''}
      <div class="totals-wrap">
        ${manoRows ? `<div class="total-box mo"><div class="tlabel">Mano de obra</div><div class="tval">${fmtMoney(manoTotal)}</div></div>` : '<div></div>'}
        ${repRows  ? `<div class="total-box rep"><div class="tlabel">Repuestos</div><div class="tval">${fmtMoney(repTotal)}</div></div>` : '<div></div>'}
        <div class="total-box grand"><div class="tlabel">Total del servicio</div><div class="tval">${fmtMoney(r.costo_total ?? 0)}</div></div>
      </div>
      ` : `
      <div style="margin-top:16px;background:linear-gradient(135deg,#E11428,#B91C1C);border-radius:14px;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;color:#fff">
        <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;opacity:.85">Total del servicio</span>
        <span style="font-size:32px;font-weight:900;letter-spacing:-1px">${fmtMoney(r.costo_total ?? 0)}</span>
      </div>`}

      <!-- MECÁNICO -->
      ${r.nombre_encargado ? `
      <div class="mec-bar">
        <div class="mec-avatar">${(r.nombre_encargado ?? 'M').charAt(0).toUpperCase()}</div>
        <div class="mec-info">
          <div class="mec-role">Técnico responsable</div>
          <div class="mec-name">${r.nombre_encargado}</div>
          ${mec?.correo ? `<div class="mec-email">${mec.correo}</div>` : ''}
        </div>
      </div>` : ''}

      <!-- GRACIAS -->
      <div class="thanks">
        <div class="thanks-main">Gracias por su confianza, estimado/a ${r.nombre_cliente?.split(' ')[0] ?? 'cliente'}.</div>
        <div class="thanks-sub">Gorila Motos · ${WORKSHOP_CONTACT.direccion} · ${WORKSHOP_CONTACT.telefono} · ${WORKSHOP_CONTACT.horario}</div>
      </div>

      <div class="foot">
        <span>Gorila Motos S.A.S. · ${WORKSHOP_CONTACT.web}</span>
        <span>${WORKSHOP_CONTACT.email}</span>
        <span>© ${new Date().getFullYear()}</span>
      </div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); setPrintingId(null); }, 600);
  };

  /* ─── Historial cliente ─── */
  const openHistory = (nombre: string) => {
    const hist = registros.filter((r) => r.nombre_cliente === nombre);
    setHistoryName(nombre);
    setClientHistory(hist);
    setHistoryOpen(true);
  };

  /* ─── Filtro de fecha rápido ─── */
  const [dateFlt, setDateFlt] = useState<'todo' | 'hoy' | 'semana' | 'mes'>('todo');

  const dateRange = (() => {
    const hoy = new Date();
    const hoyStr = hoy.toISOString().slice(0, 10);
    const mesStr = hoy.toISOString().slice(0, 7);
    const d = hoy.getDay();
    const mon = new Date(hoy);
    mon.setDate(hoy.getDate() - (d === 0 ? 6 : d - 1));
    return { hoy: hoyStr, mes: mesStr, semana: mon.toISOString().slice(0, 10) };
  })();

  /* ─── Filtro ─── */
  const filtered = registros.filter((r) => {
    const q = search.toLowerCase();
    const matchText = (r.nombre_cliente ?? '').toLowerCase().includes(q) ||
      (r.placa ?? '').toLowerCase().includes(q) ||
      (r.tipo_servicio ?? '').toLowerCase().includes(q);
    const matchEstado = estadoFlt === -1 || r.estado === estadoFlt;
    const fecha = toIsoStr(r.fecha);
    const matchDate =
      dateFlt === 'todo' ? true :
      dateFlt === 'hoy' ? fecha === dateRange.hoy :
      dateFlt === 'semana' ? fecha >= dateRange.semana :
      dateFlt === 'mes' ? fecha.startsWith(dateRange.mes) : true;
    return matchText && matchEstado && matchDate;
  });

  /* ─── Conteos ─── */
  const counts = {
    0: registros.filter((r) => r.estado === 0).length,
    1: registros.filter((r) => r.estado === 1).length,
    2: registros.filter((r) => r.estado === 2).length,
    3: registros.filter((r) => r.estado === 3).length,
    4: registros.filter((r) => r.estado === 4).length,
  };

  const clientPhone = isAdmin && nCliente ? extractPhone(nCliente.descripcion) : null;

  /* Motos que coinciden con la placa buscada */
  const plateMatches = plateQuery.trim().length >= 2
    ? todasMotos.filter(m => m.placa.toLowerCase().includes(plateQuery.trim().toLowerCase())).slice(0, 6)
    : [];

  /* Mantenimientos recomendados (vencidos/próximos) para la moto seleccionada */
  const recomendaciones = nMoto
    ? calcularEstadoLocal(nMoto.cilindraje, nMoto.kilometraje, nMotoServicios)
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
        {/* Filtro rápido de fecha */}
        <div className="flex rounded-xl overflow-hidden shrink-0"
             style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E4E7EC'}` }}>
          {([
            { key: 'hoy',    label: 'Hoy'     },
            { key: 'semana', label: 'Semana'  },
            { key: 'mes',    label: 'Mes'     },
            { key: 'todo',   label: 'Todos'   },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setDateFlt(key)}
              className="px-3 py-1.5 text-[11px] font-bold transition-all"
              style={{
                background: dateFlt === key
                  ? isDark ? 'rgba(225,20,40,0.2)' : 'rgba(225,20,40,0.12)'
                  : 'transparent',
                color: dateFlt === key
                  ? isDark ? '#FF6470' : '#C8001A'
                  : isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)',
                borderRight: key !== 'todo'
                  ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : undefined,
              }}>
              {label}
            </button>
          ))}
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
                            onClick={() => {
                              setExpandedRecords(prev => 
                                prev.includes(r.id_registro) ? prev.filter(id => id !== r.id_registro) : [...prev, r.id_registro]
                              );
                            }}
                            className="group flex items-center gap-1.5 font-semibold text-white/90 hover:text-white transition-colors outline-none max-w-[150px] truncate"
                            title="Desplegar información"
                          >
                            {r.nombre_cliente}
                            <ChevronRight size={11} className={`text-white/40 transition-transform ${expandedRecords.includes(r.id_registro) ? 'rotate-90' : ''}`} />
                          </button>
                          {expandedRecords.includes(r.id_registro) && (() => {
                            const cli = usuarios.find(u => u.nombre_completo === r.nombre_cliente);
                            const tel = cli?.telefono || (cli ? extractPhone(cli.descripcion) : null);
                            const cedId = cli ? extractCedula(cli.descripcion) : null;
                            return (
                              <div className="flex flex-col gap-0.5 mt-1 bg-white/[0.02] p-1.5 rounded border border-white/[0.05]">
                                {tel && (
                                  <a href={`tel:${tel}`}
                                    className="flex items-center gap-1 text-[10px] text-emerald-400/80 hover:text-emerald-400"
                                    onClick={e => e.stopPropagation()}>
                                    <Phone size={9}/> {tel}
                                  </a>
                                )}
                                {cedId && (
                                  <span className="flex items-center gap-1 text-[10px] text-white/40">
                                    <CreditCard size={9}/> {cedId}
                                  </span>
                                )}
                                {cli?.direccion && (
                                  <span className="flex items-center gap-1 text-[10px] text-white/40">
                                    <MapPin size={9}/> {cli.direccion}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); openHistory(r.nombre_cliente!); }}
                                  className="flex items-center gap-1 text-[10px] text-gm-red/80 hover:text-gm-red mt-1"
                                >
                                  <History size={9}/> Ver historial
                                </button>
                              </div>
                            );
                          })()}
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
                            {r.estado >= 1 && (
                              <button
                                onClick={() => abrirFactura(r, false)}
                                className="icon-btn"
                                title="Mano de obra y repuestos"
                              >
                                <Package size={13} />
                              </button>
                            )}
                            {canPrint && (
                              <button
                                onClick={() => printOrder(r)}
                                className="icon-btn"
                                title={printingId === r.id_registro ? 'Generando…' : 'Imprimir orden'}
                                disabled={printingId !== null}
                                style={{ opacity: printingId === r.id_registro ? 0.5 : undefined }}
                              >
                                {printingId === r.id_registro
                                  ? <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                                  : <Printer size={13} />}
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
                    <input className="gm-input-d" placeholder="Nombre completo *" value={qNombre} onChange={e => setQNombre(e.target.value)} />
                    <input className="gm-input-d" placeholder="Teléfono / WhatsApp *" value={qTelefono} onChange={e => setQTelefono(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="gm-input-d" placeholder="Cédula *" value={qCedula} onChange={e => setQCedula(e.target.value)} />
                    <input className="gm-input-d" placeholder="Dirección de casa *" value={qDireccion} onChange={e => setQDireccion(e.target.value)} />
                  </div>
                  <div>
                    <input className="gm-input-d w-full" type="email" placeholder="Correo (si lo tiene, para que inicie sesión)" value={qCorreo} onChange={e => setQCorreo(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
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
                      className="text-[12px] font-semibold px-3 py-2 rounded-lg"
                      style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(21,21,27,0.5)' }}>
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
                        : { background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: 'rgba(245,158,11,0.25)', color: 'rgba(251,191,36,0.75)' }}>
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
                      : { background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D1D5DB', color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(21,21,27,0.50)' }}
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
            onSelect={(t) => setNTipo(t)}
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

      {/* ══════ EDITOR DE FACTURA: MANO DE OBRA + REPUESTOS ══════ */}
      <FacturaEditor
        open={!!facturaTarget}
        registro={facturaTarget}
        productos={productos}
        completarAlGuardar={facturaCompletar}
        onClose={() => { setFacturaTarget(null); setFacturaCompletar(false); }}
        onSaved={onFacturaGuardada}
      />

      {/* ══════ MODAL HISTORIAL CLIENTE ══════ */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Historial: ${historyName}`}
        size="xl"
        footer={<Button variant="secondary" onClick={() => setHistoryOpen(false)}>Cerrar</Button>}
      >
        {/* Tarjeta de datos del cliente */}
        {(() => {
          const cli = usuarios.find(u => u.nombre_completo === historyName);
          if (!cli) return null;
          const tel = extractPhone(cli.descripcion);
          const ced = extractCedula(cli.descripcion);
          const totalGastado = clientHistory.reduce((s, r) => s + (r.costo_total ?? 0), 0);
          return (
            <div className="mb-4 p-4 rounded-2xl flex flex-wrap gap-4 items-center"
              style={{ background: isDark ? 'rgba(225,20,40,0.07)' : 'rgba(225,20,40,0.05)',
                       border: `1px solid ${isDark ? 'rgba(225,20,40,0.15)' : 'rgba(225,20,40,0.15)'}` }}>
              <div className="flex items-center justify-center w-12 h-12 rounded-full text-xl font-black text-gm-red"
                style={{ background: isDark ? 'rgba(225,20,40,0.12)' : 'rgba(225,20,40,0.08)' }}>
                {historyName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-base" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : '#15151B' }}>
                  {historyName}
                </p>
                <div className="flex flex-wrap gap-3 mt-1">
                  {ced && (
                    <span className="text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(21,21,27,0.45)' }}>
                      CI: {ced}
                    </span>
                  )}
                  {tel && (
                    <a href={`tel:${tel}`} className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <Phone size={10}/> {tel}
                    </a>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wider" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)' }}>Total histórico</p>
                <p className="text-lg font-black text-gm-red">{fmtMoney(totalGastado)}</p>
                <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)' }}>
                  {clientHistory.length} servicio(s)
                </p>
              </div>
            </div>
          );
        })()}
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
                  <button
                    onClick={() => printOrder(r)}
                    className="icon-btn shrink-0"
                    title={printingId === r.id_registro ? 'Generando…' : 'Imprimir'}
                    disabled={printingId !== null}
                    style={{ opacity: printingId === r.id_registro ? 0.5 : undefined }}
                  >
                    {printingId === r.id_registro
                      ? <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                      : <Printer size={13} />}
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
