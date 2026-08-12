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
import { createDeployVersionChecker } from './modules/app-version/deploy-version';

registerSW({ immediate: true });

const checkDeployVersion = createDeployVersionChecker({
  currentVersion: import.meta.env.VITE_DEPLOY_VERSION,
  versionManifestUrl: `${import.meta.env.BASE_URL}version.json`,
  origin: window.location.origin,
  baseUrl: import.meta.env.BASE_URL,
  isOnline: () => navigator.onLine,
  fetchVersion: (url, init) => fetch(url, init),
  hasServiceWorker: () => 'serviceWorker' in navigator,
  getRegistration: scope => navigator.serviceWorker.getRegistration(scope),
  reload: () => window.location.reload(),
});

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
