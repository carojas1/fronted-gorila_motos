import { useState } from 'react';

export default function Bike3D({ className = '' }: { className?: string }) {
  const [shown, setShown] = useState(false);

  /* El onLoad del iframe dispara cuando carga el HTML de Sketchfab,
     pero el modelo 3D tarda ~2-3s más. Esperamos 2.8s antes de mostrar. */
  const handleLoad = () => setTimeout(() => setShown(true), 2800);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} className={className}>

      {/* Overlay branded — cubre el "Loading 3D model" nativo de Sketchfab */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: '#060608',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: shown ? 0 : 1,
        transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: shown ? 'none' : 'all',
      }}>
        <div style={{
          width: 40, height: 40,
          border: '2px solid rgba(225,20,40,0.1)',
          borderTop: '2px solid #E11428',
          borderRadius: '50%',
          animation: 'bike3d-spin 0.85s linear infinite',
        }}/>
      </div>

      <iframe
        title="Gorila Motos — Motocicleta 3D"
        onLoad={handleLoad}
        style={{ width: '100%', height: '100%', border: 'none', background: 'transparent' }}
        allow="autoplay; fullscreen; xr-spatial-tracking; accelerometer; gyroscope; magnetometer"
        src="https://sketchfab.com/models/18dc6bf0c9cf4d9fb314aa544fda2cc7/embed?ui_theme=dark&autostart=1&autospin=0.25&ui_controls=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&transparent=1&preload=1&camera=0"
      />

      <style>{`@keyframes bike3d-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
