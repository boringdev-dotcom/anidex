import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // the API runs separately in development (npm run dev starts both)
    proxy: { '/api': { target: `http://localhost:${process.env.API_PORT ?? 3001}`, changeOrigin: false } },
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
