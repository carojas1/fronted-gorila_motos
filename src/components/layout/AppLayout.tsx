/* ─────────────────────────────────────────────
   GMotors — App Layout Premium
   Logo grande · Nav completo · Dropdown elegante
   ───────────────────────────────────────────── */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { initials } from '../../lib/utils';
import { NotificationBell, NotificationPanel } from '../ui/NotificationCenter';
import { useNotifications } from '../../hooks/useNotifications';
import TermsModal, { useTermsAccepted } from '../ui/TermsModal';

export default function AppLayout() {
  const { user, isAdmin, isMecanico, isCliente, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const { unread } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const menuRef   = useRef<HTMLDivElement>(null);
  const [showTerms, setShowTerms] = useState(!useTermsAccepted());

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.nombre_completo?.split(' ')[0] ?? 'Usuario';
  const roleLabel = isAdmin ? 'Administrador' : isMecanico ? 'Mecánico' : 'Cliente';
  const roleColor = isAdmin ? '#E11428' : isMecanico ? '#3B82F6' : '#10B981';

  const NAV = [
    { label: 'Dashboard',   to: '/dashboard'   },
    ...((isAdmin || isMecanico) ? [{ label: 'Registros',  to: '/registros'  }] : []),
    { label: 'Motos',       to: '/motos'       },
    ...((isAdmin || isMecanico) ? [{ label: 'Clientes',   to: '/clientes'   }] : []),
    ...((isAdmin || isMecanico) ? [{ label: 'Inventario', to: '/inventario' }] : []),
    ...((isAdmin || isMecanico) ? [{ label: 'Alertas',    to: '/alertas'    }] : []),
    { label: 'Puntos',      to: '/puntos'      },
    { label: 'Combustible', to: '/combustible' },
    ...(isCliente             ? [{ label: 'Mi Portal',  to: '/portal'     }] : []),
    ...(isAdmin               ? [{ label: 'Perfiles',   to: '/perfiles'   }] : []),
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0C0C10' }}>

      {/* Modal términos — solo primera vez */}
      {showTerms && <TermsModal onAccept={() => setShowTerms(false)} />}

      {/* ══ TOPBAR ══════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 flex-none"
        style={{
          background: 'linear-gradient(180deg, rgba(11,11,15,0.98) 0%, rgba(9,9,13,0.96) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-center gap-6 px-6 lg:px-10 h-[68px] max-w-screen-2xl mx-auto">

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-4 shrink-0 group">
            <div
              className="relative shrink-0 overflow-hidden"
              style={{
                width: 54, height: 54,
                borderRadius: 14,
                boxShadow: '0 0 0 2px rgba(225,20,40,0.35), 0 4px 20px rgba(225,20,40,0.2)',
                transition: 'box-shadow 200ms',
              }}
            >
              <img src="/brand/gorila-logo.png" alt="GMotors" className="w-full h-full object-cover" />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.08) 0%,transparent 60%)' }}
              />
            </div>
            <div style={{ lineHeight: 1 }}>
              <span
                className="hidden sm:block font-black text-white drop-shadow-lg"
                style={{ fontFamily: "'Dancing Script', cursive", fontSize: 44, fontWeight: 700 }}
              >
                Gorila <span style={{
                  background: 'linear-gradient(135deg, #FF3B47 0%, #E11428 60%, #C00018 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Motos</span>
              </span>
            </div>
          </Link>

          {/* Divisor */}
          <div className="hidden lg:block w-px h-8 bg-white/[0.06] shrink-0" />

          {/* Nav */}
          <nav className="flex items-center gap-0.5 flex-1">
            {NAV.map(({ label, to }) => {
              const active = location.pathname === to || location.pathname.startsWith(to + '/');
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative px-4 py-2 rounded-lg text-[12px] font-bold tracking-[0.14em] uppercase transition-all duration-150"
                  style={active ? {
                    color: '#fff',
                    background: 'rgba(225,20,40,0.15)',
                    boxShadow: '0 0 0 1px rgba(225,20,40,0.3)',
                  } : {
                    color: 'rgba(255,255,255,0.38)',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)'; }}
                >
                  {active && (
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full"
                      style={{ background: '#E11428', boxShadow: '0 0 8px rgba(225,20,40,0.8)' }}
                    />
                  )}
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Derecha: notif + saludo + avatar */}
          <div className="flex items-center gap-3 shrink-0" ref={menuRef}>
            {/* Bell de notificaciones */}
            <div className="relative" ref={notifRef}>
              <NotificationBell onClick={() => setNotifOpen(v => !v)} unread={unread} />
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
            <div className="hidden lg:block text-right">
              <p className="text-[12px] font-semibold leading-snug" style={{ color:'rgba(255,255,255,0.55)' }}>
                {greeting}, <span style={{ color:'rgba(255,255,255,0.92)', fontWeight:700 }}>{firstName}</span>
              </p>
              <p className="text-[12px] font-bold tracking-[0.12em] uppercase" style={{ color: roleColor }}>
                {roleLabel}
              </p>
            </div>

            {/* Punto online */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
                 style={{ background:'rgba(16,185,129,0.07)', borderColor:'rgba(16,185,129,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    style={{ boxShadow:'0 0 6px rgba(52,211,153,0.9)' }} />
              <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-emerald-400/70">Online</span>
            </div>

            {/* Avatar con dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all"
                style={{
                  background: open ? `${roleColor}22` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${open ? roleColor + '40' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-black"
                  style={{ background:`${roleColor}22`, color:roleColor }}
                >
                  {initials(user?.nombre_completo ?? 'U')}
                </div>
                <ChevronDown size={13} style={{ color:'rgba(255,255,255,0.4)', transform: open ? 'rotate(180deg)' : '', transition:'transform 200ms' }} />
              </button>

              {open && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden z-50"
                  style={{
                    background: 'linear-gradient(150deg, #1E1E28 0%, #16161E 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
                  }}
                >
                  {/* Header usuario */}
                  <div className="p-4 border-b" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-black"
                        style={{ background:`${roleColor}22`, color:roleColor, border:`1.5px solid ${roleColor}35` }}
                      >
                        {initials(user?.nombre_completo ?? 'U')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-white/90 truncate">{user?.nombre_completo}</p>
                        <p className="text-[11px] text-white/35 truncate">{user?.correo}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span
                        className="text-[10px] font-black tracking-[0.18em] uppercase px-2.5 py-1 rounded-full"
                        style={{ background:`${roleColor}18`, color:roleColor, border:`1px solid ${roleColor}30` }}
                      >
                        {roleLabel}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400/60 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                        En línea
                      </span>
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all group"
                      style={{ color:'rgba(248,113,113,0.8)' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                        (e.currentTarget as HTMLElement).style.color = 'rgb(248,113,113)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = '';
                        (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.8)';
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20">
                        <LogOut size={14} className="text-red-400" />
                      </div>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ══ CONTENIDO ═══════════════════════════════════════════════ */}
      <main className="flex-1">
        <div className="p-6 lg:p-8 max-w-screen-2xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
