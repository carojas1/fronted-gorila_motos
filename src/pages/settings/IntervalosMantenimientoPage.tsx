import { useState } from 'react';
import { ChevronLeft, Edit2, Check, X, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIntervalosStore, type ParametroMantenimiento } from '../../lib/intervalosStore';
import { useTheme } from '../../lib/theme';
import { useToast } from '../../components/ui/Toast';
import { RANGOS_CC } from '../../lib/mantenimiento';

export default function IntervalosMantenimientoPage() {
  const navigate = useNavigate();
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const toast = useToast();
  
  const { parametros, loading, updateIntervalo } = useIntervalosStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Group by ccMin
  const grouped = RANGOS_CC.map(rango => {
    const params = parametros.filter(p => p.ccMin === rango.ccMin && p.ccMax === (rango.ccMax || null));
    return { rango, params };
  });

  const startEdit = (p: ParametroMantenimiento) => {
    setEditingId(p.idParametro);
    setEditValue(p.intervaloKm.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id: number) => {
    const val = parseInt(editValue, 10);
    if (isNaN(val) || val <= 0) {
      toast.error('Valor de kilómetros inválido');
      return;
    }
    setSaving(true);
    try {
      await updateIntervalo(id, val);
      toast.success('Intervalo actualizado con éxito');
      setEditingId(null);
    } catch (err) {
      toast.error('Error al actualizar el intervalo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-white/50">Cargando parámetros...</div>;
  }

  return (
    <div className="space-y-5 pb-10 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={() => navigate('/ajustes')}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', color: isDark ? '#fff' : '#000' }}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black text-white">Intervalos de Mantenimiento</h1>
          <p className="text-xs text-white/50">Ajusta la vida útil (en km) de las piezas por cilindraje</p>
        </div>
      </div>

      <div className="space-y-6">
        {grouped.map(({ rango, params }) => {
          if (params.length === 0) return null;
          return (
            <div key={rango.ccMin} className="rounded-2xl overflow-hidden border"
                 style={{ background: isDark ? '#17171E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E4E7EC' }}>
              
              {/* Encabezado del rango */}
              <div className="px-4 py-3 border-b flex items-center gap-3"
                   style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E4E7EC', background: `${rango.color}15` }}>
                <span className="w-3 h-3 rounded-full" style={{ background: rango.color }} />
                <h2 className="text-sm font-bold text-white">{rango.label}</h2>
                <span className="text-[10px] opacity-60 ml-auto font-mono">
                  {rango.ccMax ? `${rango.ccMin}-${rango.ccMax} cc` : `${rango.ccMin} cc +`}
                </span>
              </div>

              {/* Lista de parámetros */}
              <div>
                {params.map((p, idx) => {
                  const isEditing = editingId === p.idParametro;
                  const isLast = idx === params.length - 1;
                  return (
                    <div key={p.idParametro} className="flex items-center justify-between px-4 py-3 border-b"
                         style={{ borderColor: isLast ? 'transparent' : (isDark ? 'rgba(255,255,255,0.05)' : '#E4E7EC') }}>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[13px] font-bold text-white mb-0.5">{p.tipoMantenimiento.replace('_', ' ')}</p>
                        <p className="text-[10px] text-white/40 leading-snug truncate">{p.descripcion}</p>
                      </div>
                      
                      <div className="shrink-0 flex items-center gap-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              className="gm-input-d w-20 px-2 py-1 text-center font-mono text-sm"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              disabled={saving}
                              autoFocus
                            />
                            <span className="text-xs text-white/40">km</span>
                            <button onClick={cancelEdit} disabled={saving} className="p-1.5 text-white/30 hover:text-white/80">
                              <X size={14} />
                            </button>
                            <button onClick={() => saveEdit(p.idParametro)} disabled={saving} className="p-1.5 text-green-500 hover:text-green-400">
                              <Check size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-sm font-black text-white/90">
                              {p.intervaloKm.toLocaleString('es-EC')} <span className="text-[10px] text-white/30 font-normal">km</span>
                            </span>
                            <button onClick={() => startEdit(p)} className="text-white/20 hover:text-white/80 transition-colors p-1">
                              <Edit2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
