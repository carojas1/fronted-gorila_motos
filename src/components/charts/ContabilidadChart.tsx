import { useRef, useState, useLayoutEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { fmtMoney } from '../../lib/utils';

function ChartTip({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;
  const ing = payload.find((p: any) => p.name === 'Ingresos');
  const gas = payload.find((p: any) => p.name === 'Gastos');
  const bal = payload.find((p: any) => p.name === 'Balance');
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

export default function ContabilidadChart({ data, isDark }: { data: any[]; isDark: boolean }) {
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
    const t = setTimeout(measure, 120);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

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
            <linearGradient id="gm-gradIng2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10B981" stopOpacity={0.9}/>
              <stop offset="100%" stopColor="#059669" stopOpacity={0.55}/>
            </linearGradient>
            <linearGradient id="gm-gradGas2" x1="0" y1="0" x2="0" y2="1">
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
            content={(props) => <ChartTip {...props} isDark={isDark}/>}
            cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
          />
          <ReferenceLine y={0} stroke={zeroColor} strokeWidth={1}/>
          <Bar dataKey="Ingresos" fill="url(#gm-gradIng2)" radius={[4,4,0,0]} maxBarSize={32}/>
          <Bar dataKey="Gastos"   fill="url(#gm-gradGas2)" radius={[4,4,0,0]} maxBarSize={32}/>
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
