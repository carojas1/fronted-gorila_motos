import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Wrench, Bike, Package, LayoutGrid, Zap, Star, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../lib/theme';
import { canAccessModulo } from '../../lib/utils';

interface Tab {
  label: string;
  icon: LucideIcon;
  to?: string;
  more?: boolean;
}

export default function MobileTabBar({ onMore }: { onMore: () => void }) {
  const { user, isAdmin, isMecanico } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [theme] = useTheme();
  const isDark = theme === 'dark';

  const esClientePuro = !isAdmin && !isMecanico;
  const tabsInternos: Tab[] = [
    { label: 'Inicio', icon: Home, to: '/dashboard' },
    ...(canAccessModulo(user?.descripcion, 'registros', isAdmin, isMecanico)
      ? [{ label: 'Ordenes', icon: Wrench, to: '/registros' } as Tab]
      : []),
    ...(canAccessModulo(user?.descripcion, 'motos', isAdmin, isMecanico)
      ? [{ label: 'Motos', icon: Bike, to: '/motos' } as Tab]
      : []),
    ...(canAccessModulo(user?.descripcion, 'inventario', isAdmin, isMecanico)
      ? [{ label: 'Inventario', icon: Package, to: '/inventario' } as Tab]
      : []),
    { label: 'Mas', icon: LayoutGrid, more: true },
  ];

  const tabs: Tab[] = esClientePuro
    ? [
        { label: 'Inicio', icon: Home, to: '/dashboard' },
        { label: 'Mi Moto', icon: Bike, to: '/mi-moto' },
        { label: 'Combustible', icon: Zap, to: '/combustible' },
        { label: 'Puntos', icon: Star, to: '/puntos' },
        { label: 'Mas', icon: LayoutGrid, more: true },
      ]
    : tabsInternos.slice(0, 5);

  const activo = (to?: string) =>
    !!to && (loc.pathname === to || loc.pathname.startsWith(to + '/'));

  const inactiveColor = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(21,21,27,0.60)';

  return (
    <nav className="gm-tabbar" role="navigation" aria-label="Navegacion principal">
      {tabs.map((t) => {
        const on = activo(t.to);
        return (
          <button
            key={t.label}
            type="button"
            className="gm-tabbar-item"
            onClick={() => (t.more ? onMore() : nav(t.to!))}
            style={{ color: on ? '#FF3B47' : inactiveColor }}
          >
            {on && <span className="gm-tabbar-ind" />}
            <t.icon size={21} strokeWidth={on ? 2.4 : 2} />
            <span className="gm-tabbar-lbl">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
