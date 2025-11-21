import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Vue-Hybrid-App/' : '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',      
      includeAssets: ['favicon.ico'], 
      manifest: {
        name: 'Vue Hybrid POS',
        short_name: 'HybridPOS',
        description: 'POS system for offline and online use',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/Vue-Hybrid-App/',
        scope: '/Vue-Hybrid-App/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
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
