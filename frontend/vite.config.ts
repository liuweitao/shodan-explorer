import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const proxyPrefixes = ['/account', '/api-info', '/dns', '/notifier', '/org', '/shodan', '/tools']

function runtimeConfigPlugin(apiKey: string): Plugin {
  return {
    name: 'runtime-config',
    configureServer(server) {
      server.middlewares.use('/runtime-config.json', (_request, response) => {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(JSON.stringify({ shodanApiKey: apiKey }))
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const apiKey = environment.SHODAN_API_KEY || 'shodanproxy'
  const target = environment.SHODAN_BASE_URL || 'http://127.0.0.1:8081'

  return {
    plugins: [runtimeConfigPlugin(apiKey), vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      proxy: Object.fromEntries(
        proxyPrefixes.map((prefix) => [prefix, { target, changeOrigin: true }])
      )
    },
    build: {
      sourcemap: false,
      target: 'es2022'
    },
    test: {
      environment: 'jsdom',
      clearMocks: true,
      restoreMocks: true
    }
  }
})
