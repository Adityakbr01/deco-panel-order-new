import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { constants, gzip, brotliCompress } from 'node:zlib'
import { promisify } from 'node:util'
import { readdir, readFile, writeFile } from 'node:fs/promises'

const gzipAsync = promisify(gzip)
const brotliAsync = promisify(brotliCompress)

const decopanelApiProxy = {
  target: 'https://decopanel.in',
  changeOrigin: true,
  secure: true,
  headers: {
    Origin: 'https://decopanel.in',
  },
  cookieDomainRewrite: '',
  rewrite: (path) => path.replace(/^\/api\/proxy/, '/public/api'),
}

function compressionPlugin() {
  let outDir = 'dist'

  async function collectFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    const files = await Promise.all(
      entries.map(async (entry) => {
        const filePath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          return collectFiles(filePath)
        }

        return filePath
      }),
    )

    return files.flat()
  }

  return {
    name: 'precompress-assets',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const compressibleExtensions = new Set([
        '.css',
        '.html',
        '.js',
        '.json',
        '.svg',
        '.txt',
        '.xml',
      ])

      const files = await collectFiles(outDir)

      await Promise.all(
        files
          .filter((file) => compressibleExtensions.has(path.extname(file)))
          .map(async (file) => {
            const source = await readFile(file)

            if (source.byteLength < 1024) return

            const [gzipped, brotlied] = await Promise.all([
              gzipAsync(source, { level: 9 }),
              brotliAsync(source, {
                params: {
                  [constants.BROTLI_PARAM_QUALITY]: 11,
                },
              }),
            ])

            await Promise.all([
              writeFile(`${file}.gz`, gzipped),
              writeFile(`${file}.br`, brotlied),
            ])
          }),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  const useDevDecopanelApiProxy =
    command === 'serve' &&
    mode === 'development' &&
    env.VITE_USE_API_PROXY === 'true'

  return {
    plugins: [
      react(),
      tailwindcss(),
      compressionPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.png',
          'originalIcon.jpeg',
          'icons/*.png',
        ],
        manifest: {
          name: 'Deco Panel',
          short_name: 'DecoPanel',
          description: 'Enterprise SaaS for Deco Panel Operations',
          theme_color: '#6366f1',
          background_color: '#f7f5f1',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          categories: ['business', 'productivity'],
          lang: 'en',
          dir: 'ltr',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60,
                },
              },
            },
          ],
        },
      }),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: true,
      cors: true,
      ...(command === 'serve'
        ? {
            proxy: {
              ...(useDevDecopanelApiProxy ? { '/api/proxy': decopanelApiProxy } : {}),
              '/api/fleet': {
                target: 'https://dfcgroup.in',
                changeOrigin: true,
                secure: true,
                headers: {
                  Origin: 'https://dfcgroup.in',
                },
                cookieDomainRewrite: '',
                rewrite: (path) => path.replace(/^\/api\/fleet/, '/fleetapi/public/api'),
              },
              '/api/orders-new': {
                target: 'https://deco-panel-order-new.vercel.app',
                changeOrigin: true,
                secure: true,
                headers: {
                  Origin: 'https://deco-panel-order-new.vercel.app',
                },
                cookieDomainRewrite: '',
                rewrite: (path) => path.replace(/^\/api\/orders-new/, ''),
              },
            },
          }
        : {}),
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      strictPort: true,
    },
    optimizeDeps: {
      include: [
        '@tanstack/react-query',
        '@tanstack/react-table',
        'axios',
        'lucide-react',
        'radix-ui',
        'react',
        'react-dom',
        'react-router-dom',
        'sonner',
        'zustand',
      ],
    },
    build: {
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: false,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames(assetInfo) {
            const sourceName =
              assetInfo.name ||
              assetInfo.names?.[0] ||
              assetInfo.originalFileNames?.[0] ||
              'asset'
            const extension = path.extname(sourceName)
            const type = extension.slice(1) || 'asset'
            const name = path.basename(sourceName, extension).replace(/[^a-zA-Z0-9_-]/g, '-')

            return `assets/${type}/${name}-[hash]${extension}`
          },
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (id.includes('react-router')) return 'router'
            if (id.includes('@tanstack')) return 'tanstack'
            if (id.includes('radix-ui') || id.includes('@radix-ui')) return 'radix'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('axios')) return 'http'
            if (id.includes('zod') || id.includes('react-hook-form')) return 'forms'
            if (id.includes('react-day-picker')) return 'calendar'
            if (id.includes('react') || id.includes('react-dom')) return 'react'

            return 'vendor'
          },
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
