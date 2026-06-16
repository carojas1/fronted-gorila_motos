/* ─────────────────────────────────────────────
   GORILA MOTOS — Modal
   Dark-compatible, GSAP animate in/out
   ───────────────────────────────────────────── */

import { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import gsap from 'gsap';
import { cn } from '../../lib/utils';

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

  useEffect(() => {
    if (!backdropRef.current || !panelRef.current) return;
    if (open) {
      document.body.style.overflow = 'hidden';
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.fromTo(panelRef.current,
        { opacity: 0, y: 28, scale: 0.95 },
        { opacity: 1, y: 0,  scale: 1,    duration: 0.3, ease: 'power3.out' },
      );
    } else {
      document.body.style.overflow = '';
    }
  }, [open]);

  /* Salvaguarda: si el modal se desmonta estando abierto (ej. cambio de ruta),
     liberar SIEMPRE el scroll del body para que la página no quede congelada. */
  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = () => {
    if (!backdropRef.current || !panelRef.current) { onClose(); return; }
    gsap.to(panelRef.current,    { opacity: 0, y: 14, scale: 0.96, duration: 0.18 });
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.2, onComplete: onClose });
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
        className={cn(
          'relative w-full rounded-2xl flex flex-col max-h-[90vh]',
          'border border-white/[0.08]',
          sizes[size],
        )}
        style={{
          background: 'linear-gradient(145deg, #1C1C24 0%, #141418 100%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(225,20,40,0.06)',
        }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h2 id="modal-title" className="text-base font-bold text-white/90">{title}</h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
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
          <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
