/* ─────────────────────────────────────────────
   GMotors — Metodología de mantenimiento
   Panel informativo: cómo calculamos los intervalos
   según el cilindraje. Visible para admin / mecánico.
   ───────────────────────────────────────────── */

import { useState } from 'react';
import {
  BookOpen, Droplet, Wind, Zap, Link2, Circle, Disc,
  ClipboardCheck, Gauge, Bell, CheckCircle, type LucideIcon,
} from 'lucide-react';
import { INTERVALOS, RANGOS_CC, TIPO_LABEL } from '../../lib/mantenimiento';
import { useTheme } from '../../lib/theme';

const ICON_BY_TIPO: Record<string, LucideIcon> = {
  ACEITE: Droplet, FILTRO_AIRE: Wind, BUJIA: Zap, CADENA: Link2,
  LLANTA_TRASERA: Circle, FRENOS: Disc, REVISION_GENERAL: ClipboardCheck,
};

const TIPOS_ORDEN = ['ACEITE', 'FILTRO_AIRE', 'BUJIA', 'CADENA', 'LLANTA_TRASERA', 'FRENOS', 'REVISION_GENERAL'];

export default function MetodologiaPage() {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const [rangoSel, setRangoSel] = useState(0);
  const intervalosSel = INTERVALOS[rangoSel];

  const card: React.CSSProperties = {
    background: isDark ? '#111117' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#E4E7EC'}`, borderRadius: 16, padding: '22px 24px',
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={21} color="#3B82F6" />
          </div>
          <div>
            <h1 style={{ color: isDark ? '#EBEBEB' : '#15151B', fontWeight: 800, fontSize: 23, margin: 0, letterSpacing: '-0.03em' }}>
              Metodología de mantenimiento
            </h1>
            <p style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.42)', fontSize: 13, margin: 0 }}>
              Cómo el sistema calcula cuándo cada moto necesita servicio
            </p>
          </div>
        </div>
      </div>

      {/* ── Cómo funciona el cálculo ── */}
      <div style={{ ...card, marginBottom: 18 }}>
        <p style={{ color: isDark ? '#EBEBEB' : '#15151B', fontWeight: 700, fontSize: 15, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Gauge size={16} color="#3B82F6" /> El cálculo, paso a paso
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
          {[
            { n: 1, t: 'Cilindraje → categoría', d: 'Según los cc de la moto se ubica en una de 5 categorías (50-125 hasta 651+).' },
            { n: 2, t: 'Intervalos por categoría', d: 'Cada categoría tiene su propio intervalo en km para cada componente.' },
            { n: 3, t: 'Desgaste actual', d: 'Con el kilometraje actual calculamos qué % de vida útil lleva cada pieza.' },
            { n: 4, t: 'Aviso automático', d: 'Al 80% avisamos; al 100% el componente está vencido y se envía un correo.' },
          ].map(s => (
            <div key={s.n} style={{ background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E4E7EC'}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#3B82F6', marginBottom: 9 }}>
                {s.n}
              </div>
              <p style={{ color: isDark ? '#EBEBEB' : '#15151B', fontWeight: 700, fontSize: 12.5, margin: '0 0 4px' }}>{s.t}</p>
              <p style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(21,21,27,0.6)', fontSize: 11.5, margin: 0, lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>

        {/* Fórmula */}
        <div style={{ background: isDark ? '#0B0B10' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E4E7EC'}`, borderRadius: 10, padding: '14px 16px' }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.42)', margin: '0 0 8px' }}>Fórmula del desgaste</p>
          <code style={{ fontSize: 12.5, color: '#10B981', display: 'block', lineHeight: 2, fontFamily: 'monospace' }}>
            último cambio = ⌊ km ÷ intervalo ⌋ × intervalo<br />
            desgaste % = (km − último cambio) ÷ intervalo × 100<br />
            km restante = (último cambio + intervalo) − km
          </code>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
              <CheckCircle size={13} color="#10B981" /><span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(21,21,27,0.6)' }}>0-79% — Al día</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
              <Bell size={13} color="#F59E0B" /><span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(21,21,27,0.6)' }}>80-99% — Próximo (avisamos)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
              <Bell size={13} color="#EF4444" /><span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(21,21,27,0.6)' }}>100%+ — Vencido (correo)</span>
            </span>
          </div>
        </div>

        {/* Ejemplo real */}
        <div style={{ marginTop: 14, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 10, padding: '12px 16px' }}>
          <p style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(21,21,27,0.6)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: '#F59E0B' }}>Ejemplo:</strong> moto de 300 cc con 18 000 km. La bujía se cambia
            cada 10 000 km → último cambio a los 10 000, lleva 8 000 km recorridos →{' '}
            <strong style={{ color: '#F59E0B' }}>80% de desgaste</strong>, faltan 2 000 km para el próximo cambio (a los 20 000 km).
            Por eso aparece en amarillo: <em>no está mal calculado, está avisando con anticipación.</em>
          </p>
        </div>
      </div>

      {/* ── Selector de categoría ── */}
      <div style={{ ...card, marginBottom: 18 }}>
        <p style={{ color: isDark ? '#EBEBEB' : '#15151B', fontWeight: 700, fontSize: 15, margin: '0 0 14px' }}>
          Intervalos por categoría de cilindraje
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {RANGOS_CC.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangoSel(i)}
              style={{
                fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${rangoSel === i ? r.color : (isDark ? 'rgba(255,255,255,0.1)' : '#E4E7EC')}`,
                background: rangoSel === i ? `${r.color}18` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                color: rangoSel === i ? r.color : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(21,21,27,0.6)'),
                transition: 'all 150ms',
              }}
            >
              {r.ccMax ? `${r.ccMin}-${r.ccMax}` : `${r.ccMin}+`} cc · {r.label}
            </button>
          ))}
        </div>

        {/* Info de la categoría seleccionada */}
        <div style={{ background: `${intervalosSel.rango.color}0D`, border: `1px solid ${intervalosSel.rango.color}25`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: intervalosSel.rango.color }} />
            <span style={{ fontSize: 14, fontWeight: 800, color: intervalosSel.rango.color }}>
              {intervalosSel.rango.label}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {intervalosSel.rango.ccMax ? `${intervalosSel.rango.ccMin}-${intervalosSel.rango.ccMax} cc` : `${intervalosSel.rango.ccMin} cc o más`}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Ejemplos: {intervalosSel.rango.ejemplos}
          </p>
        </div>

        {/* Tabla de componentes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {[...intervalosSel.params]
            .sort((a, b) => TIPOS_ORDEN.indexOf(a.tipo) - TIPOS_ORDEN.indexOf(b.tipo))
            .map(p => {
              const Icon = ICON_BY_TIPO[p.tipo] ?? ClipboardCheck;
              return (
                <div key={p.tipo} style={{ background: isDark ? '#0E0E14' : '#F8F9FB', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E4E7EC', borderRadius: 12, padding: '13px 15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${intervalosSel.rango.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} color={intervalosSel.rango.color} />
                    </div>
                    <div>
                      <p style={{ color: isDark ? '#EBEBEB' : '#15151B', fontWeight: 700, fontSize: 12.5, margin: 0 }}>{p.label}</p>
                      <p style={{ color: intervalosSel.rango.color, fontWeight: 700, fontSize: 13, margin: 0 }}>
                        cada {p.intervaloKm.toLocaleString('es-EC')} km
                      </p>
                    </div>
                  </div>
                  <p style={{ color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(21,21,27,0.5)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                    {p.descripcion}
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Tabla comparativa completa ── */}
      <div style={card}>
        <p style={{ color: isDark ? '#EBEBEB' : '#15151B', fontWeight: 700, fontSize: 15, margin: '0 0 14px' }}>
          Tabla comparativa — todos los intervalos (km)
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.42)', borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC' }}>
                  Componente
                </th>
                {RANGOS_CC.map(r => (
                  <th key={r.label} style={{ textAlign: 'center', padding: '8px 12px', fontSize: 10.5, fontWeight: 700, color: r.color, borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC', whiteSpace: 'nowrap' }}>
                    {r.ccMax ? `${r.ccMin}-${r.ccMax}` : `${r.ccMin}+`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIPOS_ORDEN.map(tipo => {
                const Icon = ICON_BY_TIPO[tipo] ?? ClipboardCheck;
                return (
                  <tr key={tipo}>
                    <td style={{ padding: '10px 12px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #F0F1F3' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: isDark ? '#EBEBEB' : '#15151B', fontWeight: 600 }}>
                        <Icon size={14} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(21,21,27,0.4)'} /> {TIPO_LABEL[tipo]}
                      </span>
                    </td>
                    {INTERVALOS.map(({ rango, params }) => {
                      const p = params.find(x => x.tipo === tipo);
                      return (
                        <td key={rango.label} style={{ textAlign: 'center', padding: '10px 12px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #F0F1F3', fontSize: 12.5, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(21,21,27,0.7)', fontWeight: 600 }}>
                          {p ? p.intervaloKm.toLocaleString('es-EC') : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.42)', margin: '14px 0 0', fontStyle: 'italic' }}>
          Valores en kilómetros. Basados en recomendaciones de fabricantes y condiciones de uso en Ecuador
          (clima, altitud, calidad de combustible y caminos).
        </p>
      </div>
    </div>
  );
}
