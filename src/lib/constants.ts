/* ─────────────────────────────────────────────
   GMotors — Datos del taller (única fuente de verdad)
   Cambia aquí los datos del taller y se actualizan en TODA la app:
   comprobantes, portal del cliente, política de privacidad, términos.
   ───────────────────────────────────────────── */

export const WORKSHOP_CONTACT = {
  /** Nombre comercial (display) */
  nombre:        'Gorila Motos',
  /** Razón social (para comprobantes) */
  razonSocial:   'GORILA MOTOS S.A.S.',
  direccion:     'Medardo A. Silva y Ángel Silva 1-666',
  ciudad:        'Cuenca',
  provincia:     'Azuay',
  pais:          'Ecuador',
  /** Ciudad completa para encabezados */
  ciudadCompleta:'Cuenca - Azuay - Ecuador',
  telefono:      '+593 98 083 4367',
  /** Solo dígitos, formato internacional (para enlaces wa.me) */
  whatsapp:      '593980834367',
  /** Número que RECIBE las solicitudes de cita por WhatsApp (número principal del taller). */
  whatsappCitas: '593980834367',
  /** Número de soporte de la app (mismo que el taller). */
  whatsappSoporte: '593980834367',
  /** Teléfono de soporte formateado para display */
  telefonoSoporte: '0980 834 367',
  /** Correo general de contacto */
  email:         'gorilamotos2026@gmail.com',
  emailFacturacion: 'gorilamotos2026@gmail.com',
  emailPrivacidad:  'gorilamotos2026@gmail.com',
  emailLegal:       'gorilamotos2026@gmail.com',
  web:           'gmotors-frontend.vercel.app',
  webUrl:        'https://gmotors-frontend.vercel.app',
  horario:       'Lun–Vie 8:00–18:00 · Sáb 9:00–14:00',
} as const;

/** Enlace directo a WhatsApp con mensaje opcional */
export function whatsappLink(mensaje = ''): string {
  const base = `https://wa.me/${WORKSHOP_CONTACT.whatsapp}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** Enlace de WhatsApp para AGENDAR CITA (va al número de citas del taller). */
export function whatsappCitaLink(mensaje = ''): string {
  const base = `https://wa.me/${WORKSHOP_CONTACT.whatsappCitas}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}
