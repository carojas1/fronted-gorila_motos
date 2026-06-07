export default function Bike3D({ className = '' }: { className?: string }) {
  return (
    <div style={{ width: '100%', height: '100%' }} className={className}>
      <iframe
        title="Gorila Motos — Motocicleta 3D"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent',
        }}
        frameBorder="0"
        allowFullScreen
        allow="autoplay; fullscreen; xr-spatial-tracking; accelerometer; gyroscope; magnetometer"
        src="https://sketchfab.com/models/18dc6bf0c9cf4d9fb314aa544fda2cc7/embed?ui_theme=dark&autostart=1&autospin=0.25&ui_controls=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&transparent=1&preload=1&camera=0"
      />
    </div>
  );
}
