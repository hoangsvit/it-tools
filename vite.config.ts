import { resolve } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import VueI18n from '@intlify/unplugin-vue-i18n/vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import Unocss from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import markdown from 'vite-plugin-vue-markdown';
import svgLoader from 'vite-svg-loader';
import { configDefaults } from 'vitest/config';

const baseUrl = process.env.BASE_URL ?? '/';
const deployVersion = process.env.DEPLOY_ID
  ?? process.env.BUILD_ID
  ?? process.env.COMMIT_REF
  ?? `local-${Date.now()}`;
const deployCommit = process.env.COMMIT_REF ?? '';
const deployBuiltAt = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VueI18n({
      runtimeOnly: true,
      jitCompilation: true,
      compositionOnly: true,
      fullInstall: true,
      strictMessage: false,
      include: [
        resolve(__dirname, 'locales/**'),
      ],
    }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
        'vue-i18n',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
        },
      ],
      vueTemplate: true,
      eslintrc: {
        enabled: true,
      },
    }),
    Icons({ compiler: 'vue3' }),
    vue({
      include: [/\.vue$/, /\.md$/],
    }),
    vueJsx(),
    markdown(),
    svgLoader(),
    {
      name: 'eplus-deploy-version',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: `${JSON.stringify({
            version: deployVersion,
            commit: deployCommit || null,
            context: process.env.CONTEXT ?? null,
            builtAt: deployBuiltAt,
          }, null, 2)}\n`,
        });
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      workbox: {
        globIgnores: ['**/version.json'],
      },
      manifest: {
        name: 'ePlus.DEV IT Tools',
        short_name: 'ePlus Tools',
        description: 'Privacy-friendly developer tools enhanced by ePlus.DEV with local workspaces, smart discovery, recent history and quick sharing.',
        display: 'standalone',
        lang: 'en',
        start_url: `${baseUrl}?utm_source=pwa&utm_medium=pwa`,
        orientation: 'any',
        theme_color: '#18a058',
        background_color: '#f1f5f9',
        categories: ['developer', 'utilities', 'productivity'],
        shortcuts: [
          {
            name: 'Developer Workspace',
            short_name: 'Workspace',
            description: 'Chain developer tools and keep input/output context locally.',
            url: `${baseUrl}workspace`,
          },
          {
            name: 'JWT Parser',
            short_name: 'JWT',
            description: 'Decode and inspect a JSON Web Token.',
            url: `${baseUrl}jwt-parser`,
          },
          {
            name: 'JSON Viewer',
            short_name: 'JSON',
            description: 'Format and inspect JSON data.',
            url: `${baseUrl}json-viewer`,
          },
          {
            name: 'URL Parser',
            short_name: 'URL',
            description: 'Inspect URL components and query parameters.',
            url: `${baseUrl}url-parser`,
          },
        ],
        icons: [
          {
            src: '/favicon-16x16.png',
            type: 'image/png',
            sizes: '16x16',
          },
          {
            src: '/favicon-32x32.png',
            type: 'image/png',
            sizes: '32x32',
          },
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
    Components({
      dirs: ['src/'],
      extensions: ['vue', 'md'],
      include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
      resolvers: [NaiveUiResolver(), IconsResolver({ prefix: 'icon' })],
    }),
    Unocss(),
  ],
  base: baseUrl,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(process.env.npm_package_version),
    'import.meta.env.VITE_DEPLOY_VERSION': JSON.stringify(deployVersion),
    'import.meta.env.VITE_DEPLOY_COMMIT': JSON.stringify(deployCommit),
  },
  test: {
    exclude: [...configDefaults.exclude, '**/*.e2e.spec.ts'],
  },
  build: {
    target: 'esnext',
  },
});