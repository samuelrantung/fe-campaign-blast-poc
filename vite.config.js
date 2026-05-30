import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // ── API PROXY ─────────────────────────────────────────────
    // Uncomment to forward /api/* calls to your backend during dev,
    // avoiding CORS. Then set VITE_API_BASE_URL=/api in .env.local
    //
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8000', // your FastAPI server
    //     changeOrigin: true,
    //   },
    // },
  },
});
