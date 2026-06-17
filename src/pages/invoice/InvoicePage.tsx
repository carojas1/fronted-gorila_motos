/* ─────────────────────────────────────────────
   GMotors — Comprobante de Servicio interno
   Sin IVA ni validez tributaria — solo registro
   ───────────────────────────────────────────── */

import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle } from 'lucide-react';
import { registrosApi, motosApi, usuariosApi, tiposApi } from '../../lib/api';
import { fmtDate, fmtMoney, extractCedula, extractPhone } from '../../lib/utils';
import type { RegistroDetalle, Moto, Usuario, Tipo } from '../../types';

/* ── Datos del taller ── */
const TALLER = {
  nombre:    'GORILA MOTOS S.A.S.',
  direccion: 'Medardo A. Silva y Ángel Silva 1-666',
  ciudad:    'Cuenca - Azuay - Ecuador',
  telefono:  '+593 98 083 4367',
  email:     'facturacion@gorilamoto.com',
  web:       'www.gorilamoto.com',
};

function genNumeroComprobante(id: number): string {
  return `SRV-${String(id).padStart(6, '0')}`;
}

interface InvoiceData {
  registro: RegistroDetalle;
  moto:     Moto | null;
  cliente:  Usuario | null;
  tipo:     Tipo | null;
}

export default function InvoicePage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const printRef   = useRef<HTMLDivElement>(null);

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

  if (error || !data) return (
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

  const { registro: reg, cliente, tipo } = data;
  const numComp  = genNumeroComprobante(reg.id_registro);
  const cedula   = extractCedula(cliente?.descripcion ?? '');
  const telefono = extractPhone(cliente?.descripcion ?? '');
  const today    = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Barra de acciones (solo pantalla) ── */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/registros"
                className="flex items-center gap-2 text-white/40 hover:text-white/80 text-sm font-semibold transition-colors">
            <ArrowLeft size={15} /> Volver a Registros
          </Link>
          <span className="text-white/20">·</span>
          <span className="text-white/40 text-sm font-mono">{numComp}</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white transition-all"
          style={{ background: '#E11428', boxShadow: '0 0 20px rgba(225,20,40,0.3)' }}
        >
          <Printer size={15} /> Imprimir / PDF
        </button>
      </div>

      {/* ══ COMPROBANTE ══ */}
      <div
        ref={printRef}
        className="invoice-print bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-3xl mx-auto"
        style={{ fontFamily: "'Arial', sans-serif", fontSize: '13px', lineHeight: '1.5' }}
      >

        {/* ── Cabecera ── */}
        <div className="grid grid-cols-3 border-b-2 border-gray-800">

          {/* Taller */}
          <div className="col-span-2 p-6 border-r border-gray-300">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: '#0C0C10' }}>
                <span className="text-white font-black text-lg">GM</span>
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900 leading-tight">{TALLER.nombre}</h1>
                <p className="text-xs text-gray-500 mt-2">{TALLER.direccion}</p>
                <p className="text-xs text-gray-500">{TALLER.ciudad}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Tel: {TALLER.telefono} &nbsp;|&nbsp; {TALLER.email}
                </p>
              </div>
            </div>
          </div>

          {/* Número de comprobante */}
          <div className="p-6 flex flex-col items-center justify-center gap-2 bg-gray-50">
            <div className="border-2 border-red-600 px-3 py-1 rounded font-black text-red-700 text-sm tracking-widest text-center">
              COMPROBANTE<br/>DE SERVICIO
            </div>
            <div className="text-center mt-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">N° de Comprobante</p>
              <p className="text-base font-black text-gray-900 font-mono">{numComp}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Fecha</p>
              <p className="text-sm font-bold text-gray-800">{fmtDate(reg.fecha)}</p>
            </div>
          </div>
        </div>

        {/* ── Datos del cliente ── */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3 pb-1 border-b border-gray-200">
            Datos del Cliente
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {([
              ['Nombre',           reg.nombre_cliente || '—'],
              ['Cédula',           cedula ?? 'S/D'],
              ['Teléfono',         telefono ?? 'S/D'],
              ['Fecha de servicio',fmtDate(reg.fecha)],
              ['Forma de pago',    'Efectivo'],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <span className="text-[11px] text-gray-500 font-bold min-w-[130px]">{label}:</span>
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
          <div className="grid grid-cols-4 gap-3">
            {([
              ['Placa',       reg.placa || '—'],
              ['Marca',       reg.marca_moto || '—'],
              ['Modelo',      reg.modelo_moto || '—'],
              ['Kilometraje', reg.kilometraje ? `${reg.kilometraje.toLocaleString()} km` : '—'],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="text-center py-2 px-3 bg-white rounded-lg border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-black text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Detalle del servicio ── */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-3">
            Detalle del Servicio
          </h2>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a1a', color: '#fff' }}>
                {['Cant.', 'Cód.', 'Descripción', 'Precio'].map(h => (
                  <th key={h} className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-left"
                      style={{ borderBottom: '1px solid #333' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td className="px-3 py-3 text-sm">1</td>
                <td className="px-3 py-3 text-xs font-mono text-gray-500">
                  SRV-{String(reg.id_registro).padStart(4, '0')}
                </td>
                <td className="px-3 py-3 text-sm font-semibold">
                  {reg.tipo_servicio || 'Servicio de mantenimiento'}
                  {reg.descripcion && (
                    <p className="text-xs text-gray-500 font-normal mt-0.5">{reg.descripcion}</p>
                  )}
                </td>
                <td className="px-3 py-3 text-sm font-bold text-right">
                  {fmtMoney(reg.costo_total)}
                </td>
              </tr>
              {[1, 2].map(i => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td colSpan={4} className="px-3 py-2 text-xs text-transparent">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Total + Info adicional ── */}
        <div className="grid grid-cols-2 p-6 gap-6 border-b border-gray-200">

          {/* Info del servicio */}
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Información del servicio
              </p>
              <p className="text-xs text-gray-600">
                Tipo: <span className="font-bold">{reg.tipo_servicio || '—'}</span>
              </p>
              {tipo?.descripcion && (
                <p className="text-xs text-gray-500 mt-1 italic">{tipo.descripcion}</p>
              )}
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-[10px] text-blue-700 font-semibold leading-relaxed">
                Este comprobante es un registro interno del servicio.
                No tiene validez tributaria. Guárdalo para reclamar garantía.
              </p>
            </div>
          </div>

          {/* Total */}
          <div className="flex flex-col justify-end">
            <div className="flex justify-between items-center py-3 px-5 rounded-xl"
                 style={{ background: '#1a1a1a' }}>
              <span className="text-white font-black text-base uppercase tracking-wider">
                Total del servicio
              </span>
              <span className="text-red-400 font-black text-2xl">
                {fmtMoney(reg.costo_total)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Firmas ── */}
        <div className="grid grid-cols-2 gap-8 px-6 py-6 border-b border-gray-200">
          {['Firma del Cliente', 'Firma del Responsable'].map(label => (
            <div key={label} className="flex flex-col items-center">
              <div className="w-full h-16 border-b-2 border-gray-400 mb-2" />
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">{label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{TALLER.nombre}</p>
            </div>
          ))}
        </div>

        {/* ── Pie ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50">
          <p className="text-[10px] text-gray-400">
            Documento generado: {fmtDate(today)} &nbsp;·&nbsp; {TALLER.web}
          </p>
          <p className="text-[10px] font-bold text-gray-600">
            Gorila Motos © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* ── Botones mobile ── */}
      <div className="no-print flex justify-center gap-3">
        <button
          onClick={() => window.print()}
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
