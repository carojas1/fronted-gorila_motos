/* ─────────────────────────────────────────────
   GMotors — Tipos globales de TypeScript
   ───────────────────────────────────────────── */

export interface Usuario {
  id_usuario:      number;
  nombre_completo: string;
  nombre_usuario:  string;
  correo:          string;
  pais:            string;
  ciudad:          string;
  descripcion:     string;
  ruta_imagen:     string | null;
  roles:           string[] | null;
  telefono?:       string | null;
  direccion?:      string | null;
  puntosBonus?:    number | null;
  codigoReferido?: string | null;
}

export interface AuthResponse {
  token:     string;
  usuario:   Usuario;
}

export interface Rol {
  id_rol: number;
  nombre: string;
}

export interface UsuarioRol {
  id_usuario:         number;
  id_rol:             number;
  estado:             number;   // 1 activo, 0 inactivo
  fecha_creacion:     string;
  fecha_modificacion: string | null;
}

export interface Moto {
  id_moto:           number;
  placa:             string;
  anio:              number;
  marca:             string;
  modelo:            string;
  nombre_moto:       string | null;
  tipo_moto:         string;
  kilometraje:       number;
  cilindraje:        number;
  id_usuario:        number;
  ruta_imagen_motos: string | null;
}

export interface Categoria {
  id_categoria: number;
  nombre:       string;
  descripcion:  string;
}

export interface Producto {
  id_producto:         number;
  codigo_proveedor:    string;
  codigo_personal:     string;
  nombre:              string;
  descripcion:         string;
  costo:               number;
  pvp:                 number;
  stock:               number;
  fecha_registro:      string;
  fecha_modificacion:  string;
  id_categoria:        number;
  ruta_imagenproductos:string | null;
}

export interface Tipo {
  id_tipo:                  number;
  nombre:                   string;
  descripcion:              string;
  concepto_manual:          string | null;
  concepto_cantidad:        number | null;
  concepto_precio_unitario: number | null;
}

export interface Factura {
  id_factura:   number;
  fecha_emision:string;
  id_usuario:   number;
  costo_total:  number;
}

export interface DetalleFactura {
  id_detalle:  number;
  cantidad:    number;
  id_factura:  number;
  id_producto: number | null;
  subtotal:    number;
  descripcion: string | null;
}

export interface Registro {
  id_registro:  number;
  fecha:        string;
  observaciones:string;
  estado:       number;   // 0 pendiente, 1 en proceso, 2 completado, 3 entregado, 4 facturado
  id_factura:   number;
  id_encargado: number;
  id_cliente:   number;
  id_tipo:      number;
  id_moto:      number;
  kilometraje:  number | null;
}

export interface RegistroDetalle {
  id_registro:      number;
  nombre_cliente:   string;
  nombre_encargado?: string;
  marca_moto:       string;
  modelo_moto:      string;
  placa:            string;
  ruta_imagen_moto: string | null;
  fecha:            string;
  descripcion:      string;
  tipo_servicio:    string;
  costo_total:      number;
  id_factura:       number;
  estado:           number;
  kilometraje:      number | null;
}

export interface Ruta {
  id_ruta:          number;
  id_usuario:       number;
  nombre_ruta:      string;
  descripcion:      string | null;
  origen_lat:       number;
  origen_lng:       number;
  destino_lat:      number;
  destino_lng:      number;
  distancia_km:     number | null;
  duracion_minutos: number | null;
}

/* ─── Gamificación ─── */
export interface PuntosResumen {
  total_ganados:   number;
  total_canjeados: number;
  disponibles:     number;
  nivel:           string;
}

export interface HistorialPuntos {
  fecha:       string;
  descripcion: string;
  puntos:      number;
  tipo:        'ganado' | 'canjeado';
}

/* ─── Combustible ─── */
export interface CargaCombustible {
  id:          number;
  id_moto:     number;
  placa:       string;
  fecha:       string;
  litros:      number;
  costo_total: number;
  km_actual:   number;
  km_anterior: number;
  marca_aceite?: string;
  notas?:      string;
}

/* ─── Alertas Mantenimiento ─── */
export interface MotoAlerta {
  moto:             Moto;
  ownerName:        string;
  lastOilKm:        number | null;
  lastOilDate:      string | null;
  kmSinceOil:       number | null;
  threshold:        number;
  urgency:          'ok' | 'soon' | 'due' | 'overdue';
  pct:              number;
}

/* ─── Diagnóstico mecánico ─── */
export interface DetalleDiagnostico {
  id_detalle?:  number;
  parte:        string;   // MOTOR | TRANSMISION | FRENOS | LLANTAS | SUSPENSION | ELECTRICO | CARROCERIA | REFRIGERACION
  estado:       1 | 2 | 3; // 1=BUENO 2=REGULAR 3=MALO
  observacion?: string | null;
}

export interface DiagnosticoMoto {
  id_diagnostico?:         number;
  id_moto:                 number;
  id_mecanico:             number;
  fecha?:                  string;
  kilometraje_ingreso:     number;
  observaciones_generales?: string | null;
  detalles:                DetalleDiagnostico[];
}

/* ─── Estado de mantenimiento (calculado por el backend) ─── */
export interface EstadoMantenimiento {
  tipo:                string;
  descripcion:         string;
  intervaloKm:         number;
  kmActual:            number;
  proximoCambioKm:     number;
  kmRestante:          number;
  porcentajeDesgaste:  number;
  estado:              'OK' | 'PROXIMO' | 'VENCIDO';
}

/* ─── API generic wrapper ─── */
export interface ApiError {
  message: string;
  status:  number;
}

export type EstadoRegistro = 0 | 1 | 2 | 3 | 4;
