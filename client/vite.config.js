import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Porta do backend: deve bater com SERVER_PORT do servidor (padrão 3001). Use .env com VITE_API_TARGET=http://localhost:3000 se o servidor estiver na 3000.
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/socket.io': {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
