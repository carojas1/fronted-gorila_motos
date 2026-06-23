/* ─────────────────────────────────────────────
   GMotors — Editor de factura de una orden
   Separa MANO DE OBRA y REPUESTOS (inventario o manual/externo).
   Calcula totales en vivo y guarda la lista completa de detalles.
   Se usa al completar una orden y para editar repuestos después
   (incluso en órdenes ya completadas).
   ───────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react';
import { Wrench, Package, Plus, Trash2, Search, X, CheckCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useTheme } from '../../lib/theme';
import { registrosApi } from '../../lib/api';
import { fmtMoney, getErrorMsg } from '../../lib/utils';
import {
  CATEGORIAS_REPUESTO, buildManoDescripcion, buildRepuestoDescripcion,
  cleanDescripcion, detalleCategoria, detalleKind,
} from '../../lib/detalles';
import type { RegistroDetalle, Producto } from '../../types';

interface LineItem {
  uid:        string;
  kind:       'mano' | 'repuesto';
  idProducto: number | null;   // null = mano de obra o repuesto manual
  nombre:     string;
  cantidad:   number;
  precio:     number;
  categoria:  string;          // solo repuesto manual
}

interface DetalleDTO {
  idDetalleFactura?: number;
  descripcion?: string | null;
  cantidad?: number;
  precioUnitario?: number;
  subtotal?: number;
  idProducto?: number | null;
}

let _uid = 0;
const nextUid = () => `li_${++_uid}`;

interface Props {
  open: boolean;
  registro: RegistroDetalle | null;
  productos: Producto[];
  /** Si true, al guardar también marca la orden como Completada (estado 2). */
  completarAlGuardar?: boolean;
  onClose: () => void;
  onSaved: (total: number, completo: boolean) => void;
}

export default function FacturaEditor({ open, registro, productos, completarAlGuardar = false, onClose, onSaved }: Props) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const toast = useToast();

  const [items, setItems]     = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [prodQuery, setProdQuery] = useState('');

  /* Cargar los detalles existentes al abrir */
  useEffect(() => {
    if (!open || !registro) return;
    setItems([]);
    setProdOpen(false);
    setProdQuery('');
    const idFactura = registro.id_factura;
    if (!idFactura) return;
    setLoading(true);
    registrosApi.detalles(idFactura)
      .then(({ data }) => {
        const dtos = (data as DetalleDTO[]) ?? [];
        const mapped: LineItem[] = dtos.map(d => {
          const kind = detalleKind(d);
          return {
            uid: nextUid(),
            kind,
            idProducto: d.idProducto ?? null,
            nombre: cleanDescripcion(d.descripcion) || (kind === 'mano' ? 'Mano de obra' : 'Repuesto'),
            cantidad: d.cantidad ?? 1,
            precio: Number(d.precioUnitario ?? 0),
            categoria: detalleCategoria(d.descripcion) ?? '',
          };
        });
        setItems(mapped);
      })
      .catch(() => { /* sin detalles aún → lista vacía */ })
      .finally(() => setLoading(false));
  }, [open, registro]);

  const totalMano = useMemo(
    () => items.filter(i => i.kind === 'mano').reduce((s, i) => s + i.precio * i.cantidad, 0),
    [items],
  );
  const totalRep = useMemo(
    () => items.filter(i => i.kind === 'repuesto').reduce((s, i) => s + i.precio * i.cantidad, 0),
    [items],
  );
  const total = totalMano + totalRep;

  /* ── Helpers de edición ── */
  const addMano = () =>
    setItems(p => [...p, { uid: nextUid(), kind: 'mano', idProducto: null, nombre: '', cantidad: 1, precio: 0, categoria: '' }]);
  const addManual = () =>
    setItems(p => [...p, { uid: nextUid(), kind: 'repuesto', idProducto: null, nombre: '', cantidad: 1, precio: 0, categoria: 'nuevo' }]);
  const addProducto = (prod: Producto) => {
    setItems(p => [...p, {
      uid: nextUid(), kind: 'repuesto', idProducto: prod.id_producto,
      nombre: prod.nombre || prod.descripcion || 'Repuesto', cantidad: 1,
      precio: Number(prod.pvp ?? 0), categoria: '',
    }]);
    setProdOpen(false); setProdQuery('');
  };
  const patch = (uid: string, upd: Partial<LineItem>) =>
    setItems(p => p.map(i => i.uid === uid ? { ...i, ...upd } : i));
  const remove = (uid: string) => setItems(p => p.filter(i => i.uid !== uid));

  const prodsFiltrados = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    const base = productos.filter(p => (p.stock ?? 0) > 0 || q);
    if (!q) return base.slice(0, 30);
    return base.filter(p =>
      (p.nombre ?? '').toLowerCase().includes(q) ||
      (p.descripcion ?? '').toLowerCase().includes(q) ||
      (p.codigo_personal ?? '').toLowerCase().includes(q),
    ).slice(0, 30);
  }, [productos, prodQuery]);

  /* ── Guardar ── */
  const guardar = async () => {
    if (!registro) return;
    const limpios = items.filter(i => i.precio > 0 || i.idProducto != null);
    if (limpios.length === 0) {
      toast.error('Agrega al menos un ítem con precio (mano de obra o repuesto).');
      return;
    }
    for (const i of limpios) {
      if (i.cantidad <= 0) { toast.error('La cantidad debe ser mayor a 0.'); return; }
      if (i.idProducto == null && !i.nombre.trim()) {
        toast.error('Cada ítem manual necesita una descripción.'); return;
      }
    }
    const dtos = limpios.map(i => {
      if (i.idProducto != null) {
        return { idProducto: i.idProducto, cantidad: i.cantidad };
      }
      const descripcion = i.kind === 'mano'
        ? buildManoDescripcion(i.nombre || 'Mano de obra')
        : buildRepuestoDescripcion(i.nombre || 'Repuesto', i.categoria);
      return { idProducto: null, cantidad: i.cantidad, precioUnitario: i.precio, descripcion };
    });

    setSaving(true);
    try {
      await registrosApi.update(registro.id_registro, dtos as unknown as Record<string, unknown>);
      if (completarAlGuardar && registro.estado < 2) {
        await registrosApi.estado(registro.id_registro, 2);
      }
      toast.success(
        completarAlGuardar
          ? 'Servicio completado · factura con mano de obra y repuestos lista.'
          : 'Factura actualizada · mano de obra y repuestos guardados.',
      );
      onSaved(total, !!completarAlGuardar);
    } catch (err) {
      toast.error(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  /* ── Tokens de tema ── */
  const surface = isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FB';
  const border  = isDark ? 'rgba(255,255,255,0.08)' : '#E4E7EC';
  const txt     = isDark ? '#EBEBEB' : '#15151B';
  const muted   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(21,21,27,0.55)';
  const inputBg = isDark ? '#1A1A22' : '#FFFFFF';

  const inputStyle: React.CSSProperties = {
    height: 34, borderRadius: 8, padding: '0 8px', background: inputBg,
    border: `1px solid ${border}`, color: txt, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  const renderRow = (i: LineItem) => {
    const esInv = i.idProducto != null;
    const sub = i.precio * i.cantidad;
    return (
      <div key={i.uid} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {i.kind === 'mano'
            ? <Wrench size={14} color="#3B82F6" />
            : <Package size={14} color="#F59E0B" />}
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: i.kind === 'mano' ? '#3B82F6' : '#F59E0B' }}>
            {i.kind === 'mano' ? 'Mano de obra' : esInv ? 'Repuesto · inventario' : 'Repuesto manual'}
          </span>
          <button onClick={() => remove(i.uid)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex' }} title="Quitar">
            <Trash2 size={14} />
          </button>
        </div>

        {/* Descripción */}
        {esInv ? (
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: txt }}>{i.nombre}</p>
        ) : (
          <input
            value={i.nombre}
            onChange={e => patch(i.uid, { nombre: e.target.value })}
            placeholder={i.kind === 'mano' ? 'Ej. Mano de obra: cambio de aceite' : 'Ej. Pastillas de freno (compra externa)'}
            style={{ ...inputStyle, width: '100%', marginBottom: 8 }}
          />
        )}

        {/* Categoría (solo repuesto manual) */}
        {i.kind === 'repuesto' && !esInv && (
          <select
            value={i.categoria}
            onChange={e => patch(i.uid, { categoria: e.target.value })}
            style={{ ...inputStyle, width: '100%', marginBottom: 8 }}
          >
            {CATEGORIAS_REPUESTO.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        )}

        {/* Cantidad · precio · subtotal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: muted }}>Cant.</span>
            <input
              type="number" min={1} value={i.cantidad}
              onChange={e => patch(i.uid, { cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
              style={{ ...inputStyle, width: 58 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: muted }}>$ c/u</span>
            <input
              type="number" min={0} step="0.01" value={i.precio}
              disabled={esInv}
              onChange={e => patch(i.uid, { precio: Math.max(0, parseFloat(e.target.value) || 0) })}
              style={{ ...inputStyle, width: 84, opacity: esInv ? 0.6 : 1 }}
              title={esInv ? 'Precio tomado del inventario (PVP)' : undefined}
            />
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: txt }}>{fmtMoney(sub)}</span>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={completarAlGuardar ? 'Completar servicio · factura' : 'Mano de obra y repuestos'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={saving} disabled={items.length === 0}>
            <CheckCircle size={14} /> {completarAlGuardar ? 'Completar y facturar' : 'Guardar factura'}
          </Button>
        </>
      }
    >
      {registro && (
        <div className="space-y-3">
          {/* Cabecera de la orden */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: txt }}>{registro.marca_moto} {registro.modelo_moto}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>
              <span className="plate-tag">{registro.placa}</span> · {registro.tipo_servicio} · {registro.nombre_cliente}
            </p>
          </div>

          {/* Botones para agregar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={addMano} style={addBtn('#3B82F6', isDark)}>
              <Wrench size={13} /> Mano de obra
            </button>
            <button onClick={() => { setProdOpen(v => !v); setProdQuery(''); }} style={addBtn('#F59E0B', isDark)}>
              <Package size={13} /> Repuesto inventario
            </button>
            <button onClick={addManual} style={addBtn('#10B981', isDark)}>
              <Plus size={13} /> Repuesto manual
            </button>
          </div>

          {/* Buscador de productos del inventario */}
          {prodOpen && (
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: muted }} />
                <input
                  autoFocus value={prodQuery} onChange={e => setProdQuery(e.target.value)}
                  placeholder="Buscar repuesto por nombre o código…"
                  style={{ ...inputStyle, width: '100%', paddingLeft: 30 }}
                />
                <button onClick={() => setProdOpen(false)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex' }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {prodsFiltrados.length === 0 ? (
                  <p style={{ fontSize: 12, color: muted, textAlign: 'center', padding: '12px 0' }}>Sin productos</p>
                ) : prodsFiltrados.map(p => (
                  <button
                    key={p.id_producto}
                    onClick={() => addProducto(p)}
                    style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'none', border: 'none', borderBottom: `1px solid ${border}`, cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre || p.descripcion}</p>
                      <p style={{ margin: 0, fontSize: 11, color: muted }}>{p.codigo_personal} · Stock {p.stock}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981' }}>{fmtMoney(Number(p.pvp ?? 0))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de ítems */}
          {loading ? (
            <p style={{ fontSize: 13, color: muted, textAlign: 'center', padding: '16px 0' }}>Cargando factura…</p>
          ) : items.length === 0 ? (
            <p style={{ fontSize: 13, color: muted, textAlign: 'center', padding: '16px 0' }}>
              Agrega mano de obra y repuestos. El total se calcula solo.
            </p>
          ) : (
            <div>{items.map(renderRow)}</div>
          )}

          {/* Totales separados */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}><Wrench size={12} color="#3B82F6" /> Mano de obra</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: txt }}>{fmtMoney(totalMano)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}><Package size={12} color="#F59E0B" /> Repuestos</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: txt }}>{fmtMoney(totalRep)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${border}` }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: txt }}>TOTAL</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#E11428' }}>{fmtMoney(total)}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function addBtn(color: string, isDark: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
    color, background: isDark ? `${color}1a` : `${color}14`,
    border: `1px solid ${color}40`, borderRadius: 9, padding: '8px 12px', cursor: 'pointer',
  };
}
