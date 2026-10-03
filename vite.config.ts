import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      manifest: {
        name: 'Ride Score',
        short_name: 'Ride Score',
        description: 'Record and review the physical disturbance of a ride.',
        theme_color: '#071d1a',
        background_color: '#f5f7f3',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ]
})
