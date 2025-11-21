import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? './' : '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',       // auto-update SW
      includeAssets: ['favicon.ico'],   // optional, any other files you want
      manifest: {
        name: 'Vue Hybrid POS',
        short_name: 'HybridPOS',
        description: 'POS system for offline and online use',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png}'],  // cache all JS, CSS, HTML, icons
        runtimeCaching: [
          {
            urlPattern: /^https?.*/,  // cache any request your app makes (optional)
            handler: 'NetworkFirst',  // try network first, fallback to cache
            options: {
              cacheName: 'offline-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60 // 1 day
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
