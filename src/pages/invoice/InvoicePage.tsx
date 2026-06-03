/* ─────────────────────────────────────────────
   GMotors — Factura Electrónica SRI Ecuador
   Cumple con formato SRI 2024 (IVA 15%)
   ───────────────────────────────────────────── */

import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { registrosApi, motosApi, usuariosApi, tiposApi } from '../../lib/api';
import { fmtDate, fmtMoney, extractCedula, extractPhone } from '../../lib/utils';
import type { RegistroDetalle, Moto, Usuario, Tipo } from '../../types';

/* ── Datos del emisor (taller) ── */
const EMISOR = {
  razon_social:  'GORILA MOTOS S.A.S.',
  ruc:           '1792345678001',
  direccion:     'Av. 6 de Diciembre N24-253 y Colón',
  ciudad:        'Quito - Pichincha - Ecuador',
  telefono:      '(02) 234-5678',
  email:         'facturacion@gorilamoto.com',
  web:           'www.gorilamoto.com',
  obligado_llevar_contabilidad: 'SI',
};

const IVA_PCT = 0.15;

/* ── Genera número de factura secuencial ── */
function genFacturaNum(id: number): string {
  const seq = String(id).padStart(9, '0');
  return `001-001-${seq}`;
}

/* ── Genera número de autorización SRI (simulado 49 dígitos) ── */
function genAutorizacion(id: number, fecha: string): string {
  const base = fecha.replace(/-/g, '') + String(id).padStart(8, '0') + '001' + '1792345678001' + '18';
  const padded = base.padEnd(49, '0').slice(0, 49);
  return padded;
}

interface InvoiceData {
  registro: RegistroDetalle;
  moto:     Moto | null;
  cliente:  Usuario | null;
  tipo:     Tipo | null;
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [data,    setData]    = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [rr, mr, ur, tr] = await Promise.allSettled([
          registrosApi.list(),
          motosApi.list(),
          usuariosApi.list(),
          tiposApi.list(),
        ]);

        const registros: RegistroDetalle[] = rr.status === 'fulfilled' ? rr.value.data : [];
        const motos:     Moto[]            = mr.status === 'fulfilled' ? mr.value.data : [];
        const usuarios:  Usuario[]         = ur.status === 'fulfilled' ? ur.value.data : [];
        const tipos:     Tipo[]            = tr.status === 'fulfilled' ? tr.value.data : [];

        const reg = registros.find(r => r.id_registro === Number(id));
        if (!reg) { setError('Registro no encontrado'); setLoading(false); return; }

        const moto    = motos.find(m => m.placa === reg.placa) ?? null;
        const cliente = usuarios.find(u => u.nombre_completo === reg.nombre_cliente) ?? null;
        const tipo    = tipos.find(t => t.nombre === reg.tipo_servicio) ?? null;

        setData({ registro: reg, moto, cliente, tipo });
      } catch {
        setError('Error al cargar la factura');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-2 border-gm-red/30 border-t-gm-red rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Cargando factura…</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center space-y-4">
        <AlertCircle size={40} className="mx-auto text-red-400/50" />
        <p className="text-white/50">{error ?? 'No se pudo cargar la factura'}</p>
        <button onClick={() => navigate(-1)} className="text-gm-red hover:text-gm-red-lt font-bold text-sm">
          ← Volver
        </button>
      </div>
    </div>
  );

  const { registro: reg, moto, cliente, tipo } = data;
  const factNum   = genFacturaNum(reg.id_registro);
  const autNum    = genAutorizacion(reg.id_registro, reg.fecha);
  const cedula    = extractCedula(cliente?.descripcion ?? '');
  const telefono  = extractPhone(cliente?.descripcion ?? '');
  const subtotal  = reg.costo_total / (1 + IVA_PCT);
  const iva       = reg.costo_total - subtotal;
  const today     = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Barra de acciones (solo en pantalla, no en print) ── */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/registros"
                className="flex items-center gap-2 text-white/40 hover:text-white/80 text-sm font-semibold transition-colors">
            <ArrowLeft size={15} /> Volver a Registros
          </Link>
          <span className="text-white/20">·</span>
          <span className="text-white/40 text-sm font-mono">{factNum}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all"
            style={{ background: '#E11428', boxShadow: '0 0 20px rgba(225,20,40,0.3)' }}
          >
            <Printer size={15} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* ══ FACTURA ══════════════════════════════════════════════════════ */}
      <div
        ref={printRef}
        className="invoice-print bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-4xl mx-auto"
        style={{ fontFamily: "'Arial', sans-serif", fontSize: '13px', lineHeight: '1.5' }}
      >

        {/* ── Cabecera ── */}
        <div className="grid grid-cols-3 border-b-2 border-gray-800">

          {/* Empresa */}
          <div className="col-span-2 p-6 border-r border-gray-300">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: '#0C0C10' }}>
                <span className="text-white font-black text-xl">GM</span>
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 leading-tight">{EMISOR.razon_social}</h1>
                <p className="text-sm font-bold text-gray-600 mt-0.5">RUC: {EMISOR.ruc}</p>
                <p className="text-xs text-gray-500 mt-2">{EMISOR.direccion}</p>
                <p className="text-xs text-gray-500">{EMISOR.ciudad}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Tel: {EMISOR.telefono} | {EMISOR.email}
                </p>
                <p className="text-xs text-gray-400 mt-1">Obligado a llevar contabilidad: {EMISOR.obligado_llevar_contabilidad}</p>
              </div>
            </div>
          </div>

          {/* Número de factura */}
          <div className="p-6 flex flex-col items-center justify-center gap-2 bg-gray-50">
            <div className="border-2 border-red-600 px-4 py-1 rounded font-black text-red-700 text-lg tracking-widest">
              FACTURA
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">N° de Factura</p>
              <p className="text-base font-black text-gray-900 font-mono">{factNum}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Fecha Emisión</p>
              <p className="text-sm font-bold text-gray-800">{fmtDate(reg.fecha)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Ambiente</p>
              <p className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">PRODUCCIÓN</p>
            </div>
          </div>
        </div>

        {/* ── Nº Autorización SRI ── */}
        <div className="bg-gray-800 text-white px-6 py-2 flex items-center gap-3">
          <CheckCircle size={14} className="text-green-400 shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nº Autorización SRI:</span>
            <span className="font-mono text-[12px] font-bold text-green-300 tracking-widest">{autNum}</span>
          </div>
        </div>

        {/* ── Datos del comprador ── */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3 pb-1 border-b border-gray-200">
            Datos del Comprador
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {[
              ['Razón Social / Nombre', reg.nombre_cliente || '—'],
              ['RUC / Cédula',          cedula ?? 'S/D'],
              ['Teléfono',              telefono ?? 'S/D'],
              ['Fecha de Servicio',     fmtDate(reg.fecha)],
              ['Forma de Pago',         'Efectivo'],
              ['Plazo',                 'Contado'],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span className="text-[11px] text-gray-500 font-bold min-w-[140px]">{label}:</span>
                <span className="text-[12px] text-gray-800 font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Datos del vehículo ── */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3">
            Datos del Vehículo
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              ['Placa',       reg.placa || '—'],
              ['Marca',       reg.marca_moto || '—'],
              ['Modelo',      reg.modelo_moto || '—'],
              ['Kilometraje', reg.kilometraje ? `${reg.kilometraje.toLocaleString()} km` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="text-center py-2 px-3 bg-white rounded-lg border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-black text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabla de servicios ── */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3">
            Detalle de Servicios
          </h2>
          <table className="w-full border-collapse" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a1a', color: '#fff' }}>
                {['Cant.', 'Cod.', 'Descripción', 'P. Unitario', 'Descuento', 'Total'].map(h => (
                  <th key={h} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-left"
                      style={{ borderBottom: '1px solid #333' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td className="px-3 py-2.5 text-sm">1</td>
                <td className="px-3 py-2.5 text-xs font-mono text-gray-500">SRV-{String(reg.id_registro).padStart(4,'0')}</td>
                <td className="px-3 py-2.5 text-sm font-semibold">
                  {reg.tipo_servicio || 'Servicio de mantenimiento'}
                  {reg.observaciones && (
                    <p className="text-xs text-gray-500 font-normal mt-0.5">{reg.observaciones}</p>
                  )}
                </td>
                <td className="px-3 py-2.5 text-sm text-right">{fmtMoney(subtotal)}</td>
                <td className="px-3 py-2.5 text-sm text-right text-gray-400">$0.00</td>
                <td className="px-3 py-2.5 text-sm text-right font-bold">{fmtMoney(subtotal)}</td>
              </tr>
              {/* Fila vacía de relleno */}
              {[1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td colSpan={6} className="px-3 py-2 text-xs text-transparent">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Totales ── */}
        <div className="grid grid-cols-2 p-6 gap-6 border-b border-gray-200">
          {/* Info adicional izquierda */}
          <div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Información Adicional</p>
              <p className="text-xs text-gray-600">
                Mecánico responsable: <span className="font-bold">{reg.nombre_cliente || 'N/A'}</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Tipo de servicio: <span className="font-bold">{reg.tipo_servicio || '—'}</span>
              </p>
              {tipo?.descripcion && (
                <p className="text-xs text-gray-500 mt-1 italic">{tipo.descripcion}</p>
              )}
            </div>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-[10px] text-yellow-700 font-semibold leading-relaxed">
                Este documento es válido como comprobante de venta únicamente si cuenta con la autorización del SRI.
                Retener para reclamar garantía del servicio.
              </p>
            </div>
          </div>

          {/* Tabla de totales derecha */}
          <div>
            <div className="space-y-1">
              {[
                ['Subtotal 0%',    '$0.00',            false],
                ['Subtotal 15%',   fmtMoney(subtotal), false],
                ['Descuento',      '$0.00',            false],
                ['Subtotal',       fmtMoney(subtotal), false],
                [`IVA 15%`,        fmtMoney(iva),      false],
              ].map(([label, value, bold]) => (
                <div key={String(label)} className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className={`text-sm ${bold ? 'font-black' : 'text-gray-600'}`}>{label}</span>
                  <span className={`text-sm font-bold ${bold ? 'text-red-700 text-lg' : ''}`}>{value}</span>
                </div>
              ))}
              {/* Total */}
              <div className="flex justify-between items-center py-3 px-4 rounded-xl mt-2"
                   style={{ background: '#1a1a1a' }}>
                <span className="text-white font-black text-base uppercase tracking-wider">TOTAL A PAGAR</span>
                <span className="text-red-400 font-black text-2xl">{fmtMoney(reg.costo_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Firmas ── */}
        <div className="grid grid-cols-2 gap-8 px-6 py-6 border-b border-gray-200">
          {['Firma del Cliente', 'Firma del Responsable'].map(label => (
            <div key={label} className="flex flex-col items-center">
              <div className="w-full h-16 border-b-2 border-gray-400 mb-2" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{EMISOR.razon_social}</p>
            </div>
          ))}
        </div>

        {/* ── Código de barras / QR placeholder ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
          <div className="flex items-center gap-4">
            {/* QR simulado */}
            <div className="w-16 h-16 border-2 border-gray-800 flex items-center justify-center text-center"
                 style={{ background: '#fff' }}>
              <div className="grid grid-cols-3 gap-px w-full h-full p-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i}
                       className={`rounded-sm ${[0,2,4,6,8].includes(i) ? 'bg-gray-900' : 'bg-gray-100'}`} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Código de Barras / QR</p>
              <p className="text-[11px] font-mono text-gray-700 mt-0.5">{autNum.slice(0, 24)}…</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Consulte en: www.sri.gob.ec</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Documento generado: {fmtDate(today)}</p>
            <p className="text-[10px] text-gray-400">{EMISOR.web}</p>
            <p className="text-[10px] font-bold text-gray-600 mt-1">Gorila Motos © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>

      {/* ── Botones mobile-friendly ── */}
      <div className="no-print flex justify-center gap-3">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white"
          style={{ background: '#E11428' }}
        >
          <Printer size={18} /> Imprimir / Guardar PDF
        </button>
        <Link
          to="/registros"
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white/50 border border-white/10 hover:border-white/20 transition-all"
        >
          <ArrowLeft size={18} /> Volver
        </Link>
      </div>
    </div>
  );
}
