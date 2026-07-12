/* ─────────────────────────────────────────────
   GMotors — Módulo de Proveedores
   Agrupa productos por proveedor · alertas stock bajo
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Truck, Package, AlertTriangle, Phone, Mail, CheckCircle2, X, Edit2, Save, MessageCircle, Plus, Search, Info, Trash2 } from 'lucide-react';
import { productosApi, proveedorContactosApi } from '../../lib/api';
import { fmtMoney, getErrorMsg } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import { useTheme } from '../../lib/theme';
import type { Producto } from '../../types';

interface Contacto {
  nombre:   string;
  telefono: string;
  email:    string;
  producto: string;
}

/* ── Stock badge utils ── */
function stockLevel(stock: number): 'red' | 'yellow' | 'green' {
  if (stock === 0)     return 'red';
  if (stock <= 5)      return 'yellow';
  return 'green';
}
const LEVEL_STYLE = {
  red:    { bg: 'rgba(225,20,40,0.12)',   border: 'rgba(225,20,40,0.25)',   color: '#E11428', label: 'Sin stock'   },
  yellow: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', color: '#F59E0B', label: 'Stock bajo'   },
  green:  { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.20)', color: '#10B981', label: 'OK'           },
};

/* ─── Tarjeta de proveedor ─────────────────────────────────────────────────── */
interface ProveedorCardProps {
  codigo:    string;
  productos: Producto[];
  contacto:  Contacto | null;
  onEdit:    (codigo: string) => void;
  onView:    (codigo: string) => void;
}

function ProveedorCard({ codigo, productos, contacto, onEdit, onView }: ProveedorCardProps) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const tieneAlerta = productos.some(p => p.stock <= 5);
  const sinStock    = productos.filter(p => p.stock === 0).length;
  const bajo        = productos.filter(p => p.stock > 0 && p.stock <= 5).length;
  const ok          = productos.filter(p => p.stock > 5).length;

  const cardColor = sinStock > 0 ? '#E11428' : tieneAlerta ? '#F59E0B' : '#10B981';

  return (
    <div
      className="gm-card-d rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
      style={{ borderColor: tieneAlerta ? `${cardColor}35` : (isDark ? 'rgba(255,255,255,0.05)' : '#E4E7EC') }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: `${cardColor}15`, border: `1px solid ${cardColor}30` }}>
              <Truck size={16} style={{ color: cardColor }} />
            </div>
            <div>
              <p className="text-[13px] font-black" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : '#15151B' }}>
                {contacto?.nombre || `Proveedor ${codigo}`}
              </p>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(21,21,27,0.6)' }}>
                Cód. {codigo}
              </p>
            </div>
          </div>
          <button
            onClick={() => onEdit(codigo)}
            className="flex items-center gap-1 text-[10px] transition-colors font-bold"
            style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(21,21,27,0.5)' }}
          >
            <Edit2 size={10} /> Editar
          </button>
        </div>

        {/* Contacto */}
        {(contacto?.telefono || contacto?.email) && (
          <div className="mt-3 space-y-1">
            {contacto.telefono && (
              <div className="flex items-center gap-2 text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(21,21,27,0.7)' }}>
                <Phone size={9} style={{ opacity: 0.5 }} /> {contacto.telefono}
              </div>
            )}
            {contacto.email && (
              <div className="flex items-center gap-2 text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(21,21,27,0.7)' }}>
                <Mail size={9} style={{ opacity: 0.5 }} /> {contacto.email}
              </div>
            )}
          </div>
        )}

        {/* Resumen contadores */}
        <div className="flex items-center gap-3 mt-4">
          {sinStock > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full"
                  style={{ background: 'rgba(225,20,40,0.12)', color: '#E11428' }}>
              <X size={9} /> {sinStock} sin stock
            </span>
          )}
          {bajo > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
              <AlertTriangle size={9} /> {bajo} bajo
            </span>
          )}
          {ok > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981' }}>
              <CheckCircle2 size={9} /> {ok} OK
            </span>
          )}
        </div>
      </div>

      {/* Alerta principal + WhatsApp */}
      {tieneAlerta && (
        <div className="px-4 py-3"
             style={{ background: `${cardColor}08`, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#E4E7EC'}` }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <AlertTriangle size={12} style={{ color: cardColor, marginTop: 2, flexShrink: 0 }} />
              <p className="text-[11px] font-semibold leading-snug" style={{ color: `${cardColor}cc` }}>
                {sinStock > 0
                  ? `${sinStock} producto${sinStock > 1 ? 's' : ''} sin stock — contacta al proveedor.`
                  : `Stock bajo — reponer con ${contacto?.nombre || `proveedor ${codigo}`}.`
                }
              </p>
            </div>
            {contacto?.telefono && (() => {
              // Normalizar a formato internacional Ecuador (593 + 9 dígitos del celular)
              const raw = contacto.telefono.replace(/\D/g, '');
              let intl = raw.startsWith('0') ? `593${raw.slice(1)}` : raw.startsWith('593') ? raw : `593${raw}`;
              intl = intl.replace(/^5930/, '593'); // quita el 0 intermedio si quedó "5930..."
              const valid = /^593\d{9}$/.test(intl); // celular EC válido
              // Si el teléfono no es un celular válido, mostrar el número sin enlace (no abrir un chat a un número inexistente)
              if (!valid) {
                return (
                  <span
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold shrink-0"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E4E7EC'}`, color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(21,21,27,0.6)' }}
                    title="Número no válido para WhatsApp (se requiere celular de Ecuador)"
                  >
                    <MessageCircle size={11} /> {contacto.telefono}
                  </span>
                );
              }
              const items = productos.filter(p => p.stock <= 5).map(p => `• ${p.nombre} (${p.stock} u.)`).join('\n');
              const msg = encodeURIComponent(`Hola! Soy Gorila Motos\n\nNecesitamos reponer:\n${items}\n\nGracias.`);
              return (
                <a
                  href={`https://wa.me/${intl}?text=${msg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black shrink-0 transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366' }}
                >
                  <MessageCircle size={11} /> WhatsApp
                </a>
              );
            })()}
          </div>
        </div>
      )}

      {/* Ver productos */}
      <div className="px-4 py-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#E4E7EC', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
        <button
          onClick={() => onView(codigo)}
          className="w-full py-2 rounded-xl text-[12px] font-bold transition-all"
          style={{ 
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E4E7EC'}`,
            color: isDark ? 'rgba(255,255,255,0.85)' : '#15151B'
          }}
        >
          Ver {productos.length} producto{productos.length !== 1 ? 's' : ''}
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t flex items-center justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#E4E7EC' }}>
        <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.5)' }}>
          {productos.length} producto{productos.length > 1 ? 's' : ''}
        </span>
        <span className="text-[10px] font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.5)' }}>
          Valor total: {fmtMoney(productos.reduce((s, p) => s + (p.pvp * p.stock), 0))}
        </span>
      </div>
    </div>
  );
}

/* ── Modal de contacto ─────────────────────────────────────────────────────── */
function ContactoModal({ codigo, contacto, isNew = false, onSave, onClose, onDelete }: {
  codigo:    string;
  contacto:  Contacto | null;
  isNew?:    boolean;
  onSave:    (codigo: string, data: Contacto) => void;
  onClose:   () => void;
  onDelete?: () => void;
}) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const [codigoState, setCodigoState] = useState(codigo);
  const [nombre,   setNombre]   = useState(contacto?.nombre   ?? '');
  const [telefono, setTelefono] = useState(contacto?.telefono ?? '');
  const [email,    setEmail]    = useState(contacto?.email    ?? '');
  const [producto, setProducto] = useState(contacto?.producto ?? '');

  const save = () => {
    // Al EDITAR se conserva la clave existente tal cual (puede venir en minúsculas
    // desde Inventario); solo al CREAR se normaliza a mayúsculas. Evita claves huérfanas.
    const cod = isNew ? codigoState.trim().toUpperCase() : codigo;
    if (!cod)    { return; }
    if (!nombre.trim()) { return; }
    onSave(cod, { nombre, telefono, email, producto });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
           style={{ background: isDark ? '#131318' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E4E7EC'}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black dark:text-white text-slate-900">{isNew ? 'Nuevo proveedor' : 'Datos de contacto'}</h3>
            {!isNew && <p className="text-[11px] dark:text-white/35 text-slate-900/35 mt-0.5 font-mono">Proveedor: {codigo}</p>}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X size={18} />
          </button>
        </div>

        {isNew && (
          <div>
            <label className="text-[10px] font-black dark:text-white/35 text-slate-900/35 uppercase tracking-widest block mb-1">
              Código del proveedor *
            </label>
            <input
              className="gm-input-d w-full font-mono uppercase"
              placeholder="Ej. MOTUL, NGK, PROV-001"
              value={codigoState}
              onChange={e => setCodigoState(e.target.value)}
              autoFocus
            />
            <p className="text-[10px] dark:text-white/25 text-slate-900/25 mt-1">
              Úsalo como "Código proveedor" al crear productos para agruparlos aquí.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {[
            { label: 'Nombre / Empresa', value: nombre,   set: setNombre,   ph: 'Distribuidora XYZ' },
            { label: 'Teléfono',         value: telefono, set: setTelefono, ph: '+593 99 123 4567' },
            { label: 'Email',            value: email,    set: setEmail,    ph: 'ventas@proveedor.com' },
            { label: 'Producto principal',value: producto, set: setProducto, ph: 'Aceite 20W-50, filtros...' },
          ].map(({ label, value, set, ph }) => (
            <div key={label}>
              <label className="text-[10px] font-black dark:text-white/35 text-slate-900/35 uppercase tracking-widest block mb-1">
                {label}
              </label>
              <input
                className="gm-input-d w-full"
                placeholder={ph}
                value={value}
                onChange={e => set(e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          {!isNew && onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5"
              style={{ background: 'rgba(225,20,40,0.1)', border: '1px solid rgba(225,20,40,0.25)', color: '#E11428' }}
            >
              <Trash2 size={13} /> Eliminar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold dark:text-white/40 text-slate-900/40 hover:dark:text-white/70 text-slate-900/70 border border-white/[0.07] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all"
            style={{ background: '#E11428', color: '#fff' }}
          >
            <Save size={13} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ──────────────────────────────────────────────────────── */
export default function ProveedoresPage() {
  const toast = useToast();

  const [productos,   setProductos]   = useState<Producto[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [contactos,   setContactos]   = useState<Record<string, Contacto>>({});
  const [editCodigo,  setEditCodigo]  = useState<string | null>(null);
  const [viewCodigo,  setViewCodigo]  = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [search,      setSearch]      = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [filterAlert, setFilterAlert] = useState(false);

  const cargarContactos = () => {
    proveedorContactosApi.list()
      .then(({ data }) => {
        const map: Record<string, Contacto> = {};
        (data as Array<{ codigo: string; nombre: string; telefono: string; email: string; producto: string }>)
          .forEach(c => { map[c.codigo] = { nombre: c.nombre, telefono: c.telefono, email: c.email, producto: c.producto }; });
        setContactos(map);
      })
      .catch(() => { /* sin contactos */ });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productosApi.list();
      setProductos(Array.isArray(data) ? data : []);
    } catch { /* render sleeping */ }
    finally { setLoading(false); }
    cargarContactos();
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Agrupar por codigo_proveedor (incluye proveedores guardados sin productos) */
  const grupos = useMemo(() => {
    const map: Record<string, Producto[]> = {};
    productos.forEach(p => {
      const key = p.codigo_proveedor || 'SIN-CODIGO';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    /* Proveedores creados manualmente que aún no tienen productos */
    Object.keys(contactos).forEach(cod => {
      if (!map[cod]) map[cod] = [];
    });
    /* Ordenar: primero los que tienen alertas */
    return Object.entries(map).sort(([, a], [, b]) => {
      const aAlert = a.some(p => p.stock <= 5) ? 0 : 1;
      const bAlert = b.some(p => p.stock <= 5) ? 0 : 1;
      return aAlert - bAlert;
    });
  }, [productos, contactos]);

  /* Filtrado por búsqueda y estado */
  const gruposFiltrados = useMemo(() => {
    return grupos.filter(([codigo, ps]) => {
      if (filterAlert && !ps.some(p => p.stock <= 5)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const contacto = contactos[codigo];
      return (
        codigo.toLowerCase().includes(q) ||
        (contacto?.nombre ?? '').toLowerCase().includes(q) ||
        ps.some(p => p.nombre.toLowerCase().includes(q) || p.codigo_personal.toLowerCase().includes(q))
      );
    });
  }, [grupos, search, filterAlert, contactos]);

  const totalAlertas = useMemo(
    () => grupos.filter(([, ps]) => ps.some(p => p.stock <= 5)).length,
    [grupos]
  );

  const handleSave = (codigo: string, data: Contacto) => {
    const prevVal = contactos[codigo]; // undefined si es proveedor nuevo
    setContactos(prev => ({ ...prev, [codigo]: data }));
    setEditCodigo(null);
    setCreatingNew(false);
    proveedorContactosApi.guardar(codigo, data as unknown as Record<string, unknown>)
      .then(() => toast.success('Proveedor guardado'))
      .catch(err => {
        toast.error(getErrorMsg(err));
        // Revertir la mutación optimista sincrónicamente (no depender de un refetch
        // que también puede fallar si el backend está caído → dejaría datos divergentes).
        setContactos(prev => {
          const next = { ...prev };
          if (prevVal !== undefined) next[codigo] = prevVal;
          else delete next[codigo];
          return next;
        });
      });
  };

  const handleDelete = async (codigo: string) => {
    const productosProveedor = productos.filter(p => p.codigo_proveedor === codigo);
    const confirmMsg = productosProveedor.length > 0
      ? `¿Eliminar este proveedor y sus ${productosProveedor.length} producto(s) del inventario?`
      : '¿Eliminar este proveedor?';
    if (!window.confirm(confirmMsg)) return;

    setEditCodigo(null);
    setContactos(prev => { const n = { ...prev }; delete n[codigo]; return n; });
    setProductos(prev => prev.filter(p => p.codigo_proveedor !== codigo));

    // allSettled: si falla el borrado de algún producto, sabemos exactamente cuántos
    // y avisamos del fallo parcial en vez de un error genérico que oculta lo que quedó a medias.
    const resultados = await Promise.allSettled([
      proveedorContactosApi.borrar(codigo),
      ...productosProveedor.map(p => productosApi.remove(p.id_producto)),
    ]);
    const fallidos = resultados.filter(r => r.status === 'rejected').length;
    if (fallidos === 0) {
      toast.success(productosProveedor.length > 0
        ? `Proveedor y ${productosProveedor.length} producto(s) eliminados`
        : 'Proveedor eliminado');
    } else {
      toast.error(`Eliminación parcial: ${fallidos} operación(es) fallaron. Reintenta.`);
      fetchData(); // re-sincroniza el estado con el backend real
    }
  };

  return (
    <div className="space-y-6 pb-8">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase dark:text-white/25 text-slate-900/25 font-semibold mb-2 flex items-center gap-2">
            <Truck size={10} className="text-gm-red" /> Cadena de suministro
          </p>
          <h1 className="text-[1.9rem] font-black dark:text-white text-slate-900 leading-tight tracking-tight">
            Proveedores
          </h1>
          <p className="dark:text-white/35 text-slate-900/35 text-sm mt-1">
            {grupos.length} proveedor{grupos.length !== 1 ? 'es' : ''} · {productos.length} productos
          </p>
        </div>

        <div className="flex items-center gap-3">
          {totalAlertas > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl animate-pulse"
                 style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-black text-amber-400">
                  {totalAlertas} proveedor{totalAlertas > 1 ? 'es' : ''} con stock bajo
                </p>
                <p className="text-[11px] text-amber-400/60">Revisar y contactar</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCreatingNew(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm dark:text-white text-slate-900 shrink-0"
            style={{ background: '#E11428', boxShadow: '0 0 20px rgba(225,20,40,0.35)' }}
          >
            <Plus size={16} /> Nuevo proveedor
          </button>
        </div>
      </div>

      {/* ─── Cómo funciona ─── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
           style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-300/70 leading-relaxed">
          <span className="font-black text-blue-300">¿Cómo funciona?</span> &nbsp;
          Al crear un producto en Inventario, asígnale un <span className="font-bold">Código de proveedor</span> (ej. MOTUL, NGK, PROV-001).
          Ese código agrupa los productos en una tarjeta aquí. Luego añade el contacto del proveedor con el botón <span className="font-bold">"Editar"</span>.
        </p>
      </div>

      {/* ─── Búsqueda ─── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="search-d flex-1" style={{ maxWidth: 360 }}>
          <Search size={14} />
          <input
            className="gm-input-d"
            placeholder="Buscar proveedor, producto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60 transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => setFilterAlert(f => !f)}
          className={`filter-chip ${filterAlert ? 'active' : ''}`}
        >
          <AlertTriangle size={11} /> Solo con alertas
        </button>
        {(search || filterAlert) && (
          <span className="text-[11px] dark:text-white/35 text-slate-900/35">
            {gruposFiltrados.length} de {grupos.length} proveedor{grupos.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* ─── Resumen KPI ─── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Proveedores',  value: grupos.length,  color: '#3B82F6', icon: Truck        },
          { label: 'Con alerta',   value: totalAlertas,   color: '#F59E0B', icon: AlertTriangle },
          { label: 'Sin stock',    value: productos.filter(p => p.stock === 0).length, color: '#E11428', icon: Package },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label}
               className="gm-card-d rounded-2xl p-4 flex items-center gap-3"
               style={{ borderColor: value > 0 && color !== '#3B82F6' ? `${color}30` : undefined }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color }}>{value}</p>
              <p className="text-[11px] dark:text-white/35 text-slate-900/35">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Grid de proveedores ─── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-d h-64 rounded-2xl" />
          ))}
        </div>
      ) : gruposFiltrados.length === 0 ? (
        <div className="py-20 text-center">
          <Truck size={40} className="dark:text-white/12 text-slate-900/12 mx-auto mb-3" />
          <p className="text-sm font-bold dark:text-white/30 text-slate-900/30">
            {search || filterAlert ? 'Sin resultados para este filtro' : 'No hay productos en inventario'}
          </p>
          {(search || filterAlert) && (
            <button
              onClick={() => { setSearch(''); setFilterAlert(false); }}
              className="mt-3 text-sm text-gm-red hover:text-gm-red-lt font-bold transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {gruposFiltrados.map(([codigo, ps]) => (
            <ProveedorCard
              key={codigo}
              codigo={codigo}
              productos={ps}
              contacto={contactos[codigo] ?? null}
              onEdit={setEditCodigo}
              onView={(codigo) => { setProductSearch(''); setViewCodigo(codigo); }}
            />
          ))}
        </div>
      )}

      {/* ─── Modal de contacto (editar) ─── */}
      {editCodigo !== null && (
        <ContactoModal
          key={editCodigo}
          codigo={editCodigo}
          contacto={contactos[editCodigo] ?? null}
          onSave={handleSave}
          onClose={() => setEditCodigo(null)}
          onDelete={() => handleDelete(editCodigo)}
        />
      )}

      {/* ─── Modal nuevo proveedor ─── */}
      {creatingNew && (
        <ContactoModal
          codigo=""
          contacto={null}
          isNew
          onSave={handleSave}
          onClose={() => setCreatingNew(false)}
        />
      )}

      {/* ─── Modal de productos del proveedor ─── */}
      {viewCodigo !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div className="gm-provider-products-modal w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
               style={{ background: '#131318', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            {/* Header del modal */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.05]">
              <div>
                <h2 className="text-lg font-black text-[#F4F4F5] flex items-center gap-2">
                  <Package size={20} className="text-gm-red" />
                  Productos de {contactos[viewCodigo]?.nombre || viewCodigo}
                </h2>
                <p className="text-[12px] text-white/45 mt-1 font-mono">
                  {productos.filter(p => p.codigo_proveedor === viewCodigo).length} productos asociados
                </p>
              </div>
              <button onClick={() => setViewCodigo(null)} className="text-white/55 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-6 overflow-y-auto flex-1 dark-scroll bg-[#0D0D12]">
              <div className="search-d mb-4">
                <Search size={14} />
                <input
                  className="gm-input-d"
                  placeholder="Buscar producto, codigo interno o codigo distribuidor..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productos.filter(p => {
                  if (p.codigo_proveedor !== viewCodigo) return false;
                  const q = productSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    p.nombre.toLowerCase().includes(q) ||
                    (p.descripcion ?? '').toLowerCase().includes(q) ||
                    (p.codigo_personal ?? '').toLowerCase().includes(q) ||
                    (p.codigo_distribuidor ?? '').toLowerCase().includes(q)
                  );
                }).map(p => {
                  const lvl = stockLevel(p.stock);
                  const st  = LEVEL_STYLE[lvl];
                  return (
                    <div key={p.id_producto} className="rounded-xl overflow-hidden" style={{ background: '#17171E', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="p-4 border-b border-white/[0.08]">
                        <h3 className="text-sm font-bold text-[#F4F4F5] truncate mb-1">{p.nombre}</h3>
                        <div className="flex gap-2 text-[10px] text-white/45 font-mono">
                          <span>{p.codigo_personal || 'SIN CÓD.'}</span>
                          {p.codigo_distribuidor && <span>Dist: {p.codigo_distribuidor}</span>}
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[10px] text-white/50 mb-0.5 uppercase">Costo</p>
                          <p className="text-[12px] font-bold text-white/85">{fmtMoney(p.costo)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-white/50 mb-0.5 uppercase">PVP</p>
                          <p className="text-[12px] font-bold text-[#F4F4F5]">{fmtMoney(p.pvp)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] mb-0.5 uppercase" style={{ color: `${st.color}80` }}>{st.label}</p>
                          <p className="text-[13px] font-black" style={{ color: st.color }}>{p.stock} u.</p>
                        </div>
                      </div>
                      <div className="px-4 pb-4 flex gap-2">
                        <button
                          className="flex-1 py-2 rounded-lg text-[11px] font-bold"
                          style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)' }}
                          onClick={() => window.alert(`${p.nombre}\n\nCodigo interno: ${p.codigo_personal || '-'}\nCodigo distribuidor: ${p.codigo_distribuidor || '-'}\nProveedor: ${p.codigo_proveedor || '-'}\nStock: ${p.stock} u.\nCosto: ${fmtMoney(p.costo)}\nPVP: ${fmtMoney(p.pvp)}\n\n${p.descripcion || ''}`)}
                        >
                          Ver detalle
                        </button>
                        <button
                          className="flex-1 py-2 rounded-lg text-[11px] font-bold"
                          style={{ background: 'rgba(225,20,40,0.12)', color: '#FF6470', border: '1px solid rgba(225,20,40,0.25)' }}
                          onClick={() => { window.location.href = '/inventario'; }}
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
