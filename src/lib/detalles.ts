/* ─────────────────────────────────────────────
   GMotors — Separación MANO DE OBRA vs REPUESTOS
   Sin cambios de base de datos. El tipo se codifica en la descripción
   de los ítems que NO son de inventario (id_producto = null):
     · Repuesto de inventario  → id_producto != null
     · Mano de obra            → id_producto = null  y desc "[MANO] ..."
     · Repuesto manual/externo → id_producto = null  y desc "[REP|cat] ..."
   Los ítems antiguos sin etiqueta (un solo "Servicio de taller") se tratan
   como mano de obra para no contar de más en repuestos.
   ───────────────────────────────────────────── */

export type DetalleKind = 'mano' | 'repuesto';

/* Categorías de repuesto que pidió el dueño */
export const CATEGORIAS_REPUESTO = [
  { key: 'nuevo',       label: 'Nuevo' },
  { key: 'marca',       label: 'De marca' },
  { key: 'pedido',      label: 'Bajo pedido' },
  { key: 'economica',   label: 'Económica' },
  { key: 'intermedia',  label: 'Intermedia' },
  { key: 'rendimiento', label: 'Buen rendimiento' },
] as const;

export type CategoriaRepuesto = typeof CATEGORIAS_REPUESTO[number]['key'];

const MANO_TAG = '[MANO]';

export function categoriaLabel(key?: string | null): string {
  return CATEGORIAS_REPUESTO.find(c => c.key === key)?.label ?? '';
}

/* Construir descripción etiquetada para guardar en el backend */
export function buildManoDescripcion(desc: string): string {
  return `${MANO_TAG} ${desc.trim()}`.trim();
}
export function buildRepuestoDescripcion(desc: string, cat?: string | null): string {
  return `[REP${cat ? '|' + cat : ''}] ${desc.trim()}`.trim();
}

/* Forma flexible: acepta tanto el DTO del backend (idProducto) como
   estructuras locales (id_producto). */
export interface DetalleLike {
  idProducto?: number | null;
  id_producto?: number | null;
  descripcion?: string | null;
  subtotal?: number | string | null;
  cantidad?: number | null;
  precioUnitario?: number | string | null;
}

function idProductoDe(d: DetalleLike): number | null {
  const v = d.idProducto ?? d.id_producto ?? null;
  return v == null ? null : Number(v);
}

/* Clasificar un detalle como mano de obra o repuesto */
export function detalleKind(d: DetalleLike): DetalleKind {
  if (idProductoDe(d) != null) return 'repuesto';           // inventario
  const desc = (d.descripcion ?? '').trimStart();
  if (desc.toUpperCase().startsWith('[REP')) return 'repuesto'; // manual/externo
  return 'mano';                                             // [MANO] o legado sin etiqueta
}

/* Quitar la etiqueta [MANO] / [REP|cat] para mostrar al usuario */
export function cleanDescripcion(desc?: string | null): string {
  if (!desc) return '';
  return desc.replace(/^\s*\[(MANO|REP[^\]]*)\]\s*/i, '').trim();
}

/* Extraer la categoría de un repuesto manual ([REP|economica] → "economica") */
export function detalleCategoria(desc?: string | null): string | null {
  const m = (desc ?? '').match(/^\s*\[REP\|([^\]]+)\]/i);
  return m ? m[1].toLowerCase() : null;
}

function num(v: number | string | null | undefined): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  return isNaN(n as number) ? 0 : (n as number);
}

/* Sumar por tipo: { mano, repuestos, total } */
export function splitTotales(detalles: DetalleLike[]): { mano: number; repuestos: number; total: number } {
  let mano = 0, repuestos = 0;
  for (const d of detalles) {
    const sub = num(d.subtotal);
    if (detalleKind(d) === 'mano') mano += sub; else repuestos += sub;
  }
  return { mano, repuestos, total: mano + repuestos };
}
