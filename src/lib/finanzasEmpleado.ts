/* ─────────────────────────────────────────────
   GORILA MOTOS — Capa de datos: finanzas y permisos por empleado.
   Persistencia en localStorage (intercambiable por API real
   simplemente cambiando esta implementación, sin tocar la UI).
   ───────────────────────────────────────────── */

export type ConceptoPago =
  | 'Sueldo'
  | 'Bono'
  | 'Comisión'
  | 'Anticipo'
  | 'Otro';

export interface PagoEmpleado {
  id:          string;       // uuid local
  id_empleado: number;
  fecha:       string;       // ISO yyyy-MM-dd
  concepto:    ConceptoPago;
  monto:       number;       // positivo (es gasto desde la óptica del jefe)
  notas?:      string;
}

export const MODULOS = [
  { key: 'ventas',     label: 'Ventas'              },
  { key: 'caja',       label: 'Caja registradora'   },
  { key: 'inventario', label: 'Inventario'          },
  { key: 'registros',  label: 'Registros / servicios' },
  { key: 'motos',      label: 'Motos'               },
  { key: 'clientes',   label: 'Clientes'            },
] as const;

export type ModuloKey = (typeof MODULOS)[number]['key'];
export type PermisosEmpleado = Record<ModuloKey, boolean>;

/** Permisos por defecto para un Mecánico recién creado. */
export const PERMISOS_DEFAULT: PermisosEmpleado = {
  ventas:     true,
  caja:       true,
  inventario: true,
  registros:  true,
  motos:      true,
  clientes:   false,
};

const KEY_PAGOS    = (id: number) => `gm_pagos_${id}`;
const KEY_PERMISOS = (id: number) => `gm_permisos_${id}`;

/* ─── Utilidad: id corto pseudo-aleatorio (no necesitamos uuid full) ─── */
const shortId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ═══════════════════ PAGOS ═══════════════════ */

export function listarPagos(idEmpleado: number): PagoEmpleado[] {
  try {
    const raw = localStorage.getItem(KEY_PAGOS(idEmpleado));
    const arr = raw ? (JSON.parse(raw) as PagoEmpleado[]) : [];
    return arr.sort((a, b) => b.fecha.localeCompare(a.fecha));
  } catch {
    return [];
  }
}

export function crearPago(
  idEmpleado: number,
  data: Omit<PagoEmpleado, 'id' | 'id_empleado'>,
): PagoEmpleado {
  const nuevo: PagoEmpleado = {
    id: shortId(),
    id_empleado: idEmpleado,
    ...data,
  };
  const actuales = listarPagos(idEmpleado);
  localStorage.setItem(KEY_PAGOS(idEmpleado), JSON.stringify([nuevo, ...actuales]));
  return nuevo;
}

export function eliminarPago(idEmpleado: number, idPago: string): void {
  const filtrados = listarPagos(idEmpleado).filter((p) => p.id !== idPago);
  localStorage.setItem(KEY_PAGOS(idEmpleado), JSON.stringify(filtrados));
}

/* ─── Agregaciones derivadas ─── */

export interface ResumenFinanzas {
  totalYTD:        number;   // total año en curso
  totalMesActual:  number;
  totalPagosCount: number;
  promedio:        number;
  porMes:          { mes: number; total: number }[]; // 12 entries (0..11)
  ultimo:          PagoEmpleado | null;
}

export function resumenFinanzas(idEmpleado: number, anio = new Date().getFullYear()): ResumenFinanzas {
  const pagos = listarPagos(idEmpleado);
  const delAnio = pagos.filter((p) => p.fecha.startsWith(String(anio)));

  const porMes = Array.from({ length: 12 }, (_, m) => ({
    mes: m,
    total: delAnio
      .filter((p) => Number(p.fecha.slice(5, 7)) === m + 1)
      .reduce((s, p) => s + p.monto, 0),
  }));

  const totalYTD       = delAnio.reduce((s, p) => s + p.monto, 0);
  const mesActual      = new Date().getMonth() + 1;
  const totalMesActual = delAnio
    .filter((p) => Number(p.fecha.slice(5, 7)) === mesActual)
    .reduce((s, p) => s + p.monto, 0);

  return {
    totalYTD,
    totalMesActual,
    totalPagosCount: delAnio.length,
    promedio:        delAnio.length ? totalYTD / delAnio.length : 0,
    porMes,
    ultimo:          pagos[0] ?? null,
  };
}

/* ═══════════════════ PERMISOS ═══════════════════ */

export function obtenerPermisos(idEmpleado: number): PermisosEmpleado {
  try {
    const raw = localStorage.getItem(KEY_PERMISOS(idEmpleado));
    if (!raw) return { ...PERMISOS_DEFAULT };
    return { ...PERMISOS_DEFAULT, ...JSON.parse(raw) } as PermisosEmpleado;
  } catch {
    return { ...PERMISOS_DEFAULT };
  }
}

export function guardarPermisos(idEmpleado: number, permisos: PermisosEmpleado): void {
  localStorage.setItem(KEY_PERMISOS(idEmpleado), JSON.stringify(permisos));
}
