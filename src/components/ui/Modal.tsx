/* ─────────────────────────────────────────────
   GORILA MOTOS — Modal
   Dark-compatible, GSAP animate in/out
   ───────────────────────────────────────────── */

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import gsap from 'gsap';
import { cn } from '../../lib/utils';
import { useTheme } from '../../lib/theme';

interface ModalProps {
  open:     boolean;
  onClose:  () => void;
  title?:   string;
  children: ReactNode;
  size?:    'sm' | 'md' | 'lg' | 'xl';
  footer?:  ReactNode;
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

export default function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);
  const [theme]     = useTheme();
  const isDark      = theme === 'dark';

  useEffect(() => {
    if (!backdropRef.current || !panelRef.current) return;
    if (open) {
      document.body.style.overflow = 'hidden';
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, overwrite: true });
      gsap.fromTo(panelRef.current,
        { opacity: 0, y: 28, scale: 0.95 },
        { opacity: 1, y: 0,  scale: 1,    duration: 0.28, ease: 'power3.out', overwrite: true },
      );
    } else {
      document.body.style.overflow = '';
    }
  }, [open]);

  /* Salvaguarda: si el modal se desmonta estando abierto (ej. cambio de ruta),
     liberar SIEMPRE el scroll del body y matar tweens para que la página no quede congelada. */
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      if (backdropRef.current) gsap.killTweensOf(backdropRef.current);
      if (panelRef.current)    gsap.killTweensOf(panelRef.current);
    };
  }, []);

  const handleClose = () => {
    if (!backdropRef.current || !panelRef.current) { onClose(); return; }
    gsap.to(panelRef.current,    { opacity: 0, y: 14, scale: 0.96, duration: 0.15, overwrite: true });
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.18, overwrite: true, onComplete: onClose });
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === backdropRef.current && handleClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn('relative w-full rounded-2xl flex flex-col max-h-[90vh]', sizes[size])}
        style={{
          background: isDark
            ? 'linear-gradient(145deg, #1C1C24 0%, #141418 100%)'
            : '#FFFFFF',
          border: isDark
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid #E4E7EC',
          boxShadow: isDark
            ? '0 0 0 1px rgba(255,255,255,0.05), 0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(225,20,40,0.06)'
            : '0 0 0 1px rgba(0,0,0,0.06), 0 24px 80px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F0F1F3' }}>
            <h2 id="modal-title" className="text-base font-bold"
              style={{ color: isDark ? 'rgba(255,255,255,0.9)' : '#15151B' }}>{title}</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(21,21,27,0.4)' }}
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 dark-scroll">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 flex justify-end gap-3"
            style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #F0F1F3' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
