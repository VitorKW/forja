/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// No GitHub Pages o app fica em https://<usuario>.github.io/<repo>/ — o workflow define BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      workbox: {
        // Fontes latinas entram no cache para o app funcionar offline com a tipografia certa.
        globPatterns: ['**/*.{js,css,html,svg,png}', '**/*-latin-*.woff2'],
        // Recebe as notificações (lembretes e avisos do par).
        importScripts: ['push-sw.js'],
      },
      manifest: {
        name: 'Forja — treino gamificado',
        short_name: 'Forja',
        description: 'Cada série forja seu personagem.',
        lang: 'pt-BR',
        theme_color: '#0d0b0a',
        background_color: '#0d0b0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
