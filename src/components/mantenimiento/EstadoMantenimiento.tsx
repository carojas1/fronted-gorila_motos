/* ─────────────────────────────────────────────
   GMotors — Estado de mantenimiento (visual)
   Muestra, por cada componente, cuánta vida útil
   se ha consumido y cuándo toca el próximo cambio.
   Datos en vivo del backend; si falla, cálculo local.
   ───────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import {
  Droplet, Wind, Zap, Link2, Circle, Disc, ClipboardCheck,
  Info, ChevronDown, ChevronUp, RefreshCw, type LucideIcon,
} from 'lucide-react';
import { alertasApi } from '../../lib/api';
import {
  calcularEstadoLocal, etiquetaCC, rangoDeCC, parametrosDeCC,
  ESTADO_COLOR, type EstadoCalculado,
} from '../../lib/mantenimiento';
import type { Moto, EstadoMantenimiento as EstadoApi } from '../../types';

const ICON_BY_TIPO: Record<string, LucideIcon> = {
  ACEITE: Droplet, FILTRO_AIRE: Wind, BUJIA: Zap, CADENA: Link2,
  LLANTA_TRASERA: Circle, FRENOS: Disc, REVISION_GENERAL: ClipboardCheck,
};

/* Une respuesta del backend con el formato local (mismo cálculo) */
function normalizar(api: EstadoApi[]): EstadoCalculado[] {
  return api.map(a => ({
    tipo:               a.tipo,
    label:              a.descripcion?.split('—')[0]?.trim() || a.tipo,
    intervaloKm:        a.intervaloKm,
    kmActual:           a.kmActual,
    ultimoCambioKm:     a.proximoCambioKm - a.intervaloKm,
    proximoCambioKm:    a.proximoCambioKm,
    kmDesdeUltimo:      a.intervaloKm - a.kmRestante,
    kmRestante:         a.kmRestante,
    porcentajeDesgaste: a.porcentajeDesgaste,
    estado:             a.estado,
  }));
}

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

/* ════════ Estado en vivo de UNA moto ════════ */
export function EstadoMotoLive({ moto, compact = false }: { moto: Moto; compact?: boolean }) {
  const [estado,  setEstado]  = useState<EstadoCalculado[]>(() =>
    calcularEstadoLocal(moto.cilindraje, moto.kilometraje));
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const cargar = () => {
    setLoading(true);
    alertasApi.estadoMoto(moto.id_moto)
      .then(({ data }) => {
        const arr = data as EstadoApi[];
        if (Array.isArray(arr) && arr.length) setEstado(normalizar(arr));
      })
      .catch(() => { /* mantiene cálculo local */ })
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [moto.id_moto, moto.kilometraje, moto.cilindraje]);

  const ordenado = [...estado].sort((a, b) => b.porcentajeDesgaste - a.porcentajeDesgaste);
  const vencidos = estado.filter(e => e.estado === 'VENCIDO').length;
  const proximos = estado.filter(e => e.estado === 'PROXIMO').length;

  return (
    <div>
      {/* Resumen */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {vencidos > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 99, padding: '3px 11px' }}>
              {vencidos} vencido{vencidos !== 1 ? 's' : ''}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{etiquetaCC(moto.cilindraje)}</span>
          <button
            onClick={cargar}
            title="Actualizar"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}
          >
            <RefreshCw size={12} style={loading ? { animation: 'spin .8s linear infinite' } : undefined} />
          </button>
        </div>
      </div>

      {/* Lista de componentes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ordenado.map(e => {
          const Icon = ICON_BY_TIPO[e.tipo] ?? ClipboardCheck;
          const ec   = ESTADO_COLOR[e.estado];
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
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: ec.color, margin: 0 }}>{e.porcentajeDesgaste}%</p>
                  <p style={{ fontSize: 9.5, fontWeight: 700, color: ec.color, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ec.label}</p>
                </div>
              </div>
              <BarraDesgaste pct={e.porcentajeDesgaste} color={ec.color} />
              {!compact && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>
                    {e.estado === 'VENCIDO'
                      ? `Excede por ${Math.abs(e.kmRestante).toLocaleString('es-EC')} km`
                      : `Faltan ${e.kmRestante.toLocaleString('es-EC')} km`}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>
                    Próximo: {e.proximoCambioKm.toLocaleString('es-EC')} km
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explicación de cómo se calcula */}
      <button
        onClick={() => setShowInfo(s => !s)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 14, fontSize: 11.5, fontWeight: 600, color: 'rgba(59,130,246,0.85)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
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
        <strong style={{ color: rango.color }}>{rango.label}</strong>. Para esta categoría usamos los intervalos
        recomendados por fabricantes y mecánica de Ecuador. El desgaste se calcula así:
      </p>
      <div style={{ background: '#0B0B10', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
        <code style={{ fontSize: 11, color: '#10B981', display: 'block', lineHeight: 1.8, fontFamily: 'monospace' }}>
          desgaste % = (km actual − último cambio) ÷ intervalo × 100<br />
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
