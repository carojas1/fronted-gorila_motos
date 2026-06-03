import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4200,
    open: true,
    proxy: {
      /* Redirige /api al backend Spring Boot en desarrollo */
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('three') || id.includes('@react-three')) return 'three';
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor';
          if (id.includes('gsap')) return 'gsap';
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'forms';
          if (id.includes('lucide-react')) return 'icons';
        },
      },
    },
  },
});
