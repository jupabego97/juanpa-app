import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@tiptap/react', '@tiptap/starter-kit'],
          utils: ['axios', 'date-fns']
        }
      }
    },
    // Optimizaciones para Vercel
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: 4173,
    host: true
  },
  // Optimizaciones adicionales
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', 'react-router-dom']
  }
})