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
  DEPLOY_UPDATE_EVENT,
  clearCompletedDeployUpdateMarker,
  createDeployVersionChecker,
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
  onVersionMismatch: versions => window.dispatchEvent(new CustomEvent(DEPLOY_UPDATE_EVENT, { detail: versions })),
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

// Local Vite previews are used by Playwright. They are immutable build
// snapshots, so deploy polling only adds noise and can interrupt navigation.
// Production/custom domains still check version.json after App is mounted so
// the update dialog is ready before a mismatch event can be emitted.
if (shouldCheckDeployVersion(window.location.hostname)) {
  void checkDeployVersion();
  window.addEventListener('pageshow', () => {
    void checkDeployVersion();
  });
}
