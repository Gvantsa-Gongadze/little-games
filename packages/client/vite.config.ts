import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'chrome-devtools-well-known',
      configureServer(server) {
        server.middlewares.use('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end('{}')
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:2567',
        changeOrigin: true,
      },
    },
  },
})
