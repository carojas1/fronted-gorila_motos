/* ─────────────────────────────────────────────
   GMotors — Referencia de mantenimiento (Ecuador)
   Espejo EXACTO de DatabaseSeeder.java del backend.
   Fuente de verdad para el panel explicativo de cálculos.
   El estado real por moto SIEMPRE viene del backend
   (alertasApi.estadoMoto), esto solo documenta la metodología.
   ───────────────────────────────────────────── */

export interface RangoCC {
  ccMin: number;
  ccMax: number | null;        // null = sin límite (651cc+)
  label: string;
  color: string;
  ejemplos: string;
}

export interface ParametroRef {
  tipo:        string;         // ACEITE, FILTRO_AIRE, ...
  label:       string;         // Nombre legible
  intervaloKm: number;
  descripcion: string;
}

/* ── Rangos de cilindraje ── */
export const RANGOS_CC: RangoCC[] = [
  { ccMin: 50,  ccMax: 125,  label: 'Urbana',           color: '#10B981', ejemplos: 'Scooters, AKT, Shineray, Ranger' },
  { ccMin: 126, ccMax: 200,  label: 'Semideportiva',    color: '#3B82F6', ejemplos: 'Honda CB190, Yamaha FZ-S, AKT TT200' },
  { ccMin: 201, ccMax: 400,  label: 'Deportiva',        color: '#F59E0B', ejemplos: 'Yamaha MT-03, Honda CB300R, Bajaj Dominar' },
  { ccMin: 401, ccMax: 650,  label: 'Alto rendimiento', color: '#FF8C00', ejemplos: 'Yamaha MT-07, KTM Duke 390, Honda CB500F' },
  { ccMin: 651, ccMax: null, label: 'Supersport',       color: '#E11428', ejemplos: 'Honda CB1000R, Yamaha MT-09, BMW GS' },
];

/* ── Etiquetas legibles por tipo ── */
export const TIPO_LABEL: Record<string, string> = {
  ACEITE:           'Aceite de motor',
  FILTRO_AIRE:      'Filtro de aire',
  BUJIA:            'Bujía',
  CADENA:           'Cadena / correa',
  LLANTA_TRASERA:   'Llanta trasera',
  FRENOS:           'Frenos',
  REVISION_GENERAL: 'Revisión general',
};

/* ── Iconos sugeridos (lucide names) por tipo ── */
export const TIPO_ICON: Record<string, string> = {
  ACEITE:           'Droplet',
  FILTRO_AIRE:      'Wind',
  BUJIA:            'Zap',
  CADENA:           'Link2',
  LLANTA_TRASERA:   'Circle',
  FRENOS:           'Disc',
  REVISION_GENERAL: 'ClipboardCheck',
};

/* ── Tabla completa de intervalos (km) por rango — espejo EXACTO del seeder ──
   Intervalos cortos a propósito (rodadura Ecuador: polvo, altitud, combustible
   87-oct). Mantienen la moto óptima y disparan recordatorios al correo seguido. */
export const INTERVALOS: { rango: RangoCC; params: ParametroRef[] }[] = [
  {
    rango: RANGOS_CC[0],
    params: [
      { tipo: 'ACEITE',           label: TIPO_LABEL.ACEITE,           intervaloKm: 1200,  descripcion: 'Aceite motor — cambio cada 1 200 km' },
      { tipo: 'FILTRO_AIRE',      label: TIPO_LABEL.FILTRO_AIRE,      intervaloKm: 2500,  descripcion: 'Filtro de aire — limpieza/cambio cada 2 500 km' },
      { tipo: 'BUJIA',            label: TIPO_LABEL.BUJIA,            intervaloKm: 3000,  descripcion: 'Bujía — inspección y cambio cada 3 000 km' },
      { tipo: 'CADENA',           label: TIPO_LABEL.CADENA,           intervaloKm: 1800,  descripcion: 'Cadena/correa — tensado y lubricación cada 1 800 km' },
      { tipo: 'LLANTA_TRASERA',   label: TIPO_LABEL.LLANTA_TRASERA,   intervaloKm: 5000,  descripcion: 'Llanta trasera — revisión de profundidad cada 5 000 km' },
      { tipo: 'FRENOS',           label: TIPO_LABEL.FRENOS,           intervaloKm: 3000,  descripcion: 'Pastillas y líquido de frenos — inspección cada 3 000 km' },
      { tipo: 'REVISION_GENERAL', label: TIPO_LABEL.REVISION_GENERAL, intervaloKm: 3500,  descripcion: 'Revisión general completa cada 3 500 km' },
    ],
  },
  {
    rango: RANGOS_CC[1],
    params: [
      { tipo: 'ACEITE',           label: TIPO_LABEL.ACEITE,           intervaloKm: 1800,  descripcion: 'Aceite motor — cambio cada 1 800 km' },
      { tipo: 'FILTRO_AIRE',      label: TIPO_LABEL.FILTRO_AIRE,      intervaloKm: 3500,  descripcion: 'Filtro de aire — limpieza/cambio cada 3 500 km' },
      { tipo: 'BUJIA',            label: TIPO_LABEL.BUJIA,            intervaloKm: 5000,  descripcion: 'Bujía — inspección y cambio cada 5 000 km' },
      { tipo: 'CADENA',           label: TIPO_LABEL.CADENA,           intervaloKm: 3000,  descripcion: 'Cadena — tensado y lubricación cada 3 000 km' },
      { tipo: 'LLANTA_TRASERA',   label: TIPO_LABEL.LLANTA_TRASERA,   intervaloKm: 6000,  descripcion: 'Llanta trasera — revisión cada 6 000 km' },
      { tipo: 'FRENOS',           label: TIPO_LABEL.FRENOS,           intervaloKm: 4000,  descripcion: 'Frenos — inspección completa cada 4 000 km' },
      { tipo: 'REVISION_GENERAL', label: TIPO_LABEL.REVISION_GENERAL, intervaloKm: 5000,  descripcion: 'Revisión general cada 5 000 km' },
    ],
  },
  {
    rango: RANGOS_CC[2],
    params: [
      { tipo: 'ACEITE',           label: TIPO_LABEL.ACEITE,           intervaloKm: 2500,  descripcion: 'Aceite motor — cambio cada 2 500 km' },
      { tipo: 'FILTRO_AIRE',      label: TIPO_LABEL.FILTRO_AIRE,      intervaloKm: 5000,  descripcion: 'Filtro de aire — cada 5 000 km' },
      { tipo: 'BUJIA',            label: TIPO_LABEL.BUJIA,            intervaloKm: 6000,  descripcion: 'Bujía de iridio — cada 6 000 km' },
      { tipo: 'CADENA',           label: TIPO_LABEL.CADENA,           intervaloKm: 5000,  descripcion: 'Cadena — tensado y lubricación cada 5 000 km' },
      { tipo: 'LLANTA_TRASERA',   label: TIPO_LABEL.LLANTA_TRASERA,   intervaloKm: 7000,  descripcion: 'Llanta trasera — revisión cada 7 000 km' },
      { tipo: 'FRENOS',           label: TIPO_LABEL.FRENOS,           intervaloKm: 5500,  descripcion: 'Frenos — inspección cada 5 500 km' },
      { tipo: 'REVISION_GENERAL', label: TIPO_LABEL.REVISION_GENERAL, intervaloKm: 6000,  descripcion: 'Revisión general cada 6 000 km' },
    ],
  },
  {
    rango: RANGOS_CC[3],
    params: [
      { tipo: 'ACEITE',           label: TIPO_LABEL.ACEITE,           intervaloKm: 3000,  descripcion: 'Aceite sintético — cambio cada 3 000 km' },
      { tipo: 'FILTRO_AIRE',      label: TIPO_LABEL.FILTRO_AIRE,      intervaloKm: 6000,  descripcion: 'Filtro de aire — cada 6 000 km' },
      { tipo: 'BUJIA',            label: TIPO_LABEL.BUJIA,            intervaloKm: 7000,  descripcion: 'Bujía de platino/iridio — cada 7 000 km' },
      { tipo: 'CADENA',           label: TIPO_LABEL.CADENA,           intervaloKm: 6000,  descripcion: 'Cadena — lubricación y revisión cada 6 000 km' },
      { tipo: 'LLANTA_TRASERA',   label: TIPO_LABEL.LLANTA_TRASERA,   intervaloKm: 9000,  descripcion: 'Llanta trasera — desgaste cada 9 000 km' },
      { tipo: 'FRENOS',           label: TIPO_LABEL.FRENOS,           intervaloKm: 6500,  descripcion: 'Frenos — inspección cada 6 500 km' },
      { tipo: 'REVISION_GENERAL', label: TIPO_LABEL.REVISION_GENERAL, intervaloKm: 7000,  descripcion: 'Revisión general cada 7 000 km' },
    ],
  },
  {
    rango: RANGOS_CC[4],
    params: [
      { tipo: 'ACEITE',           label: TIPO_LABEL.ACEITE,           intervaloKm: 3500,  descripcion: 'Aceite 100% sintético — cambio cada 3 500 km' },
      { tipo: 'FILTRO_AIRE',      label: TIPO_LABEL.FILTRO_AIRE,      intervaloKm: 7000,  descripcion: 'Filtro de aire de alto flujo — cada 7 000 km' },
      { tipo: 'BUJIA',            label: TIPO_LABEL.BUJIA,            intervaloKm: 9000,  descripcion: 'Bujía de iridio — cada 9 000 km' },
      { tipo: 'CADENA',           label: TIPO_LABEL.CADENA,           intervaloKm: 7000,  descripcion: 'Cadena reforzada — cada 7 000 km' },
      { tipo: 'LLANTA_TRASERA',   label: TIPO_LABEL.LLANTA_TRASERA,   intervaloKm: 10000, descripcion: 'Llanta trasera de alto rendimiento — cada 10 000 km' },
      { tipo: 'FRENOS',           label: TIPO_LABEL.FRENOS,           intervaloKm: 7500,  descripcion: 'Frenos — inspección cada 7 500 km' },
      { tipo: 'REVISION_GENERAL', label: TIPO_LABEL.REVISION_GENERAL, intervaloKm: 9000,  descripcion: 'Revisión general integral cada 9 000 km' },
    ],
  },
];

/* ── Devuelve el rango al que pertenece un cilindraje ── */
export function rangoDeCC(cc: number): RangoCC {
  return RANGOS_CC.find(r => cc >= r.ccMin && (r.ccMax === null || cc <= r.ccMax)) ?? RANGOS_CC[RANGOS_CC.length - 1];
}

/* ── Devuelve los parámetros que aplican a un cilindraje ── */
export function parametrosDeCC(cc: number): ParametroRef[] {
  const rango = rangoDeCC(cc);
  return INTERVALOS.find(i => i.rango === rango)?.params ?? [];
}

/* Detecta todos los mantenimientos mencionados en una orden o factura.
   Se usa al completar el trabajo para reiniciar sus porcentajes en la nube,
   incluso cuando el repuesto fue escrito manualmente y no vino del inventario. */
const MANTENIMIENTO_TEXT_RULES: { tipo: string; pattern: RegExp }[] = [
  { tipo: 'FILTRO_AIRE',      pattern: /\bfiltro\s+(?:de\s+)?aire\b/ },
  { tipo: 'ACEITE',           pattern: /\baceite\b/ },
  { tipo: 'BUJIA',            pattern: /\bbujia(?:s)?\b/ },
  { tipo: 'CADENA',           pattern: /\b(?:cadena|correa)\b/ },
  { tipo: 'LLANTA_TRASERA',   pattern: /\b(?:llanta|llantas|neumatico|neumaticos)\b/ },
  { tipo: 'FRENOS',           pattern: /\b(?:freno|frenos|pastilla|pastillas)\b/ },
  { tipo: 'REVISION_GENERAL', pattern: /\b(?:revision|mantenimiento)\s+general\b/ },
];

export function tiposMantenimientoEnTexto(texto: string): string[] {
  const normalizado = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return MANTENIMIENTO_TEXT_RULES
    .filter(regla => regla.pattern.test(normalizado))
    .map(regla => regla.tipo);
}

/* ── Etiqueta del rango "X cc — Categoría" ── */
export function etiquetaCC(cc: number): string {
  const r = rangoDeCC(cc);
  return `${cc} cc — ${r.label}`;
}

/* ── Cálculo de desgaste (idéntico al backend AlertaMantenimientoService) ──
   ultimoUmbral  = floor(km / intervalo) * intervalo
   proximoUmbral = ultimoUmbral + intervalo
   porcentaje    = (km - ultimoUmbral) / intervalo * 100   (cap 100)
   kmRestante    = proximoUmbral - km
   estado: >=100 VENCIDO · >=80 PROXIMO · resto OK
   ───────────────────────────────────────────────────────────────────── */
export interface EstadoCalculado {
  tipo:               string;
  label:              string;
  intervaloKm:        number;
  kmActual:           number;
  ultimoCambioKm:     number;
  proximoCambioKm:    number;
  kmDesdeUltimo:      number;
  kmRestante:         number;
  porcentajeDesgaste: number;
  estado:             'OK' | 'PROXIMO' | 'VENCIDO';
}

/* El desgaste se mide desde el ÚLTIMO MANTENIMIENTO REAL registrado por el
   mecánico (no desde un múltiplo asumido). Si nunca se registró, parte de 0 km
   → la pieza acumula desgaste y se pone en rojo hasta que alguien la cambie.
   `servicios` = { TIPO: km_en_que_se_hizo }. */
export function calcularEstadoLocal(
  cc: number,
  kmActual: number,
  servicios: Record<string, number> = {},
): EstadoCalculado[] {
  return parametrosDeCC(cc).map(p => {
    const intervalo     = p.intervaloKm;
    const ultimoCambio  = servicios[p.tipo] ?? 0;            // km del último cambio real (0 = nunca)
    const kmDesdeUltimo = Math.max(0, kmActual - ultimoCambio);
    const proximoCambio = ultimoCambio + intervalo;
    const porcentaje    = Math.round((kmDesdeUltimo / intervalo) * 100); // puede superar 100% (vencido)
    const kmRestante    = proximoCambio - kmActual;
    /* PROXIMO desde 70% (antes 80%) → el cliente recibe el aviso antes */
    const estado: EstadoCalculado['estado'] =
      porcentaje >= 100 ? 'VENCIDO' : porcentaje >= 70 ? 'PROXIMO' : 'OK';
    return {
      tipo: p.tipo, label: p.label, intervaloKm: intervalo, kmActual,
      ultimoCambioKm: ultimoCambio, proximoCambioKm: proximoCambio,
      kmDesdeUltimo, kmRestante, porcentajeDesgaste: porcentaje, estado,
    };
  });
}

/* Los mantenimientos realizados viven en el backend (tabla mantenimiento_realizado),
   se consultan vía mantenimientosApi. No se guarda nada en el dispositivo. */

/* ── Colores de estado consistentes en toda la app ── */
export const ESTADO_COLOR: Record<EstadoCalculado['estado'], { label: string; color: string; bg: string; border: string }> = {
  OK:      { label: 'Al día',   color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
  PROXIMO: { label: 'Próximo',  color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  VENCIDO: { label: 'Vencido',  color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)'  },
};
