/* ─────────────────────────────────────────────
   GMotors — Sidebar de navegación
   Logout visible · roles · design refinado
   ───────────────────────────────────────────── */

import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wrench, Package, Users,
  Bike, LogOut, ChevronRight, UserCheck, ClipboardList,
  CreditCard, Truck,
} from 'lucide-react';
import { useAuth, type RoleName } from '../../contexts/AuthContext';
import { initials, cn } from '../../lib/utils';

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; roles?: RoleName[] }[] = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard                          },
  { to: '/registros',   label: 'Registros',   icon: Wrench,       roles: ['ADMIN','MECANICO'] },
  { to: '/diagnostico', label: 'Diagnóstico', icon: ClipboardList, roles: ['ADMIN','MECANICO'] },
  { to: '/motos',       label: 'Motos',       icon: Bike                                      },
  { to: '/clientes',    label: 'Clientes',    icon: UserCheck,    roles: ['ADMIN','MECANICO'] },
  { to: '/inventario',   label: 'Inventario',   icon: Package,      roles: ['ADMIN','MECANICO'] },
  { to: '/proveedores',  label: 'Proveedores',  icon: Truck,        roles: ['ADMIN','MECANICO'] },
  { to: '/pagos',        label: 'Pagos',         icon: CreditCard,  roles: ['ADMIN']             },
  { to: '/perfiles',     label: 'Perfiles',      icon: Users,        roles: ['ADMIN']             },
];

export default function Sidebar() {
  const { user, logout, hasRole, isAdmin } = useAuth();
  const navigate = useNavigate();

  const navItems = NAV.filter((item) => !item.roles || hasRole(...item.roles));

  const roleLabel = isAdmin         ? 'Administrador'
    : hasRole('MECANICO')           ? 'Mecánico'
    : hasRole('CLIENTE')            ? 'Cliente'
    : 'Usuario';

  const roleColor = isAdmin         ? 'text-gm-red'
    : hasRole('MECANICO')           ? 'text-blue-400'
    : 'text-emerald-400';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="gm-sidebar fixed inset-y-0 left-0 w-64 flex flex-col z-30"
      style={{ background: 'linear-gradient(180deg,#131317 0%,#0f0f13 100%)', borderRight:'1px solid rgba(255,255,255,0.05)' }}>

      {/* ── Logo ── */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-1 ring-gm-red/20 shrink-0">
            <img src="/brand/gorila-logo.png" alt="GMotors" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="dark:text-white text-slate-900 font-black text-[17px] tracking-tight leading-none">
              Gorila<span className="text-gm-red"> Motos</span>
            </p>
            <p className="dark:text-white/25 text-slate-900/25 text-[9px] font-semibold tracking-[0.28em] uppercase mt-0.5">
              Taller · Sistema
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
        <p className="px-3 mb-2 text-[9px] font-black tracking-[0.3em] dark:text-white/20 text-slate-900/20 uppercase">
          Navegación
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 relative',
                  isActive
                    ? 'bg-gm-red/10 text-white border border-gm-red/20'
                    : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gm-red rounded-r-full shadow-[0_0_8px_rgba(225,20,40,0.8)]" />
                    )}
                    <Icon size={16} className={isActive ? 'text-gm-red' : 'text-current'} />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight size={12} className="text-gm-red/50" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── User card + logout ── */}
      <div className="px-3 pb-4 border-t border-white/[0.05] pt-3 space-y-2">
        {/* Tarjeta de usuario */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="w-8 h-8 rounded-full bg-gm-red/15 border border-gm-red/25 flex items-center justify-center shrink-0">
            <span className="text-gm-red text-xs font-black">{initials(user?.nombre_completo ?? 'U')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="dark:text-white text-slate-900 text-[12px] font-bold truncate leading-tight">
              {user?.nombre_completo ?? 'Usuario'}
            </p>
            <p className={`text-[10px] font-bold tracking-[0.1em] uppercase mt-0.5 ${roleColor}`}>
              {roleLabel}
            </p>
          </div>
        </div>

        {/* Botón Cerrar sesión — siempre visible */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-white/40 hover:text-red-400 hover:bg-red-500/[0.07] border border-transparent hover:border-red-500/[0.15] transition-all duration-150 group"
        >
          <LogOut size={15} className="group-hover:rotate-12 transition-transform duration-200" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
