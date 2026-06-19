/* ─────────────────────────────────────────────
   GMotors — Barra de pestañas inferior (solo APK)
   Da el "feel" de app nativa. Cambia según el rol.
   ───────────────────────────────────────────── */
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Wrench, Bike, Package, LayoutGrid, Zap, Star, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Tab {
  label: string;
  icon:  LucideIcon;
  to?:   string;
  more?: boolean;
}

export default function MobileTabBar({ onMore }: { onMore: () => void }) {
  const { isAdmin, isMecanico, isCliente } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  const esClientePuro = isCliente && !isAdmin && !isMecanico;

  const tabs: Tab[] = esClientePuro
    ? [
        { label: 'Inicio',      icon: Home,       to: '/dashboard'   },
        { label: 'Mi Moto',     icon: Bike,       to: '/mi-moto'     },
        { label: 'Combustible', icon: Zap,        to: '/combustible' },
        { label: 'Puntos',      icon: Star,       to: '/puntos'      },
        { label: 'Más',         icon: LayoutGrid, more: true         },
      ]
    : [
        { label: 'Inicio',     icon: Home,       to: '/dashboard'   },
        { label: 'Órdenes',    icon: Wrench,     to: '/registros'   },
        { label: 'Motos',      icon: Bike,       to: '/motos'       },
        { label: 'Inventario', icon: Package,    to: '/inventario'  },
        { label: 'Más',        icon: LayoutGrid, more: true         },
      ];

  const activo = (to?: string) =>
    !!to && (loc.pathname === to || loc.pathname.startsWith(to + '/'));

  return (
    <nav className="gm-tabbar" role="navigation" aria-label="Navegación principal">
      {tabs.map((t) => {
        const on = activo(t.to);
        return (
          <button
            key={t.label}
            type="button"
            className="gm-tabbar-item"
            onClick={() => (t.more ? onMore() : nav(t.to!))}
            style={{ color: on ? '#FF3B47' : 'rgba(255,255,255,0.42)' }}
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
