import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Disabled, not misconfigured: `public/` is this app's build *output*, so
  // Vite's default publicDir would collide with outDir below.
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
});
