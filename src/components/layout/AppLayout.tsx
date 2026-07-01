/* ─────────────────────────────────────────────
   GMotors — App Layout Premium
   Logo · Nav · Hamburger mobile · Dropdown
   ───────────────────────────────────────────── */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
// AnimatePresence kept for mobile drawer only — main content uses plain motion.div to avoid scroll freeze
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, ChevronDown, Menu, X, KeyRound, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { initials, parsePermisos, getErrorMsg } from '../../lib/utils';
import { NotificationBell, NotificationPanel } from '../ui/NotificationCenter';
import { useNotifications } from '../../hooks/useNotifications';
import { healthApi, usuariosApi, authApi } from '../../lib/api';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ErrorBoundary from '../ui/ErrorBoundary';
import { isNativeApp } from '../../lib/platform';
import MobileTabBar from '../mobile/MobileTabBar';
import MobileMore from '../mobile/MobileMore';
import { useTheme } from '../../lib/theme';
import { Sun, Moon } from 'lucide-react';
import { whatsappCitaLink } from '../../lib/constants';

export default function AppLayout() {
  const { user, isAdmin, isMecanico, isCliente, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const toast      = useToast();
  const { unread } = useNotifications();
  const [theme, toggleTheme] = useTheme();

  /* Cambiar/crear contraseña */
  const [pwOpen,    setPwOpen]    = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pw1,       setPw1]       = useState('');
  const [pw2,       setPw2]       = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const resetPw = () => { setPwCurrent(''); setPw1(''); setPw2(''); };

  const guardarPassword = async () => {
    if (pw1.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (pw1 !== pw2)    { toast.error('Las contraseñas no coinciden'); return; }
    if (!user?.id_usuario || !user.correo) { toast.error('Sesión no válida'); return; }
    setPwSaving(true);
    try {
      if (pwCurrent.trim()) {
        try { await authApi.login(user.correo, pwCurrent.trim()); }
        catch { toast.error('La contraseña actual es incorrecta'); setPwSaving(false); return; }
      }
      await usuariosApi.update(user.id_usuario, { contrasena: pw1 });
      toast.success('Contraseña actualizada · ya puedes entrar con tu correo y nueva contraseña', 'Listo');
      setPwOpen(false); resetPw(); setOpen(false);
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setPwSaving(false); }
  };
  const [notifOpen, setNotifOpen]       = useState(false);
  const notifRef                        = useRef<HTMLDivElement>(null);
  const [open, setOpen]                 = useState(false);
  const menuRef                         = useRef<HTMLDivElement>(null);
  // El consentimiento legal se captura en el registro (checkbox obligatorio).
  // No se vuelve a pedir en cada login. Los enlaces a /privacidad y /terminos
  // están en el pie de Login y Registro.
  const [mobileMenuOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen]         = useState(false);
  const moreRef                         = useRef<HTMLDivElement>(null);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = user?.nombre_completo?.split(' ')[0] ?? 'Usuario';
  const roleLabel = isAdmin ? 'Administrador' : isMecanico ? 'Mecánico' : isCliente ? 'Cliente' : 'Sin rol';
  const roleColor = isAdmin ? '#E11428' : isMecanico ? '#3B82F6' : isCliente ? '#10B981' : '#8B8FA8';
  const isDark    = theme === 'dark';
  const topText   = isDark ? 'rgba(255,255,255,0.38)'  : 'rgba(22,22,26,0.50)';
  const topTextHi = isDark ? 'rgba(255,255,255,0.80)'  : 'rgba(22,22,26,0.90)';
  const topBtnBg  = isDark ? 'rgba(255,255,255,0.05)'  : 'rgba(0,0,0,0.05)';
  const topBtnBdr = isDark ? 'rgba(255,255,255,0.08)'  : 'rgba(0,0,0,0.10)';
  const topBrand  = isDark ? '#ffffff'                 : '#16161A';

  /* Permisos de módulos (mecánicos): null = sin restricción, array = lista permitida */
  const mecPermisos = isMecanico ? parsePermisos(user?.descripcion) : null;
  const puede = (mod: string) =>
    isAdmin || !isMecanico || !mecPermisos || mecPermisos.includes(mod);

  /* Vista de cliente: cualquiera que NO sea admin ni mecánico (incluye usuarios
     SIN rol asignado). Garantiza que nunca vean módulos internos del taller. */
  const verCliente = !isAdmin && !isMecanico;

  /* Navegación principal — limpia. Diagnóstico y Metodología viven DENTRO de Motos.
     Combustible y Alertas van en el menú "Más" para no saturar la barra. */
  const NAV = [
    { label: 'Dashboard',    to: '/dashboard'    },
    ...(puede('registros')   && (isAdmin || isMecanico) ? [{ label: 'Registros',   to: '/registros'   }] : []),
    ...(puede('motos')       && (isAdmin || isMecanico) ? [{ label: 'Motos',       to: '/motos'       }] : []),
    ...(puede('inventario')  && (isAdmin || isMecanico) ? [{ label: 'Inventario',  to: '/inventario'  }] : []),
    ...(puede('proveedores') && (isAdmin || isMecanico) ? [{ label: 'Proveedores', to: '/proveedores' }] : []),
    ...(puede('clientes')    && (isAdmin || isMecanico) ? [{ label: 'Clientes',    to: '/clientes'    }] : []),
    ...(isAdmin                                         ? [{ label: 'Pagos',       to: '/pagos'       }] : []),
    ...(verCliente                                      ? [{ label: 'Mi Moto',     to: '/mi-moto'     }] : []),
    ...(verCliente                                      ? [{ label: 'Mi Portal',   to: '/portal'      }] : []),
    ...(verCliente                                      ? [{ label: 'Puntos',      to: '/puntos'      }] : []),
  ];

  /* Menú "Más" — secundarios, no saturan la barra principal */
  const NAV_MORE = [
    ...(puede('alertas')     && (isAdmin || isMecanico) ? [{ label: 'Alertas',       to: '/alertas'       }] : []),
    ...(puede('metodologia') && (isAdmin || isMecanico) ? [{ label: 'Metodología',  to: '/metodologia'   }] : []),
    ...(puede('puntos')      && (isAdmin || isMecanico) ? [{ label: 'Puntos',       to: '/puntos'        }] : []),
    ...(puede('combustible') && (isAdmin || isMecanico) ? [{ label: 'Combustible',  to: '/combustible'   }] : []),
    ...(verCliente                                      ? [{ label: 'Combustible',  to: '/combustible'   }] : []),
    ...(isAdmin                                         ? [{ label: 'Contabilidad', to: '/contabilidad'  }] : []),
    ...(isAdmin                                         ? [{ label: 'Perfiles',     to: '/perfiles'      }] : []),
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

  /* Cerrar menú móvil y "Más" al cambiar de ruta */
  useEffect(() => { setMobileOpen(false); setMoreOpen(false); }, [location.pathname]);

  /* Cerrar dropdown "Más" al hacer clic fuera */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

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
    <div className="gm-app-bg flex flex-col min-h-screen">

      {/* ══ MENÚ "MÁS" PREMIUM — solo APK ══ */}
      {isNativeApp && (
        <MobileMore
          open={mobileMenuOpen}
          onClose={() => setMobileOpen(false)}
          items={[...NAV, ...NAV_MORE]}
          nombre={user?.nombre_completo ?? 'Usuario'}
          roleLabel={roleLabel}
          roleColor={roleColor}
          onChangePassword={() => { setPwOpen(true); setMobileOpen(false); }}
          onLogout={handleLogout}
        />
      )}

      {/* ══ MOBILE DRAWER (web) ════════════════════════════════════════════ */}
      <AnimatePresence>
        {!isNativeApp && mobileMenuOpen && (
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
                background: isDark ? 'linear-gradient(180deg,#15151C 0%,#111115 100%)' : '#FFFFFF',
                borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC',
                boxShadow: isDark ? '10px 0 50px rgba(0,0,0,0.65)' : '10px 0 50px rgba(0,0,0,0.12)',
              }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b shrink-0"
                   style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#E4E7EC' }}>
                <Link to="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0"
                       style={{ boxShadow: '0 0 0 1.5px rgba(225,20,40,0.4)', backgroundColor: '#111' }}>
                    <img src="/brand/gorila-logo.png" alt="GM" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-black leading-none"
                        style={{ fontFamily: "'Dancing Script', cursive", fontSize: 22, color: isDark ? '#fff' : '#16161A' }}>
                    Gorila <span style={{ color: '#E11428' }}>Motos</span>
                  </span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC' }}
                  aria-label="Cerrar menú"
                >
                  <X size={15} style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(21,21,27,0.6)' }} />
                </button>
              </div>

              {/* User info strip */}
              <div className="px-3 pt-3 shrink-0">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                     style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E4E7EC' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0"
                       style={{ background: `${roleColor}22`, color: roleColor, border: `1.5px solid ${roleColor}35` }}>
                    {initials(user?.nombre_completo ?? 'U')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black truncate leading-tight" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(21,21,27,0.9)' }}>{user?.nombre_completo}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] mt-0.5" style={{ color: roleColor }}>{roleLabel}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                        style={{ boxShadow: '0 0 6px rgba(52,211,153,0.9)' }} />
                </div>
              </div>

              {/* Nav links */}
              <nav className="flex-1 px-3 py-3 overflow-y-auto dark-scroll">
                <p className="px-3 mb-2 text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(21,21,27,0.3)' }}>Navegación</p>
                <div className="space-y-0.5">
                  {[...NAV, ...NAV_MORE].map(({ label, to }) => {
                    const active = location.pathname === to || location.pathname.startsWith(to + '/');
                    return (
                      <Link
                        key={to}
                        to={to}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all relative"
                        style={active ? {
                          background: 'rgba(225,20,40,0.12)',
                          color: isDark ? '#fff' : '#E11428',
                          border: '1px solid rgba(225,20,40,0.22)',
                        } : {
                          color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(21,21,27,0.6)',
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
              <div className="px-3 pb-5 border-t pt-3 shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E4E7EC' }}>
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
        className="gm-topbar sticky top-0 z-50 flex-none"
        style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-3 px-4 lg:px-10 h-[62px] max-w-screen-2xl mx-auto">

          {/* Hamburger — solo mobile */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all"
            style={{ background: topBtnBg, border: `1px solid ${topBtnBdr}` }}
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={18} style={{ color: topTextHi }} />
          </button>

          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-3 shrink-0 group">
            <div
              className="relative shrink-0 overflow-hidden"
              style={{
                width: 46, height: 46, borderRadius: 12,
                boxShadow: '0 0 0 2px rgba(225,20,40,0.35), 0 4px 20px rgba(225,20,40,0.2)',
                transition: 'box-shadow 200ms',
                backgroundColor: '#111'
              }}
            >
              <img src="/brand/gorila-logo.png" alt="GMotors" className="w-full h-full object-cover" />
              <div className="absolute inset-0"
                   style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.08) 0%,transparent 60%)' }} />
            </div>
            <div style={{ lineHeight: 1 }}>
              <span
                className="font-black drop-shadow-lg text-[24px] sm:text-[38px]"
                style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700, color: topBrand }}
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
                    color: isDark ? '#fff' : '#16161A',
                    background: 'rgba(225,20,40,0.15)',
                    boxShadow: '0 0 0 1px rgba(225,20,40,0.3)',
                  } : {
                    color: topText,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = topTextHi; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = topText; }}
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

          {/* Menú "Más" — FUERA del <nav> (el overflow del nav recortaba el desplegable) */}
          {NAV_MORE.length > 0 && (
            <div className="relative hidden md:block shrink-0" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(v => !v)}
                className="relative flex items-center gap-1 px-3 py-2 rounded-lg text-[11.5px] font-bold tracking-[0.12em] uppercase transition-all duration-150"
                style={{
                  color: moreOpen ? (isDark ? '#fff' : '#16161A') : topText,
                  background: moreOpen ? topBtnBg : 'transparent',
                }}
              >
                Más <ChevronDown size={12} style={{ transform: moreOpen ? 'rotate(180deg)' : '', transition: 'transform 180ms' }} />
              </button>
              {moreOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-[60] py-1"
                  style={{
                    background: isDark ? 'linear-gradient(150deg, #1E1E28 0%, #16161E 100%)' : '#FFFFFF',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC',
                    boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 16px 48px rgba(0,0,0,0.12)',
                  }}
                >
                  {NAV_MORE.map(({ label, to }) => {
                    const active = location.pathname === to || location.pathname.startsWith(to + '/');
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMoreOpen(false)}
                        className="block px-4 py-2.5 text-[12px] font-bold tracking-[0.08em] uppercase transition-colors"
                        style={{ color: active ? '#FF6470' : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(21,21,27,0.6)'), background: active ? 'rgba(225,20,40,0.1)' : 'transparent' }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Derecha: notif + saludo + avatar */}
          <div className="flex items-center gap-2 ml-auto shrink-0" ref={menuRef}>
            {/* PWA Install */}
            {deferredPrompt && (
                <button
                  onClick={() => {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
                  style={{ background: '#E11428', color: '#FFF' }}
                  title="Instalar Gorila Motos"
                >
                  <Download size={14} />
                  Instalar
                </button>
              )}
            {/* Toggle de tema claro / oscuro */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-xl transition-all shrink-0"
              style={{ background: topBtnBg, border: `1px solid ${topBtnBdr}` }}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Cambiar tema"
            >
              {theme === 'dark'
                ? <Sun size={16} style={{ color: '#F59E0B' }} />
                : <Moon size={16} style={{ color: '#3B82F6' }} />}
            </button>
            {/* Bell de notificaciones */}
            <div className="relative" ref={notifRef}>
              <NotificationBell onClick={() => setNotifOpen(v => !v)} unread={unread} />
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
            <div className="hidden lg:block text-right">
              <p className="text-[12px] font-semibold leading-snug" style={{ color: topText }}>
                {greeting}, <span style={{ color: topTextHi, fontWeight:700 }}>{firstName}</span>
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
                  background: open ? `${roleColor}22` : topBtnBg,
                  border: `1px solid ${open ? roleColor + '40' : topBtnBdr}`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black"
                  style={{ background:`${roleColor}22`, color:roleColor }}
                >
                  {initials(user?.nombre_completo ?? 'U')}
                </div>
                <ChevronDown size={12} style={{ color: topText, transform: open ? 'rotate(180deg)' : '', transition:'transform 200ms' }} />
              </button>

              {open && (
                <div
                  className="absolute right-0 top-full mt-2 w-60 rounded-2xl overflow-hidden z-50"
                  style={{
                    background: isDark ? 'linear-gradient(150deg, #1E1E28 0%, #16161E 100%)' : '#FFFFFF',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC',
                    boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)' : '0 24px 60px rgba(0,0,0,0.12)',
                  }}
                >
                  {/* Header usuario */}
                  <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E4E7EC' }}>
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

                  {/* Acciones de cuenta */}
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => { setPwOpen(true); setOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all text-white/70"
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                        <KeyRound size={14} className="text-blue-400" />
                      </div>
                      Crear / cambiar contraseña
                    </button>
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
      <main className="flex-1" style={{ paddingTop: isNativeApp ? 'calc(env(safe-area-inset-top, 0px) + 12px)' : undefined }}>
        <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto"
            style={{ paddingBottom: isNativeApp ? 120 : undefined }}
          >
            {/* Boundary por página: si una pantalla falla, el menú sigue vivo
                y al navegar a otra ruta (resetKey) se recupera sola. */}
            <ErrorBoundary resetKey={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </motion.div>
      </main>

      {/* ══ BARRA DE TABS INFERIOR — solo en el APK ══ */}
      {isNativeApp && <MobileTabBar onMore={() => setMobileOpen(true)} />}

      {/* ══ BOTÓN FLOTANTE WHATSAPP — solo en web ══ */}
      {!isNativeApp && (
        <a
          href={whatsappCitaLink('Hola! Quiero agendar una cita en Gorila Motos 🏍️')}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed z-50 flex items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-110 active:scale-95"
          style={{
            bottom: 24,
            right: 20,
            width: 52,
            height: 52,
            background: '#25D366',
            boxShadow: '0 4px 24px rgba(37,211,102,0.45)',
          }}
          title="Agendar cita por WhatsApp"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      {/* ══ MODAL: crear / cambiar contraseña ══ */}
      <Modal
        open={pwOpen}
        onClose={() => { setPwOpen(false); resetPw(); }}
        title="Crear o cambiar contraseña"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setPwOpen(false); resetPw(); }}>Cancelar</Button>
            <Button onClick={guardarPassword} loading={pwSaving} disabled={!pw1 || !pw2}>
              <KeyRound size={14} /> Guardar contraseña
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[12px] text-white/45 leading-relaxed">
            Cuenta: <strong className="text-white/70">{user?.correo}</strong>
          </p>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              Contraseña actual
              <span className="normal-case font-normal ml-1 text-white/25">(déjala vacía si es la primera vez)</span>
            </label>
            <input type="password" className="gm-input-d w-full" placeholder="Contraseña actual (opcional)"
                   value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">Nueva contraseña</label>
            <input type="password" className="gm-input-d w-full" placeholder="Mínimo 6 caracteres"
                   value={pw1} onChange={e => setPw1(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">Repetir contraseña</label>
            <input type="password" className="gm-input-d w-full" placeholder="Vuelve a escribirla"
                   value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" />
          </div>
          {pw1 && pw2 && pw1 !== pw2 && <p className="text-xs text-red-400">Las contraseñas no coinciden</p>}
        </div>
      </Modal>
    </div>
  );
}
