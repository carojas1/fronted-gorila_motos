/* ─────────────────────────────────────────────
   GMotors — Menú "Más" móvil (solo APK)
   Hub premium con acceso a TODOS los módulos del usuario,
   agrupados de forma lógica. Reemplaza el drawer en el APK.
   ───────────────────────────────────────────── */
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Bike, Package, Truck, UserCheck, CreditCard,
  Users, Star, Bell, ClipboardList, Fuel, Wallet, BookOpen, Globe,
  KeyRound, LogOut, X, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { initials } from '../../lib/utils';

interface NavItem { label: string; to: string }

const ICONS: Record<string, LucideIcon> = {
  'Dashboard': LayoutDashboard, 'Registros': Wrench, 'Motos': Bike,
  'Inventario': Package, 'Proveedores': Truck, 'Clientes': UserCheck,
  'Pagos': CreditCard, 'Contabilidad': Wallet, 'Perfiles': Users,
  'Mi Moto': Bike, 'Mi Portal': Globe, 'Puntos': Star, 'Alertas': Bell,
  'Diagnóstico': ClipboardList, 'Metodología': BookOpen, 'Combustible': Fuel,
};
const COLORS: Record<string, string> = {
  'Dashboard': '#3B82F6', 'Registros': '#E11428', 'Motos': '#3B82F6',
  'Inventario': '#F59E0B', 'Proveedores': '#14B8A6', 'Clientes': '#10B981',
  'Pagos': '#8B5CF6', 'Contabilidad': '#10B981', 'Perfiles': '#8B5CF6',
  'Mi Moto': '#3B82F6', 'Mi Portal': '#10B981', 'Puntos': '#F59E0B',
  'Alertas': '#E11428', 'Diagnóstico': '#F59E0B', 'Metodología': '#14B8A6',
  'Combustible': '#8B5CF6',
};

/* Orden lógico por grupos */
const GROUPS: { title: string; labels: string[] }[] = [
  { title: 'Operación',           labels: ['Dashboard', 'Registros', 'Motos', 'Diagnóstico', 'Alertas', 'Metodología'] },
  { title: 'Inventario y compras', labels: ['Inventario', 'Proveedores'] },
  { title: 'Clientes',            labels: ['Clientes', 'Mi Moto', 'Mi Portal', 'Combustible', 'Puntos'] },
  { title: 'Finanzas',            labels: ['Pagos', 'Contabilidad'] },
  { title: 'Administración',      labels: ['Perfiles'] },
];

export default function MobileMore({
  open, onClose, items, nombre, roleLabel, roleColor, onChangePassword, onLogout,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  nombre: string;
  roleLabel: string;
  roleColor: string;
  onChangePassword: () => void;
  onLogout: () => void;
}) {
  const nav = useNavigate();
  const loc = useLocation();
  if (!open) return null;

  const byLabel = new Map(items.map(i => [i.label, i]));
  const go = (to: string) => { onClose(); nav(to); };

  return (
    <div className="m-more-overlay" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="m-more-head">
        <div className="flex items-center gap-3">
          <div className="m-more-avatar" style={{ background: `${roleColor}22`, color: roleColor, border: `1.5px solid ${roleColor}40` }}>
            {initials(nombre)}
          </div>
          <div>
            <p className="m-more-name">{nombre}</p>
            <p className="m-more-role" style={{ color: roleColor }}>{roleLabel}</p>
          </div>
        </div>
        <button onClick={onClose} className="m-more-close" aria-label="Cerrar">
          <X size={18} />
        </button>
      </div>

      <div className="m-more-scroll">
        {GROUPS.map(group => {
          const presentes = group.labels.map(l => byLabel.get(l)).filter(Boolean) as NavItem[];
          if (presentes.length === 0) return null;
          return (
            <div key={group.title} className="m-more-group">
              <p className="m-more-gt">{group.title}</p>
              <div className="m-more-grid">
                {presentes.map(it => {
                  const Icon = ICONS[it.label] ?? LayoutDashboard;
                  const color = COLORS[it.label] ?? '#E11428';
                  const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + '/');
                  return (
                    <button key={it.to} onClick={() => go(it.to)} className="m-more-item"
                            style={{ borderColor: active ? `${color}55` : undefined }}>
                      <div className="m-more-ico" style={{ background: `${color}1c`, border: `1px solid ${color}33` }}>
                        <Icon size={18} style={{ color }} />
                      </div>
                      <span className="m-more-lbl">{it.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Cuenta */}
        <div className="m-more-group">
          <p className="m-more-gt">Cuenta</p>
          <button onClick={() => { onClose(); onChangePassword(); }} className="m-more-row">
            <div className="m-more-ico" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
              <KeyRound size={16} style={{ color: '#3B82F6' }} />
            </div>
            <span className="m-more-row-lbl">Crear / cambiar contraseña</span>
            <ChevronRight size={15} className="text-white/25" />
          </button>
          <button onClick={onLogout} className="m-more-row">
            <div className="m-more-ico" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <LogOut size={16} style={{ color: '#EF4444' }} />
            </div>
            <span className="m-more-row-lbl" style={{ color: 'rgba(248,113,113,0.9)' }}>Cerrar sesión</span>
          </button>
        </div>

        <p className="m-more-foot">Gorila Motos · Cuenca, Ecuador</p>
      </div>
    </div>
  );
}
