/* ─────────────────────────────────────────────
   GMotors — Diagnóstico de Moto (Mecánico)
   Registro clínico al ingreso de cada vehículo
   ───────────────────────────────────────────── */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ClipboardList, Search, Bike, CheckCircle, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Gauge, Save, Clock, User,
  Cog, Link2, Shield, Circle, ArrowUpDown, Droplets, Zap, type LucideIcon,
} from 'lucide-react';
import { motosApi, diagnosticosApi, usuariosApi } from '../../lib/api';
import { usePolling } from '../../hooks/usePolling';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getErrorMsg } from '../../lib/utils';
import type { Moto, Usuario, DiagnosticoMoto, DetalleDiagnostico } from '../../types';

/* ─── Partes a evaluar ─── */
const PARTES: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'MOTOR',         label: 'Motor',                Icon: Cog        },
  { key: 'TRANSMISION',   label: 'Transmisión / Cadena', Icon: Link2      },
  { key: 'FRENOS',        label: 'Sistema de Frenos',    Icon: Shield     },
  { key: 'LLANTAS',       label: 'Llantas',              Icon: Circle     },
  { key: 'SUSPENSION',    label: 'Suspensión',           Icon: ArrowUpDown},
  { key: 'ELECTRICO',     label: 'Sistema Eléctrico',    Icon: Zap        },
  { key: 'CARROCERIA',    label: 'Carrocería',           Icon: Bike       },
  { key: 'REFRIGERACION', label: 'Refrigeración',        Icon: Droplets   },
];

const ESTADO_CONFIG = {
  1: { label: 'Bueno',   color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  2: { label: 'Regular', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  3: { label: 'Malo',    color: '#E11428', bg: 'rgba(225,20,40,0.12)',   border: 'rgba(225,20,40,0.25)'  },
} as const;

const EstadoIcon = ({ estado }: { estado: 1 | 2 | 3 }) => {
  if (estado === 1) return <CheckCircle size={14} color="#10B981" />;
  if (estado === 2) return <AlertTriangle size={14} color="#F59E0B" />;
  return <XCircle size={14} color="#E11428" />;
};

/* ─── Card de historial de diagnóstico ─── */
function DiagnosticoCard({ d, motos, usuarios }: { d: DiagnosticoMoto; motos: Moto[]; usuarios: Usuario[] }) {
  const [open, setOpen] = useState(false);
  const moto = motos.find(m => m.id_moto === d.id_moto);
  const mec  = usuarios.find(u => u.id_usuario === d.id_mecanico);

  const worst = d.detalles.reduce((a, b) => Math.max(a, b.estado), 1) as 1 | 2 | 3;
  const ec = ESTADO_CONFIG[worst];

  return (
    <div style={{ background: '#111117', border: `1px solid ${ec.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ width: 42, height: 42, borderRadius: 10, background: ec.bg, border: `1px solid ${ec.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bike size={18} color={ec.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 14, margin: 0 }}>
            {moto ? `${moto.marca} ${moto.modelo}` : `Moto #${d.id_moto}`}
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 500, marginLeft: 8 }}>
              {moto?.placa}
            </span>
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
              {d.fecha ? new Date(d.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              <Gauge size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
              {d.kilometraje_ingreso?.toLocaleString()} km
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              <User size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
              {mec?.nombre_completo ?? `Mec. #${d.id_mecanico}`}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: ec.color, background: ec.bg, border: `1px solid ${ec.border}`, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap' }}>
          {ec.label}
        </span>
        {open ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
      </div>

      {open && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {d.observaciones_generales && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '12px 0', lineHeight: 1.6 }}>
              {d.observaciones_generales}
            </p>
          )}
          <div className="gm-respgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: 12 }}>
            {d.detalles.map(det => {
              const pc = ESTADO_CONFIG[det.estado as 1 | 2 | 3];
              const part = PARTES.find(p => p.key === det.parte);
              return (
                <div key={det.parte} style={{ background: pc.bg, border: `1px solid ${pc.border}`, borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {(() => { const Icon = part?.Icon ?? Cog; return <Icon size={15} color="rgba(255,255,255,0.45)" style={{ flexShrink: 0, marginTop: 1 }} />; })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#EBEBEB' }}>{part?.label ?? det.parte}</span>
                      <EstadoIcon estado={det.estado as 1 | 2 | 3} />
                    </div>
                    <span style={{ fontSize: 10, color: pc.color, fontWeight: 700 }}>{pc.label}</span>
                    {det.observacion && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0', lineHeight: 1.4 }}>{det.observacion}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function DiagnosticoPage() {
  const { user }    = useAuth();
  const toast       = useToast();
  const [params]    = useSearchParams();
  const preselected = useRef(params.get('moto_id'));

  const [motos,    setMotos]    = useState<Moto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [historial,setHistorial]= useState<DiagnosticoMoto[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  /* Resultado del último diagnóstico guardado (resumen + confirmación de correo) */
  const [resultado, setResultado] = useState<{
    motoLabel: string; placa: string; correo: string;
    malos: { label: string; obs: string }[];
    regulares: { label: string; obs: string }[];
  } | null>(null);

  /* Búsqueda de moto para diagnosticar */
  const [busqueda,    setBusqueda]    = useState('');
  const [motoSel,     setMotoSel]     = useState<Moto | null>(null);
  const [kmIngreso,   setKmIngreso]   = useState('');
  const [obsGen,      setObsGen]      = useState('');
  const [detalles,    setDetalles]    = useState<Record<string, { estado: 1|2|3; obs: string }>>(() =>
    Object.fromEntries(PARTES.map(p => [p.key, { estado: 1, obs: '' }]))
  );

  const load = useCallback(async () => {
    const [m, u, h] = await Promise.allSettled([
      motosApi.list(),
      usuariosApi.list(),
      user ? diagnosticosApi.byMecanico(user.id_usuario) : Promise.reject(),
    ]);
    if (m.status === 'fulfilled') {
      const lista = m.value.data as Moto[];
      setMotos(lista);
      if (preselected.current) {
        const found = lista.find(mo => mo.id_moto === parseInt(preselected.current!));
        if (found) { setMotoSel(found); setBusqueda(`${found.marca} ${found.modelo}`); }
      }
    }
    if (u.status === 'fulfilled') setUsuarios(u.value.data as Usuario[]);
    if (h.status === 'fulfilled') setHistorial(h.value.data as DiagnosticoMoto[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /* Refresco en tiempo real del historial de diagnósticos */
  usePolling(load, { intervalMs: 30_000 });

  const motosFiltradas = motos.filter(m => {
    const q = busqueda.toLowerCase();
    return (
      m.placa.toLowerCase().includes(q) ||
      m.marca.toLowerCase().includes(q) ||
      m.modelo.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const setEstado = (parte: string, estado: 1 | 2 | 3) =>
    setDetalles(prev => ({ ...prev, [parte]: { ...prev[parte], estado } }));

  const setObs = (parte: string, obs: string) =>
    setDetalles(prev => ({ ...prev, [parte]: { ...prev[parte], obs } }));

  const handleGuardar = async () => {
    if (!motoSel || !user) return;
    const km = parseInt(kmIngreso);
    if (!km || km < 0) { toast.error('Ingresa el kilometraje de ingreso', 'Error'); return; }

    const detList: DetalleDiagnostico[] = PARTES.map(p => ({
      parte:       p.key,
      estado:      detalles[p.key].estado,
      observacion: detalles[p.key].obs || null,
    }));

    const diagnostico: DiagnosticoMoto = {
      id_moto:                  motoSel.id_moto,
      id_mecanico:              user.id_usuario,
      kilometraje_ingreso:      km,
      observaciones_generales:  obsGen || null,
      detalles:                 detList,
    };

    setSaving(true);
    try {
      const { data } = await diagnosticosApi.create(diagnostico as unknown as Record<string, unknown>);
      setHistorial(prev => [data as DiagnosticoMoto, ...prev]);
      load(); // sincroniza con la verdad del servidor (evita duplicados/estados viejos)
      toast.success('Diagnóstico registrado · reporte enviado al cliente', 'Diagnóstico');
      /* Resumen + confirmación de correo (el backend envía el reporte al dueño) */
      const owner = usuarios.find(u => u.id_usuario === motoSel.id_usuario);
      setResultado({
        motoLabel: `${motoSel.marca} ${motoSel.modelo}`,
        placa:     motoSel.placa,
        correo:    owner?.correo ?? '',
        malos:     PARTES.filter(p => detalles[p.key].estado === 3).map(p => ({ label: p.label, obs: detalles[p.key].obs })),
        regulares: PARTES.filter(p => detalles[p.key].estado === 2).map(p => ({ label: p.label, obs: detalles[p.key].obs })),
      });
      // Reset form
      setMotoSel(null);
      setBusqueda('');
      setKmIngreso('');
      setObsGen('');
      setDetalles(Object.fromEntries(PARTES.map(p => [p.key, { estado: 1, obs: '' }])));
    } catch (err) {
      toast.error(getErrorMsg(err), 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const card: React.CSSProperties = {
    background: '#111117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 22px',
  };

  const lbl: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)', marginBottom: 6, display: 'block',
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={20} color="#3B82F6" />
          </div>
          <div>
            <h1 style={{ color: '#EBEBEB', fontWeight: 800, fontSize: 22, margin: 0, letterSpacing: '-0.03em' }}>
              Diagnóstico de Moto
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12.5, margin: 0 }}>
              Registro clínico al ingreso — historial de cada vehículo
            </p>
          </div>
        </div>
      </div>

      {/* ── Resultado del último diagnóstico + confirmación de correo ── */}
      {resultado && (() => {
        const critico = resultado.malos.length > 0;
        const acento  = critico ? '#E11428' : (resultado.regulares.length > 0 ? '#F59E0B' : '#10B981');
        const bg      = critico ? 'rgba(225,20,40,0.08)' : (resultado.regulares.length > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)');
        return (
          <div style={{ ...card, marginBottom: 24, borderColor: `${acento}40`, background: bg }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${acento}20`, border: `1px solid ${acento}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {critico ? <XCircle size={18} color={acento} /> : (resultado.regulares.length > 0 ? <AlertTriangle size={18} color={acento} /> : <CheckCircle size={18} color={acento} />)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#EBEBEB', fontWeight: 800, fontSize: 15, margin: '0 0 2px' }}>
                  Diagnóstico guardado — {resultado.motoLabel} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{resultado.placa}</span>
                </p>
                <p style={{ color: acento, fontWeight: 700, fontSize: 12.5, margin: '0 0 10px' }}>
                  {critico
                    ? `${resultado.malos.length} componente(s) en estado CRÍTICO${resultado.regulares.length ? ` y ${resultado.regulares.length} a vigilar` : ''}`
                    : (resultado.regulares.length > 0 ? `${resultado.regulares.length} componente(s) a vigilar — nada crítico` : 'Todos los componentes en buen estado ✓')}
                </p>

                {(resultado.malos.length > 0 || resultado.regulares.length > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {resultado.malos.map(m => (
                      <span key={m.label} style={{ fontSize: 11, fontWeight: 700, color: '#E11428', background: 'rgba(225,20,40,0.12)', border: '1px solid rgba(225,20,40,0.25)', borderRadius: 8, padding: '3px 9px' }}>
                        {m.label}: Malo{m.obs ? ` · ${m.obs}` : ''}
                      </span>
                    ))}
                    {resultado.regulares.map(r => (
                      <span key={r.label} style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '3px 9px' }}>
                        {r.label}: Regular{r.obs ? ` · ${r.obs}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <CheckCircle size={13} color="#10B981" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    {resultado.correo
                      ? <>Reporte enviado automáticamente al correo del cliente: <b style={{ color: '#EBEBEB' }}>{resultado.correo}</b></>
                      : 'El reporte se intentó enviar al correo del cliente.'}
                  </span>
                </div>
              </div>
              <button onClick={() => setResultado(null)}
                style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}>
                Nuevo diagnóstico
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Formulario nuevo diagnóstico ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <p style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 15, margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={15} color="#3B82F6" /> Nuevo diagnóstico
        </p>

        {/* Búsqueda de moto */}
        {!motoSel ? (
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Buscar moto (placa, marca o modelo)</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Ej. ABC-1234, Honda, CB300R…"
                style={{ width: '100%', paddingLeft: 36, paddingRight: 12, height: 42, borderRadius: 10, background: '#1A1A22', border: '1px solid rgba(255,255,255,0.1)', color: '#EBEBEB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {busqueda.length >= 2 && (
              <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {motosFiltradas.length === 0 ? (
                  <div style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Sin resultados</div>
                ) : motosFiltradas.map(m => {
                  const owner = usuarios.find(u => u.id_usuario === m.id_usuario);
                  return (
                    <div key={m.id_moto} onClick={() => { setMotoSel(m); setKmIngreso(String(m.kilometraje)); setBusqueda(''); }}
                      style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', background: '#16161E' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1E1E2A')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#16161E')}
                    >
                      {m.ruta_imagen_motos && m.ruta_imagen_motos !== 'Desconocido' ? (
                        <img src={m.ruta_imagen_motos} alt={m.placa} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Bike size={16} color="rgba(255,255,255,0.3)" />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ color: '#EBEBEB', fontSize: 13, fontWeight: 700, margin: 0 }}>{m.marca} {m.modelo}</p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>
                          {m.placa} · {m.cilindraje}cc · {m.kilometraje.toLocaleString()} km
                          {owner ? ` · ${owner.nombre_completo}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Moto seleccionada */
          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            {motoSel.ruta_imagen_motos && motoSel.ruta_imagen_motos !== 'Desconocido' ? (
              <img src={motoSel.ruta_imagen_motos} alt={motoSel.placa} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bike size={22} color="#3B82F6" />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ color: '#EBEBEB', fontSize: 14, fontWeight: 800, margin: 0 }}>{motoSel.marca} {motoSel.modelo}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>
                {motoSel.placa} · {motoSel.cilindraje}cc · {motoSel.tipo_moto}
              </p>
            </div>
            <button onClick={() => setMotoSel(null)}
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>
              Cambiar
            </button>
          </div>
        )}

        {/* Kilometraje de ingreso */}
        <div className="gm-respgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 18 }}>
          <div>
            <label style={lbl}>Kilometraje de ingreso *</label>
            <div style={{ position: 'relative' }}>
              <Gauge size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="number" min="0" value={kmIngreso} onChange={e => setKmIngreso(e.target.value)}
                placeholder="Ej. 12500"
                style={{ width: '100%', paddingLeft: 32, height: 42, borderRadius: 10, background: '#1A1A22', border: '1px solid rgba(255,255,255,0.1)', color: '#EBEBEB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div>
            <label style={lbl}>Observaciones generales</label>
            <input
              value={obsGen} onChange={e => setObsGen(e.target.value)}
              placeholder="Descripción del problema o notas del cliente…"
              style={{ width: '100%', height: 42, borderRadius: 10, padding: '0 12px', background: '#1A1A22', border: '1px solid rgba(255,255,255,0.1)', color: '#EBEBEB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Tabla de partes */}
        <div>
          <label style={{ ...lbl, marginBottom: 12 }}>Estado de cada componente</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PARTES.map(parte => {
              const det = detalles[parte.key];
              const ec  = ESTADO_CONFIG[det.estado];
              return (
                <div key={parte.key} style={{ background: '#16161E', borderRadius: 12, border: `1px solid ${ec.border}`, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <parte.Icon size={16} color="rgba(255,255,255,0.5)" style={{ flexShrink: 0 }} />
                    <span style={{ color: '#EBEBEB', fontSize: 13, fontWeight: 700, flex: 1, minWidth: 120 }}>{parte.label}</span>
                    {/* Botones de estado */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([1, 2, 3] as const).map(est => {
                        const ecc = ESTADO_CONFIG[est];
                        const active = det.estado === est;
                        return (
                          <button key={est} onClick={() => setEstado(parte.key, est)}
                            style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: `1px solid ${active ? ecc.color : 'rgba(255,255,255,0.1)'}`, background: active ? ecc.bg : 'rgba(255,255,255,0.03)', color: active ? ecc.color : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 150ms' }}>
                            {ecc.label}
                          </button>
                        );
                      })}
                    </div>
                    {/* Nota de la parte */}
                    <input
                      value={det.obs} onChange={e => setObs(parte.key, e.target.value)}
                      placeholder="Nota (opcional)"
                      style={{ flex: 2, minWidth: 160, height: 34, borderRadius: 8, padding: '0 10px', background: '#1A1A22', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 12, outline: 'none' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={handleGuardar} disabled={!motoSel || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#fff', background: (!motoSel || saving) ? 'rgba(59,130,246,0.4)' : '#3B82F6', border: 'none', borderRadius: 10, padding: '10px 22px', cursor: (!motoSel || saving) ? 'not-allowed' : 'pointer' }}>
            <Save size={14} /> {saving ? 'Guardando…' : 'Registrar diagnóstico'}
          </button>
        </div>
      </div>

      {/* ── Historial de diagnósticos ── */}
      <div style={card}>
        <p style={{ color: '#EBEBEB', fontWeight: 700, fontSize: 15, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={15} color="rgba(255,255,255,0.4)" /> Historial de diagnósticos
          <span style={{ marginLeft: 4, fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>
            {historial.length}
          </span>
        </p>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3B82F6', animation: 'spin .8s linear infinite' }} />
          </div>
        ) : historial.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            No hay diagnósticos registrados aún.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historial.map(d => (
              <DiagnosticoCard key={d.id_diagnostico} d={d} motos={motos} usuarios={usuarios} />
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
