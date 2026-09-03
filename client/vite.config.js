import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    // Toutes les requêtes /api partent vers l'API Express
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true
      }
    }
  }
});
