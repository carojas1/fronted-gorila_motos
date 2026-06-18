/* ─────────────────────────────────────────────
   GMotors — Estado de mantenimiento (visual)
   El desgaste se mide desde el ÚLTIMO MANTENIMIENTO REAL.
   El mecánico/admin marca cada pieza como cambiada → se resetea.
   Las piezas no cambiadas siguen acumulando desgaste (rojo).
   ───────────────────────────────────────────── */

import { useState, useMemo, useEffect } from 'react';
import {
  Droplet, Wind, Zap, Link2, Circle, Disc, ClipboardCheck,
  Info, ChevronDown, ChevronUp, Check, RotateCcw, MessageCircle, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mantenimientosApi } from '../../lib/api';
import { whatsappCitaLink, WORKSHOP_CONTACT } from '../../lib/constants';
import {
  calcularEstadoLocal, etiquetaCC, rangoDeCC, parametrosDeCC,
  ESTADO_COLOR,
} from '../../lib/mantenimiento';
import type { Moto } from '../../types';

interface MantenimientoApi { tipo: string; kmServicio: number }

const ICON_BY_TIPO: Record<string, LucideIcon> = {
  ACEITE: Droplet, FILTRO_AIRE: Wind, BUJIA: Zap, CADENA: Link2,
  LLANTA_TRASERA: Circle, FRENOS: Disc, REVISION_GENERAL: ClipboardCheck,
};

function BarraDesgaste({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, pct)}%`,
        background: `linear-gradient(90deg, ${color}AA, ${color})`,
        borderRadius: 99, transition: 'width 600ms cubic-bezier(0.25,0.1,0.25,1)',
      }} />
    </div>
  );
}

/* ════════ Estado de mantenimiento de UNA moto ════════ */
export function EstadoMotoLive({ moto, compact = false }: { moto: Moto; compact?: boolean }) {
  const { isAdmin, isMecanico } = useAuth();
  const canService = isAdmin || isMecanico;       // solo mecánico/admin marca cambios
  const [servicios, setServicios] = useState<Record<string, number>>({});
  const [errorServ, setErrorServ] = useState(false);
  const [showInfo, setShowInfo]   = useState(false);

  /* Carga compartida desde el backend (100% nube, sin almacenamiento local) */
  const cargarServicios = () => {
    mantenimientosApi.byMoto(moto.id_moto)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data as MantenimientoApi[]).forEach(m => {
          map[m.tipo] = Math.max(map[m.tipo] ?? 0, m.kmServicio);
        });
        setServicios(map);
        setErrorServ(false);
      })
      .catch((err) => {
        /* 404 = la moto no tiene registros de mantenimiento aún → array vacío, sin error */
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) { setServicios({}); setErrorServ(false); }
        else setErrorServ(true);
      });
  };
  useEffect(cargarServicios, [moto.id_moto]);

  const estado = useMemo(
    () => calcularEstadoLocal(moto.cilindraje, moto.kilometraje, servicios),
    [moto.cilindraje, moto.kilometraje, servicios],
  );

  const marcarCambiado = (tipo: string) => {
    setServicios(s => ({ ...s, [tipo]: moto.kilometraje }));   // optimista
    mantenimientosApi.registrar({ id_moto: moto.id_moto, tipo, km_servicio: moto.kilometraje })
      .then(cargarServicios)
      .catch(() => { setErrorServ(true); cargarServicios(); }); // revierte si falla
  };
  const deshacer = (tipo: string) => {
    setServicios(s => { const n = { ...s }; delete n[tipo]; return n; });
    mantenimientosApi.borrar(moto.id_moto, tipo)
      .then(cargarServicios)
      .catch(() => { setErrorServ(true); cargarServicios(); });
  };

  const ordenado = [...estado].sort((a, b) => b.porcentajeDesgaste - a.porcentajeDesgaste);
  const vencidos = estado.filter(e => e.estado === 'VENCIDO').length;
  const proximos = estado.filter(e => e.estado === 'PROXIMO').length;

  /* Mensaje personalizado para agendar cita por WhatsApp (lo usa el cliente) */
  const citaMsg = (() => {
    const pendientes = ordenado
      .filter(e => e.estado === 'VENCIDO' || e.estado === 'PROXIMO')
      .map(e => `• ${e.label}${e.estado === 'VENCIDO' ? ' (urgente)' : ''}`);
    return (
      `¡Hola ${WORKSHOP_CONTACT.nombre}! 🏍️\n\n` +
      `Quiero agendar una cita para mi moto ${moto.marca} ${moto.modelo} (placa ${moto.placa}).\n` +
      `Kilometraje actual: ${moto.kilometraje.toLocaleString('es-EC')} km.` +
      (pendientes.length ? `\n\nMantenimiento que necesita:\n${pendientes.join('\n')}` : '') +
      `\n\n¿Qué horarios tienen disponibles? Gracias.`
    );
  })();

  return (
    <div>
      {/* Resumen */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {vencidos > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 99, padding: '3px 11px' }}>
              {vencidos} por cambiar
            </span>
          )}
          {proximos > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 99, padding: '3px 11px' }}>
              {proximos} por vencer
            </span>
          )}
          {vencidos === 0 && proximos === 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99, padding: '3px 11px' }}>
              Todo al día
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{etiquetaCC(moto.cilindraje)}</span>
      </div>

      {errorServ && (
        <div style={{ fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
          No se pudo conectar con el servidor para los mantenimientos. Verifica tu conexión o que el backend esté activo.
        </div>
      )}

      {/* Lista de componentes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ordenado.map(e => {
          const Icon       = ICON_BY_TIPO[e.tipo] ?? ClipboardCheck;
          const ec         = ESTADO_COLOR[e.estado];
          const yaCambiado = e.ultimoCambioKm > 0;
          return (
            <div key={e.tipo} style={{ background: '#0E0E14', border: `1px solid ${ec.border}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: ec.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={ec.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 13, margin: 0 }}>{e.label}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10.5, margin: '1px 0 0' }}>
                    Cambio cada {e.intervaloKm.toLocaleString('es-EC')} km
                    {yaCambiado && ` · último: ${e.ultimoCambioKm.toLocaleString('es-EC')} km`}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: ec.color, margin: 0 }}>{e.porcentajeDesgaste}%</p>
                  <p style={{ fontSize: 9.5, fontWeight: 700, color: ec.color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {e.estado === 'VENCIDO' ? 'Cambiar' : e.estado === 'PROXIMO' ? 'Próximo' : 'Al día'}
                  </p>
                </div>
              </div>
              <BarraDesgaste pct={e.porcentajeDesgaste} color={ec.color} />
              {!compact && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7, gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>
                    {e.estado === 'VENCIDO'
                      ? `Excede por ${Math.abs(e.kmRestante).toLocaleString('es-EC')} km`
                      : `Faltan ${e.kmRestante.toLocaleString('es-EC')} km`}
                  </span>
                  {/* Acción del mecánico: marcar como cambiado */}
                  {canService && (
                    yaCambiado ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: '#10B981', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Check size={11} /> registrado
                        </span>
                        <button onClick={() => deshacer(e.tipo)} title="Deshacer"
                          style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <RotateCcw size={10} /> deshacer
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => marcarCambiado(e.tipo)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
                        <Check size={12} /> Marcar cambiado
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Agendar cita por WhatsApp — solo clientes */}
      {!canService && (
        <a
          href={whatsappCitaLink(citaMsg)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', marginTop: 14, padding: '12px 16px', borderRadius: 12,
            background: 'linear-gradient(135deg, #25D366, #1EBE5A)', color: '#063D1E',
            fontWeight: 800, fontSize: 14, textDecoration: 'none',
            boxShadow: '0 6px 18px rgba(37,211,102,0.28)',
          }}
        >
          <MessageCircle size={17} /> Agendar cita por WhatsApp
        </a>
      )}

      {/* Nota para el mecánico */}
      {canService && (
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', margin: '10px 0 0', lineHeight: 1.5 }}>
          Al revisar la moto, marca lo que realmente cambiaste a estos {moto.kilometraje.toLocaleString('es-EC')} km.
          Esa pieza se reinicia a 0%; las demás siguen acumulando hasta su próximo cambio.
        </p>
      )}

      {/* Explicación de cómo se calcula */}
      <button
        onClick={() => setShowInfo(s => !s)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, fontSize: 11.5, fontWeight: 600, color: 'rgba(59,130,246,0.85)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <Info size={13} /> ¿Cómo calculamos esto?
        {showInfo ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {showInfo && <ExplicacionCalculo cc={moto.cilindraje} />}
    </div>
  );
}

/* ════════ Explicación del cálculo para un cilindraje ════════ */
function ExplicacionCalculo({ cc }: { cc: number }) {
  const rango  = rangoDeCC(cc);
  const params = parametrosDeCC(cc);
  return (
    <div style={{ marginTop: 12, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 12px' }}>
        Tu moto es de <strong style={{ color: rango.color }}>{cc} cc</strong> → categoría{' '}
        <strong style={{ color: rango.color }}>{rango.label}</strong>. El desgaste se mide desde el último cambio real:
      </p>
      <div style={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
        <code style={{ fontSize: 11, color: '#10B981', display: 'block', lineHeight: 1.8, fontFamily: 'monospace' }}>
          desgaste % = (km actual − km del último cambio) ÷ intervalo × 100<br />
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>→ 80% = avisamos · 100% = toca cambiar</span>
        </code>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 7 }}>
        {params.map(p => (
          <div key={p.tipo} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '7px 10px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#EBEBEB', margin: 0 }}>{p.label}</p>
            <p style={{ fontSize: 10, color: rango.color, margin: '1px 0 0', fontWeight: 600 }}>cada {p.intervaloKm.toLocaleString('es-EC')} km</p>
          </div>
        ))}
      </div>
    </div>
  );
}
