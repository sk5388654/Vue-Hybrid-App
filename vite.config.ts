import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.NODE_ENV === 'production' ? '/Vue-Hybrid-App/' : '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',      
      includeAssets: [
        'favicon.ico',
        'src/assets/manifest/android-chrome-192x192.png',
        'src/assets/manifest/android-chrome-512x512.png',
        'src/assets/manifest/apple-touch-icon.png',
        'src/assets/manifest/favicon-32x32.png',
        'src/assets/manifest/favicon-16x16.png'
      ],
      manifest: {
        name: 'Vue Hybrid POS',
        short_name: 'HybridPOS',
        description: 'POS system for offline and online use',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'assets/manifest/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/manifest/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png}'], 
        runtimeCaching: [
          {
            urlPattern: /^https?.*/, 
            handler: 'NetworkFirst', 
            options: {
              cacheName: 'offline-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60 
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
