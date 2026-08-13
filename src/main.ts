import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createHead } from '@vueuse/head';

import shadow from 'vue-shadow-dom';

import 'virtual:uno.css';

import { naive } from './plugins/naive.plugin';

import App from './App.vue';
import router from './router';
import { installGoogleAnalytics } from './plugins/google-analytics.plugin';
import { i18nPlugin } from './plugins/i18n.plugin';
import {
  clearCompletedDeployUpdateMarker,
  createDeployUpdateUrl,
  createDeployVersionChecker,
  hasAttemptedDeployUpdate,
  shouldCheckDeployVersion,
} from './modules/app-version/deploy-version';

const deployVersion = import.meta.env.VITE_DEPLOY_VERSION;
const completedUpdatePath = clearCompletedDeployUpdateMarker(window.location.href, deployVersion);
if (completedUpdatePath) {
  window.history.replaceState(window.history.state, '', completedUpdatePath);
}

const checkDeployVersion = createDeployVersionChecker({
  currentVersion: deployVersion,
  versionManifestUrl: `${import.meta.env.BASE_URL}version.json`,
  origin: window.location.origin,
  isOnline: () => navigator.onLine,
  fetchVersion: (url, init) => fetch(url, init),
  onVersionMismatch: ({ serverVersion }) => {
    // A normal reload can reuse a stale app shell in some browsers. Navigate to
    // a URL marked with the target deploy so the document request is distinct.
    // If the same old bundle boots again, do not auto-navigate a second time.
    if (hasAttemptedDeployUpdate(window.location.href, serverVersion)) {
      return;
    }

    window.location.replace(createDeployUpdateUrl(window.location.href, serverVersion));
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

// Keep deploy polling out of local Playwright/Vite previews. In production,
// start only after the app has mounted so version checking can never block the
// initial Vue bootstrap. pageshow also covers a tab restored from bfcache.
if (shouldCheckDeployVersion(window.location.hostname)) {
  void checkDeployVersion();
  window.addEventListener('pageshow', () => {
    void checkDeployVersion();
  });
}
