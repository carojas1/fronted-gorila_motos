import type { CargaCombustible, DetalleFactura, Moto, RegistroDetalle, Usuario } from '../types';
import { parseDescuentoPuntos } from './detalles';

export const POINTS_TABLE = [
  { max: 125,   pts: 5,  label: '<= 125 cc',  color: '#10B981' },
  { max: 200,   pts: 8,  label: '126-200 cc', color: '#3B82F6' },
  { max: 400,   pts: 12, label: '201-400 cc', color: '#8B5CF6' },
  { max: 650,   pts: 18, label: '401-650 cc', color: '#F59E0B' },
  { max: 99999, pts: 25, label: '651 cc +',   color: '#EF4444' },
];

export const PUNTOS_CANJE_PASO = 100;
export const DESCUENTO_POR_PASO = 5;

const OIL_KEYWORDS = ['cambio de aceite', 'aceite', 'oil'];

export function ptsForCc(cc: number): number {
  return POINTS_TABLE.find(r => cc <= r.max)?.pts ?? 5;
}

export function isOilChange(tipo: string | null | undefined, desc: string | null | undefined): boolean {
  const t = `${tipo ?? ''} ${desc ?? ''}`.toLowerCase();
  return OIL_KEYWORDS.some(k => t.includes(k));
}

export function descuentoUsdPorPuntos(puntos: number): number {
  return Math.floor(Math.max(0, puntos) / PUNTOS_CANJE_PASO) * DESCUENTO_POR_PASO;
}

export function puntosPorDescuentoUsd(monto: number): number {
  return Math.floor(Math.max(0, monto) / DESCUENTO_POR_PASO) * PUNTOS_CANJE_PASO;
}

function detallesDeRegistro(reg: RegistroDetalle): DetalleFactura[] {
  return (reg.detalles ?? []) as DetalleFactura[];
}

export function puntosCanjeadosEnRegistros(registros: RegistroDetalle[]): number {
  return registros.reduce((total, reg) => (
    total + detallesDeRegistro(reg).reduce((s, d) => s + parseDescuentoPuntos(d.descripcion), 0)
  ), 0);
}

export function puntosCliente(params: {
  usuario: Usuario;
  motos: Moto[];
  registros: RegistroDetalle[];
  combustible?: CargaCombustible[];
}) {
  const { usuario, motos, registros, combustible = [] } = params;
  const placas = new Set(motos.map(m => m.placa));
  const motoMap = new Map(motos.map(m => [m.placa, m]));

  const registrosCliente = registros.filter(r =>
    (r.id_cliente != null && r.id_cliente === usuario.id_usuario) || placas.has(r.placa)
  );

  const puntosServicio = registrosCliente.reduce((total, r) => {
    const moto = motoMap.get(r.placa);
    const cc = moto?.cilindraje ?? 125;
    return total + ptsForCc(cc) + (isOilChange(r.tipo_servicio, r.descripcion) ? 3 : 0);
  }, 0);

  const diasCombustible = new Set(
    combustible.filter(c => placas.has(c.placa)).map(c => String(c.fecha).slice(0, 10))
  );
  const puntosCombustible = diasCombustible.size * 2;
  const bonus = Number(usuario.puntosBonus ?? 0);
  const ganados = puntosServicio + puntosCombustible + bonus;
  const canjeados = puntosCanjeadosEnRegistros(registrosCliente);
  const disponibles = Math.max(0, ganados - canjeados);
  const puntosListos = Math.floor(disponibles / PUNTOS_CANJE_PASO) * PUNTOS_CANJE_PASO;
  const cashback = descuentoUsdPorPuntos(disponibles);

  return {
    registrosCliente,
    puntosServicio,
    puntosCombustible,
    bonus,
    ganados,
    canjeados,
    disponibles,
    puntosListos,
    cashback,
  };
}
