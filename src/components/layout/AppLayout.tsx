/* ─────────────────────────────────────────────
   GMotors — App Layout Premium
   Logo · Nav · Hamburger mobile · Dropdown
   ───────────────────────────────────────────── */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
// AnimatePresence kept for mobile drawer only — main content uses plain motion.div to avoid scroll freeze
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { initials } from '../../lib/utils';
import { NotificationBell, NotificationPanel } from '../ui/NotificationCenter';
import { useNotifications } from '../../hooks/useNotifications';
import TermsModal, { useTermsAccepted } from '../ui/TermsModal';
import { healthApi } from '../../lib/api';

export default function AppLayout() {
  const { user, isAdmin, isMecanico, isCliente, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const { unread } = useNotifications();
  const [notifOpen, setNotifOpen]       = useState(false);
  const notifRef                        = useRef<HTMLDivElement>(null);
  const [open, setOpen]                 = useState(false);
  const menuRef                         = useRef<HTMLDivElement>(null);
  const [showTerms, setShowTerms]       = useState(!useTermsAccepted());
  const [mobileMenuOpen, setMobileOpen] = useState(false);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.nombre_completo?.split(' ')[0] ?? 'Usuario';
  const roleLabel = isAdmin ? 'Administrador' : isMecanico ? 'Mecánico' : 'Cliente';
  const roleColor = isAdmin ? '#E11428' : isMecanico ? '#3B82F6' : '#10B981';

  const NAV = [
    { label: 'Dashboard',    to: '/dashboard'    },
    ...((isAdmin || isMecanico) ? [{ label: 'Registros',   to: '/registros'   }] : []),
    ...((isAdmin || isMecanico) ? [{ label: 'Motos',       to: '/motos'       }] : []),
    ...((isAdmin || isMecanico) ? [{ label: 'Diagnóstico', to: '/diagnostico' }] : []),
    ...((isAdmin || isMecanico) ? [{ label: 'Inventario',  to: '/inventario'  }] : []),
    ...((isAdmin || isMecanico) ? [{ label: 'Alertas',     to: '/alertas'     }] : []),
    ...((isAdmin || isMecanico) ? [{ label: 'Proveedores', to: '/proveedores' }] : []),
    ...((isAdmin || isMecanico) ? [{ label: 'Metodología', to: '/metodologia' }] : []),
    ...(isAdmin               ? [{ label: 'Pagos',       to: '/pagos'       }] : []),
    { label: 'Puntos',        to: '/puntos'       },
    { label: 'Combustible',   to: '/combustible'  },
    ...(isCliente             ? [{ label: 'Mi Moto',     to: '/mi-moto'     }] : []),
    ...(isCliente             ? [{ label: 'Mi Portal',   to: '/portal'      }] : []),
    ...(isAdmin               ? [{ label: 'Perfiles',    to: '/perfiles'    }] : []),
  ];

  const handleLogout = () => { setMobileOpen(false); logout(); navigate('/login'); };

  /* Cerrar dropdown de avatar al hacer clic fuera */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Cerrar menú móvil al cambiar de ruta */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* Bloquear scroll del body cuando el drawer está abierto */
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  /**
   * Keep-alive: evitar que el backend de Render (free tier) se duerma.
   * Hace un ping inmediato al montar (despierta el servidor si estaba dormido)
   * y luego cada 4 minutos (Render duerme tras 15 min de inactividad).
   */
  useEffect(() => {
    const ping = () => healthApi.check().catch(() => {}); // silencioso
    ping(); // ping inmediato al abrir la app
    const id = setInterval(ping, 4 * 60 * 1000); // cada 4 minutos
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0C0C10' }}>

      {/* Modal términos — solo primera vez */}
      {showTerms && <TermsModal onAccept={() => setShowTerms(false)} />}

      {/* ══ MOBILE DRAWER ════════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[60] md:hidden"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="fixed inset-y-0 left-0 w-72 z-[70] md:hidden flex flex-col"
              style={{
                background: 'linear-gradient(180deg,#15151C 0%,#111115 100%)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '10px 0 50px rgba(0,0,0,0.65)',
              }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b shrink-0"
                   style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <Link to="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0"
                       style={{ boxShadow: '0 0 0 1.5px rgba(225,20,40,0.4)' }}>
                    <img src="/brand/gorila-logo.png" alt="GM" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-black text-white leading-none"
                        style={{ fontFamily: "'Dancing Script', cursive", fontSize: 22 }}>
                    Gorila <span style={{ color: '#E11428' }}>Motos</span>
                  </span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  aria-label="Cerrar menú"
                >
                  <X size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              {/* User info strip */}
              <div className="px-3 pt-3 shrink-0">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                     style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0"
                       style={{ background: `${roleColor}22`, color: roleColor, border: `1.5px solid ${roleColor}35` }}>
                    {initials(user?.nombre_completo ?? 'U')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-white/90 truncate leading-tight">{user?.nombre_completo}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] mt-0.5" style={{ color: roleColor }}>{roleLabel}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                        style={{ boxShadow: '0 0 6px rgba(52,211,153,0.9)' }} />
                </div>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-3 py-3 overflow-y-auto dark-scroll">
                <p className="px-3 mb-2 text-[9px] font-black tracking-[0.3em] text-white/20 uppercase">Navegación</p>
                <div className="space-y-0.5">
                  {NAV.map(({ label, to }) => {
                    const active = location.pathname === to || location.pathname.startsWith(to + '/');
                    return (
                      <Link
                        key={to}
                        to={to}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all relative"
                        style={active ? {
                          background: 'rgba(225,20,40,0.12)',
                          color: '#fff',
                          border: '1px solid rgba(225,20,40,0.22)',
                        } : {
                          color: 'rgba(255,255,255,0.45)',
                          border: '1px solid transparent',
                        }}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                                style={{ background: '#E11428', boxShadow: '0 0 8px rgba(225,20,40,0.8)' }} />
                        )}
                        {label}
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                                         style={{ background: '#E11428' }} />}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Logout */}
              <div className="px-3 pb-5 border-t pt-3 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all"
                  style={{ color: 'rgba(248,113,113,0.8)', border: '1px solid transparent' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                    (e.currentTarget as HTMLElement).style.color = 'rgb(248,113,113)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.15)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = '';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.8)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20 shrink-0">
                    <LogOut size={14} className="text-red-400" />
                  </div>
                  Cerrar sesión
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
        <div className="flex items-center gap-3 px-4 lg:px-10 h-[62px] max-w-screen-2xl mx-auto">

          {/* Hamburger — solo mobile */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={18} style={{ color: 'rgba(255,255,255,0.72)' }} />
          </button>

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 shrink-0 group">
            <div
              className="relative shrink-0 overflow-hidden"
              style={{
                width: 46, height: 46, borderRadius: 12,
                boxShadow: '0 0 0 2px rgba(225,20,40,0.35), 0 4px 20px rgba(225,20,40,0.2)',
                transition: 'box-shadow 200ms',
              }}
            >
              <img src="/brand/gorila-logo.png" alt="GMotors" className="w-full h-full object-cover" />
              <div className="absolute inset-0"
                   style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.08) 0%,transparent 60%)' }} />
            </div>
            <div style={{ lineHeight: 1 }}>
              <span
                className="hidden sm:block font-black text-white drop-shadow-lg"
                style={{ fontFamily: "'Dancing Script', cursive", fontSize: 38, fontWeight: 700 }}
              >
                Gorila <span style={{
                  background: 'linear-gradient(135deg, #FF3B47 0%, #E11428 60%, #C00018 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Motos</span>
              </span>
            </div>
          </Link>

          {/* Divisor desktop */}
          <div className="hidden lg:block w-px h-8 bg-white/[0.06] shrink-0" />

          {/* Nav — solo desktop */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto overflow-y-hidden whitespace-nowrap no-scrollbar pb-1 -mb-1"
               style={{ WebkitOverflowScrolling: 'touch' }}>
            {NAV.map(({ label, to }) => {
              const active = location.pathname === to || location.pathname.startsWith(to + '/');
              return (
                <Link
                  key={to}
                  to={to}
                  className="relative px-3 py-2 rounded-lg text-[11.5px] font-bold tracking-[0.12em] uppercase transition-all duration-150"
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
          <div className="flex items-center gap-2 ml-auto shrink-0" ref={menuRef}>
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

            {/* Punto online — visible en md+ */}
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
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-all"
                style={{
                  background: open ? `${roleColor}22` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${open ? roleColor + '40' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black"
                  style={{ background:`${roleColor}22`, color:roleColor }}
                >
                  {initials(user?.nombre_completo ?? 'U')}
                </div>
                <ChevronDown size={12} style={{ color:'rgba(255,255,255,0.4)', transform: open ? 'rotate(180deg)' : '', transition:'transform 200ms' }} />
              </button>

              {open && (
                <div
                  className="absolute right-0 top-full mt-2 w-60 rounded-2xl overflow-hidden z-50"
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
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-black"
                        style={{ background:`${roleColor}22`, color:roleColor, border:`1.5px solid ${roleColor}35` }}
                      >
                        {initials(user?.nombre_completo ?? 'U')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-white/90 truncate">{user?.nombre_completo}</p>
                        <p className="text-[11px] text-white/35 truncate">{user?.correo}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="text-[10px] font-black tracking-[0.18em] uppercase px-2 py-0.5 rounded-full"
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
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all"
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
        <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto"
          >
            <Outlet />
          </motion.div>
      </main>
    </div>
  );
}
