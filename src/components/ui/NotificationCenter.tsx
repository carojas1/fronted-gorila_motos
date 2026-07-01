/* ─────────────────────────────────────────────
   GMotors — Centro de Notificaciones Enterprise
   Alertas automáticas: aceite, stock, órdenes
   Theme-aware (dark + light mode)
   ───────────────────────────────────────────── */

import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, X, CheckCheck, ChevronRight,
  AlertTriangle, Package, Wrench, Info, CheckCircle,
} from 'lucide-react';
import { useNotifications, type Notification, type NotifType } from '../../hooks/useNotifications';
import { useTheme } from '../../lib/theme';

/* ── Config visual por tipo ── */
const TYPE_CONFIG: Record<NotifType, { icon: typeof Bell; color: string; bg: string }> = {
  oil_alert:     { icon: Wrench,        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  low_stock:     { icon: Package,       color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  pending_order: { icon: AlertTriangle, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  moto_ready:    { icon: CheckCircle,   color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  info:          { icon: Info,          color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `hace ${d}d`;
  if (h > 0) return `hace ${h}h`;
  if (m > 0) return `hace ${m}m`;
  return 'ahora';
}

function NotifRow({ n, onRead, onDismiss, isDark }: {
  n:         Notification;
  onRead:    (id: string) => void;
  onDismiss: (id: string) => void;
  isDark:    boolean;
}) {
  const cfg = TYPE_CONFIG[n.type];
  const Icon = cfg.icon;

  const titleColor = n.read
    ? (isDark ? 'rgba(255,255,255,0.50)' : 'rgba(21,21,27,0.45)')
    : (isDark ? 'rgba(255,255,255,0.90)' : 'rgba(21,21,27,0.90)');
  const msgColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.45)';
  const timeColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(21,21,27,0.30)';

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-all cursor-pointer last:border-0 group relative"
      style={{
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)',
        background: !n.read ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(225,20,40,0.03)') : 'transparent',
      }}
      onClick={() => onRead(n.id)}
    >
      {/* Dot no leído */}
      {!n.read && (
        <span className="absolute left-2 top-4 w-1.5 h-1.5 rounded-full bg-gm-red notification-dot" />
      )}

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: cfg.bg }}
      >
        <Icon size={14} style={{ color: cfg.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold leading-tight" style={{ color: titleColor }}>
          {n.title}
        </p>
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: msgColor }}>{n.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px]" style={{ color: timeColor }}>{timeAgo(n.createdAt)}</span>
          {n.link && (
            <Link
              to={n.link}
              className="text-[10px] font-bold text-gm-red hover:text-gm-red-lt flex items-center gap-0.5"
              onClick={e => e.stopPropagation()}
            >
              Ver <ChevronRight size={9} />
            </Link>
          )}
        </div>
      </div>

      {n.type === 'moto_ready' ? (
        <button
          onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
          className="shrink-0 px-2 py-1 rounded-lg text-[9px] font-black transition-all"
          style={{ background:'rgba(16,185,129,0.15)', color:'#10B981', border:'1px solid rgba(16,185,129,0.25)' }}
        >
          Aceptar
        </button>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
          className="icon-btn shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6"
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}

/* ── Panel principal ── */
export function NotificationPanel({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const { notifications, unread, loading, markRead, markAllRead, dismiss } = useNotifications();
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);

  if (!open) return null;

  const highPriority = notifications.filter(n => n.priority === 'high' && !n.read);
  const rest         = notifications.filter(n => !(n.priority === 'high' && !n.read));

  const panelBg = isDark ? 'linear-gradient(150deg, #1C1C26 0%, #14141C 100%)' : 'linear-gradient(150deg, #FFFFFF 0%, #F8F9FA 100%)';
  const panelBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E4E7EC';
  const panelShadow = isDark ? '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)' : '0 24px 60px rgba(0,0,0,0.15)';
  const headerBg = isDark ? 'rgba(20,20,28,0.95)' : 'rgba(255,255,255,0.97)';
  const headerBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textMain = isDark ? 'rgba(255,255,255,0.90)' : 'rgba(21,21,27,0.90)';
  const textSub = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(21,21,27,0.45)';
  const textMuted = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(21,21,27,0.30)';
  const footerBg = isDark ? 'rgba(14,14,20,0.95)' : 'rgba(248,249,250,0.97)';

  return (
    <div
      ref={panelRef}
      className="notif-panel absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] rounded-2xl overflow-hidden z-50 dark-scroll"
      style={{
        background: panelBg,
        border: panelBorder,
        boxShadow: panelShadow,
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div className="notif-header flex items-center justify-between px-4 py-2.5 sticky top-0"
           style={{ background: headerBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${headerBorder}` }}>
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-gm-red" />
          <span className="text-[13px] font-black" style={{ color: textMain }}>Notificaciones</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-gm-red text-white">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[11px] transition-colors font-bold"
              style={{ color: textSub }}
            >
              <CheckCheck size={12} /> Marcar todas
            </button>
          )}
          <button onClick={onClose} className="icon-btn w-6 h-6"><X size={12} /></button>
        </div>
      </div>
      {/* Contenido */}
      {loading && notifications.length === 0 && (
        <div className="px-4 py-8 flex justify-center items-center">
          <div className="w-5 h-5 rounded-full border-2 border-gm-red border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="px-4 py-10 text-center">
          <CheckCheck size={24} className="mx-auto mb-2" style={{ color: 'rgba(16,185,129,0.3)' }} />
          <p className="text-sm font-semibold" style={{ color: textSub }}>Todo al día</p>
          <p className="text-xs mt-0.5" style={{ color: textMuted }}>Sin alertas pendientes</p>
        </div>
      )}

      {/* Alta prioridad primero */}
      {highPriority.length > 0 && (
        <>
          <div className="px-4 py-1.5" style={{ background: 'rgba(239,68,68,0.06)', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">
              Requieren atención
            </p>
          </div>
          {highPriority.map(n => (
            <NotifRow key={n.id} n={n} onRead={markRead} onDismiss={dismiss} isDark={isDark} />
          ))}
        </>
      )}

      {rest.length > 0 && (
        <>
          {highPriority.length > 0 && (
            <div className="px-4 py-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textMuted }}>Otras alertas</p>
            </div>
          )}
          {rest.map(n => (
            <NotifRow key={n.id} n={n} onRead={markRead} onDismiss={dismiss} isDark={isDark} />
          ))}
        </>
      )}

      {/* Footer */}
      <div className="notif-footer px-4 py-2.5 flex justify-between items-center sticky bottom-0"
           style={{ background: footerBg, borderTop: `1px solid ${headerBorder}` }}>
        <span className="text-[11px]" style={{ color: textMuted }}>{notifications.length} alertas</span>
        <Link
          to="/alertas"
          onClick={onClose}
          className="text-[11px] text-gm-red font-bold hover:text-gm-red-lt transition-colors flex items-center gap-1"
        >
          Ver alertas <ChevronRight size={10} />
        </Link>
      </div>
    </div>
  );
}

/* ── Bell button exportable ── */
export function NotificationBell({ onClick, unread }: { onClick: () => void; unread: number }) {
  const [theme] = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all"
      style={{
        background: unread > 0 ? 'rgba(225,20,40,0.12)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
        border: `1px solid ${unread > 0 ? 'rgba(225,20,40,0.3)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
      }}
      title="Notificaciones"
    >
      <Bell size={16} style={{ color: unread > 0 ? '#E11428' : (isDark ? 'rgba(255,255,255,0.40)' : 'rgba(21,21,27,0.40)') }} />
      {unread > 0 && (
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white notification-dot"
          style={{ background: '#E11428', boxShadow: '0 0 8px rgba(225,20,40,0.7)' }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
