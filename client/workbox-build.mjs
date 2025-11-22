import { generateSW } from 'workbox-build';

generateSW({
  globDirectory: 'dist/',
  globPatterns: ['**/*.{html,js,css,png,svg,json}'],
  swDest: 'dist/service-worker.js',
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
      },
    },
    {
      urlPattern: ({ request }) => request.destination === 'image',
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
});
