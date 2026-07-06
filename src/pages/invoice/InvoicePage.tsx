/* ─────────────────────────────────────────────
   GMotors — Nota de Servicio / Comprobante
   Diseño premium · datos del técnico · logo
   ───────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, AlertCircle, CheckCircle, Clock, Package, FileText } from 'lucide-react';
import { registrosApi, usuariosApi, productosApi, detallesFacturaApi, facturasApi } from '../../lib/api';
import { fmtDate, fmtMoney, extractCedula, extractPhone, ordenNumero } from '../../lib/utils';
import { WORKSHOP_CONTACT, whatsappCitaLink } from '../../lib/constants';
import { useTheme } from '../../lib/theme';
import { useAuth } from '../../contexts/AuthContext';
import {
  detalleKind, cleanDescripcion, detalleCategoria, categoriaLabel, splitTotales,
} from '../../lib/detalles';
import type { RegistroDetalle, Usuario, Producto } from '../../types';

interface DetalleFila {
  idDetalleFactura?: number;
  descripcion?: string | null;
  cantidad?: number;
  precioUnitario?: number;
  subtotal?: number;
  idProducto?: number | null;
}

const ESTADO_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'Pendiente',  color: '#F59E0B' },
  1: { label: 'En proceso', color: '#3B82F6' },
  2: { label: 'Completado', color: '#10B981' },
  3: { label: 'Entregado',  color: '#8B5CF6' },
  4: { label: 'Facturado',  color: '#14B8A6' },
};

/* Número de orden único: delega en el helper compartido (ordenNumero) */
const genNumero = ordenNumero;

export default function InvoicePage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [theme]  = useTheme();
  const isDark   = theme === 'dark';
  const { user } = useAuth();

  const [reg,       setReg]       = useState<RegistroDetalle | null>(null);
  const [cliente,   setCliente]   = useState<Usuario | null>(null);
  const [detalles,  setDetalles]  = useState<DetalleFila[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const isDirectSale = id.startsWith('f_');
        const realId = isDirectSale ? id.replace('f_', '') : id;

        const [rr, ur, pr] = await Promise.allSettled([
          registrosApi.list(),
          usuariosApi.list(),
          productosApi.list(),
        ]);

        const registros: RegistroDetalle[] = rr.status === 'fulfilled' ? rr.value.data : [];
        const usuarios:  Usuario[]         = ur.status === 'fulfilled' ? ur.value.data : [];
        if (pr.status === 'fulfilled') setProductos(pr.value.data as Producto[]);

        if (isDirectSale) {
          // VENTA DIRECTA (Sin registro)
          try {
            const facReq = await facturasApi.get(Number(realId));
            const factura = facReq.data as any;
            const cli = usuarios.find(u => u.id_usuario === factura.id_usuario) ?? null;
            
            // Creamos un "pseudo-registro" para que la UI no se rompa
            setReg({
              id_registro: 0,
              id_usuario: factura.id_usuario,
              id_moto: 0,
              id_factura: factura.id_factura,
              fecha: factura.fecha_emision || factura.fecha,
              estado: 4, // Facturado
              costo_total: factura.costo_total,
              nombre_cliente: cli?.nombre_completo || 'Cliente',
              placa: 'VENTA DIRECTA',
              marca: 'Gorila Motos',
              modelo: 'Inventario',
              sintomas: 'Venta de mostrador',
              nombre_encargado: 'Administración'
            } as any);
            setCliente(cli);
            
            const { data } = await detallesFacturaApi.byFactura(factura.id_factura);
            setDetalles((data as DetalleFila[]) ?? []);
          } catch (err) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 401) {
              localStorage.removeItem('gm_token');
              localStorage.removeItem('gm_user');
              window.dispatchEvent(new Event('gm:unauthorized'));
              return;
            }
            setError('Factura no encontrada');
          }
        } else {
          // NOTA DE SERVICIO (Con registro)
          const found = registros.find(r => r.id_registro === Number(realId));
          if (!found) { setError('Registro no encontrado'); setLoading(false); return; }

          try {
            const det = await registrosApi.get(Number(realId));
            const d = det.data as Record<string, unknown>;
            if (d.nombreEncargado || d.nombre_encargado) {
              (found as Record<string, unknown>).nombre_encargado =
                (d.nombreEncargado ?? d.nombre_encargado) as string;
            }
          } catch { /* fallback */ }

          const cli = usuarios.find(u => u.nombre_completo === found.nombre_cliente) ?? null;
          setReg(found);
          setCliente(cli);

          try {
            const { data } = await detallesFacturaApi.byFactura(found.id_factura);
            setDetalles((data as DetalleFila[]) ?? []);
          } catch { setDetalles([]); }
        }
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
        <p className="dark:text-white/40 text-slate-900/40 text-sm">Cargando comprobante…</p>
      </div>
    </div>
  );

  if (error || !reg) return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center space-y-4">
        <AlertCircle size={40} className="mx-auto text-red-400/50" />
        <p className="dark:text-white/50 text-slate-900/50">{error ?? 'No se pudo cargar el comprobante'}</p>
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
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard', { replace: true });
  };

  const productoById = (id?: number | null) =>
    id ? productos.find(p => p.id_producto === id) : undefined;

  /* Separar los detalles en mano de obra y repuestos para la factura */
  const manoItems = detalles.filter(d => detalleKind(d) === 'mano');
  const repItems  = detalles.filter(d => detalleKind(d) === 'repuesto');
  const descItems = detalles.filter(d => detalleKind(d) === 'descuento');
  const { mano: totalMano, repuestos: totalRep, descuentos: totalDesc, total: totalDetalles } = splitTotales(detalles);
  /* Si no hay detalles cargados (orden vieja), usar el costo_total como mano de obra */
  const hayDetalles = detalles.length > 0;
  const subtotalFactura = hayDetalles ? totalDetalles : (reg.costo_total ?? 0);

  /* ── Paleta de pantalla (chrome) según tema ── */
  const sc = {
    pageBg:      isDark ? 'transparent'              : '#F4F5F7',
    btnBackTxt:  isDark ? 'rgba(255,255,255,0.5)'    : '#15151B',
    btnBackBord: isDark ? 'rgba(255,255,255,0.10)'   : '#E4E7EC',
  };

  return (
    <div className="space-y-6 pb-8" style={{ background: sc.pageBg }}>

      {/* ── Barra de acciones (solo pantalla) ── */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3 px-2">
        <div className="flex items-center gap-3">
          <button onClick={handleBack}
                className="flex items-center gap-2 text-sm font-semibold transition-colors"
                style={{ color: sc.btnBackTxt }}>
            <ArrowLeft size={15} /> Volver
          </button>
          <span style={{ color: sc.btnBackBord }}>·</span>
          <span className="text-sm font-mono" style={{ color: sc.btnBackTxt, opacity: 0.7 }}>{numComp}</span>
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
        <div style={{ background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)', borderBottom: '1px solid rgba(220,38,38,0.1)' }} className="p-6 border-b border-red-100">
          <div className="flex items-center justify-between">
            {/* Logo + taller */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 relative bg-white shadow-sm"
                   style={{ border: '1px solid rgba(220,38,38,0.2)' }}>
                <img src="/brand/gorila-logo.png" alt="Gorila Motos"
                     className="w-full h-full object-cover relative z-10"
                     onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div>
                <h1 className="font-black text-2xl leading-none" style={{ color: '#991B1B', fontFamily: "'Inter', sans-serif", letterSpacing: '-0.5px' }}>
                  Gorila Motos
                </h1>
                <p style={{ color: '#7F1D1D', fontSize: 11, marginTop: 4, opacity: 0.8 }}>
                  {WORKSHOP_CONTACT.direccion}
                </p>
                <p style={{ color: '#7F1D1D', fontSize: 11, opacity: 0.8 }}>
                  {WORKSHOP_CONTACT.telefono} · {WORKSHOP_CONTACT.email}
                </p>
              </div>
            </div>
            {/* Badge número */}
            <div className="text-right">
              <div style={{
                background: '#FFFFFF', border: '1px solid rgba(220,38,38,0.15)',
                borderRadius: 12, padding: '10px 18px', boxShadow: '0 4px 12px rgba(220,38,38,0.05)'
              }}>
                <p style={{ color: '#DC2626', fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Nota de Servicio
                </p>
                <p className="font-black" style={{ color: '#7F1D1D', fontSize: 22, letterSpacing: '-0.5px', marginTop: 2 }}>
                  {numComp}
                </p>
                <p style={{ color: '#991B1B', fontSize: 11, marginTop: 2, opacity: 0.6 }}>{fmtDate(reg.fecha)}</p>
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

            {/* Hero foto moto */}
            {reg.ruta_imagen_moto ? (
              <div className="relative rounded-2xl overflow-hidden mb-3" style={{ height: 110 }}>
                <img
                  src={reg.ruta_imagen_moto}
                  alt={`${reg.marca_moto} ${reg.modelo_moto}`}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(12,12,16,0.88) 0%, rgba(12,12,16,0.4) 55%, transparent 100%)' }} />
                <div className="absolute inset-0 flex flex-col justify-end p-3">
                  <span className="font-mono font-black text-white" style={{ fontSize: 20, letterSpacing: '0.18em', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                    {placa}
                  </span>
                  <span className="text-white/70 text-[11px] font-semibold mt-0.5">
                    {reg.marca_moto} {reg.modelo_moto}
                    {reg.kilometraje ? ` · ${reg.kilometraje.toLocaleString('es-EC')} km` : ''}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-3 p-3 rounded-xl flex items-center justify-between"
                   style={{ background: '#0C0C10', border: '2px solid #E11428' }}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Placa
                </span>
                <span className="font-mono font-black text-white" style={{ fontSize: 22, letterSpacing: '0.18em' }}>
                  {placa}
                </span>
              </div>
            )}

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
        <div className="border-b border-gray-200">
          {(reg.descripcion || reg.observaciones) && (
            <div className="px-6 pt-4 pb-3" style={{ background: '#FFFDFD', borderBottom: '1px solid #F3F4F6' }}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-2">
                Ingreso y observaciones
              </h2>
              {reg.descripcion && (
                <p className="text-[12px] text-gray-700 leading-relaxed">{reg.descripcion}</p>
              )}
              {reg.observaciones && reg.observaciones !== reg.descripcion && (
                <p className="text-[12px] text-gray-700 leading-relaxed mt-1">{reg.observaciones}</p>
              )}
            </div>
          )}
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
              Detalle del Servicio
            </h2>
            {hayDetalles && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#F3F4F6', color: '#6B7280' }}>
                {detalles.length} ítem{detalles.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0C0C10' }}>
                {['', 'Cant.', 'Descripción del servicio / repuesto', 'P. Unit.', 'Total'].map((h, idx) => (
                  <th key={idx} className={`px-3 py-2.5 ${idx >= 3 ? 'text-right' : 'text-left'}`}
                      style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: 800,
                               textTransform: 'uppercase', letterSpacing: '0.1em', width: idx === 0 ? 4 : undefined }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!hayDetalles && (
                <tr style={{ borderBottom: '1px solid #F0F1F3' }}>
                  <td style={{ width: 4, background: '#0C0C10', padding: 0 }} />
                  <td className="px-3 py-3.5 text-sm text-gray-600">1</td>
                  <td className="px-3 py-3.5">
                    <p className="text-sm font-bold text-gray-800">{reg.tipo_servicio || 'Servicio de mantenimiento'}</p>
                    {reg.descripcion && (
                      <p className="text-xs text-gray-500 mt-0.5 font-normal leading-relaxed">{reg.descripcion}</p>
                    )}
                  </td>
                  <td className="px-3 py-3.5 text-sm text-gray-600 text-right">{fmtMoney(reg.costo_total)}</td>
                  <td className="px-3 py-3.5 text-sm font-black text-gray-900 text-right">{fmtMoney(reg.costo_total)}</td>
                </tr>
              )}

              {/* ── Mano de obra ── */}
              {manoItems.length > 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <div className="flex items-center gap-3 px-4 py-2"
                         style={{ background: 'linear-gradient(90deg,#FEF2F2,#FFF5F5)', borderLeft: '3px solid #EF4444' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: '#B91C1C' }}>
                        Mano de obra — {manoItems.length} ítem{manoItems.length !== 1 ? 's' : ''}
                      </span>
                      <span className="ml-auto text-[11px] font-bold" style={{ color: '#B91C1C' }}>{fmtMoney(totalMano)}</span>
                    </div>
                  </td>
                </tr>
              )}
              {manoItems.map((d, i) => (
                <tr key={`m${i}`} style={{ borderBottom: '1px solid #F0F1F3', background: i % 2 === 0 ? '#FFFDFD' : '#FFFFFF' }}>
                  <td style={{ width: 4, background: '#EF4444', padding: 0 }} />
                  <td className="px-3 py-3 text-sm text-gray-500 font-mono text-center">{d.cantidad ?? 1}</td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-bold text-gray-800">{cleanDescripcion(d.descripcion) || 'Mano de obra'}</p>
                    <p className="text-[10px] text-red-400 mt-0.5 font-semibold">MO-{String(i + 1).padStart(2, '0')}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500 text-right">{fmtMoney(Number(d.precioUnitario ?? 0))}</td>
                  <td className="px-3 py-3 text-sm font-black text-gray-800 text-right">{fmtMoney(Number(d.subtotal ?? 0))}</td>
                </tr>
              ))}

              {/* ── Repuestos ── */}
              {repItems.length > 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <div className="flex items-center gap-3 px-4 py-2"
                         style={{ background: 'linear-gradient(90deg,#FFF1F2,#FFF7F8)', borderLeft: '3px solid #F43F5E' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#BE123C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: '#BE123C' }}>
                        Repuestos — {repItems.length} ítem{repItems.length !== 1 ? 's' : ''}
                      </span>
                      <span className="ml-auto text-[11px] font-bold" style={{ color: '#BE123C' }}>{fmtMoney(totalRep)}</span>
                    </div>
                  </td>
                </tr>
              )}
              {repItems.map((d, i) => {
                const prod = productoById(d.idProducto);
                const cat = d.idProducto != null ? 'inventario' : (detalleCategoria(d.descripcion) ?? '');
                const catLbl = d.idProducto != null ? 'Inventario' : categoriaLabel(cat);
                return (
                  <tr key={`r${i}`} style={{ borderBottom: '1px solid #F0F1F3', background: i % 2 === 0 ? '#FFFCFC' : '#FFFFFF' }}>
                    <td style={{ width: 4, background: '#F43F5E', padding: 0 }} />
                    <td className="px-3 py-3 text-sm text-gray-500 font-mono text-center">{d.cantidad ?? 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {prod?.ruta_imagenproductos ? (
                          <img src={prod.ruta_imagenproductos} alt={prod.nombre}
                            className="rounded-lg object-cover shrink-0"
                            style={{ width: 40, height: 40, border: '1px solid #E5E7EB' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : null}
                        <div>
                          <p className="text-sm font-bold text-gray-800">{cleanDescripcion(d.descripcion) || 'Repuesto'}</p>
                          {catLbl && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                              style={{ background: '#FFE4E6', color: '#BE123C' }}>
                              {catLbl}
                            </span>
                          )}
                          <p className="text-[10px] text-rose-400 mt-0.5 font-semibold">RP-{String(i + 1).padStart(2, '0')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 text-right">{fmtMoney(Number(d.precioUnitario ?? 0))}</td>
                    <td className="px-3 py-3 text-sm font-black text-gray-800 text-right">{fmtMoney(Number(d.subtotal ?? 0))}</td>
                  </tr>
                );
              })}

              {descItems.length > 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <div className="flex items-center gap-3 px-4 py-2"
                         style={{ background: 'linear-gradient(90deg,#ECFDF5,#F7FEFA)', borderLeft: '3px solid #10B981' }}>
                      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: '#047857' }}>
                        Descuento por puntos
                      </span>
                      <span className="ml-auto text-[11px] font-bold" style={{ color: '#047857' }}>{fmtMoney(totalDesc)}</span>
                    </div>
                  </td>
                </tr>
              )}
              {descItems.map((d, i) => (
                <tr key={`d${i}`} style={{ borderBottom: '1px solid #F0F1F3', background: '#F7FEFA' }}>
                  <td style={{ width: 4, background: '#10B981', padding: 0 }} />
                  <td className="px-3 py-3 text-sm text-gray-500 font-mono text-center">{d.cantidad ?? 1}</td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-bold text-gray-800">{cleanDescripcion(d.descripcion) || 'Descuento por puntos'}</p>
                    <p className="text-[10px] text-emerald-500 mt-0.5 font-semibold">CP-{String(i + 1).padStart(2, '0')}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500 text-right">{fmtMoney(Number(d.precioUnitario ?? 0))}</td>
                  <td className="px-3 py-3 text-sm font-black text-emerald-700 text-right">{fmtMoney(Number(d.subtotal ?? 0))}</td>
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
            <div className="space-y-1.5 mb-4">
              {hayDetalles && (
                <>
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg"
                       style={{ background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                    <span className="text-xs text-blue-700 font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#3B82F6', flexShrink: 0 }} />
                      Mano de obra
                    </span>
                    <span className="font-black text-blue-800 text-sm">{fmtMoney(totalMano)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg"
                       style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <span className="text-xs text-amber-700 font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B', flexShrink: 0 }} />
                      Repuestos
                    </span>
                    <span className="font-black text-amber-800 text-sm">{fmtMoney(totalRep)}</span>
                  </div>
                  {totalDesc !== 0 && (
                    <div className="flex justify-between items-center py-2 px-3 rounded-lg"
                         style={{ background: '#ECFDF5', border: '1px solid #BBF7D0' }}>
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981', flexShrink: 0 }} />
                        Descuento puntos
                      </span>
                      <span className="font-black text-emerald-800 text-sm">{fmtMoney(totalDesc)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-gray-200 my-2" />
                </>
              )}
              <div className="flex justify-between text-xs text-gray-500 px-1">
                <span>Subtotal:</span>
                <span className="font-bold text-gray-700">{fmtMoney(subtotalFactura)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 px-1">
                <span>IVA (no aplica):</span>
                <span>$0.00</span>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(220,38,38,0.15)' }}>
              <div className="p-4" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' }}>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/80 text-[9px] font-black uppercase tracking-[0.2em]">Total a pagar</p>
                    <p className="text-white font-black leading-none mt-1" style={{ fontSize: 32, letterSpacing: '-1px' }}>
                      {fmtMoney(subtotalFactura)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-[9px] font-bold uppercase">Efectivo / Transf.</p>
                    <p className="text-white/50 text-[9px] mt-0.5">Sin IVA</p>
                  </div>
                </div>
              </div>
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

        {/* ── Garantía ── */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
             style={{ background: 'linear-gradient(90deg,#F0FDF4,#ECFDF5)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                 style={{ background: '#10B981', boxShadow: '0 0 16px rgba(16,185,129,0.4)' }}>
              <CheckCircle size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">Garantía de servicio</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">30 días en mano de obra · 90 días en repuestos instalados</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Presenta este comprobante</p>
            <p className="text-[9px] text-emerald-500">para hacer válida tu garantía</p>
          </div>
        </div>

        {/* ── Pie ── */}
        <div style={{ background: '#0C0C10' }} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <CheckCircle size={12} style={{ color: '#10B981' }} />
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
              {WORKSHOP_CONTACT.horario} · {WORKSHOP_CONTACT.web}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a href={whatsappCitaLink('Hola, quiero agendar una cita en Gorila Motos')}
               target="_blank" rel="noopener noreferrer"
               style={{ color: '#25D366', fontSize: 10, fontWeight: 700, display:'flex', alignItems:'center', gap:4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp citas
            </a>
            <p style={{ color: '#E11428', fontSize: 10, fontWeight: 700 }}>
              Gorila Motos © {new Date().getFullYear()}
            </p>
          </div>
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
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold"
          style={{ color: sc.btnBackTxt, border: `1px solid ${sc.btnBackBord}` }}
        >
          <ArrowLeft size={18} /> Volver
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          .invoice-print {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          @page { margin: 0.5cm; size: A4; }
        }
        .invoice-print table td, .invoice-print table th {
          break-inside: avoid;
        }
      `}</style>
    </div>
  );
}

// Re-export icons for use in RecordsPage status labels (avoids circular import)
export { CheckCircle, Clock, Package, FileText };
