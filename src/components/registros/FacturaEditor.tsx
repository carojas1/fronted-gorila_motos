/* ─────────────────────────────────────────────
   GMotors — Editor de factura de una orden
   Separa MANO DE OBRA y REPUESTOS (inventario o manual/externo).
   Calcula totales en vivo y guarda la lista completa de detalles.
   Se usa al completar una orden y para editar repuestos después
   (incluso en órdenes ya completadas).
   ───────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react';
import { Wrench, Package, Plus, Trash2, Search, X, CheckCircle, Gift } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useTheme } from '../../lib/theme';
import { registrosApi, mantenimientosApi, combustibleApi } from '../../lib/api';
import { fmtMoney, getErrorMsg } from '../../lib/utils';
import {
  CATEGORIAS_REPUESTO, buildManoDescripcion, buildRepuestoDescripcion,
  buildDescuentoPuntosDescripcion, cleanDescripcion, detalleCategoria, detalleKind,
  detalleCostoManual, parseDescuentoPuntos,
} from '../../lib/detalles';
import { descuentoUsdPorPuntos, puntosCliente, puntosPorDescuentoUsd } from '../../lib/puntos';
import type { CargaCombustible, Moto, RegistroDetalle, Producto, Usuario } from '../../types';

interface LineItem {
  uid:        string;
  kind:       'mano' | 'repuesto' | 'descuento';
  idProducto: number | null;   // null = mano de obra, repuesto manual o descuento
  nombre:     string;
  cantidad:   number;
  precio:     number;
  costo:      number;          // solo repuesto manual/externo: costo real de compra
  categoria:  string;          // solo repuesto manual
  puntos?:    number;          // solo descuento por puntos
  foto?:      string | null;   // foto del producto de inventario
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
  usuarios?: Usuario[];
  registros?: RegistroDetalle[];
  motos?: Moto[];
  /** Si true, al guardar también marca la orden como Completada (estado 2). */
  completarAlGuardar?: boolean;
  onClose: () => void;
  onSaved: (total: number, completo: boolean) => void;
}

export default function FacturaEditor({
  open, registro, productos, usuarios = [], registros = [], motos = [],
  completarAlGuardar = false, onClose, onSaved,
}: Props) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const toast = useToast();

  const [items, setItems]     = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [prodQuery, setProdQuery] = useState('');
  const [combustible, setCombustible] = useState<CargaCombustible[]>([]);

  /* Factura emitida (estado 4 = Facturado) → solo lectura: ya no se edita, solo se ven los detalles. */
  const readOnly = (registro?.estado ?? 0) >= 4;

  /* Cargar los detalles existentes al abrir */
  useEffect(() => {
    if (!open || !registro) return;
    setItems([]);
    setProdOpen(false);
    setProdQuery('');
    const idFactura = registro.id_factura;
    combustibleApi.list()
      .then(({ data }) => setCombustible(data as CargaCombustible[]))
      .catch(() => setCombustible([]));
    if (!idFactura) return;
    setLoading(true);
    registrosApi.detalles(idFactura)
      .then(({ data }) => {
        const dtos = (data as DetalleDTO[]) ?? [];
        const mapped: LineItem[] = dtos.map(d => {
          const kind = detalleKind(d);
          const puntos = parseDescuentoPuntos(d.descripcion);
          return {
            uid: nextUid(),
            kind,
            idProducto: d.idProducto ?? null,
            nombre: cleanDescripcion(d.descripcion) || (kind === 'descuento' ? 'Descuento por puntos' : kind === 'mano' ? 'Mano de obra' : 'Repuesto'),
            cantidad: d.cantidad ?? 1,
            precio: Number(d.precioUnitario ?? 0),
            costo: detalleCostoManual(d.descripcion),
            categoria: detalleCategoria(d.descripcion) ?? '',
            puntos,
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
  const totalDesc = useMemo(
    () => items.filter(i => i.kind === 'descuento').reduce((s, i) => s + i.precio * i.cantidad, 0),
    [items],
  );
  const subtotalAntesDescuento = totalMano + totalRep;
  const total = subtotalAntesDescuento + totalDesc;

  const clienteFactura = useMemo(() => {
    if (!registro) return null;
    if (registro.id_cliente != null) {
      return usuarios.find(u => u.id_usuario === registro.id_cliente) ?? null;
    }
    const moto = motos.find(m => m.id_moto === registro.id_moto || m.placa === registro.placa);
    return usuarios.find(u => u.id_usuario === moto?.id_usuario || u.nombre_completo === registro.nombre_cliente) ?? null;
  }, [registro, usuarios, motos]);

  const puntosInfo = useMemo(() => {
    if (!clienteFactura) return null;
    const motosCliente = motos.filter(m => m.id_usuario === clienteFactura.id_usuario);
    return puntosCliente({ usuario: clienteFactura, motos: motosCliente, registros, combustible });
  }, [clienteFactura, motos, registros, combustible]);

  const puntosEnFactura = useMemo(
    () => items.filter(i => i.kind === 'descuento').reduce((s, i) => s + (i.puntos ?? 0), 0),
    [items],
  );
  const puntosDisponiblesParaFactura = (puntosInfo?.disponibles ?? 0) + puntosEnFactura;
  const puntosMostrados = readOnly ? (puntosInfo?.disponibles ?? 0) : puntosDisponiblesParaFactura;
  const puntosMaxPorTotal = Math.floor(Math.max(0, subtotalAntesDescuento) / 5) * 100;
  const puntosAplicables = Math.min(
    Math.floor(puntosDisponiblesParaFactura / 100) * 100,
    puntosMaxPorTotal,
  );

  /* ── Helpers de edición ── */
  const addMano = () =>
    setItems(p => [...p, { uid: nextUid(), kind: 'mano', idProducto: null, nombre: '', cantidad: 1, precio: 0, costo: 0, categoria: '' }]);
  const addManual = () =>
    setItems(p => [...p, { uid: nextUid(), kind: 'repuesto', idProducto: null, nombre: '', cantidad: 1, precio: 0, costo: 0, categoria: 'nuevo' }]);
  const addProducto = (prod: Producto) => {
    setItems(p => [...p, {
      uid: nextUid(), kind: 'repuesto', idProducto: prod.id_producto,
      nombre: prod.nombre || prod.descripcion || 'Repuesto', cantidad: 1,
      precio: Number(prod.pvp ?? 0), costo: Number(prod.costo ?? 0), categoria: '',
      foto: prod.ruta_imagenproductos ?? null,
    }]);
    setProdOpen(false); setProdQuery('');
  };
  const patch = (uid: string, upd: Partial<LineItem>) =>
    setItems(p => p.map(i => i.uid === uid ? { ...i, ...upd } : i));
  const remove = (uid: string) => setItems(p => p.filter(i => i.uid !== uid));
  const quitarCupon = () => setItems(p => p.filter(i => i.kind !== 'descuento'));
  const aplicarCupon = () => {
    if (puntosAplicables < 100) {
      toast.error('Este cliente no tiene puntos suficientes para canjear.');
      return;
    }
    const descuento = descuentoUsdPorPuntos(puntosAplicables);
    setItems(p => [
      ...p.filter(i => i.kind !== 'descuento'),
      {
        uid: nextUid(), kind: 'descuento', idProducto: null,
        nombre: 'Descuento por puntos', cantidad: 1, precio: -descuento,
        costo: 0, categoria: '', puntos: puntosAplicables,
      },
    ]);
    toast.success(`Cupón aplicado: ${puntosAplicables} pts (${fmtMoney(descuento)}).`);
  };

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
    if (!registro || readOnly) return;
    const limpios = items.filter(i => i.kind === 'descuento' || i.precio > 0 || i.idProducto != null);
    const cobrables = limpios.filter(i => i.kind !== 'descuento');
    if (cobrables.length === 0) {
      toast.error('Agrega al menos un ítem con precio (mano de obra o repuesto).');
      return;
    }
    for (const i of limpios) {
      if (i.cantidad <= 0) { toast.error('La cantidad debe ser mayor a 0.'); return; }
      if (i.kind === 'descuento') {
        if (i.precio >= 0 || (i.puntos ?? 0) < 100) {
          toast.error('El cupón de puntos no es válido.');
          return;
        }
        continue;
      }
      if (i.idProducto == null && !i.nombre.trim()) {
        toast.error('Cada ítem manual necesita una descripción.'); return;
      }
    }
    if (total < 0) {
      toast.error('El cupón no puede dejar la factura en negativo.');
      return;
    }
    const dtos = limpios.map(i => {
      if (i.idProducto != null) {
        return { idProducto: i.idProducto, cantidad: i.cantidad };
      }
      if (i.kind === 'descuento') {
        const puntos = i.puntos ?? puntosPorDescuentoUsd(Math.abs(i.precio));
        return {
          idProducto: null,
          cantidad: 1,
          precioUnitario: i.precio,
          descripcion: buildDescuentoPuntosDescripcion(puntos),
        };
      }
      const descripcion = i.kind === 'mano'
        ? buildManoDescripcion(i.nombre || 'Mano de obra')
        : buildRepuestoDescripcion(i.nombre || 'Repuesto', i.categoria, i.costo);
      return { idProducto: null, cantidad: i.cantidad, precioUnitario: i.precio, descripcion };
    });

    setSaving(true);
    try {
      await registrosApi.update(registro.id_registro, dtos as unknown as Record<string, unknown>);
      if (completarAlGuardar && registro.estado < 2) {
        await registrosApi.estado(registro.id_registro, 2);
      }

      /* ── Auto-registro de mantenimiento según categoría del producto ──
         Si el registro tiene id_moto y kilometraje, detectamos qué tipos de
         mantenimiento corresponden a los productos de inventario agregados.
         Se registra en segundo plano sin bloquear el guardado. */
      const idMoto = registro.id_moto;
      const km = registro.kilometraje;
      if (idMoto && km != null) {
        const MANT_MAP: [RegExp, string][] = [
          [/aceite/i,                    'ACEITE'],
          [/filtro\s*(de\s*)?aire/i,     'FILTRO_AIRE'],
          [/buj[ií]a/i,                  'BUJIA'],
          [/cadena|correa/i,             'CADENA'],
          [/llanta|neum[aá]tico|tire/i,  'LLANTA_TRASERA'],
          [/freno|pastilla|brake/i,       'FRENOS'],
        ];
        const tiposARegistrar = new Set<string>();
        for (const item of limpios) {
          if (item.idProducto == null) continue;
          const prod = productos.find(p => p.id_producto === item.idProducto);
          if (!prod) continue;
          const texto = `${prod.nombre ?? ''} ${prod.descripcion ?? ''}`;
          for (const [regex, tipo] of MANT_MAP) {
            if (regex.test(texto)) { tiposARegistrar.add(tipo); break; }
          }
        }
        tiposARegistrar.forEach(tipo =>
          mantenimientosApi.registrar({ id_moto: idMoto, tipo, km_servicio: km }).catch(() => {})
        );
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
    const esDesc = i.kind === 'descuento';
    const sub = i.precio * i.cantidad;
    const rowColor = esDesc ? '#10B981' : i.kind === 'mano' ? '#3B82F6' : '#F59E0B';
    return (
      <div key={i.uid} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {esDesc
            ? <Gift size={14} color="#10B981" />
            : i.kind === 'mano'
              ? <Wrench size={14} color="#3B82F6" />
              : <Package size={14} color="#F59E0B" />}
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: rowColor }}>
            {esDesc ? `Cupón de puntos · ${i.puntos ?? 0} pts` : i.kind === 'mano' ? 'Mano de obra' : esInv ? 'Repuesto · inventario' : 'Repuesto manual'}
          </span>
          {!readOnly && (
            <button onClick={() => remove(i.uid)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex' }} title="Quitar">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Descripción */}
        {esInv ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {i.foto ? (
              <img src={i.foto} alt={i.nombre}
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: `1px solid ${border}` }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Package size={18} color={muted} />
              </div>
            )}
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: txt }}>{i.nombre}</p>
          </div>
        ) : esDesc ? (
          <div style={{ background: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : '#BBF7D0'}`, borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: rowColor }}>{i.nombre}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>Canje aplicado a esta factura</p>
          </div>
        ) : (
          <input
            value={i.nombre}
            disabled={readOnly}
            onChange={e => patch(i.uid, { nombre: e.target.value })}
            placeholder={i.kind === 'mano' ? 'Ej. Mano de obra: cambio de aceite' : 'Ej. Pastillas de freno (compra externa)'}
            style={{ ...inputStyle, width: '100%', marginBottom: 8, opacity: readOnly ? 0.7 : 1 }}
          />
        )}

        {/* Categoría (solo repuesto manual) */}
        {i.kind === 'repuesto' && !esInv && (
          <select
            value={i.categoria}
            disabled={readOnly}
            onChange={e => patch(i.uid, { categoria: e.target.value })}
            style={{ ...inputStyle, width: '100%', marginBottom: 8, opacity: readOnly ? 0.7 : 1 }}
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
              disabled={readOnly || esDesc}
              onChange={e => patch(i.uid, { cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
              style={{ ...inputStyle, width: 58, opacity: readOnly ? 0.7 : 1 }}
            />
          </div>
          {i.kind === 'repuesto' && !esInv && !esDesc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: muted }}>Costo</span>
              <input
                type="number" min={0} step="0.01" value={i.costo}
                disabled={readOnly}
                onChange={e => patch(i.uid, { costo: Math.max(0, parseFloat(e.target.value) || 0) })}
                style={{ ...inputStyle, width: 78, opacity: readOnly ? 0.7 : 1 }}
                title="Cuanto te cuesta comprar este repuesto"
              />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: muted }}>{i.kind === 'repuesto' && !esInv ? 'PVP' : '$ c/u'}</span>
            <input
              type="number" min={0} step="0.01" value={i.precio}
              disabled={esInv || readOnly || esDesc}
              onChange={e => patch(i.uid, { precio: Math.max(0, parseFloat(e.target.value) || 0) })}
              style={{ ...inputStyle, width: 84, opacity: (esInv || readOnly || esDesc) ? 0.6 : 1 }}
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
      title={readOnly ? 'Factura emitida · solo lectura' : completarAlGuardar ? 'Completar servicio · factura' : 'Mano de obra y repuestos'}
      size="lg"
      footer={
        readOnly ? (
          <Button onClick={onClose}>Cerrar</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} loading={saving} disabled={items.length === 0}>
              <CheckCircle size={14} /> {completarAlGuardar ? 'Completar y facturar' : 'Guardar factura'}
            </Button>
          </>
        )
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

          {(registro.descripcion || registro.observaciones || registro.kilometraje != null) && (
            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: muted }}>
                Ingreso y observaciones
              </p>
              {registro.descripcion && (
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: txt }}>{registro.descripcion}</p>
              )}
              {registro.observaciones && registro.observaciones !== registro.descripcion && (
                <p style={{ margin: '5px 0 0', fontSize: 12, lineHeight: 1.45, color: txt }}>{registro.observaciones}</p>
              )}
              {registro.kilometraje != null && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: muted }}>Km de ingreso: {registro.kilometraje.toLocaleString('es-EC')} km</p>
              )}
            </div>
          )}

          {/* Aviso de factura emitida */}
          {readOnly && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={15} color="#10B981" />
              <span style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(21,21,27,0.7)' }}>
                Esta factura ya fue emitida. Solo puedes ver el detalle; no se puede modificar.
              </span>
            </div>
          )}

          {clienteFactura && puntosInfo && (
            <div style={{ background: isDark ? 'rgba(16,185,129,0.06)' : '#F0FDF4', border: `1px solid ${isDark ? 'rgba(16,185,129,0.18)' : '#BBF7D0'}`, borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Gift size={15} color="#10B981" />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: txt }}>{clienteFactura.nombre_completo}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>
                    Ganados {puntosInfo.ganados} pts · Canjeados {puntosInfo.canjeados} pts · Disponibles {puntosMostrados} pts
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#10B981' }}>
                  {fmtMoney(descuentoUsdPorPuntos(puntosMostrados))}
                </span>
                {!readOnly && (
                  puntosEnFactura > 0 ? (
                    <button onClick={quitarCupon} style={addBtn('#EF4444', isDark)}>
                      <X size={13} /> Quitar cupón
                    </button>
                  ) : (
                    <button onClick={aplicarCupon} disabled={puntosAplicables < 100 || subtotalAntesDescuento <= 0}
                      style={{ ...addBtn('#10B981', isDark), opacity: puntosAplicables < 100 || subtotalAntesDescuento <= 0 ? 0.45 : 1 }}>
                      <Gift size={13} /> Aplicar {puntosAplicables} pts
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Botones para agregar */}
          {!readOnly && (
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
          )}

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
                    {p.ruta_imagenproductos ? (
                      <img src={p.ruta_imagenproductos} alt={p.nombre}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: `1px solid ${border}` }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={16} color={muted} />
                      </div>
                    )}
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
              {readOnly ? 'Esta factura no tiene ítems registrados.' : 'Agrega mano de obra y repuestos. El total se calcula solo.'}
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
            {totalDesc !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: muted, display: 'flex', alignItems: 'center', gap: 6 }}><Gift size={12} color="#10B981" /> Descuento puntos</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#10B981' }}>{fmtMoney(totalDesc)}</span>
              </div>
            )}
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
