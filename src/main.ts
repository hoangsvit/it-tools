import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createHead } from '@vueuse/head';

import { registerSW } from 'virtual:pwa-register';
import shadow from 'vue-shadow-dom';

import 'virtual:uno.css';

import { naive } from './plugins/naive.plugin';

import App from './App.vue';
import router from './router';
import { installGoogleAnalytics } from './plugins/google-analytics.plugin';
import { i18nPlugin } from './plugins/i18n.plugin';

const CURRENT_DEPLOY_VERSION = import.meta.env.VITE_DEPLOY_VERSION;
const VERSION_MANIFEST_URL = `${import.meta.env.BASE_URL}version.json`;

registerSW({ immediate: true });

let versionCheckRunning = false;

async function checkDeployVersion() {
  if (versionCheckRunning || !navigator.onLine) {
    return;
  }

  versionCheckRunning = true;

  try {
    const versionUrl = new URL(VERSION_MANIFEST_URL, window.location.origin);
    versionUrl.searchParams.set('_', Date.now().toString());

    const response = await fetch(versionUrl, {
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      return;
    }

    const manifest = await response.json() as { version?: string };
    if (!manifest.version || manifest.version === CURRENT_DEPLOY_VERSION) {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      window.location.reload();
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
    if (!registration) {
      window.location.reload();
      return;
    }

    await registration.update();
  }
  catch {
    // Keep the current app usable if the version endpoint is temporarily unavailable.
  }
  finally {
    versionCheckRunning = false;
  }
}

void checkDeployVersion();
window.addEventListener('pageshow', () => {
  void checkDeployVersion();
});

installGoogleAnalytics({ router });

const app = createApp(App);

app.use(createPinia());
app.use(createHead());
app.use(i18nPlugin);
app.use(router);
app.use(naive);
app.use(shadow);

app.mount('#app');
