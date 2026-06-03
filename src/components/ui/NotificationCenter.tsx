/* ─────────────────────────────────────────────
   GMotors — Centro de Notificaciones Enterprise
   Alertas automáticas: aceite, stock, órdenes
   ───────────────────────────────────────────── */

import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, X, CheckCheck, ChevronRight,
  AlertTriangle, Package, Wrench, Info,
} from 'lucide-react';
import { useNotifications, type Notification, type NotifType } from '../../hooks/useNotifications';

/* ── Config visual por tipo ── */
const TYPE_CONFIG: Record<NotifType, { icon: typeof Bell; color: string; bg: string }> = {
  oil_alert:     { icon: Wrench,        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  low_stock:     { icon: Package,       color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
  pending_order: { icon: AlertTriangle, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
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

function NotifRow({ n, onRead, onDismiss }: {
  n:         Notification;
  onRead:    (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const cfg = TYPE_CONFIG[n.type];
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 transition-all cursor-pointer border-b border-white/[0.04] last:border-0 group relative ${!n.read ? 'bg-white/[0.02]' : ''}`}
      onClick={() => onRead(n.id)}
    >
      {/* Dot no leído */}
      {!n.read && (
        <span className="absolute left-2 top-4 w-1.5 h-1.5 rounded-full bg-gm-red notification-dot" />
      )}

      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: cfg.bg }}
      >
        <Icon size={15} style={{ color: cfg.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold leading-tight ${n.read ? 'text-white/50' : 'text-white/90'}`}>
          {n.title}
        </p>
        <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">{n.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-white/22">{timeAgo(n.createdAt)}</span>
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

      <button
        onClick={e => { e.stopPropagation(); onDismiss(n.id); }}
        className="icon-btn shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6"
      >
        <X size={11} />
      </button>
    </div>
  );
}

/* ── Panel principal ── */
export function NotificationPanel({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const { notifications, unread, loading, markRead, markAllRead, dismiss } = useNotifications();
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

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[380px] rounded-2xl overflow-hidden z-50 dark-scroll"
      style={{
        background: 'linear-gradient(150deg, #1C1C26 0%, #14141C 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] sticky top-0"
           style={{ background: 'rgba(20,20,28,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-gm-red" />
          <span className="text-[13px] font-black text-white/90">Notificaciones</span>
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
              className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/70 transition-colors font-bold"
            >
              <CheckCheck size={12} /> Marcar todas
            </button>
          )}
          <button onClick={onClose} className="icon-btn w-6 h-6"><X size={12} /></button>
        </div>
      </div>

      {loading && (
        <div className="px-4 py-8 text-center text-white/25 text-sm">Cargando…</div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="px-4 py-12 text-center">
          <CheckCheck size={28} className="mx-auto mb-2 text-emerald-400/30" />
          <p className="text-white/30 text-sm font-semibold">Todo al día</p>
          <p className="text-white/18 text-xs mt-0.5">Sin alertas pendientes</p>
        </div>
      )}

      {/* Alta prioridad primero */}
      {highPriority.length > 0 && (
        <>
          <div className="px-4 py-2 bg-red-500/[0.06] border-b border-red-500/10">
            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">
              Requieren atención
            </p>
          </div>
          {highPriority.map(n => (
            <NotifRow key={n.id} n={n} onRead={markRead} onDismiss={dismiss} />
          ))}
        </>
      )}

      {rest.length > 0 && (
        <>
          {highPriority.length > 0 && (
            <div className="px-4 py-2 bg-white/[0.02] border-b border-white/[0.04]">
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Otras alertas</p>
            </div>
          )}
          {rest.map(n => (
            <NotifRow key={n.id} n={n} onRead={markRead} onDismiss={dismiss} />
          ))}
        </>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.04] flex justify-between items-center sticky bottom-0"
           style={{ background: 'rgba(14,14,20,0.95)' }}>
        <span className="text-[11px] text-white/20">{notifications.length} alertas totales</span>
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
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all"
      style={{
        background: unread > 0 ? 'rgba(225,20,40,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${unread > 0 ? 'rgba(225,20,40,0.3)' : 'rgba(255,255,255,0.08)'}`,
      }}
      title="Notificaciones"
    >
      <Bell size={16} className={unread > 0 ? 'text-gm-red' : 'text-white/40'} />
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
