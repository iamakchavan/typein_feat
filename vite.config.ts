import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh by default
      // No need to specify fastRefresh as it's enabled by default
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    hmr: {
      timeout: 1000,
      overlay: true,
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: [],
  },
  // Handle base URL for different deployment environments
  base: process.env.NODE_ENV === 'production' ? '/' : '/',
});
