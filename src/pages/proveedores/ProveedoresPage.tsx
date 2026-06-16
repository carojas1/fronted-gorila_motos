/* ─────────────────────────────────────────────
   GMotors — Módulo de Proveedores
   Agrupa productos por proveedor · alertas stock bajo
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Truck, Package, AlertTriangle, Phone, Mail, CheckCircle2, X, Edit2, Save } from 'lucide-react';
import { productosApi } from '../../lib/api';
import { fmtMoney } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import type { Producto } from '../../types';

/* Contacto guardado en localStorage por código de proveedor */
const STORAGE_KEY = 'gm_proveedores_contactos';

interface Contacto {
  nombre:   string;
  telefono: string;
  email:    string;
  producto: string;
}

function loadContactos(): Record<string, Contacto> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}
function saveContactos(data: Record<string, Contacto>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
}

function ProveedorCard({ codigo, productos, contacto, onEdit }: ProveedorCardProps) {
  const tieneAlerta = productos.some(p => p.stock <= 5);
  const sinStock    = productos.filter(p => p.stock === 0).length;
  const bajo        = productos.filter(p => p.stock > 0 && p.stock <= 5).length;
  const ok          = productos.filter(p => p.stock > 5).length;

  const cardColor = sinStock > 0 ? '#E11428' : tieneAlerta ? '#F59E0B' : '#10B981';

  return (
    <div
      className="gm-card-d rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
      style={{ borderColor: tieneAlerta ? `${cardColor}35` : 'rgba(255,255,255,0.05)' }}
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
              <p className="text-[13px] font-black text-white/90">{contacto?.nombre || `Proveedor ${codigo}`}</p>
              <p className="text-[11px] text-white/35 font-mono mt-0.5">Cód. {codigo}</p>
            </div>
          </div>
          <button
            onClick={() => onEdit(codigo)}
            className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-colors font-bold"
          >
            <Edit2 size={10} /> Editar
          </button>
        </div>

        {/* Contacto */}
        {(contacto?.telefono || contacto?.email) && (
          <div className="mt-3 space-y-1">
            {contacto.telefono && (
              <div className="flex items-center gap-2 text-[11px] text-white/40">
                <Phone size={9} className="text-white/20" /> {contacto.telefono}
              </div>
            )}
            {contacto.email && (
              <div className="flex items-center gap-2 text-[11px] text-white/40">
                <Mail size={9} className="text-white/20" /> {contacto.email}
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

      {/* Alerta principal */}
      {tieneAlerta && (
        <div className="px-4 py-3"
             style={{ background: `${cardColor}08`, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={12} style={{ color: cardColor, marginTop: 2, flexShrink: 0 }} />
            <p className="text-[11px] font-semibold leading-snug" style={{ color: `${cardColor}cc` }}>
              {sinStock > 0
                ? `Deberías contactar con ${contacto?.nombre || `el proveedor ${codigo}`} — tenemos ${sinStock} producto${sinStock > 1 ? 's' : ''} sin stock.`
                : `Stock bajo detectado. Contacta a ${contacto?.nombre || `el proveedor ${codigo}`} para reponer.`
              }
              {contacto?.producto && ` Producto principal: ${contacto.producto}.`}
            </p>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      <div className="px-4 py-3 space-y-1.5 max-h-52 overflow-y-auto dark-scroll">
        {productos.map(p => {
          const lvl = stockLevel(p.stock);
          const st  = LEVEL_STYLE[lvl];
          return (
            <div key={p.id_producto}
                 className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                 style={{ background: st.bg, border: `1px solid ${st.border}` }}>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-white/75 truncate">{p.nombre}</p>
                <p className="text-[10px] text-white/30 font-mono mt-0.5">{p.codigo_personal}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-black" style={{ color: st.color }}>{p.stock} u.</p>
                <p className="text-[9px] font-bold" style={{ color: `${st.color}80` }}>{st.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-white/25">{productos.length} producto{productos.length > 1 ? 's' : ''}</span>
        <span className="text-[10px] text-white/25 font-mono">
          Valor total: {fmtMoney(productos.reduce((s, p) => s + (p.pvp * p.stock), 0))}
        </span>
      </div>
    </div>
  );
}

/* ── Modal de contacto ─────────────────────────────────────────────────────── */
function ContactoModal({ codigo, contacto, onSave, onClose }: {
  codigo:   string;
  contacto: Contacto | null;
  onSave:   (codigo: string, data: Contacto) => void;
  onClose:  () => void;
}) {
  const [nombre,   setNombre]   = useState(contacto?.nombre   ?? '');
  const [telefono, setTelefono] = useState(contacto?.telefono ?? '');
  const [email,    setEmail]    = useState(contacto?.email    ?? '');
  const [producto, setProducto] = useState(contacto?.producto ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
           style={{ background: '#131318', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-white">Datos de contacto</h3>
            <p className="text-[11px] text-white/35 mt-0.5 font-mono">Proveedor: {codigo}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Nombre / Empresa', value: nombre,   set: setNombre,   ph: 'Distribuidora XYZ' },
            { label: 'Teléfono',         value: telefono, set: setTelefono, ph: '+593 99 123 4567' },
            { label: 'Email',            value: email,    set: setEmail,    ph: 'ventas@proveedor.com' },
            { label: 'Producto principal',value: producto, set: setProducto, ph: 'Aceite 20W-50, filtros...' },
          ].map(({ label, value, set, ph }) => (
            <div key={label}>
              <label className="text-[10px] font-black text-white/35 uppercase tracking-widest block mb-1">
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
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/40 hover:text-white/70 border border-white/[0.07] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(codigo, { nombre, telefono, email, producto })}
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
  const [contactos,   setContactos]   = useState<Record<string, Contacto>>(loadContactos);
  const [editCodigo,  setEditCodigo]  = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productosApi.list();
      setProductos(Array.isArray(data) ? data : []);
    } catch { /* render sleeping */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Agrupar por codigo_proveedor */
  const grupos = useMemo(() => {
    const map: Record<string, Producto[]> = {};
    productos.forEach(p => {
      const key = p.codigo_proveedor || 'SIN-CODIGO';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    /* Ordenar: primero los que tienen alertas */
    return Object.entries(map).sort(([, a], [, b]) => {
      const aAlert = a.some(p => p.stock <= 5) ? 0 : 1;
      const bAlert = b.some(p => p.stock <= 5) ? 0 : 1;
      return aAlert - bAlert;
    });
  }, [productos]);

  const totalAlertas = useMemo(
    () => grupos.filter(([, ps]) => ps.some(p => p.stock <= 5)).length,
    [grupos]
  );

  const handleSave = (codigo: string, data: Contacto) => {
    const updated = { ...contactos, [codigo]: data };
    setContactos(updated);
    saveContactos(updated);
    setEditCodigo(null);
    toast.success('Contacto guardado');
  };

  return (
    <div className="space-y-6 pb-8">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-white/25 font-semibold mb-2 flex items-center gap-2">
            <Truck size={10} className="text-gm-red" /> Cadena de suministro
          </p>
          <h1 className="text-[1.9rem] font-black text-white leading-tight tracking-tight">
            Proveedores
          </h1>
          <p className="text-white/35 text-sm mt-1">
            {grupos.length} proveedor{grupos.length !== 1 ? 'es' : ''} · {productos.length} productos
          </p>
        </div>

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
              <p className="text-[11px] text-white/35">{label}</p>
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
      ) : grupos.length === 0 ? (
        <div className="py-20 text-center">
          <Truck size={40} className="text-white/12 mx-auto mb-3" />
          <p className="text-sm font-bold text-white/30">No hay productos en inventario</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {grupos.map(([codigo, ps]) => (
            <ProveedorCard
              key={codigo}
              codigo={codigo}
              productos={ps}
              contacto={contactos[codigo] ?? null}
              onEdit={setEditCodigo}
            />
          ))}
        </div>
      )}

      {/* ─── Modal de contacto ─── */}
      {editCodigo !== null && (
        <ContactoModal
          codigo={editCodigo}
          contacto={contactos[editCodigo] ?? null}
          onSave={handleSave}
          onClose={() => setEditCodigo(null)}
        />
      )}
    </div>
  );
}
