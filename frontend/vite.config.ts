import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
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
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy para la API durante desarrollo
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
  }
})
