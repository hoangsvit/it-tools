<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import {
  NAlert,
  NButton,
  NCard,
  NGlobalStyle,
  NMessageProvider,
  NModal,
  NNotificationProvider,
  NProgress,
  darkTheme,
} from 'naive-ui';
import { darkThemeOverrides, lightThemeOverrides } from './themes';
import { layouts } from './layouts';
import { useStyleStore } from './stores/style.store';
import {
  DEPLOY_UPDATE_EVENT,
  type DeployVersionMismatch,
  createDeployUpdateUrl,
  hasAttemptedDeployUpdate,
} from './modules/app-version/deploy-version';

const UPDATE_COUNTDOWN_SECONDS = 8;

const route = useRoute();
const layout = computed(() => route?.meta?.layout ?? layouts.base);
const styleStore = useStyleStore();

const theme = computed(() => (styleStore.isDarkTheme ? darkTheme : null));
const themeOverrides = computed(() => (styleStore.isDarkTheme ? darkThemeOverrides : lightThemeOverrides));

const { locale } = useI18n();

syncRef(
  locale,
  useStorage('locale', locale),
);

const appUpdateText = computed(() => locale.value === 'vi'
  ? {
      title: 'Đã có phiên bản mới',
      description: 'ePlus.DEV Tools vừa được cập nhật. Trang sẽ đồng bộ phiên bản mới và tải lại để bạn luôn sử dụng tính năng mới nhất.',
      legacyVersion: 'bản cũ',
      reloadCountdown: (seconds: number) => `Tự động tải lại sau ${seconds} giây`,
      updateNow: 'Cập nhật ngay',
      reloadLoopStopped: 'Trình duyệt vẫn đang giữ phiên bản cũ sau lần tải lại trước. Hệ thống đã dừng tự động tải lại để tránh vòng lặp và trang trắng. Bạn có thể thử tải phiên bản mới lại một lần nữa.',
      retryUpdate: 'Thử tải phiên bản mới',
    }
  : {
      title: 'A new version is available',
      description: 'ePlus.DEV Tools has just been updated. The page will sync the new version and reload so you always use the latest features.',
      legacyVersion: 'legacy',
      reloadCountdown: (seconds: number) => `Automatically reloading in ${seconds} seconds`,
      updateNow: 'Update now',
      reloadLoopStopped: 'The browser is still holding the previous version after a reload. Automatic reloads have been stopped to prevent a loop or blank page. You can try loading the new version once more.',
      retryUpdate: 'Try loading the new version',
    });

const updateDialogVisible = ref(false);
const updateCountdown = ref(UPDATE_COUNTDOWN_SECONDS);
const pendingUpdate = ref<DeployVersionMismatch>();
const automaticReloadBlocked = ref(false);
let updateTimer: ReturnType<typeof setInterval> | undefined;

const updateProgress = computed(() => (
  ((UPDATE_COUNTDOWN_SECONDS - updateCountdown.value) / UPDATE_COUNTDOWN_SECONDS) * 100
));

function shortVersion(version?: string) {
  if (!version) {
    return appUpdateText.value.legacyVersion;
  }

  return version.length > 10 ? version.slice(0, 8) : version;
}

function clearUpdateTimer() {
  if (updateTimer !== undefined) {
    clearInterval(updateTimer);
    updateTimer = undefined;
  }
}

function reloadForUpdate() {
  clearUpdateTimer();

  const serverVersion = pendingUpdate.value?.serverVersion;
  if (!serverVersion) {
    return;
  }

  // A normal location.reload() can reuse stale HTML in some browsers. Put the
  // target deploy in the URL so the navigation is a fresh document request.
  // If that exact deploy still does not load, the next app boot detects this
  // marker and stops auto-reloading instead of entering a refresh loop.
  window.location.replace(createDeployUpdateUrl(window.location.href, serverVersion));
}

function startUpdateCountdown(versions: DeployVersionMismatch) {
  if (updateDialogVisible.value) {
    return;
  }

  pendingUpdate.value = versions;
  automaticReloadBlocked.value = hasAttemptedDeployUpdate(window.location.href, versions.serverVersion);
  updateCountdown.value = automaticReloadBlocked.value ? 0 : UPDATE_COUNTDOWN_SECONDS;
  updateDialogVisible.value = true;
  clearUpdateTimer();

  if (automaticReloadBlocked.value) {
    return;
  }

  updateTimer = setInterval(() => {
    // Do not consume the countdown while the tab is hidden. The user should
    // actually see the update notice before the page refreshes.
    if (document.visibilityState !== 'visible') {
      return;
    }

    if (updateCountdown.value <= 1) {
      updateCountdown.value = 0;
      reloadForUpdate();
      return;
    }

    updateCountdown.value -= 1;
  }, 1000);
}

function handleDeployUpdate(event: Event) {
  const { detail } = event as CustomEvent<DeployVersionMismatch>;
  startUpdateCountdown(detail);
}

onMounted(() => {
  window.addEventListener(DEPLOY_UPDATE_EVENT, handleDeployUpdate);
});

onBeforeUnmount(() => {
  clearUpdateTimer();
  window.removeEventListener(DEPLOY_UPDATE_EVENT, handleDeployUpdate);
});
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <NGlobalStyle />
    <NMessageProvider placement="bottom">
      <NNotificationProvider placement="bottom-right">
        <component :is="layout">
          <RouterView />
        </component>

        <NModal
          v-model:show="updateDialogVisible"
          :mask-closable="false"
          :close-on-esc="false"
          :auto-focus="false"
        >
          <NCard
            class="app-update-card"
            :bordered="false"
            role="dialog"
            aria-modal="true"
            :title="appUpdateText.title"
          >
            <div class="app-update-content">
              <p class="app-update-description">
                {{ appUpdateText.description }}
              </p>

              <div v-if="pendingUpdate" class="app-update-version">
                <span>{{ shortVersion(pendingUpdate.currentVersion) }}</span>
                <span aria-hidden="true">→</span>
                <strong>{{ shortVersion(pendingUpdate.serverVersion) }}</strong>
              </div>

              <NAlert v-if="automaticReloadBlocked" type="warning" :show-icon="true">
                {{ appUpdateText.reloadLoopStopped }}
              </NAlert>

              <template v-else>
                <NProgress
                  type="line"
                  :percentage="updateProgress"
                  :show-indicator="false"
                  processing
                />

                <p class="app-update-countdown" aria-live="polite">
                  {{ appUpdateText.reloadCountdown(updateCountdown) }}
                </p>
              </template>
            </div>

            <template #footer>
              <NButton type="primary" block @click="reloadForUpdate">
                {{ automaticReloadBlocked ? appUpdateText.retryUpdate : appUpdateText.updateNow }}
              </NButton>
            </template>
          </NCard>
        </NModal>
      </NNotificationProvider>
    </NMessageProvider>
  </n-config-provider>
</template>

<style>
body {
  min-height: 100%;
  margin: 0;
  padding: 0;
}

html {
  height: 100%;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}

.app-update-card {
  width: min(440px, calc(100vw - 32px));
}

.app-update-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.app-update-description,
.app-update-countdown {
  margin: 0;
  line-height: 1.55;
}

.app-update-countdown {
  text-align: center;
  font-size: 13px;
  opacity: 0.78;
}

.app-update-version {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  background: rgba(127, 127, 127, 0.1);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
}
</style>
