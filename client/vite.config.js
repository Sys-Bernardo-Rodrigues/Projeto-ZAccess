import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Quando rodar via Docker, a API não fica em `localhost`.
// Assim, fica configurável via ENV (`VITE_PROXY_TARGET`) e mantém default para dev local.
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3000'

// O Vite regista "ws proxy error" internamente; este plugin filtra ECONNRESET/ECONNREFUSED
function suppressWsProxyErrors() {
  return {
    name: 'suppress-ws-proxy-errors',
    configureServer() {
      const orig = console.error
      console.error = (...args) => {
        const full = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ')
        if (
          (full.includes('ws proxy error') || full.includes('ws proxy socket error')) &&
          (full.includes('ECONNRESET') || full.includes('ECONNREFUSED'))
        ) {
          return
        }
        orig.apply(console, args)
      }
    },
  }
}

// Trata erros no proxy para não propagar
function proxyErrorHandler(proxy) {
  proxy.on('error', (err, _req, _res) => {
    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return
    console.error('[vite proxy]', err.message)
  })
}

export default defineConfig({
  plugins: [react(), suppressWsProxyErrors()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'api.zroot.online',
      'zaccess.zroot.online',
      'zacess.zroot.online',
      'localhost',
    ],
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        configure: proxyErrorHandler,
      },
      '/socket.io': {
        target: proxyTarget,
        changeOrigin: true,
        ws: true,
        configure: proxyErrorHandler,
      },
    },
  },
})
