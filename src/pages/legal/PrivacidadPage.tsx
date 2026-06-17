import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Wrench } from 'lucide-react';
import { WORKSHOP_CONTACT } from '../../lib/constants';

const SECTIONS = [
  {
    title: '1. Información que recopilamos',
    body: `Recopilamos los siguientes datos personales cuando te registras y usas Gorila Motos:
• Nombre completo, correo electrónico y contraseña cifrada
• Número de cédula de identidad (RUC para empresas)
• Número de teléfono de contacto
• Nombre y dirección de tu taller
• Información sobre vehículos (placa, marca, modelo, año, cilindraje)
• Historial de órdenes de servicio y facturación
• Datos de uso de la plataforma (accesos, acciones realizadas)`,
  },
  {
    title: '2. Finalidad del tratamiento',
    body: `Los datos recopilados se utilizan exclusivamente para:
• Gestionar tu cuenta y acceso al sistema
• Procesar órdenes de servicio e inventario del taller
• Generar documentos de facturación conforme a normativa SRI Ecuador
• Enviar alertas y notificaciones de mantenimiento de vehículos
• Mejorar la funcionalidad y seguridad de la plataforma
• Cumplir obligaciones legales establecidas en Ecuador`,
  },
  {
    title: '3. Base legal del tratamiento',
    body: `El tratamiento de tus datos se rige por:
• Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador
• Reglamento General de Datos Personales (Ecuador)
• Tu consentimiento explícito al registrarte en la plataforma
• La ejecución del contrato de servicio entre tú y Gorila Motos`,
  },
  {
    title: '4. Almacenamiento y seguridad',
    body: `Tus datos se almacenan en servidores seguros provistos por:
• Render.com (backend y base de datos PostgreSQL) — Virginia, EE.UU.
• Supabase (almacenamiento de archivos e imágenes) — Servidores cifrados
• Vercel (alojamiento del frontend) — Distribución global con TLS/SSL

Aplicamos medidas de seguridad técnicas y organizativas: cifrado de contraseñas con BCrypt, transmisión HTTPS/TLS, autenticación JWT con expiración, y acceso restringido por roles.`,
  },
  {
    title: '5. Transferencia internacional de datos',
    body: `Por el uso de proveedores en la nube (Render, Supabase, Vercel), tus datos pueden transferirse a servidores ubicados fuera del Ecuador, principalmente en Estados Unidos. Estos proveedores cuentan con certificaciones de seguridad y privacidad reconocidas internacionalmente (SOC 2, ISO 27001). Al aceptar estos términos, consientes dicha transferencia internacional.`,
  },
  {
    title: '6. Compartición con terceros',
    body: `No vendemos, alquilamos ni compartimos tus datos personales con terceros con fines comerciales. Solo los compartimos con:
• Proveedores de infraestructura tecnológica (Render, Supabase, Vercel)
• Autoridades competentes del Ecuador cuando sea legalmente requerido
• El SRI (Servicio de Rentas Internas) en el contexto de facturación electrónica`,
  },
  {
    title: '7. Tus derechos (LOPDP Ecuador)',
    body: `Conforme a la Ley Orgánica de Protección de Datos Personales tienes derecho a:
• Acceso: conocer qué datos tenemos sobre ti
• Rectificación: corregir datos incorrectos o desactualizados
• Eliminación: solicitar la supresión de tus datos (derecho al olvido)
• Portabilidad: recibir tus datos en formato estructurado
• Oposición: oponerte al tratamiento de tus datos en ciertos casos
• Limitación: solicitar la restricción del tratamiento

Para ejercer estos derechos, escríbenos a: ${WORKSHOP_CONTACT.emailPrivacidad}`,
  },
  {
    title: '8. Retención de datos',
    body: `Conservamos tus datos mientras tu cuenta esté activa y hasta 7 años después de su cierre, conforme a los plazos de conservación establecidos por la normativa tributaria ecuatoriana (SRI). Los datos de facturación se conservan 10 años por obligación legal.`,
  },
  {
    title: '9. Cookies y tecnologías similares',
    body: `Utilizamos almacenamiento local (localStorage) del navegador para mantener tu sesión activa de forma segura mediante tokens JWT. No utilizamos cookies de rastreo de terceros ni publicidad. Los tokens de sesión expiran automáticamente por seguridad.`,
  },
  {
    title: '10. Cambios a esta política',
    body: `Podemos actualizar esta Política de Privacidad. Te notificaremos por correo electrónico ante cambios sustanciales con al menos 15 días de anticipación. El uso continuado de la plataforma después de la notificación implica la aceptación de la nueva política.`,
  },
  {
    title: '11. Contacto',
    body: `Para cualquier consulta sobre privacidad o protección de datos:\n• Email: ${WORKSHOP_CONTACT.emailPrivacidad}\n• ${WORKSHOP_CONTACT.razonSocial} — ${WORKSHOP_CONTACT.direccion}, ${WORKSHOP_CONTACT.ciudadCompleta}\n• Teléfono / WhatsApp: ${WORKSHOP_CONTACT.telefono}`,
  },
];

export default function PrivacidadPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0D', color: '#fff' }}>

      {/* Header */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#0F0F14',
        padding: '20px 24px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: 'linear-gradient(135deg, #E11428, #8B0010)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Wrench size={16} color="white" />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 15, margin: 0 }}>
                Gorila <span style={{ color: '#E11428' }}>Motos</span>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: 0 }}>Sistema de gestión</p>
            </div>
          </div>
          <Link
            to="/login"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: 13, fontWeight: 500,
            }}
          >
            <ArrowLeft size={14} /> Volver al inicio
          </Link>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '52px 24px 80px' }}>

        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: 'rgba(225,20,40,0.1)', border: '1px solid rgba(225,20,40,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={20} color="#E11428" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 28, margin: 0, letterSpacing: '-0.02em' }}>
              Política de Privacidad
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '3px 0 0' }}>
              Gorila Motos · Última actualización: junio 2025 · Ley LOPDP Ecuador
            </p>
          </div>
        </div>

        {/* Resumen ejecutivo */}
        <div style={{
          background: 'rgba(225,20,40,0.06)',
          border: '1px solid rgba(225,20,40,0.15)',
          borderLeft: '3px solid #E11428',
          borderRadius: 10, padding: '16px 20px',
          marginBottom: 40, marginTop: 28,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: '#fff' }}>En resumen:</strong> Recopilamos tus datos para brindarte el servicio de gestión de taller. No los vendemos. Los protegemos con cifrado. Tienes derecho a acceder, corregir o eliminar tus datos en cualquier momento. Cumplimos la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador.
          </p>
        </div>

        {/* Secciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {SECTIONS.map(({ title, body }, i) => (
            <div
              key={i}
              style={{
                borderTop: '1px solid rgba(255,255,255,0.05)',
                padding: '28px 0',
              }}
            >
              <h2 style={{
                color: '#fff', fontWeight: 700, fontSize: 16,
                margin: '0 0 12px', letterSpacing: '-0.01em',
              }}>
                {title}
              </h2>
              <p style={{
                color: 'rgba(255,255,255,0.52)', fontSize: 13,
                margin: 0, lineHeight: 1.85, whiteSpace: 'pre-line',
              }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 48, padding: '20px 24px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, textAlign: 'center',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0 }}>
            © 2025 Gorila Motos · Ecuador ·{' '}
            <Link to="/terminos" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
              Términos de Uso
            </Link>
            {' '}·{' '}
            <Link to="/login" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
