import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  /* Fix for WebSocket HMR & Proxy issues */
  server: {
    port: 3000,
    host: 'localhost',
    open: false,
    strictPort: true, // Force port 3000 to fail fast if blocked (prevents 3001 fallback)
    cors: true, // Enable CORS for WebSocket safety
    hmr: {
      // Allow Vite to automatically detect the host and port
      overlay: true,
    },
    proxy: {
      '/api': {
        target: 'https://maxp-ai.pro',
        changeOrigin: true,
      },
      '/webhooks': {
        target: 'https://maxp-ai.pro',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://maxp-ai.pro',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'https://maxp-ai.pro',
        changeOrigin: true,
      },
    },
  },

  // Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
    ],
  },

  build: {
    outDir: 'dist',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          editors: ['react-quill', 'emoji-picker-react'],
          framer: ['framer-motion'],
          radix: [
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
          ],
          tanstack: ['@tanstack/react-query', '@tanstack/react-virtual'],
          utils: ['axios', 'lodash', 'date-fns', 'i18next', 'socket.io-client'],
        },
      },
    },
  },
});
