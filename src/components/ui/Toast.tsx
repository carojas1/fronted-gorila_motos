/* ─────────────────────────────────────────────
   GMotors — Toast notification system
   ───────────────────────────────────────────── */

import {
  createContext, useContext, useState,
  useCallback, useRef, useEffect, type ReactNode,
} from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import gsap from 'gsap';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id:      string;
  type:    ToastType;
  message: string;
  title?:  string;
}

interface ToastCtx {
  toast: (type: ToastType, message: string, title?: string) => void;
  success: (msg: string, title?: string) => void;
  error:   (msg: string, title?: string) => void;
  warning: (msg: string, title?: string) => void;
  info:    (msg: string, title?: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle  size={18} className="text-green-500" />,
  error:   <XCircle      size={18} className="text-red-500"   />,
  warning: <AlertCircle  size={18} className="text-amber-500" />,
  info:    <Info         size={18} className="text-blue-500"  />,
};

const borders: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error:   'border-l-red-500',
  warning: 'border-l-amber-500',
  info:    'border-l-blue-500',
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { x: 64, opacity: 0 },
      { x: 0,  opacity: 1, duration: 0.3, ease: 'power2.out', overwrite: true }
    );
    const timer = setTimeout(() => dismiss(), 4200);
    return () => {
      clearTimeout(timer);
      if (ref.current) gsap.killTweensOf(ref.current);
    };
  }, []);

  const dismiss = () => {
    if (!ref.current) { onRemove(toast.id); return; }
    gsap.to(ref.current, {
      x: 64, opacity: 0, duration: 0.22, overwrite: true,
      onComplete: () => onRemove(toast.id),
    });
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-start gap-3 bg-gm-surface rounded-xl shadow-modal px-4 py-3',
        'border border-gm-border border-l-4 min-w-[280px] max-w-[360px]',
        borders[toast.type],
      )}
    >
      <span className="mt-0.5 shrink-0">{icons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-semibold text-gm-text">{toast.title}</p>}
        <p className="text-sm text-gm-muted">{toast.message}</p>
      </div>
      <button onClick={dismiss} className="text-gm-muted hover:text-gm-text transition-colors shrink-0 mt-0.5">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message, title }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastCtx = {
    toast,
    success: (m, t) => toast('success', m, t),
    error:   (m, t) => toast('error',   m, t),
    warning: (m, t) => toast('warning', m, t),
    info:    (m, t) => toast('info',    m, t),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onRemove={remove} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}
