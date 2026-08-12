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

const SERVICE_WORKER_UPDATE_INTERVAL_MS = 15 * 60 * 1000;

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) {
      return;
    }

    const checkForUpdate = async () => {
      if (!navigator.onLine || registration.installing) {
        return;
      }

      try {
        const response = await fetch(swUrl, {
          cache: 'no-store',
          headers: {
            'cache-control': 'no-cache',
          },
        });

        if (response.ok) {
          await registration.update();
        }
      }
      catch {
        // Keep the current app available if the update check is temporarily offline.
      }
    };

    void checkForUpdate();
    window.setInterval(() => {
      void checkForUpdate();
    }, SERVICE_WORKER_UPDATE_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate();
      }
    });
  },
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
