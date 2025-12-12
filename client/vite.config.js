import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
   server: {
    host: true,
    port: 4173
  },
    plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192x192.png', 'icons/icon-512x512.png'],
      manifest: {
        id: "/",
        short_name: "ASD System",
        name: "ASD Management System",
        description: "Autism assessment and guidance app for parents, clinicians, and therapists.",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ],
        start_url: "/",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#4285F4",
        background_color: "#FFFFFF"
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, './src'),
    },
  },
})
