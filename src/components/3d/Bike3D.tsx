/* ─────────────────────────────────────────────
   GORILA MOTOS — Moto 3D (Sketchfab embed)
   Modelo real: Motorbike by Artec 3D
   ───────────────────────────────────────────── */

interface Bike3DProps {
  className?: string;
  enableZoom?: boolean;
  enablePan?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
}

export default function Bike3D({ className = '' }: Bike3DProps) {
  return (
    <div className={`bike-sketchfab-wrap ${className}`}>
      <iframe
        title="Motorbike"
        className="bike-sketchfab-iframe"
        frameBorder="0"
        allowFullScreen
        allow="autoplay; fullscreen; xr-spatial-tracking"
        src="https://sketchfab.com/models/18dc6bf0c9cf4d9fb314aa544fda2cc7/embed?ui_theme=dark&autostart=1&autospin=0.3&ui_controls=1&ui_infos=0&ui_stop=0&ui_inspector=1&ui_watermark=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&transparent=1&preload=1"
      />
    </div>
  );
}
