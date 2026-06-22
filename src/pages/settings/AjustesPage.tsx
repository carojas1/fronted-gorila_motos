/* ─────────────────────────────────────────────
   GMotors — Página de Ajustes / Configuración
   APK-first · perfil · tema · notificaciones · soporte
   ───────────────────────────────────────────── */

import { useState, useEffect } from 'react';
import {
  User, Phone, Sun, Moon, Bell, BellOff, MessageCircle,
  Lock, Shield, Info, ChevronRight, Check, Save,
  ExternalLink, RefreshCw, LogOut, HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../lib/theme';
import { usuariosApi, authApi } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { extractPhone, getErrorMsg } from '../../lib/utils';
import { WORKSHOP_CONTACT } from '../../lib/constants';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const APP_VERSION = '1.0.0';

/* ── Hook notificaciones (localStorage) ── */
const NOTIF_KEY = 'gm_notif_enabled';
function useNotifPref() {
  const [on, setOn] = useState(() => localStorage.getItem(NOTIF_KEY) !== 'false');
  const toggle = () => setOn(prev => {
    const next = !prev;
    localStorage.setItem(NOTIF_KEY, String(next));
    return next;
  });
  return [on, toggle] as const;
}

/* ── Toggle visual ── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onToggle}
      className="relative shrink-0 transition-all duration-300"
      style={{
        width: 46, height: 26,
        background: on ? '#E11428' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'),
        borderRadius: 99,
        border: on ? '1px solid rgba(225,20,40,0.6)' : (isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)'),
        boxShadow: on ? '0 0 16px rgba(225,20,40,0.4)' : 'none',
      }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="absolute top-0.5 transition-all duration-300"
        style={{
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          left: on ? 22 : 2,
        }}
      />
    </button>
  );
}

/* ── Sección con título ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] px-1"
         style={{ color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(21,21,27,0.42)' }}>
        {title}
      </p>
      <div className="rounded-2xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.035)' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #E4E7EC' }}>
        {children}
      </div>
    </div>
  );
}

/* ── Fila de ajuste ── */
function Row({
  icon, label, sub, right, onClick, color = '#E11428', last = false,
}: {
  icon: React.ReactNode; label: string; sub?: string;
  right?: React.ReactNode; onClick?: () => void; color?: string; last?: boolean;
}) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150"
      style={{ borderBottom: last ? 'none' : (isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #E4E7EC') }}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
           style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold" style={{ color: isDark ? 'rgba(255,255,255,0.88)' : '#15151B' }}>{label}</p>
        {sub && <p className="text-[11.5px] mt-0.5 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(21,21,27,0.6)' }}>{sub}</p>}
      </div>
      {right ?? (onClick ? <ChevronRight size={15} style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(21,21,27,0.42)', flexShrink: 0 }} /> : null)}
    </button>
  );
}

export default function AjustesPage() {
  const { user, logout } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const isDark = theme === 'dark';
  const [notif, toggleNotif] = useNotifPref();
  const toast   = useToast();
  const navigate = useNavigate();

  /* ─── Editar perfil ─── */
  const [editOpen,   setEditOpen]   = useState(false);
  const [editNombre, setEditNombre] = useState(user?.nombre_completo ?? '');
  const [editTel,    setEditTel]    = useState('');
  const [editSaving, setEditSaving] = useState(false);

  /* ─── Cambiar contraseña ─── */
  const [pwOpen,    setPwOpen]    = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pw1,       setPw1]       = useState('');
  const [pw2,       setPw2]       = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);

  useEffect(() => {
    if (user) {
      setEditNombre(user.nombre_completo ?? '');
      const tel = extractPhone(user.descripcion ?? '');
      setEditTel(tel ?? '');
    }
  }, [user]);

  const saveProfile = async () => {
    if (!user?.id_usuario) return;
    if (!editNombre.trim()) { toast.error('El nombre no puede estar vacío'); return; }
    setEditSaving(true);
    try {
      const telClean = editTel.trim();
      const desc = user.descripcion ?? '';
      const newDesc = telClean
        ? desc.replace(/TELEFONO:\s*[^\s|]*/i, `TELEFONO: ${telClean}`) ||
          (desc ? `${desc} | TELEFONO: ${telClean}` : `TELEFONO: ${telClean}`)
        : desc;
      await usuariosApi.update(user.id_usuario, {
        nombre_completo: editNombre.trim(),
        descripcion: newDesc,
      });
      toast.success('Datos actualizados');
      setEditOpen(false);
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setEditSaving(false); }
  };

  const savePassword = async () => {
    if (pw1.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    if (pw1 !== pw2)    { toast.error('Las contraseñas no coinciden'); return; }
    if (!user?.id_usuario || !user.correo) return;
    setPwSaving(true);
    try {
      if (pwCurrent.trim()) {
        // Verificar contraseña actual
        try {
          await authApi.login(user.correo, pwCurrent.trim());
        } catch {
          toast.error('La contraseña actual es incorrecta');
          setPwSaving(false);
          return;
        }
      }
      await usuariosApi.update(user.id_usuario, { contrasena: pw1 });
      toast.success('Contraseña actualizada');
      setPwOpen(false); setPwCurrent(''); setPw1(''); setPw2('');
    } catch (err) { toast.error(getErrorMsg(err)); }
    finally { setPwSaving(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const tel = extractPhone(user?.descripcion ?? '');

  return (
    <div className="space-y-5 pb-10 max-w-lg mx-auto">

      {/* ─── Header ─── */}
      <div className="pt-2">
        <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1"
           style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(21,21,27,0.42)' }}>
          Configuración
        </p>
        <h1 className="text-[1.7rem] font-black text-white">Ajustes</h1>
      </div>

      {/* ─── Perfil ─── */}
      <div className="rounded-2xl p-5 flex items-center gap-4"
           style={{ background: isDark ? 'linear-gradient(135deg,#17171E,#131318)' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #E4E7EC' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0"
             style={{ background: 'rgba(225,20,40,0.15)', border: '1.5px solid rgba(225,20,40,0.3)', color: '#E11428' }}>
          {(user?.nombre_completo ?? 'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-black truncate" style={{ color: isDark ? '#FFFFFF' : '#15151B' }}>{user?.nombre_completo}</p>
          <p className="text-[12px] truncate" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(21,21,27,0.6)' }}>{user?.correo}</p>
          {tel && <p className="text-[11px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.42)' }}>{tel}</p>}
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E4E7EC', color: isDark ? 'rgba(255,255,255,0.7)' : '#15151B' }}
        >
          Editar
        </button>
      </div>

      {/* ─── Apariencia ─── */}
      <Section title="Apariencia">
        <Row
          icon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          color={theme === 'dark' ? '#F59E0B' : '#3B82F6'}
          label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          sub={`Actualmente: ${theme === 'dark' ? 'Oscuro' : 'Claro'}`}
          right={<Toggle on={theme === 'dark'} onToggle={toggleTheme} />}
          onClick={toggleTheme}
          last
        />
      </Section>

      {/* ─── Notificaciones ─── */}
      <Section title="Notificaciones">
        <Row
          icon={notif ? <Bell size={18} /> : <BellOff size={18} />}
          color='#8B5CF6'
          label="Notificaciones de la app"
          sub={notif ? 'Recibirás alertas de mantenimiento' : 'Notificaciones desactivadas'}
          right={<Toggle on={notif} onToggle={toggleNotif} />}
          onClick={toggleNotif}
          last
        />
      </Section>

      {/* ─── Soporte ─── */}
      <Section title="Soporte">
        <Row
          icon={<MessageCircle size={18} />}
          color='#10B981'
          label="Contactar soporte"
          sub={`WhatsApp: ${WORKSHOP_CONTACT.telefonoSoporte}`}
          onClick={() => window.open(`https://wa.me/${WORKSHOP_CONTACT.whatsappSoporte}?text=${encodeURIComponent('Hola, necesito ayuda con la app Gorila Motos')}`, '_blank')}
        />
        <Row
          icon={<Phone size={18} />}
          color='#14B8A6'
          label="Llamar al taller"
          sub={`${WORKSHOP_CONTACT.telefonoSoporte} · Gorila Motos`}
          onClick={() => window.open(`tel:${WORKSHOP_CONTACT.telefonoSoporte.replace(/\s/g, '')}`, '_blank')}
        />
        <Row
          icon={<ExternalLink size={18} />}
          color='#3B82F6'
          label="Términos y condiciones"
          onClick={() => navigate('/terminos')}
        />
        <Row
          icon={<Shield size={18} />}
          color='#8B5CF6'
          label="Política de privacidad"
          onClick={() => navigate('/privacidad')}
          last
        />
      </Section>

      {/* ─── Seguridad / Cuenta ─── */}
      <Section title="Cuenta y Seguridad">
        <Row
          icon={<Lock size={18} />}
          color='#3B82F6'
          label="Cambiar contraseña"
          sub="Actualiza tu contraseña de acceso"
          onClick={() => setPwOpen(true)}
        />
        <Row
          icon={<RefreshCw size={18} />}
          color='#10B981'
          label="Recuperar cuenta con Google"
          sub="Vincular o recuperar con tu cuenta de Google"
          onClick={() => toast.info('Usa el botón "Continuar con Google" en la pantalla de inicio de sesión')}
        />
        <Row
          icon={<HelpCircle size={18} />}
          color='#F59E0B'
          label="¿Olvidaste tu contraseña?"
          sub="Recuperar acceso por correo"
          onClick={() => navigate('/recuperar')}
          last
        />
      </Section>

      {/* ─── Acerca de ─── */}
      <Section title="Acerca de">
        <Row
          icon={<Info size={18} />}
          color='#8B8FA8'
          label="Gorila Motos"
          sub={`Versión ${APP_VERSION} · ${WORKSHOP_CONTACT.ciudadCompleta}`}
          last
        />
      </Section>

      {/* ─── Cerrar sesión ─── */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all"
        style={{
          background: 'rgba(225,20,40,0.08)',
          border: '1px solid rgba(225,20,40,0.22)',
          color: '#FF6470',
        }}
      >
        <LogOut size={15} className="inline mr-2" />
        Cerrar sesión
      </button>

      {/* ══ MODAL EDITAR PERFIL ══ */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar perfil"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveProfile} loading={editSaving} icon={<Save size={14}/>}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              Nombre completo
            </label>
            <input
              className="gm-input-d w-full"
              value={editNombre}
              onChange={e => setEditNombre(e.target.value)}
              placeholder="Tu nombre completo"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              Número de teléfono
            </label>
            <input
              className="gm-input-d w-full"
              value={editTel}
              onChange={e => setEditTel(e.target.value)}
              placeholder="Ej. 0989 443 282"
              type="tel"
            />
          </div>
          <p className="text-[11px] text-white/30">
            El correo electrónico no se puede cambiar aquí. Contacta al soporte si necesitas actualizarlo.
          </p>
        </div>
      </Modal>

      {/* ══ MODAL CAMBIAR CONTRASEÑA ══ */}
      <Modal
        open={pwOpen}
        onClose={() => { setPwOpen(false); setPwCurrent(''); setPw1(''); setPw2(''); }}
        title="Cambiar contraseña"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setPwOpen(false); setPwCurrent(''); setPw1(''); setPw2(''); }}>
              Cancelar
            </Button>
            <Button onClick={savePassword} loading={pwSaving} disabled={!pw1 || !pw2} icon={<Check size={14}/>}>
              Actualizar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              Contraseña actual
              <span className="normal-case font-normal ml-1 text-white/25">(déjalo vacío si es primera vez)</span>
            </label>
            <input
              className="gm-input-d w-full"
              type="password"
              value={pwCurrent}
              onChange={e => setPwCurrent(e.target.value)}
              placeholder="Contraseña actual (opcional)"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              Nueva contraseña
            </label>
            <input
              className="gm-input-d w-full"
              type="password"
              value={pw1}
              onChange={e => setPw1(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider block mb-1.5">
              Confirmar contraseña
            </label>
            <input
              className="gm-input-d w-full"
              type="password"
              value={pw2}
              onChange={e => setPw2(e.target.value)}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
            />
          </div>
          {pw1 && pw2 && pw1 !== pw2 && (
            <p className="text-xs text-red-400">Las contraseñas no coinciden</p>
          )}
        </div>
      </Modal>

    </div>
  );
}
