<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import {
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
    }
  : {
      title: 'A new version is available',
      description: 'ePlus.DEV Tools has just been updated. The page will sync the new version and reload so you always use the latest features.',
      legacyVersion: 'legacy',
      reloadCountdown: (seconds: number) => `Automatically reloading in ${seconds} seconds`,
      updateNow: 'Update now',
    });

const updateDialogVisible = ref(false);
const updateCountdown = ref(UPDATE_COUNTDOWN_SECONDS);
const pendingUpdate = ref<DeployVersionMismatch>();
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
  window.location.reload();
}

function startUpdateCountdown(versions: DeployVersionMismatch) {
  if (updateDialogVisible.value) {
    return;
  }

  pendingUpdate.value = versions;
  updateCountdown.value = UPDATE_COUNTDOWN_SECONDS;
  updateDialogVisible.value = true;
  clearUpdateTimer();

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

              <NProgress
                type="line"
                :percentage="updateProgress"
                :show-indicator="false"
                processing
              />

              <p class="app-update-countdown" aria-live="polite">
                {{ appUpdateText.reloadCountdown(updateCountdown) }}
              </p>
            </div>

            <template #footer>
              <NButton type="primary" block @click="reloadForUpdate">
                {{ appUpdateText.updateNow }}
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
