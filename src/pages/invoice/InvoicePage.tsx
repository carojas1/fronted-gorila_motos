/* ─────────────────────────────────────────────
   GMotors — Nota de Servicio / Comprobante
   Diseño premium · datos del técnico · logo
   ───────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle, CheckCircle, Clock, Package, FileText } from 'lucide-react';
import { registrosApi, usuariosApi } from '../../lib/api';
import { fmtDate, fmtMoney, extractCedula, extractPhone } from '../../lib/utils';
import { WORKSHOP_CONTACT } from '../../lib/constants';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../contexts/AuthContext';
import type { RegistroDetalle, Usuario } from '../../types';

const ESTADO_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'Pendiente',  color: '#F59E0B' },
  1: { label: 'En proceso', color: '#3B82F6' },
  2: { label: 'Completado', color: '#10B981' },
  3: { label: 'Entregado',  color: '#8B5CF6' },
  4: { label: 'Facturado',  color: '#14B8A6' },
};

function genNumero(id: number): string {
  return `ORD-${String(id).padStart(6, '0')}`;
}

export default function InvoicePage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [theme]  = useTheme();
  const isDark   = theme === 'dark';
  const { user } = useAuth();

  const [reg,     setReg]     = useState<RegistroDetalle | null>(null);
  const [cliente, setCliente] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [rr, ur] = await Promise.allSettled([
          registrosApi.list(),
          usuariosApi.list(),
        ]);

        const registros: RegistroDetalle[] = rr.status === 'fulfilled' ? rr.value.data : [];
        const usuarios:  Usuario[]         = ur.status === 'fulfilled' ? ur.value.data : [];

        const found = registros.find(r => r.id_registro === Number(id));
        if (!found) { setError('Registro no encontrado'); setLoading(false); return; }

        // Intentar enriquecer con detalle (tiene nombre_encargado)
        try {
          const det = await registrosApi.get(Number(id));
          const d = det.data as Record<string, unknown>;
          if (d.nombreEncargado || d.nombre_encargado) {
            (found as Record<string, unknown>).nombre_encargado =
              (d.nombreEncargado ?? d.nombre_encargado) as string;
          }
        } catch { /* fallback: sin nombre encargado */ }

        const cli = usuarios.find(u => u.nombre_completo === found.nombre_cliente) ?? null;
        setReg(found);
        setCliente(cli);
      } catch {
        setError('Error al cargar el comprobante');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-2 border-gm-red/30 border-t-gm-red rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Cargando comprobante…</p>
      </div>
    </div>
  );

  if (error || !reg) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center space-y-4">
        <AlertCircle size={40} className="mx-auto text-red-400/50" />
        <p className="text-white/50">{error ?? 'No se pudo cargar el comprobante'}</p>
        <button onClick={() => navigate(-1)} className="text-gm-red hover:text-gm-red-lt font-bold text-sm">
          ← Volver
        </button>
      </div>
    </div>
  );

  const numComp  = genNumero(reg.id_registro);
  const cedula   = extractCedula(cliente?.descripcion ?? '');
  const telefono = extractPhone(cliente?.descripcion ?? '');
  const estInfo  = ESTADO_LABEL[reg.estado] ?? ESTADO_LABEL[0];
  const mecanico = reg.nombre_encargado ?? 'Técnico Gorila Motos';

  /* Quién despachó / cobró el pedido: el encargado del registro;
     si no existe, el usuario que emite el comprobante; en último caso, el cliente. */
  const despachadoPor = reg.nombre_encargado
    ?? user?.nombre_completo
    ?? reg.nombre_cliente
    ?? 'Gorila Motos';
  /* Desde qué cuenta se realizó el comprobante (usuario autenticado). */
  const cuentaEmisora = user?.correo
    ?? (user?.nombre_usuario ? `@${user.nombre_usuario}` : null)
    ?? WORKSHOP_CONTACT.email;
  const placa = reg.placa?.trim() || '—';

  /* ── Paleta de pantalla (chrome) según tema ── */
  const sc = {
    pageBg:      isDark ? 'transparent'              : '#F4F5F7',
    btnBackTxt:  isDark ? 'rgba(255,255,255,0.5)'    : '#15151B',
    btnBackBord: isDark ? 'rgba(255,255,255,0.10)'   : '#E4E7EC',
  };

  return (
    <div className="space-y-6 pb-8" style={{ background: sc.pageBg }}>

      {/* ── Barra de acciones (solo pantalla) ── */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/registros"
                className="flex items-center gap-2 text-white/40 hover:text-white/80 text-sm font-semibold transition-colors">
            <ArrowLeft size={15} /> Volver a Registros
          </Link>
          <span className="text-white/20">·</span>
          <span className="text-white/35 text-sm font-mono">{numComp}</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
          style={{ background: '#E11428', boxShadow: '0 0 24px rgba(225,20,40,0.35)' }}
        >
          <Printer size={15} /> Imprimir / PDF
        </button>
      </div>

      {/* ══ COMPROBANTE ══ */}
      <div
        className="invoice-print bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-[800px] mx-auto"
        style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '13px', lineHeight: '1.5' }}
      >
        {/* ── Cabecera premium ── */}
        <div style={{ background: 'linear-gradient(135deg, #0C0C10 0%, #1A1A22 100%)' }} className="p-6">
          <div className="flex items-center justify-between">
            {/* Logo + taller */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0"
                   style={{ border: '2px solid rgba(225,20,40,0.5)', boxShadow: '0 0 20px rgba(225,20,40,0.3)' }}>
                <img src="/brand/gorila-logo.png" alt="GM"
                     className="w-full h-full object-cover"
                     onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                <div className="w-full h-full flex items-center justify-center bg-[#0C0C10] text-white font-black text-lg" style={{ display:'flex' }}>
                  GM
                </div>
              </div>
              <div>
                <h1 className="text-white font-black text-xl leading-none" style={{ fontFamily: "'Dancing Script', cursive" }}>
                  Gorila <span style={{ color: '#E11428' }}>Motos</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>
                  {WORKSHOP_CONTACT.direccion}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                  {WORKSHOP_CONTACT.telefono} · {WORKSHOP_CONTACT.email}
                </p>
              </div>
            </div>
            {/* Badge número */}
            <div className="text-right">
              <div style={{
                background: 'rgba(225,20,40,0.15)', border: '1px solid rgba(225,20,40,0.5)',
                borderRadius: 12, padding: '10px 18px',
              }}>
                <p style={{ color: '#E11428', fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Nota de Servicio
                </p>
                <p className="text-white font-black" style={{ fontSize: 22, letterSpacing: '-0.5px', marginTop: 2 }}>
                  #{reg.id_registro}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>{numComp}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Info meta ── */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100"
             style={{ background: '#F9FAFB' }}>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span><strong className="text-gray-700">Fecha:</strong> {fmtDate(reg.fecha)}</span>
            <span><strong className="text-gray-700">Generado:</strong> {fmtDate(new Date().toISOString().slice(0,10))}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
               style={{ background: `${estInfo.color}14`, color: estInfo.color, border: `1px solid ${estInfo.color}30` }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: estInfo.color }} />
            {estInfo.label}
          </div>
        </div>

        {/* ── Cuerpo: cliente + vehículo ── */}
        <div className="grid grid-cols-2 gap-0 border-b border-gray-200">

          {/* Cliente */}
          <div className="p-6 border-r border-gray-200">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3">
              Datos del Cliente
            </h2>
            <div className="space-y-2.5">
              {([
                ['Nombre',   reg.nombre_cliente || '—'],
                ['C.I.',     cedula   ?? 'S/D'],
                ['Teléfono', telefono ?? 'S/D'],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k} className="flex gap-2 items-baseline">
                  <span className="text-[12px] text-gray-400 font-semibold min-w-[78px]">{k}:</span>
                  <span className={`font-bold text-gray-900 ${k==='Nombre' ? 'text-[16px]' : 'text-[14px]'}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vehículo */}
          <div className="p-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3">
              Datos del Vehículo
            </h2>

            {/* Placa destacada */}
            <div className="mb-3 p-3 rounded-xl flex items-center justify-between"
                 style={{ background: '#0C0C10', border: '2px solid #E11428' }}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Placa
              </span>
              <span className="font-mono font-black text-white" style={{ fontSize: 24, letterSpacing: '0.18em' }}>
                {placa}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([
                ['Marca',  reg.marca_moto || '—'],
                ['Modelo', reg.modelo_moto || '—'],
                ['Km',     reg.kilometraje ? `${reg.kilometraje.toLocaleString('es-EC')} km` : '—'],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k} className="p-2.5 rounded-xl text-center"
                     style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{k}</p>
                  <p className="font-black text-gray-900 mt-0.5 text-[15px]">
                    {v}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Detalle del servicio ── */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-4">
            Detalle del Servicio
          </h2>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0C0C10' }}>
                {['Cant.', 'Código', 'Descripción del servicio', 'Precio unitario', 'Total'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left"
                      style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 800,
                               textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #F0F1F3' }}>
                <td className="px-4 py-3.5 text-sm text-gray-600">1</td>
                <td className="px-4 py-3.5 text-xs font-mono text-gray-400">SRV-{String(reg.id_registro).padStart(4,'0')}</td>
                <td className="px-4 py-3.5">
                  <p className="text-sm font-bold text-gray-800">{reg.tipo_servicio || 'Servicio de mantenimiento'}</p>
                  {reg.descripcion && (
                    <p className="text-xs text-gray-500 mt-0.5 font-normal leading-relaxed">{reg.descripcion}</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-600 text-right">{fmtMoney(reg.costo_total)}</td>
                <td className="px-4 py-3.5 text-sm font-black text-gray-900 text-right">{fmtMoney(reg.costo_total)}</td>
              </tr>
              {[0,1].map(i => (
                <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <td colSpan={5} className="px-4 py-2.5 text-xs text-gray-200">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Total + Técnico ── */}
        <div className="grid grid-cols-2 gap-0 border-b border-gray-200">

          {/* Info técnico */}
          <div className="p-6 border-r border-gray-200">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3">
              Técnico Responsable
            </h2>
            <div className="flex items-center gap-3 p-3 rounded-xl"
                 style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                   style={{ background: '#0C0C10' }}>
                {mecanico.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black text-gray-800">{mecanico}</p>
                <p className="text-xs text-gray-500">{WORKSHOP_CONTACT.nombre} · Técnico certificado</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Despachado por: <span className="font-semibold text-gray-600">{despachadoPor}</span>
                </p>
                <p className="text-xs text-gray-400">
                  Cuenta: <span className="font-mono text-gray-600">{cuentaEmisora}</span>
                </p>
              </div>
            </div>
            <div className="mt-3 p-2.5 rounded-lg"
                 style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <p className="text-[10px] text-blue-700 font-semibold leading-relaxed">
                Este comprobante es un registro interno. No tiene validez tributaria. Guárdalo para reclamar garantía.
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="p-6 flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal:</span>
                <span className="font-bold">{fmtMoney(reg.costo_total)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>IVA (no aplica):</span>
                <span>$0.00</span>
              </div>
              <div className="border-t border-gray-200 my-1" />
            </div>
            <div className="p-4 rounded-2xl flex justify-between items-center"
                 style={{ background: 'linear-gradient(135deg, #E11428, #B91C1C)' }}>
              <div>
                <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Total del servicio</p>
                <p className="text-white/60 text-[10px]">Forma de pago: Efectivo</p>
              </div>
              <p className="text-white font-black text-2xl" style={{ letterSpacing: '-0.5px' }}>
                {fmtMoney(reg.costo_total)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Firmas ── */}
        <div className="grid grid-cols-2 gap-8 px-8 py-6 border-b border-gray-200">
          {[
            { label: 'Firma del Cliente', sub: reg.nombre_cliente },
            { label: 'Firma del Técnico', sub: mecanico },
          ].map(({ label, sub }) => (
            <div key={label} className="flex flex-col items-center">
              <div className="w-full h-14 border-b-2 border-gray-300 mb-2" />
              <p className="text-[11px] font-black text-gray-600 uppercase tracking-wider text-center">{label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 text-center">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Pie ── */}
        <div style={{ background: '#0C0C10' }} className="flex items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <CheckCircle size={12} style={{ color: '#10B981' }} />
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
              {WORKSHOP_CONTACT.horario} · {WORKSHOP_CONTACT.web}
            </p>
          </div>
          <p style={{ color: '#E11428', fontSize: 10, fontWeight: 700 }}>
            Gorila Motos © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* ── Botones mobile ── */}
      <div className="no-print flex justify-center gap-3">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white"
          style={{ background: '#E11428', boxShadow: '0 0 24px rgba(225,20,40,0.3)' }}
        >
          <Printer size={18} /> Imprimir / Guardar PDF
        </button>
        <Link
          to="/registros"
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold"
          style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <ArrowLeft size={18} /> Volver
        </Link>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .invoice-print { box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}

// Re-export icons for use in RecordsPage status labels (avoids circular import)
export { CheckCircle, Clock, Package, FileText };
