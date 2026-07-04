import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';

// Library build: compiles src/ui into a distributable component library.
// Output: dist/ui.js (ESM), dist/ui.css (tokens + Tailwind utilities), and
// per-component .d.ts type declarations. React stays external (peer dep).
// Kept separate from the app build (vite.config.js), which outputs to public/.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({ include: ['src/ui'], rollupTypes: false }),
  ],
  // Don't copy the app's static dir (public/, which holds the app build) into the library output.
  publicDir: false,
  build: {
    // Separate from dist/ (electron-builder's output) and public/ (the app build).
    outDir: 'dist-ui',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/ui/lib.ts'),
      formats: ['es'],
      fileName: () => 'ui.js',
      cssFileName: 'ui',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
});
