import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'local-wordpress-demo',
    configureServer(server) {
      const { WORDPRESS_DEMO_APP_PASSWORD } = loadEnv(mode, server.config.envDir, 'WORDPRESS_DEMO_')
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/__local/wordpress-demo-password' || req.method !== 'GET') return next()

        const localAddress = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
        const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host ?? '')
        if (!localAddress || !localHost || !WORDPRESS_DEMO_APP_PASSWORD) {
          res.statusCode = 404
          return res.end()
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(WORDPRESS_DEMO_APP_PASSWORD)
      })
    },
  }],
  server: {
    port: 3000,
    open: true
  }
}))
