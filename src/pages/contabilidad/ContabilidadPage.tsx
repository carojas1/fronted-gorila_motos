/* ─────────────────────────────────────────────
   GORILA MOTOS — Contabilidad del Negocio
   Filtros: Día · Semana · Mes · Año · Todo
   ───────────────────────────────────────────── */

import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import XLSX from 'xlsx-js-style';
import {
  TrendingUp, DollarSign, Wallet, Plus, Trash2,
  ArrowUpRight, ArrowDownRight, BarChart2, Receipt, Calendar,
  Download, TrendingDown, Target, Activity,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { registrosApi, pagosEmpleadoApi, usuariosApi, productosApi, detallesFacturaApi, type PagoEmpleadoAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { splitTotales, detalleKind, type DetalleLike } from '../../lib/detalles';

type DetalleFila = DetalleLike;
import { fmtMoney, fmtDate, getErrorMsg, toIsoStr } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import type { RegistroDetalle, Usuario, Producto } from '../../types';
import { usePageEntrance } from '../../hooks/useGsap';
import { useTheme } from '../../lib/theme';

const MES_LABELS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MES_SHORT  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const CONCEPTOS_GASTO = ['Compra inventario', 'Sueldo', 'Bono', 'Anticipo', 'Servicio externo', 'Alquiler', 'Otro'];

type FiltroTipo = 'dia' | 'semana' | 'mes' | 'anio' | 'todo';

function getWeekRange(dateStr: string): [string, string] {
  const d   = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)];
}

function weekLabel(dateStr: string): string {
  const [mon, sun] = getWeekRange(dateStr);
  const fm = new Date(mon + 'T12:00:00');
  const fs = new Date(sun + 'T12:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${fm.toLocaleDateString('es-EC', opts)} – ${fs.toLocaleDateString('es-EC', opts)}`;
}

/* ─── Tooltip personalizado ─── */
function ChartTip({ active, payload, label, isDark }: {
  active?:boolean; payload?:{name:string;value:number;color:string}[]; label?:string; isDark?:boolean;
}) {
  if (!active || !payload?.length) return null;
  const ing = payload.find(p => p.name === 'Ingresos');
  const gas = payload.find(p => p.name === 'Gastos');
  const bal = payload.find(p => p.name === 'Balance');
  const dark = isDark !== false;
  return (
    <div className="rounded-xl px-4 py-3 text-xs font-semibold"
         style={{
           background:   dark ? '#1A1A24' : '#FFFFFF',
           border:       dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E4E7EC',
           boxShadow:    dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
           color:        dark ? 'rgba(255,255,255,0.7)' : 'rgba(21,21,27,0.7)',
         }}>
      <p className="font-black mb-2 uppercase tracking-widest text-[10px]">{label}</p>
      {ing && <p style={{ color:'#10B981' }}>↑ Ingresos: {fmtMoney(ing.value)}</p>}
      {gas && <p style={{ color:'#F43F5E' }}>↓ Gastos: {fmtMoney(gas.value)}</p>}
      {bal && (
        <p className="mt-1.5 pt-1.5 border-t"
           style={{
             borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
             color: (bal.value ?? 0) >= 0 ? '#10B981' : '#F43F5E',
           }}>
          = Balance: {fmtMoney(bal.value)}
        </p>
      )}
    </div>
  );
}

/* ─── Gráfica de negocio profesional con Recharts ───
   Usa ancho explícito medido con ResizeObserver para garantizar
   visibilidad en Android WebView (Capacitor APK) donde
   ResponsiveContainer a veces recibe ancho 0 del layout.         */
function BusinessChart({ ingresos, gastos, labels, isDark }: {
  ingresos: number[]; gastos: number[]; labels: string[]; isDark: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || el.offsetWidth || el.getBoundingClientRect().width;
      if (w > 0) setCw(Math.floor(w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    /* Fallback: si el layout del WebView no dispara ResizeObserver de inmediato */
    const t = setTimeout(measure, 120);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  const data = labels.map((name, i) => ({
    name,
    Ingresos: ingresos[i] ?? 0,
    Gastos:   gastos[i]   ?? 0,
    Balance:  (ingresos[i] ?? 0) - (gastos[i] ?? 0),
  }));
  const hasData = data.some(d => d.Ingresos > 0 || d.Gastos > 0);
  const tickColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.45)';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const zeroColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

  return (
    <div ref={wrapRef} style={{ width: '100%', height: 240, minHeight: 240 }}>
      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <BarChart2 size={28} style={{ color: tickColor, opacity: 0.4 }}/>
          <p style={{ color: tickColor, fontSize: 12 }}>Sin datos para este período</p>
        </div>
      ) : cw > 0 ? (
        <ComposedChart width={cw} height={240} data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="gm-gradIng" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10B981" stopOpacity={0.9}/>
              <stop offset="100%" stopColor="#059669" stopOpacity={0.55}/>
            </linearGradient>
            <linearGradient id="gm-gradGas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#F43F5E" stopOpacity={0.9}/>
              <stop offset="100%" stopColor="#E11428" stopOpacity={0.55}/>
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3"/>
          <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false}/>
          <YAxis
            tick={{ fill: tickColor, fontSize: 10 }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
            width={44}
          />
          <Tooltip
            content={(props) => <ChartTip {...(props as { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string })} isDark={isDark}/>}
            cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
          />
          <ReferenceLine y={0} stroke={zeroColor} strokeWidth={1}/>
          <Bar dataKey="Ingresos" fill="url(#gm-gradIng)" radius={[4,4,0,0]} maxBarSize={32}/>
          <Bar dataKey="Gastos"   fill="url(#gm-gradGas)" radius={[4,4,0,0]} maxBarSize={32}/>
          <Line
            type="monotone" dataKey="Balance" stroke="#F59E0B" strokeWidth={2}
            dot={{ fill:'#F59E0B', r:3, strokeWidth:0 }}
            activeDot={{ r:5, fill:'#F59E0B', strokeWidth:0 }}
          />
        </ComposedChart>
      ) : null}
    </div>
  );
}

/* ─── Helpers de estilo para xlsx-js-style ─── */
// Colores ARGB: sin transparencia (FF = opaco)
const XS = {
  headerGreen:  { fill:{patternType:'solid',fgColor:{rgb:'FF0F7A4E'}}, font:{bold:true,color:{rgb:'FFFFFFFF'},sz:10}, border:{bottom:{style:'medium',color:{rgb:'FF10B981'}}}, alignment:{horizontal:'center'} },
  headerRed:    { fill:{patternType:'solid',fgColor:{rgb:'FF8B0000'}}, font:{bold:true,color:{rgb:'FFFFFFFF'},sz:10}, border:{bottom:{style:'medium',color:{rgb:'FFF43F5E'}}}, alignment:{horizontal:'center'} },
  headerGray:   { fill:{patternType:'solid',fgColor:{rgb:'FF1F2937'}}, font:{bold:true,color:{rgb:'FFFFFFFF'},sz:10}, border:{bottom:{style:'medium',color:{rgb:'FF6B7280'}}}, alignment:{horizontal:'center'} },
  headerAmber:  { fill:{patternType:'solid',fgColor:{rgb:'FF92400E'}}, font:{bold:true,color:{rgb:'FFFFFFFF'},sz:10}, border:{bottom:{style:'medium',color:{rgb:'FFF59E0B'}}}, alignment:{horizontal:'center'} },
  title:        { font:{bold:true,sz:13,color:{rgb:'FF111827'}}, fill:{patternType:'solid',fgColor:{rgb:'FFEEF2FF'}} },
  totRow:       { font:{bold:true,sz:10,color:{rgb:'FF111827'}}, fill:{patternType:'solid',fgColor:{rgb:'FFFEF3C7'}}, border:{top:{style:'medium',color:{rgb:'FFF59E0B'}}} },
  totRowGreen:  { font:{bold:true,sz:10,color:{rgb:'FF065F46'}}, fill:{patternType:'solid',fgColor:{rgb:'FFD1FAE5'}}, border:{top:{style:'medium',color:{rgb:'FF10B981'}}} },
  totRowRed:    { font:{bold:true,sz:10,color:{rgb:'FF7F1D1D'}}, fill:{patternType:'solid',fgColor:{rgb:'FFFEE2E2'}}, border:{top:{style:'medium',color:{rgb:'FFF43F5E'}}} },
  rowEven:      { fill:{patternType:'solid',fgColor:{rgb:'FFF9FAFB'}}, font:{sz:9} },
  rowOdd:       { fill:{patternType:'solid',fgColor:{rgb:'FFFFFFFF'}}, font:{sz:9} },
  numCell:      { alignment:{horizontal:'right'}, numFmt:'"$"#,##0.00', font:{sz:9} },
  numCellGreen: { alignment:{horizontal:'right'}, numFmt:'"$"#,##0.00', font:{bold:true,color:{rgb:'FF065F46'},sz:9}, fill:{patternType:'solid',fgColor:{rgb:'FFF0FDF4'}} },
  numCellRed:   { alignment:{horizontal:'right'}, numFmt:'"$"#,##0.00', font:{bold:true,color:{rgb:'FF7F1D1D'},sz:9}, fill:{patternType:'solid',fgColor:{rgb:'FFFEF2F2'}} },
};
type CellStyle = typeof XS.headerGreen;

/* ─── Helper: construye una WorkSheet para un sub-período de datos ─── */
function buildReportSheet(
  ingresos: RegistroDetalle[],
  gastos:   PagoEmpleadoAPI[],
  empleados: Usuario[],
  label:     string,
  detallesMap?: Map<number, DetalleFila[]>,
  productos:  Producto[] = [],
  mode: 'all' | 'resumen' | 'ingresos' | 'gastos' | 'inventario' | 'pendientes' | 'activas' = 'all'
): Record<string, { v: unknown; t: string; s?: CellStyle }> {
  const hoy    = new Date().toISOString().slice(0, 10);
  const nombreEmp = (id: number) => {
    if (id === 0) return 'Gasto general';
    const u = empleados.find(e => e.id_usuario === id);
    return u ? u.nombre_completo.split(' ').slice(0, 3).join(' ') : `Empleado #${id}`;
  };
  const costoProducto = (idProd?: number | null) => {
    if (idProd == null) return null;
    const p = productos.find(pp => pp.id_producto === idProd);
    return p ? Number(p.costo ?? 0) : null;
  };
  const num = (v: unknown) => { const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0); return isNaN(n) ? 0 : n; };

  const totalIng = ingresos.reduce((s, r) => s + (r.costo_total ?? 0), 0);
  const gasEmpl  = gastos.filter(g => g.id_empleado > 0).reduce((s, g) => s + Number(g.monto), 0);
  const gasGen   = gastos.filter(g => g.id_empleado === 0).reduce((s, g) => s + Number(g.monto), 0);
  const totalGas = gasEmpl + gasGen;
  const balance  = totalIng - totalGas;

  let manoRev = 0, repInvRev = 0, repInvCost = 0, piezaExtraRev = 0;
  const gananciaRows: (string | number)[][] = [];
  if (detallesMap) {
    for (const r of ingresos) {
      const items = detallesMap.get(r.id_registro) ?? [];
      let rMano = 0, rInvRev = 0, rInvCost = 0, rExtra = 0;
      for (const d of items) {
        const sub = num(d.subtotal);
        const idProd = d.idProducto ?? null;
        const kind = detalleKind(d);
        if (kind === 'mano') { rMano += sub; continue; }
        if (kind === 'descuento') { continue; }
        if (idProd != null) {
          const c = costoProducto(idProd);
          rInvRev += sub;
          rInvCost += (c ?? 0) * (d.cantidad ?? 1);
        } else {
          rExtra += sub;
        }
      }
      manoRev += rMano; repInvRev += rInvRev; repInvCost += rInvCost; piezaExtraRev += rExtra;
      if (rMano || rInvRev || rExtra) {
        gananciaRows.push([
          toIsoStr(r.fecha), r.placa ?? '', r.tipo_servicio ?? 'Servicio',
          +rMano.toFixed(2),
          +rInvRev.toFixed(2), +rInvCost.toFixed(2), +(rInvRev - rInvCost).toFixed(2),
          +rExtra.toFixed(2),
          +(rMano + (rInvRev - rInvCost) + rExtra).toFixed(2),
        ]);
      }
    }
  }
  const repInvProfit  = repInvRev - repInvCost;
  const gananciaBruta = manoRev + repInvProfit + piezaExtraRev;
  const gananciaNeta  = gananciaBruta - totalGas;
  const margenPct     = totalIng > 0 ? ((gananciaBruta / totalIng) * 100).toFixed(1) : '0';

  const COLS = 9;
  const sub  = { font: { sz: 10, italic: true, color: { rgb: 'FF6B7280' } } };
  type RowMeta = {
    cells: (string | number)[];
    kind: 'title' | 'subtitle' | 'banner' | 'header' | 'data' | 'total' | 'blank';
    headerStyles?: CellStyle[];
    bannerStyle?: CellStyle;
    numCols?: number[];
    totStyle?: CellStyle;
  };
  const R: RowMeta[] = [];
  const blank = () => R.push({ cells: [], kind: 'blank' });

  R.push({ cells: ['GORILA MOTOS — Reporte Contable'], kind: 'title' });
  R.push({ cells: [`Período: ${label}`], kind: 'subtitle' });
  R.push({ cells: [`Generado: ${hoy}`], kind: 'subtitle' });
  blank();

  if (mode === 'all' || mode === 'resumen') {
    R.push({ cells: ['RESUMEN GENERAL'], kind: 'banner' });
    R.push({ cells: ['Concepto', 'Monto (USD)'], kind: 'header', headerStyles: [XS.headerGray, XS.headerGray] });
    R.push({ cells: ['Ingresos totales (facturado)', +totalIng.toFixed(2)], kind: 'data', numCols: [1] });
    R.push({ cells: ['Ganancia bruta', +gananciaBruta.toFixed(2)], kind: 'total', totStyle: XS.totRowGreen, numCols: [1] });
    R.push({ cells: ['Total gastos', +totalGas.toFixed(2)], kind: 'total', totStyle: XS.totRowRed, numCols: [1] });
    R.push({ cells: ['GANANCIA NETA', +gananciaNeta.toFixed(2)], kind: 'total', totStyle: gananciaNeta >= 0 ? XS.totRowGreen : XS.totRowRed, numCols: [1] });
    R.push({ cells: ['Margen sobre ingresos', `${margenPct}%`], kind: 'data' });
    blank();

    R.push({ cells: ['GANANCIA POR FUENTE'], kind: 'banner' });
    R.push({ cells: ['Fuente', 'Venta ($)', 'Costo ($)', 'Ganancia ($)'], kind: 'header', headerStyles: [XS.headerGray, XS.headerGreen, XS.headerRed, XS.headerGreen] });
    R.push({ cells: ['Mano de obra', +manoRev.toFixed(2), 0, +manoRev.toFixed(2)], kind: 'data', numCols: [1, 2, 3] });
    R.push({ cells: ['Repuestos inventario', +repInvRev.toFixed(2), +repInvCost.toFixed(2), +repInvProfit.toFixed(2)], kind: 'data', numCols: [1, 2, 3] });
    R.push({ cells: ['Piezas extras (manual)', +piezaExtraRev.toFixed(2), 0, +piezaExtraRev.toFixed(2)], kind: 'data', numCols: [1, 2, 3] });
    R.push({ cells: ['GANANCIA BRUTA', +(manoRev + repInvRev + piezaExtraRev).toFixed(2), +repInvCost.toFixed(2), +gananciaBruta.toFixed(2)], kind: 'total', totStyle: XS.totRowGreen, numCols: [1, 2, 3] });
    blank();
  }

  if ((mode === 'all' || mode === 'inventario') && gananciaRows.length > 0) {
    R.push({ cells: ['DETALLE POR SERVICIO'], kind: 'banner' });
    R.push({
      cells: ['Fecha', 'Placa', 'Servicio', 'Mano obra ($)', 'Rep. venta ($)', 'Rep. costo ($)', 'Rep. ganancia ($)', 'Piezas extras ($)', 'Ganancia total ($)'],
      kind: 'header',
      headerStyles: [XS.headerGray, XS.headerGray, XS.headerGray, XS.headerAmber, XS.headerGreen, XS.headerRed, XS.headerGreen, XS.headerGreen, XS.headerGreen],
    });
    gananciaRows.forEach(row => R.push({ cells: row, kind: 'data', numCols: [3, 4, 5, 6, 7, 8] }));
    R.push({
      cells: ['', '', 'TOTALES', +manoRev.toFixed(2), +repInvRev.toFixed(2), +repInvCost.toFixed(2), +repInvProfit.toFixed(2), +piezaExtraRev.toFixed(2), +gananciaBruta.toFixed(2)],
      kind: 'total', totStyle: XS.totRow, numCols: [3, 4, 5, 6, 7, 8],
    });
    blank();
  }

  if (mode === 'all' || mode === 'ingresos' || mode === 'pendientes' || mode === 'activas') {
    let bannerTitle = 'INGRESOS (COBRADOS)';
    let bStyle = XS.headerGreen;
    if (mode === 'pendientes') { bannerTitle = 'MOTOS PENDIENTES DE PAGO / ENTREGA'; bStyle = XS.headerAmber; }
    if (mode === 'activas') { bannerTitle = 'MOTOS ACTIVAS EN TALLER'; bStyle = XS.headerRed; }

    R.push({ cells: [bannerTitle], kind: 'banner', bannerStyle: bStyle });
    R.push({ cells: ['Fecha', 'Placa', 'Tipo de servicio', 'Estado', 'Monto (USD)'], kind: 'header', headerStyles: [XS.headerGray, XS.headerGray, XS.headerGray, XS.headerGray, XS.headerGreen] });
    
    let subTotal = 0;
    ingresos.forEach(r => {
      const estStr = ['Pendiente','En proceso','Completado','Entregado','Cobrado'][r.estado] ?? 'Desconocido';
      const monto = +(r.costo_total ?? 0).toFixed(2);
      subTotal += monto;
      R.push({
        cells: [toIsoStr(r.fecha), r.placa ?? '', r.tipo_servicio ?? 'Servicio general', estStr, monto],
        kind: 'data', numCols: [4],
      });
    });
    R.push({ cells: ['', '', '', 'TOTAL', +subTotal.toFixed(2)], kind: 'total', totStyle: XS.totRowGreen, numCols: [4] });
    blank();
  }

  if (mode === 'all' || mode === 'gastos') {
    R.push({ cells: ['GASTOS'], kind: 'banner', bannerStyle: XS.headerRed });
    R.push({ cells: ['Fecha', 'Concepto', 'Empleado / Proveedor', 'Categoría', 'Monto (USD)'], kind: 'header', headerStyles: [XS.headerGray, XS.headerRed, XS.headerGray, XS.headerGray, XS.headerRed] });
    gastos.forEach(g => R.push({
      cells: [toIsoStr(g.fecha), g.concepto, nombreEmp(g.id_empleado), g.id_empleado > 0 ? 'Pago empleado' : 'Gasto general', +Number(g.monto).toFixed(2)],
      kind: 'data', numCols: [4],
    }));
    R.push({ cells: ['', '', '', 'TOTAL GASTOS', +totalGas.toFixed(2)], kind: 'total', totStyle: XS.totRowRed, numCols: [4] });
    R.push({ cells: ['', '', '', 'Empleados', +gasEmpl.toFixed(2)], kind: 'data', numCols: [4] });
    R.push({ cells: ['', '', '', 'Generales', +gasGen.toFixed(2)], kind: 'data', numCols: [4] });
    blank();
  }

  if (mode === 'all' || mode === 'resumen') {
    R.push({ cells: ['RESULTADO FINAL'], kind: 'banner' });
    R.push({ cells: ['Balance neto (ingresos − gastos)', +balance.toFixed(2)], kind: 'total', totStyle: balance >= 0 ? XS.totRowGreen : XS.totRowRed, numCols: [1] });
    R.push({ cells: ['GANANCIA NETA (bruta − gastos)', +gananciaNeta.toFixed(2)], kind: 'total', totStyle: gananciaNeta >= 0 ? XS.totRowGreen : XS.totRowRed, numCols: [1] });
  }

  const aoa = R.map(m => { const p = [...m.cells]; while (p.length < COLS) p.push(''); return p; });
  const ws = XLSX.utils.aoa_to_sheet(aoa) as Record<string, { v: unknown; t: string; s?: CellStyle }>;
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  R.forEach((m, r) => {
    if (m.kind === 'title' || m.kind === 'subtitle' || m.kind === 'banner') {
      merges.push({ s: { r, c: 0 }, e: { r, c: COLS - 1 } });
    }
    for (let c = 0; c < COLS; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) continue;
      const isNum = m.numCols?.includes(c);
      if (m.kind === 'title')          ws[addr].s = XS.title;
      else if (m.kind === 'subtitle')  ws[addr].s = sub as CellStyle;
      else if (m.kind === 'banner')    ws[addr].s = m.bannerStyle ?? XS.headerGray;
      else if (m.kind === 'header')    ws[addr].s = m.headerStyles?.[c] ?? XS.headerGray;
      else if (m.kind === 'total')     ws[addr].s = isNum ? { ...(m.totStyle ?? XS.totRow), alignment: { horizontal: 'right' }, numFmt: '"$"#,##0.00' } as CellStyle : (m.totStyle ?? XS.totRow);
      else if (m.kind === 'data') {
        const base = r % 2 === 0 ? XS.rowEven : XS.rowOdd;
        ws[addr].s = isNum ? { ...XS.numCell, fill: base.fill } as CellStyle : base;
      }
    }
  });
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 13 }, { wch: 13 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 15 }, { wch: 15 }];
  return ws;
}

/* ─── Exportar datos filtrados a Excel (.xlsx) ─── */
/* Cuando filtroTipo === 'anio' → hoja "Resumen" + una hoja por mes con datos.
   Cuando filtroTipo === 'semana' → hoja "Resumen" + una hoja por día con datos.
   Demás filtros → solo hoja "Resumen". */
function exportarExcel(
  ingresos: RegistroDetalle[], gastos: PagoEmpleadoAPI[],
  empleados: Usuario[], label: string,
  detallesMap?: Map<number, DetalleFila[]>,
  productos: Producto[] = [],
  filtroTipo: FiltroTipo = 'mes',
  filtroAnio: number = new Date().getFullYear(),
  filtroFecha: string = ''
) {
  const hoy = new Date().toISOString().slice(0, 10);
  const wb  = XLSX.utils.book_new();

  const cobrados = ingresos.filter(r => r.estado === 4);
  const pendientes = ingresos.filter(r => r.estado !== 4);
  const activas = ingresos.filter(r => r.estado < 3);

  XLSX.utils.book_append_sheet(wb, buildReportSheet(cobrados, gastos, empleados, label, detallesMap, productos, 'resumen'), 'Resumen');
  XLSX.utils.book_append_sheet(wb, buildReportSheet(cobrados, gastos, empleados, label, detallesMap, productos, 'ingresos'), 'Ingresos');
  XLSX.utils.book_append_sheet(wb, buildReportSheet(cobrados, gastos, empleados, label, detallesMap, productos, 'gastos'), 'Gastos');
  XLSX.utils.book_append_sheet(wb, buildReportSheet(cobrados, gastos, empleados, label, detallesMap, productos, 'inventario'), 'Inventario');

  if (pendientes.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildReportSheet(pendientes, [], empleados, label, detallesMap, productos, 'pendientes'), 'Pendientes');
  }
  if (activas.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildReportSheet(activas, [], empleados, label, detallesMap, productos, 'activas'), 'Motos Activas');
  }

  if (filtroTipo === 'anio') {
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      const mIng = cobrados.filter(r => toIsoStr(r.fecha).slice(5, 7) === mStr);
      const mGas = gastos.filter(g  => toIsoStr(g.fecha).slice(5, 7) === mStr);
      if (!mIng.length && !mGas.length) continue;
      XLSX.utils.book_append_sheet(wb,
        buildReportSheet(mIng, mGas, empleados, `${MES_LABELS[m - 1]} ${filtroAnio}`, detallesMap, productos),
        MES_SHORT[m - 1]
      );
    }
  } else if (filtroTipo === 'semana') {
    const [wMon] = getWeekRange(filtroFecha || hoy);
    const DIA_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const DIA_FULL  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(wMon + 'T12:00:00');
      dayDate.setDate(dayDate.getDate() + d);
      const dayStr = dayDate.toISOString().slice(0, 10);
      const dIng   = cobrados.filter(r => toIsoStr(r.fecha) === dayStr);
      const dGas   = gastos.filter(g  => toIsoStr(g.fecha) === dayStr);
      if (!dIng.length && !dGas.length) continue;
      XLSX.utils.book_append_sheet(wb,
        buildReportSheet(dIng, dGas, empleados, `${DIA_FULL[d]} ${dayStr}`, detallesMap, productos),
        `${DIA_SHORT[d]} ${dayStr.slice(8)}`
      );
    }
  }

  const filename = `gorila_motos_${label.replace(/[\s/\\:*?"<>|]/g, '-')}_${hoy}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/* ─── Label del filtro activo ─── */
function filtroLabel(tipo: FiltroTipo, fecha: string, mes: number, anio: number): string {
  switch (tipo) {
    case 'dia':    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-EC', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    case 'semana': return `Semana del ${weekLabel(fecha)}`;
    case 'mes':    return `${MES_LABELS[mes-1]} ${anio}`;
    case 'anio':   return `Año ${anio}`;
    case 'todo':   return 'Todos los registros';
  }
}

export default function ContabilidadPage() {
  const toast   = useToast();
  const pageRef = usePageEntrance();
  const [theme] = useTheme();
  const isDark = theme !== 'light';
  const { user, isAdmin } = useAuth();

  const [registros,   setRegistros]   = useState<RegistroDetalle[]>([]);
  const [gastos,      setGastos]      = useState<PagoEmpleadoAPI[]>([]);
  const [empleados,   setEmpleados]   = useState<Usuario[]>([]);
  const [productos,   setProductos]   = useState<Producto[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [exportLoading,  setExportLoading]  = useState(false);
  const [desglose, setDesglose] = useState<{ mano: number; rep: number } | null>(null);
  const [desgloseLoading, setDesgloseLoading] = useState(false);

  interface CierreResult {
    manoRevenue: number;
    repRevenue:  number;
    repCosto:    number;
    repProfit:   number;
    repMargen:   number;
    totalRevenue: number;
    totalCosto:   number;
    gananciaReal: number;
    margenReal:   number;
    label: string;
  }
  const [cierre, setCierre] = useState<CierreResult | null>(null);
  const [cierreLoading, setCierreLoading] = useState(false);
  /* Una vez el usuario calcula el cierre, se recalcula solo al cambiar el filtro (día/semana/mes/año). */
  const cierreActivoRef = useRef(false);
  const [modalGasto,    setModalGasto]    = useState(false);
  const [savingGasto,   setSavingGasto]   = useState(false);

  const hoy  = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual  = hoy.getMonth() + 1;
  const hoyStr     = hoy.toISOString().slice(0, 10);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('mes');
  const [filtroFecha, setFiltroFecha] = useState(hoyStr);
  const [filtroMes,   setFiltroMes]   = useState(mesActual);
  const [filtroAnio,  setFiltroAnio]  = useState(anioActual);

  const [form, setForm] = useState({
    concepto:    'Compra inventario',
    fecha:       hoyStr,
    monto:       '',
    notas:       '',
    empleadoId:  0,
    empSearch:   '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, gRes, uRes, pRes] = await Promise.all([
        registrosApi.list(),
        pagosEmpleadoApi.listAll(),
        usuariosApi.list(),
        productosApi.list(),
      ]);
      const allRegistros: RegistroDetalle[] = Array.isArray(rRes.data) ? rRes.data : [];
      /* Mecánico ve solo sus propias órdenes */
      const myId = user?.id_usuario;
      setRegistros(isAdmin || !myId ? allRegistros : allRegistros.filter(r => r.id_encargado === myId));
      setGastos(Array.isArray(gRes.data) ? gRes.data : []);
      setEmpleados(Array.isArray(uRes.data) ? uRes.data : []);
      setProductos(Array.isArray(pRes.data) ? pRes.data : []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user?.id_usuario]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── filtrado por periodo ── */
  const filtrar = useCallback(<T extends { fecha: unknown }>(arr: T[]): T[] => {
    switch (filtroTipo) {
      case 'todo': return arr;
      case 'dia':  return arr.filter(x => toIsoStr(x.fecha) === filtroFecha);
      case 'semana': {
        const [mon, sun] = getWeekRange(filtroFecha);
        return arr.filter(x => { const f = toIsoStr(x.fecha); return f >= mon && f <= sun; });
      }
      case 'mes':  return arr.filter(x => {
        const [y, m] = toIsoStr(x.fecha).split('-').map(Number);
        return y === filtroAnio && m === filtroMes;
      });
      case 'anio': return arr.filter(x => toIsoStr(x.fecha).startsWith(String(filtroAnio)));
    }
  }, [filtroTipo, filtroFecha, filtroMes, filtroAnio]);

  /* ── KPIs ── */
  const ingresosPeriodo = useMemo(() => {
    const cobrados = registros.filter(r => r.estado === 4);
    return filtrar(cobrados.map(r => ({ ...r }))).reduce((s, r) => s + (r.costo_total ?? 0), 0);
  }, [registros, filtrar]);

  const gastosEmpleados = useMemo(
    () => filtrar(gastos.filter(g => g.id_empleado > 0)).reduce((s, g) => s + Number(g.monto), 0),
    [gastos, filtrar]
  );
  const gastosGenerales = useMemo(
    () => filtrar(gastos.filter(g => g.id_empleado === 0)).reduce((s, g) => s + Number(g.monto), 0),
    [gastos, filtrar]
  );
  const totalGastos = gastosEmpleados + gastosGenerales;
  const balance     = ingresosPeriodo - totalGastos;

  /* ── Chart adaptable al filtro activo ── */
  const { chartIngresos, chartGastos, chartLabels } = useMemo(() => {
    const cobrados = registros.filter(r => r.estado === 4);

    if (filtroTipo === 'dia') {
      // Últimos 7 días desde la fecha seleccionada
      const base = new Date(filtroFecha + 'T12:00:00');
      const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base); d.setDate(base.getDate() - 6 + i);
        return d.toISOString().slice(0, 10);
      });
      const ing = dias.map(d => cobrados.filter(r => toIsoStr(r.fecha) === d).reduce((s,r) => s+(r.costo_total??0), 0));
      const gas = dias.map(d => gastos.filter(g => toIsoStr(g.fecha) === d).reduce((s,g) => s+Number(g.monto), 0));
      return { chartIngresos: ing, chartGastos: gas, chartLabels: dias.map(d => { const dd = new Date(d+'T12:00:00'); return `${dd.getDate()}/${dd.getMonth()+1}`; }) };
    }

    if (filtroTipo === 'semana') {
      // Últimas 4 semanas desde la semana activa
      const [wMon] = getWeekRange(filtroFecha);
      const semanas = Array.from({ length: 4 }, (_, i) => {
        const d = new Date(wMon + 'T12:00:00'); d.setDate(d.getDate() - (3 - i) * 7);
        const mon = d.toISOString().slice(0,10);
        const sun = new Date(d); sun.setDate(d.getDate() + 6);
        return { mon, sun: sun.toISOString().slice(0,10) };
      });
      const ing = semanas.map(({ mon, sun }) => cobrados.filter(r => { const f=toIsoStr(r.fecha); return f>=mon && f<=sun; }).reduce((s,r) => s+(r.costo_total??0), 0));
      const gas = semanas.map(({ mon, sun }) => gastos.filter(g => { const f=toIsoStr(g.fecha); return f>=mon && f<=sun; }).reduce((s,g) => s+Number(g.monto), 0));
      const labels = semanas.map(({ mon }) => { const d=new Date(mon+'T12:00:00'); return `S${d.getDate()}/${d.getMonth()+1}`; });
      return { chartIngresos: ing, chartGastos: gas, chartLabels: labels };
    }

    if (filtroTipo === 'mes') {
      // Últimos 6 meses desde el mes seleccionado
      const meses = Array.from({ length: 6 }, (_, i) => {
        let m = filtroMes - 5 + i; let y = filtroAnio;
        if (m <= 0) { m += 12; y -= 1; }
        return { m, y };
      });
      const ing = meses.map(({ m, y }) => cobrados.filter(r => { const f=toIsoStr(r.fecha); return f.startsWith(`${y}-${String(m).padStart(2,'0')}`); }).reduce((s,r) => s+(r.costo_total??0), 0));
      const gas = meses.map(({ m, y }) => gastos.filter(g => { const f=toIsoStr(g.fecha); return f.startsWith(`${y}-${String(m).padStart(2,'0')}`); }).reduce((s,g) => s+Number(g.monto), 0));
      return { chartIngresos: ing, chartGastos: gas, chartLabels: meses.map(({ m }) => MES_SHORT[m-1]) };
    }

    if (filtroTipo === 'anio') {
      const año = filtroAnio;
      const cobradosAnio = cobrados.filter(r => toIsoStr(r.fecha).startsWith(String(año)));
      const ing = Array.from({ length: 12 }, (_, m) => cobradosAnio.filter(r => Number(toIsoStr(r.fecha).slice(5,7)) === m+1).reduce((s,r) => s+(r.costo_total??0), 0));
      const gas = Array.from({ length: 12 }, (_, m) => gastos.filter(g => toIsoStr(g.fecha).startsWith(String(año)) && Number(toIsoStr(g.fecha).slice(5,7)) === m+1).reduce((s,g) => s+Number(g.monto), 0));
      return { chartIngresos: ing, chartGastos: gas, chartLabels: MES_SHORT };
    }

    // todo: últimos 3 años, por año
    const años = [anioActual - 2, anioActual - 1, anioActual];
    const ing = años.map(y => cobrados.filter(r => toIsoStr(r.fecha).startsWith(String(y))).reduce((s,r) => s+(r.costo_total??0), 0));
    const gas = años.map(y => gastos.filter(g => toIsoStr(g.fecha).startsWith(String(y))).reduce((s,g) => s+Number(g.monto), 0));
    return { chartIngresos: ing, chartGastos: gas, chartLabels: años.map(String) };
  }, [registros, gastos, anioActual, filtroTipo, filtroFecha, filtroMes, filtroAnio]);

  const nombreEmpleado = (idEmp: number) => {
    if (idEmp === 0) return 'Gasto general';
    const u = empleados.find(e => e.id_usuario === idEmp);
    return u ? u.nombre_completo.split(' ').slice(0,2).join(' ') : `Empleado #${idEmp}`;
  };

  const CONCEPTOS_EMPLEADO = ['Sueldo', 'Bono', 'Anticipo'];

  const handleGuardarGasto = async () => {
    const monto = parseFloat(form.monto);
    if (isNaN(monto) || monto <= 0) { toast.error('Ingresa un monto válido'); return; }
    const necesitaEmpleado = CONCEPTOS_EMPLEADO.includes(form.concepto);
    if (necesitaEmpleado && form.empleadoId === 0) { toast.error('Selecciona un empleado'); return; }
    const idEmp = necesitaEmpleado ? form.empleadoId : 0;
    setSavingGasto(true);
    try {
      await pagosEmpleadoApi.create({ id_empleado: idEmp, fecha: form.fecha, concepto: form.concepto, monto, notas: form.notas || undefined });
      toast.success('Gasto registrado');
      setModalGasto(false);
      setForm({ concepto: 'Compra inventario', fecha: hoyStr, monto: '', notas: '', empleadoId: 0, empSearch: '' });
      fetchData();
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setSavingGasto(false); }
  };

  const handleEliminarGasto = async (id: number) => {
    try {
      await pagosEmpleadoApi.remove(id);
      setGastos(prev => prev.filter(g => g.id_pago !== id));
      toast.success('Gasto eliminado');
    } catch (err) { toast.error(getErrorMsg(err)); }
  };

  const movimientos = useMemo(() => {
    const ing = filtrar(registros.filter(r => r.estado === 4))
      .map(r => ({ tipo:'ingreso' as const, fecha:toIsoStr(r.fecha), desc:`Servicio · ${r.placa}`, monto:r.costo_total??0, id:r.id_registro }));
    const gas = filtrar(gastos)
      .map(g => ({ tipo:'gasto' as const, fecha:toIsoStr(g.fecha), desc:`${g.concepto} — ${nombreEmpleado(g.id_empleado)}`, monto:Number(g.monto), id:g.id_pago, id_pago:g.id_pago }));
    return [...ing, ...gas].sort((a,b) => b.fecha.localeCompare(a.fecha)).slice(0, 30);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registros, gastos, empleados, filtrar]);

  /* ── KPIs de negocio ampliados ── */
  const serviciosPeriodo = useMemo(
    () => filtrar(registros.filter(r => r.estado === 4)).length,
    [registros, filtrar]
  );
  const ticketPromedio   = serviciosPeriodo > 0 ? ingresosPeriodo / serviciosPeriodo : 0;
  const margenNeto       = ingresosPeriodo > 0 ? ((balance / ingresosPeriodo) * 100) : 0;

  /* Crecimiento vs período anterior (solo para filtro mes) */
  const crecimientoMes = useMemo(() => {
    if (filtroTipo !== 'mes') return null;
    let prevM = filtroMes - 1, prevY = filtroAnio;
    if (prevM === 0) { prevM = 12; prevY -= 1; }
    const cobradosPrev = registros.filter(r => r.estado === 4 && (() => {
      const f = toIsoStr(r.fecha);
      return f.startsWith(`${prevY}-${String(prevM).padStart(2,'0')}`);
    })()).reduce((s, r) => s + (r.costo_total ?? 0), 0);
    if (cobradosPrev === 0) return null;
    return ((ingresosPeriodo - cobradosPrev) / cobradosPrev) * 100;
  }, [filtroTipo, filtroMes, filtroAnio, registros, ingresosPeriodo]);

  const KPIs = [
    {
      label:'Ingresos', value:fmtMoney(ingresosPeriodo),
      sub: crecimientoMes != null
        ? `${crecimientoMes >= 0 ? '▲' : '▼'} ${Math.abs(crecimientoMes).toFixed(1)}% vs mes anterior`
        : 'Servicios facturados',
      icon: crecimientoMes != null && crecimientoMes < 0 ? TrendingDown : TrendingUp,
      color:'#10B981', bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.2)',
    },
    { label:'Gastos totales',  value:fmtMoney(totalGastos),    sub:`Empleados $${fmtMoney(gastosEmpleados)} + gral. $${fmtMoney(gastosGenerales)}`, icon:DollarSign, color:'#F43F5E', bg:'rgba(244,63,94,0.08)',  border:'rgba(244,63,94,0.2)'   },
    { label:'Balance neto',    value:fmtMoney(balance),         sub:`Margen: ${margenNeto.toFixed(1)}%`,
      icon: balance >= 0 ? ArrowUpRight : ArrowDownRight,
      color: balance >= 0 ? '#10B981' : '#E11428',
      bg: balance >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(225,20,40,0.08)',
      border: balance >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(225,20,40,0.2)',
    },
    { label:'Ticket promedio', value:fmtMoney(ticketPromedio),  sub:`${serviciosPeriodo} servicios facturados`, icon:Target, color:'#8B5CF6', bg:'rgba(139,92,246,0.08)', border:'rgba(139,92,246,0.2)' },
  ];

  /* ── Calcular cierre de caja del período ── */
  const calcularCierre = useCallback(async () => {
    cierreActivoRef.current = true;
    setCierreLoading(true);
    try {
      const ordered = filtrar(registros.filter(r => r.estado === 4));
      const results = await Promise.allSettled(
        ordered.map(r => registrosApi.detalles(r.id_factura)
          .then(res => res.data as DetalleFila[])
        )
      );
      const prodMap = new Map<number, Producto>(
        productos.map(p => [p.id_producto, p])
      );

      let manoRevenue = 0, repRevenue = 0, repCosto = 0;

      for (const res of results) {
        if (res.status !== 'fulfilled') continue;
        for (const d of res.value) {
          const sub = Number(d.subtotal ?? 0);
          const cant = Number(d.cantidad ?? 1);
          const idProd = d.idProducto ?? (d as { id_producto?: number }).id_producto ?? null;
          const kind = (idProd != null || (d.descripcion ?? '').toUpperCase().startsWith('[REP'))
            ? 'repuesto' : 'mano';
          if (kind === 'mano') {
            manoRevenue += sub;
          } else {
            repRevenue += sub;
            if (idProd != null) {
              const prod = prodMap.get(Number(idProd));
              if (prod) repCosto += (prod.costo ?? 0) * cant;
            }
          }
        }
      }

      const repProfit   = repRevenue - repCosto;
      const repMargen   = repRevenue > 0 ? (repProfit / repRevenue) * 100 : 0;
      const totalRevenue = manoRevenue + repRevenue;
      const totalCosto  = repCosto;
      const gananciaReal = totalRevenue - totalCosto;
      const margenReal  = totalRevenue > 0 ? (gananciaReal / totalRevenue) * 100 : 0;

      setCierre({
        manoRevenue, repRevenue, repCosto, repProfit, repMargen,
        totalRevenue, totalCosto, gananciaReal, margenReal,
        label: filtroLabel(filtroTipo, filtroFecha, filtroMes, filtroAnio),
      });
    } catch { /* ignorar */ } finally { setCierreLoading(false); }
  }, [filtrar, registros, productos, filtroTipo, filtroFecha, filtroMes, filtroAnio]);

  /* Recalcular el cierre automáticamente al cambiar el filtro (si ya estaba activo). */
  useEffect(() => {
    if (cierreActivoRef.current) calcularCierre();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTipo, filtroFecha, filtroMes, filtroAnio]);

  const FILTROS: { key: FiltroTipo; label: string }[] = [
    { key:'dia',    label:'Día'    },
    { key:'semana', label:'Semana' },
    { key:'mes',    label:'Mes'    },
    { key:'anio',   label:'Año'    },
    { key:'todo',   label:'Todo'   },
  ];

  const yearsOpts = [anioActual-2, anioActual-1, anioActual, anioActual+1].filter(y => y <= anioActual+1);

  return (
    <div ref={pageRef} className="space-y-7 pb-10">

      {/* ─── Encabezado + Filtros ─── */}
      <div className="header-enter flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-gm-red font-black uppercase mb-1">Taller · Finanzas</p>
            <h1 className="text-3xl font-black text-white">Contabilidad</h1>
            <p className="text-white/30 text-sm mt-1">Ingresos, gastos y balance del negocio</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={exportLoading}
              onClick={async () => {
                const ordered = filtrar(registros.filter(r => r.estado === 4));
                setExportLoading(true);
                let detallesMap: Map<number, DetalleFila[]> | undefined;
                try {
                  const results = await Promise.allSettled(
                    ordered.map(r => r.id_factura
                      ? detallesFacturaApi.byFactura(r.id_factura).then(res => ({ id: r.id_registro, d: res.data as DetalleFila[] }))
                      : Promise.resolve({ id: r.id_registro, d: [] as DetalleFila[] })
                    )
                  );
                  detallesMap = new Map(
                    results.flatMap(res => res.status === 'fulfilled' ? [[res.value.id, res.value.d]] : [])
                  );
                } catch { /* skip breakdown on error */ }
                exportarExcel(filtrar(registros), filtrar(gastos), empleados,
                  filtroLabel(filtroTipo, filtroFecha, filtroMes, filtroAnio), detallesMap, productos,
                  filtroTipo, filtroAnio, filtroFecha);
                setExportLoading(false);
              }}
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl transition-all"
              style={{ background: exportLoading ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.1)',
                       color: exportLoading ? 'rgba(16,185,129,0.4)' : '#10B981',
                       border:'1px solid rgba(16,185,129,0.2)', cursor: exportLoading ? 'wait' : 'pointer' }}
              title="Exportar a Excel con desglose mano de obra vs repuestos"
            >
              <Download size={13}/> {exportLoading ? 'Cargando...' : 'Exportar Excel'}
            </button>
            <Button icon={<Plus size={14}/>} onClick={() => setModalGasto(true)}>
              Registrar gasto
            </Button>
          </div>
        </div>

        {/* Filtros de fecha */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tabs de tipo */}
          <div className="flex rounded-xl overflow-hidden shrink-0"
               style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E4E7EC'}` }}>
            {FILTROS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltroTipo(key)}
                className="px-3 py-2 text-[11px] font-bold tracking-wide transition-all"
                style={{
                  background: filtroTipo === key
                    ? isDark ? 'rgba(225,20,40,0.18)' : 'rgba(225,20,40,0.12)'
                    : 'transparent',
                  color: filtroTipo === key
                    ? isDark ? '#fff' : '#C8001A'
                    : isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.45)',
                  borderRight: key !== 'todo'
                    ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
                    : undefined,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Selector de fecha específica (día / semana) */}
          {(filtroTipo === 'dia' || filtroTipo === 'semana') && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-white/30 shrink-0" />
              <input
                type="date"
                value={filtroFecha}
                onChange={e => setFiltroFecha(e.target.value)}
                className="gm-select-d text-sm"
                style={{ height:36, paddingLeft:10, paddingRight:10 }}
              />
              {filtroTipo === 'semana' && (
                <span className="text-[11px] text-white/40 font-semibold">{weekLabel(filtroFecha)}</span>
              )}
            </div>
          )}

          {/* Selector mes + año */}
          {filtroTipo === 'mes' && (
            <div className="flex items-center gap-2">
              <select
                value={filtroMes}
                onChange={e => setFiltroMes(Number(e.target.value))}
                className="gm-select-d text-sm"
                style={{ height:36, minWidth:110 }}
              >
                {MES_LABELS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <select
                value={filtroAnio}
                onChange={e => setFiltroAnio(Number(e.target.value))}
                className="gm-select-d text-sm"
                style={{ height:36, width:80 }}
              >
                {yearsOpts.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {/* Selector año */}
          {filtroTipo === 'anio' && (
            <select
              value={filtroAnio}
              onChange={e => setFiltroAnio(Number(e.target.value))}
              className="gm-select-d text-sm"
              style={{ height:36, width:90 }}
            >
              {yearsOpts.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}

          {/* Label del filtro activo */}
          <span
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              color:      isDark ? 'rgba(255,255,255,0.40)' : 'rgba(21,21,27,0.52)',
              border:     `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
            }}
          >
            {filtroLabel(filtroTipo, filtroFecha, filtroMes, filtroAnio)}
          </span>
        </div>
      </div>

      {/* ─── KPI cards ─── */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="gm-card-d rounded-2xl p-6 h-28 skeleton-d"/>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {KPIs.map(({ label, value, sub, icon: Icon, color, bg, border }) => (
            <div key={label} className="rounded-2xl p-5 flex flex-col gap-3"
                 style={{ background:bg, border:`1px solid ${border}` }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] tracking-[0.2em] uppercase font-black text-white/35">{label}</p>
                <Icon size={16} style={{ color }}/>
              </div>
              <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
              <p className="text-[11px] text-white/30">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Desglose Mano de Obra vs Repuestos ─── */}
      <div className="section-enter rounded-2xl p-5 flex flex-wrap gap-4 items-center"
           style={{ background: isDark ? 'rgba(255,255,255,0.025)' : '#F8F9FC',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E4E7EC'}` }}>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.2em] uppercase font-black mb-1"
             style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)' }}>
            Desglose del período
          </p>
          {desglose ? (
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-[10px] text-blue-400/70 uppercase font-bold mb-0.5">Mano de obra</p>
                <p className="text-xl font-black text-blue-400">{fmtMoney(desglose.mano)}</p>
                {(desglose.mano + desglose.rep) > 0 &&
                  <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.35)' }}>
                    {((desglose.mano / (desglose.mano + desglose.rep)) * 100).toFixed(1)}% del total
                  </p>}
              </div>
              <div>
                <p className="text-[10px] text-amber-400/70 uppercase font-bold mb-0.5">Repuestos</p>
                <p className="text-xl font-black text-amber-400">{fmtMoney(desglose.rep)}</p>
                {(desglose.mano + desglose.rep) > 0 &&
                  <p className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.35)' }}>
                    {((desglose.rep / (desglose.mano + desglose.rep)) * 100).toFixed(1)}% del total
                  </p>}
              </div>
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(21,21,27,0.35)' }}>
              Calcula cuánto viene de mano de obra y cuánto de repuestos.
            </p>
          )}
        </div>
        <button
          disabled={desgloseLoading}
          onClick={async () => {
            const ordered = filtrar(registros.filter(r => r.estado === 4));
            setDesgloseLoading(true);
            try {
              const results = await Promise.allSettled(
                ordered.map(r => r.id_factura
                  ? detallesFacturaApi.byFactura(r.id_factura).then(res => res.data as DetalleFila[])
                  : Promise.resolve([] as DetalleFila[])
                )
              );
              let mano = 0, rep = 0;
              for (const r of results) {
                if (r.status === 'fulfilled') {
                  const { mano: m, repuestos: rv } = splitTotales(r.value);
                  mano += m; rep += rv;
                }
              }
              setDesglose({ mano, rep });
            } catch { /* ignore */ } finally {
              setDesgloseLoading(false);
            }
          }}
          className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2.5 rounded-xl transition-all shrink-0"
          style={{
            background: desgloseLoading ? 'rgba(59,130,246,0.04)' : 'rgba(59,130,246,0.1)',
            color: desgloseLoading ? 'rgba(59,130,246,0.4)' : '#3B82F6',
            border: '1px solid rgba(59,130,246,0.2)',
            cursor: desgloseLoading ? 'wait' : 'pointer',
          }}>
          <Activity size={13}/> {desgloseLoading ? 'Calculando...' : desglose ? 'Recalcular' : 'Calcular desglose'}
        </button>
      </div>

      {/* ─── CIERRE DE CAJA con márgenes reales ─── */}
      <div className="section-enter rounded-2xl overflow-hidden"
           style={{ border: `1px solid ${isDark ? 'rgba(225,20,40,0.15)' : 'rgba(225,20,40,0.2)'}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ background: isDark ? 'rgba(225,20,40,0.08)' : 'rgba(225,20,40,0.06)' }}>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase font-black text-gm-red">Cierre de caja</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.75)' : '#15151B' }}>
              {cierre ? cierre.label : filtroLabel(filtroTipo, filtroFecha, filtroMes, filtroAnio)}
            </p>
          </div>
          <button
            disabled={cierreLoading}
            onClick={calcularCierre}
            className="flex items-center gap-1.5 text-[11px] font-bold px-4 py-2.5 rounded-xl transition-all"
            style={{
              background: cierreLoading ? 'rgba(225,20,40,0.04)' : 'rgba(225,20,40,0.12)',
              color: cierreLoading ? 'rgba(225,20,40,0.4)' : '#E11428',
              border: '1px solid rgba(225,20,40,0.25)',
              cursor: cierreLoading ? 'wait' : 'pointer',
            }}>
            <Receipt size={13}/> {cierreLoading ? 'Calculando...' : cierre ? 'Recalcular' : 'Calcular cierre'}
          </button>
        </div>

        {cierre ? (() => {
          const moPC  = cierre.totalRevenue > 0 ? (cierre.manoRevenue / cierre.totalRevenue) * 100 : 0;
          const repPC = cierre.totalRevenue > 0 ? (cierre.repRevenue  / cierre.totalRevenue) * 100 : 0;
          const moHealth  = moPC  >= 40 ? 'good' : moPC  >= 20 ? 'mid' : 'low';
          const repHealth = cierre.repMargen >= 30 ? 'good' : cierre.repMargen >= 15 ? 'mid' : 'low';
          const hColor = (h: 'good'|'mid'|'low') => h === 'good' ? '#10B981' : h === 'mid' ? '#F59E0B' : '#F43F5E';
          const hLabel = (h: 'good'|'mid'|'low', type: 'mo'|'rep') =>
            type === 'mo'
              ? h === 'good' ? '✓ Buena participación' : h === 'mid' ? '⚠ Puede subir' : '✗ Poca mano de obra'
              : h === 'good' ? '✓ Buen margen' : h === 'mid' ? '⚠ Margen ajustado' : '✗ Revisa tus precios';

          return (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* MANO DE OBRA */}
              <div className="rounded-xl p-4" style={{ background: isDark ? 'rgba(59,130,246,0.07)' : 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-400">💪 Mano de obra</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${hColor(moHealth)}22`, color: hColor(moHealth) }}>
                    {hLabel(moHealth, 'mo')}
                  </span>
                </div>
                <p className="text-2xl font-black text-blue-400 tabular-nums">{fmtMoney(cierre.manoRevenue)}</p>
                <p className="text-[11px] text-blue-300/60 mt-1">100% margen — costo $0.00</p>
                {/* Barra de participación */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.4)' }}>
                    <span>% del ingreso total</span>
                    <span className="font-bold text-blue-400">{moPC.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(moPC, 100)}%`, background: 'linear-gradient(90deg,#3B82F6,#60A5FA)' }}/>
                  </div>
                </div>
              </div>

              {/* REPUESTOS */}
              <div className="rounded-xl p-4" style={{ background: isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">🔧 Repuestos</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${hColor(repHealth)}22`, color: hColor(repHealth) }}>
                    {hLabel(repHealth, 'rep')}
                  </span>
                </div>
                <p className="text-2xl font-black text-amber-400 tabular-nums">{fmtMoney(cierre.repRevenue)}</p>
                <div className="flex gap-4 mt-1">
                  <p className="text-[11px] text-amber-300/60">Costo: {fmtMoney(cierre.repCosto)}</p>
                  <p className="text-[11px] text-amber-300/60">Ganancia: {fmtMoney(cierre.repProfit)}</p>
                </div>
                {/* Barra de margen */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.4)' }}>
                    <span>Margen de ganancia</span>
                    <span className="font-bold" style={{ color: hColor(repHealth) }}>{cierre.repMargen.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(cierre.repMargen, 100)}%`, background: `linear-gradient(90deg,${hColor(repHealth)},${hColor(repHealth)}88)` }}/>
                  </div>
                </div>
                {/* Split participación */}
                <div className="mt-2 flex justify-between text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.35)' }}>
                  <span>% del ingreso total</span>
                  <span className="font-bold text-amber-400">{repPC.toFixed(1)}%</span>
                </div>
              </div>

              {/* RESUMEN TOTAL */}
              <div className="md:col-span-2 rounded-xl p-4"
                   style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FC', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#E4E7EC'}` }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)' }}>Ingreso bruto</p>
                    <p className="text-lg font-black text-emerald-400 tabular-nums">{fmtMoney(cierre.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)' }}>Costo repuestos</p>
                    <p className="text-lg font-black text-rose-400 tabular-nums">{fmtMoney(cierre.totalCosto)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)' }}>Ganancia real</p>
                    <p className="text-lg font-black tabular-nums" style={{ color: cierre.gananciaReal >= 0 ? '#10B981' : '#F43F5E' }}>{fmtMoney(cierre.gananciaReal)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)' }}>Margen neto</p>
                    <p className="text-lg font-black tabular-nums" style={{ color: cierre.margenReal >= 40 ? '#10B981' : cierre.margenReal >= 20 ? '#F59E0B' : '#F43F5E' }}>
                      {cierre.margenReal.toFixed(1)}%
                    </p>
                  </div>
                </div>
                {/* Barra visual mano vs repuesto */}
                <div className="mt-4">
                  <p className="text-[10px] mb-2 font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)' }}>Composición del ingreso</p>
                  <div className="h-3 rounded-full overflow-hidden flex">
                    {cierre.manoRevenue > 0 && (
                      <div style={{ width: `${moPC}%`, background: 'linear-gradient(90deg,#3B82F6,#60A5FA)', flexShrink: 0 }}/>
                    )}
                    {cierre.repRevenue > 0 && (
                      <div style={{ width: `${repPC}%`, background: 'linear-gradient(90deg,#F59E0B,#FCD34D)', flexShrink: 0 }}/>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1.5">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400"/><span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.4)' }}>Mano de obra {moPC.toFixed(0)}%</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400"/><span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.4)' }}>Repuestos {repPC.toFixed(0)}%</span></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : (
          <div className="px-5 py-8 text-center">
            <p className="text-[11px]" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(21,21,27,0.35)' }}>
              Presiona "Calcular cierre" para ver tus márgenes reales por mano de obra y repuestos.
            </p>
            <p className="text-[10px] mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(21,21,27,0.25)' }}>
              Usa el margen de repuestos para saber si estás ganando bien o mal con cada producto.
            </p>
          </div>
        )}
      </div>

      {/* ─── Gráfico de negocio profesional ─── */}
      <div className="section-enter gm-card-d rounded-2xl p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm font-bold text-white/85 flex items-center gap-2">
              <Activity size={15} className="text-gm-red"/>
              {filtroTipo === 'dia'    ? `Últimos 7 días` :
               filtroTipo === 'semana' ? `Últimas 4 semanas` :
               filtroTipo === 'mes'   ? `Últimos 6 meses` :
               filtroTipo === 'anio'  ? `Análisis financiero ${filtroAnio}` :
               `Resumen histórico`}
            </p>
            <p className="text-[11px] text-white/30 mt-0.5">
              Barras: ingresos / gastos · Línea amarilla: balance neto por período
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background:'#10B981' }}/><span className="text-[10px] text-white/35 font-semibold">Ingresos</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background:'#F43F5E' }}/><span className="text-[10px] text-white/35 font-semibold">Gastos</span></div>
              <div className="flex items-center gap-1"><div className="w-5 h-0.5 rounded-full" style={{ background:'#F59E0B' }}/><span className="text-[10px] text-white/35 font-semibold">Balance</span></div>
            </div>
          </div>
        </div>
        <BusinessChart ingresos={chartIngresos} gastos={chartGastos} labels={chartLabels} isDark={isDark}/>

        {/* ── Análisis de tendencia por período ── */}
        {!loading && (() => {
          const nonZero = chartIngresos.filter(v => v > 0);
          if (nonZero.length < 2) return null;
          const last3Avg = nonZero.slice(-3).reduce((s,v)=>s+v,0) / Math.min(3, nonZero.length);
          const first3Avg = nonZero.slice(0,3).reduce((s,v)=>s+v,0) / Math.min(3, nonZero.length);
          const tendencia = last3Avg > first3Avg * 1.05 ? 'creciente' : last3Avg < first3Avg * 0.95 ? 'decreciente' : 'estable';
          const tendColor = tendencia === 'creciente' ? '#10B981' : tendencia === 'decreciente' ? '#F43F5E' : '#F59E0B';
          const maxMes = chartLabels[chartIngresos.indexOf(Math.max(...chartIngresos))];
          const totalIng = chartIngresos.reduce((s,v)=>s+v,0);
          const totalGas = chartGastos.reduce((s,v)=>s+v,0);
          const rentabilidad = totalIng > 0 ? ((totalIng - totalGas) / totalIng * 100) : 0;
          return (
            <div className="mt-5 pt-5 border-t grid grid-cols-3 gap-4"
                 style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}>
              <div className="text-center">
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Tendencia</p>
                <p className="text-sm font-black capitalize" style={{ color: tendColor }}>
                  {tendencia === 'creciente' ? '▲' : tendencia === 'decreciente' ? '▼' : '→'} {tendencia}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Mejor mes</p>
                <p className="text-sm font-black text-white/80">{maxMes}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-1">Rentabilidad</p>
                <p className="text-sm font-black" style={{ color: rentabilidad >= 0 ? '#10B981' : '#F43F5E' }}>
                  {rentabilidad.toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ─── Tabla de movimientos ─── */}
      <div className="section-enter gm-card-d rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-sm font-bold text-white/80">Movimientos</p>
          <span className="text-[10px] text-white/25 font-semibold">{movimientos.length} registros</span>
        </div>
        <div className="overflow-x-auto dark-scroll">
          <table className="gm-table-d">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th className="text-right">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}>{[70,160,80,80,30].map((w,j) => (
                    <td key={j} className="px-4 py-3.5"><div className="skeleton-d h-3.5 rounded" style={{width:w}}/></td>
                  ))}</tr>
                ))
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="py-14 text-center flex flex-col items-center gap-3">
                      <Wallet size={28} className="text-white/12"/>
                      <p className="text-sm text-white/25">Sin movimientos para este período</p>
                    </div>
                  </td>
                </tr>
              ) : movimientos.map((m, idx) => (
                <tr key={`${m.tipo}-${m.id}-${idx}`}>
                  <td className="text-white/35 text-xs whitespace-nowrap">{fmtDate(m.fecha)}</td>
                  <td className="text-white/70 text-sm max-w-[220px] truncate">{m.desc}</td>
                  <td>
                    {m.tipo === 'ingreso' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <ArrowUpRight size={10}/> Ingreso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                        <ArrowDownRight size={10}/> Gasto
                      </span>
                    )}
                  </td>
                  <td className={`text-right font-black tabular-nums text-sm ${m.tipo==='ingreso'?'text-emerald-400':'text-red-400'}`}>
                    {m.tipo==='ingreso'?'+':'-'}{fmtMoney(m.monto)}
                  </td>
                  <td>
                    {'id_pago' in m && (
                      <button onClick={() => handleEliminarGasto((m as { id_pago:number }).id_pago)}
                              className="icon-btn danger" title="Eliminar gasto">
                        <Trash2 size={12}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal: registrar gasto ─── */}
      <Modal open={modalGasto} onClose={() => setModalGasto(false)} title="Registrar gasto / compra" size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setModalGasto(false)}>Cancelar</Button>
          <Button loading={savingGasto} onClick={handleGuardarGasto}>Guardar</Button>
        </>}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Concepto</label>
            <select className="gm-select-d w-full" value={form.concepto}
              onChange={e => setForm(f => ({ ...f, concepto: e.target.value, empleadoId: 0, empSearch: '' }))}>
              {CONCEPTOS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Selector de empleado — solo para Sueldo, Bono, Anticipo */}
          {CONCEPTOS_EMPLEADO.includes(form.concepto) && (() => {
            const mecYAdmin = empleados.filter(e =>
              !e.roles?.length ||
              e.roles.some(r => ['MECANICO','ADMIN'].includes(r.rol?.nombre ?? ''))
            );
            const filtrados = form.empSearch.trim()
              ? mecYAdmin.filter(e => e.nombre_completo.toLowerCase().includes(form.empSearch.toLowerCase()))
              : mecYAdmin;
            const selEmp = empleados.find(e => e.id_usuario === form.empleadoId);
            return (
              <div>
                <label className="text-sm font-medium text-white/70 block mb-1.5">
                  Empleado <span className="text-gm-red">*</span>
                </label>
                {selEmp ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                       style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.25)' }}>
                    <span className="text-sm font-bold text-emerald-400">{selEmp.nombre_completo.split(' ').slice(0,3).join(' ')}</span>
                    <button className="text-white/30 hover:text-white/70 text-xs ml-2"
                      onClick={() => setForm(f => ({ ...f, empleadoId: 0, empSearch: '' }))}>✕</button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      className="gm-input-d mb-2"
                      placeholder="Buscar empleado..."
                      value={form.empSearch}
                      onChange={e => setForm(f => ({ ...f, empSearch: e.target.value }))}
                    />
                    <div className="max-h-36 overflow-y-auto rounded-xl divide-y"
                         style={{ border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.03)' }}>
                      {filtrados.length === 0
                        ? <p className="px-3 py-2 text-xs text-white/30">Sin resultados</p>
                        : filtrados.map(e => (
                          <button key={e.id_usuario}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors"
                            onClick={() => setForm(f => ({ ...f, empleadoId: e.id_usuario!, empSearch: '' }))}
                          >
                            <span className="font-semibold text-white/80">{e.nombre_completo.split(' ').slice(0,3).join(' ')}</span>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Fecha</label>
            <input type="date" className="gm-input-d" value={form.fecha} onChange={e => setForm(f => ({...f,fecha:e.target.value}))}/>
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Monto ($)</label>
            <input type="number" className="gm-input-d" placeholder="0.00" step="0.01" value={form.monto} onChange={e => setForm(f => ({...f,monto:e.target.value}))}/>
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 block mb-1.5">Descripción (opcional)</label>
            <input type="text" className="gm-input-d" placeholder="Ej: Aceite 10W40 x5 litros" value={form.notas} onChange={e => setForm(f => ({...f,notas:e.target.value}))}/>
          </div>
        </div>
      </Modal>
    </div>
  );
}
