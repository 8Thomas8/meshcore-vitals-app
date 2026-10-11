import { version } from './package.json'
import { ELEVATION_API_URL, MAP_STYLE_URL, SITE_URL } from './app/utils/constants'

// The prerendered pages inline Nuxt's config as a script and the theme colors
// as a style attribute on <html>, hence 'unsafe-inline'. The rest only allows
// what the app loads: Google Fonts, which the service worker also caches,
// OpenFreeMap for the map and Open-Meteo for the elevation.
const CONTENT_SECURITY_POLICY = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `img-src 'self' data: blob:`,
  `connect-src 'self' ${new URL(MAP_STYLE_URL).origin} ${new URL(ELEVATION_API_URL).origin} https://fonts.googleapis.com https://fonts.gstatic.com`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`
].join('; ')

const SECURITY_HEADERS = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  // Two years.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  // Bluetooth, the GPS and the compass are all the app uses.
  'Permissions-Policy': 'bluetooth=(self), geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), camera=(), microphone=(), payment=(), usb=()'
}

const APP_NAME = 'MeshCore Vitals'
// THEME_COLORS.background, the colour around the app while it opens.
const BACKGROUND_COLOR = '#0c121d'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: [
    '@nuxt/eslint',
    '@vite-pwa/nuxt',
    '@nuxtjs/i18n',
    '@vercel/analytics',
    'reka-ui/nuxt'
  ],

  vite: {
    assetsInclude: ['**/*.bin']
  },

  devtools: { enabled: true },

  experimental: {
    // Windows Chrome cannot map the WSL project root as a DevTools workspace.
    chromeDevtoolsProjectSettings: false,
    // Nuxt's own check reloads on the next page change, which would drop the
    // Bluetooth link. The app-update plugin handles new deployments instead.
    checkOutdatedBuildInterval: false
  },

  css: ['~/assets/scss/main.scss'],

  postcss: {
    plugins: { '@tailwindcss/postcss': {} }
  },

  // Sent by Vercel. A route rule would become a Vercel route that ends the
  // routing, so the assets would miss the headers. The first route lets the
  // routing go on. The second drops the trailing slash so each page has a
  // single URL, the third keeps search engines off the preview deployments.
  nitro: {
    vercel: {
      config: {
        routes: [
          { src: '/(.*)', headers: SECURITY_HEADERS as Record<string, string>, continue: true },
          { src: '^/([^/].*)/$', headers: { Location: '/$1' }, status: 308 } as { src: string, headers: Record<string, string> },
          {
            src: '/(.*)',
            missing: [{ type: 'host', value: new URL(SITE_URL).host }],
            headers: { 'X-Robots-Tag': 'noindex' },
            continue: true
          } as { src: string, headers: Record<string, string> }
        ]
      }
    }
  },

  // Installable, and works offline once visited: the prerendered pages and
  // every asset are precached. A new deployment installs a new service worker
  // in the background, and the app-update plugin decides when to switch.
  pwa: {
    registerType: 'prompt',
    manifest: {
      name: APP_NAME,
      short_name: APP_NAME,
      description: 'Check MeshCore coverage where you stand: signal (SNR) of nearby repeaters, link quality and overall health.',
      lang: 'en',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: BACKGROUND_COLOR,
      theme_color: BACKGROUND_COLOR,
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,json,png,svg,ico}'],
      globIgnores: [
        // Fetched fresh to spot a new deployment, never from the cache.
        '_nuxt/builds/**',
        '404.html',
        // Only the browser reads these, when installing.
        'pwa-*.png',
        'maskable-*.png',
        'og-image.png'
      ],
      // Pages by the URL the host serves them at: Vercel serves
      // companion/index.html at /companion and not under its file name. The
      // module's own transform would also rename 200.html to /200, which no
      // host serves.
      manifestTransforms: [async entries => ({
        manifest: entries.map(entry => ({ ...entry, url: entry.url.replace(/(^|\/)index\.html$/, '') || '/' })),
        warnings: []
      })],
      // Any other page opens the SPA shell, which renders it on the client.
      navigateFallback: '/200.html',
      navigateFallbackDenylist: [/\.\w+$/],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'google-fonts-css' }
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }, cacheableResponse: { statuses: [0, 200] } }
        }
      ]
    },
    client: {
      // The app-update plugin registers the worker itself, to decide when a
      // new one may reload the page.
      registerPlugin: false
    }
  },

  runtimeConfig: {
    public: { version }
  },

  // Rendered in English, then the locale plugin switches to the language
  // chosen in the footer or the browser's.
  i18n: {
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' }
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    baseUrl: SITE_URL,
    detectBrowserLanguage: false
  },

  app: {
    head: {
      title: APP_NAME,
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [
        { name: 'theme-color', content: BACKGROUND_COLOR },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: APP_NAME },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: APP_NAME },
        { property: 'og:image', content: `${SITE_URL}/og-image.png` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap' }
      ]
    }
  }
})
