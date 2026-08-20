import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { apiPlugin } from './vite-plugin-api';

export default defineConfig({
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './lib'),
    },
  },
  server: {
    port: 5173,
  },
  // Large JSON (the locale bundles) is emitted as JSON.parse('…') rather than
  // an object literal, which engines parse roughly twice as fast.
  json: { stringify: true },
  build: {
    target: 'es2022',
    // 'hidden' still emits maps (upload them to an error tracker if you want
    // readable stack traces) but drops the sourceMappingURL comment, so the
    // browser never fetches them. They embed the full original TypeScript,
    // including the admin console, so they must not be reachable in public —
    // deploy/deploy-vps.sh also excludes *.map from the upload.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion': ['framer-motion'],
          // 'swiper' was declared here but never matched: the app imports
          // swiper subpaths, so the entry only ever emitted an empty chunk.
          'radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-tabs',
          ],
        },
      },
    },
  },
});
