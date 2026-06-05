import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, Wrench } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Descripción del servicio',
    body: `Gorila Motos es una plataforma de software como servicio (SaaS) diseñada para la gestión integral de talleres de motocicletas en Ecuador. El servicio incluye:
• Módulo de órdenes de trabajo y seguimiento de servicios
• Gestión de inventario y control de repuestos
• Registro de clientes y vehículos
• Facturación compatible con normativas SRI Ecuador (IVA 15%)
• Alertas de mantenimiento por kilometraje
• Acceso web (navegador) y app móvil (Android/iOS via Capacitor)
• Panel de administración para propietarios de taller`,
  },
  {
    title: '2. Registro y cuenta de usuario',
    body: `Para acceder al servicio debes:
• Proporcionar información verdadera, precisa y actualizada durante el registro
• Mantener la confidencialidad de tus credenciales de acceso
• Notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta
• Ser mayor de 18 años o contar con autorización legal

Eres responsable de todas las acciones realizadas bajo tu cuenta. Gorila Motos no será responsable por pérdidas causadas por el uso no autorizado de tu cuenta si no se nos notificó oportunamente.`,
  },
  {
    title: '3. Uso permitido del servicio',
    body: `Al usar Gorila Motos te comprometes a:
• Usar el servicio únicamente para fines legítimos de gestión de taller
• No compartir tu acceso con personas no autorizadas
• No intentar acceder a cuentas de otros usuarios
• No realizar ingeniería inversa del software
• No usar el servicio para actividades ilegales, fraudulentas o contrarias a la moral
• Cumplir con todas las leyes ecuatorianas aplicables`,
  },
  {
    title: '4. Datos de facturación y SRI',
    body: `El usuario es el único responsable de:
• La veracidad de los datos RUC/cédula ingresados al sistema
• La correcta emisión y declaración de documentos ante el SRI
• El cumplimiento de obligaciones tributarias (IVA 15%, retenciones, etc.)
• La configuración correcta de datos del establecimiento emisor

Gorila Motos proporciona herramientas de apoyo para la facturación pero no es un agente de retención ni contribuyente delegado. Consulta siempre con tu contador.`,
  },
  {
    title: '5. Disponibilidad del servicio',
    body: `Gorila Motos opera en servidores de Render.com (plan gratuito en etapa inicial). Por esto:
• El servicio puede experimentar tiempos de inicio de hasta 50 segundos tras períodos de inactividad
• No garantizamos disponibilidad del 99.9% SLA en el plan actual
• Realizamos mantenimientos programados con previo aviso cuando sea posible
• Nos comprometemos a avisar con al menos 24 horas ante interrupciones planificadas

En fases futuras del servicio se ofrecerán planes con mayores garantías de disponibilidad.`,
  },
  {
    title: '6. Propiedad intelectual',
    body: `Todo el contenido, diseño, código fuente, marcas, logotipos y materiales de Gorila Motos son propiedad exclusiva de sus desarrolladores y están protegidos por las leyes de propiedad intelectual del Ecuador e internacionales. Se concede una licencia limitada, no exclusiva e intransferible para usar el servicio. Está prohibida cualquier reproducción o uso no autorizado.`,
  },
  {
    title: '7. Limitación de responsabilidad',
    body: `Gorila Motos no será responsable por:
• Pérdida de datos causada por fallas de terceros (proveedores de infraestructura)
• Daños indirectos, incidentales o emergentes derivados del uso del servicio
• Decisiones comerciales tomadas con base en la información del sistema
• Errores en declaraciones tributarias ante el SRI
• Interrupciones del servicio fuera de nuestro control (fuerza mayor, fallas de internet)

La responsabilidad máxima de Gorila Motos en cualquier caso estará limitada al valor pagado por el servicio en los últimos 3 meses.`,
  },
  {
    title: '8. Modificaciones al servicio',
    body: `Nos reservamos el derecho de modificar, suspender o descontinuar el servicio o cualquiera de sus funcionalidades con previo aviso de al menos 30 días. También podemos actualizar estos Términos de Uso; te notificaremos por correo electrónico ante cambios importantes.`,
  },
  {
    title: '9. Terminación',
    body: `Podemos suspender o terminar tu acceso al servicio si:
• Incumples estos Términos de Uso
• Usas el servicio para actividades ilegales o fraudulentas
• No pagas (en planes de pago futuros)

Puedes cancelar tu cuenta en cualquier momento. Tras la cancelación, tus datos serán eliminados según nuestra Política de Privacidad.`,
  },
  {
    title: '10. Ley aplicable y jurisdicción',
    body: `Estos Términos de Uso se rigen por las leyes de la República del Ecuador. Cualquier disputa se someterá a los tribunales competentes de la ciudad de Quito, Ecuador. Las partes acuerdan intentar resolver cualquier controversia de buena fe antes de acudir a instancias judiciales.`,
  },
  {
    title: '11. Contacto',
    body: `Para consultas sobre estos términos:\n• Email: legal@gorilamoto.ec\n• Ecuador — Provincia de Pichincha\n• Teléfono: +593 98 XXX XXXX`,
  },
];

export default function TerminosPage() {
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
            background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={20} color="#3B82F6" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 28, margin: 0, letterSpacing: '-0.02em' }}>
              Términos de Uso
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '3px 0 0' }}>
              Gorila Motos · Última actualización: junio 2025 · Ecuador
            </p>
          </div>
        </div>

        {/* Resumen */}
        <div style={{
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderLeft: '3px solid #3B82F6',
          borderRadius: 10, padding: '16px 20px',
          marginBottom: 40, marginTop: 28,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: '#fff' }}>Al usar Gorila Motos aceptas estos términos.</strong> En resumen: usa el servicio honestamente para gestionar tu taller, eres responsable de tus datos tributarios, y nos comprometemos a proteger tu información y darte un servicio confiable.
          </p>
        </div>

        {/* Secciones */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {SECTIONS.map(({ title, body }, i) => (
            <div key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '28px 0' }}>
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 12px', letterSpacing: '-0.01em' }}>
                {title}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: 13, margin: 0, lineHeight: 1.85, whiteSpace: 'pre-line' }}>
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
            <Link to="/privacidad" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
              Política de Privacidad
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
