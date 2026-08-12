<script lang="ts" setup>
import { NIcon, useThemeVars } from 'naive-ui';

import { RouterLink } from 'vue-router';
import { Home2, Menu2 } from '@vicons/tabler';
import { IconBrandGithub } from '@tabler/icons-vue';

import { storeToRefs } from 'pinia';
import HeroGradient from '../assets/hero-gradient.svg?component';
import MenuLayout from '../components/MenuLayout.vue';
import NavbarButtons from '../components/NavbarButtons.vue';
import { useStyleStore } from '@/stores/style.store';
import { config } from '@/config';
import type { ToolCategory } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';
import { useTracker } from '@/modules/tracker/tracker.services';
import CollapsibleToolMenu from '@/components/CollapsibleToolMenu.vue';

const themeVars = useThemeVars();
const styleStore = useStyleStore();
const deployVersion = import.meta.env.VITE_DEPLOY_VERSION;
const deployCommitFull = import.meta.env.VITE_DEPLOY_COMMIT;
const deployCommit = deployCommitFull.slice(0, 7);
const deployLabel = deployVersion.startsWith('local-') ? 'local' : deployVersion.slice(0, 8);

const { tracker } = useTracker();
const { t } = useI18n();

const toolStore = useToolStore();
const { favoriteTools, toolsByCategory } = storeToRefs(toolStore);

const tools = computed<ToolCategory[]>(() => [
  ...(favoriteTools.value.length > 0 ? [{ name: t('tools.categories.favorite-tools'), components: favoriteTools.value }] : []),
  ...toolsByCategory.value,
]);
</script>

<template>
  <MenuLayout class="menu-layout" :class="{ isSmallScreen: styleStore.isSmallScreen }">
    <template #sider>
      <RouterLink to="/" class="hero-wrapper">
        <HeroGradient class="gradient" />
        <div class="text-wrapper">
          <div class="title">
            IT - TOOLS
          </div>
          <div class="edition-label">
            ePlus.DEV Edition
          </div>
          <div class="divider" />
          <div class="subtitle">
            {{ $t('home.subtitle') }}
          </div>
        </div>
      </RouterLink>

      <div class="sider-content">
        <div v-if="styleStore.isSmallScreen" flex flex-col items-center>
          <locale-selector w="90%" />

          <div flex justify-center>
            <NavbarButtons />
          </div>
        </div>

        <CollapsibleToolMenu :tools-by-category="tools" />

        <div class="footer">
          <div class="build-meta" data-testid="deploy-build-meta">
            <span>ePlus.DEV Tools</span>
            <span class="build-chip" :title="deployVersion">Build {{ deployLabel }}</span>

            <template v-if="deployCommit">
              <span aria-hidden="true">·</span>
              <c-link
                target="_blank"
                rel="noopener"
                type="primary"
                :href="`https://github.com/hoangsvit/it-tools/commit/${deployCommitFull}`"
                :title="`Git commit ${deployCommitFull}`"
              >
                {{ deployCommit }}
              </c-link>
            </template>
          </div>
          <div>
            © {{ new Date().getFullYear() }}
            <c-link target="_blank" rel="noopener" href="https://github.com/hoangsvit">
              David Nguyen
            </c-link>
          </div>
          <div class="upstream-credit">
            Based on
            <c-link target="_blank" rel="noopener" href="https://github.com/CorentinTh/it-tools">
              CorentinTh/it-tools
            </c-link>
          </div>
        </div>
      </div>
    </template>

    <template #content>
      <div flex items-center justify-center gap-2>
        <c-button
          circle
          variant="text"
          :aria-label="$t('home.toggleMenu')"
          @click="styleStore.isMenuCollapsed = !styleStore.isMenuCollapsed"
        >
          <NIcon size="25" :component="Menu2" />
        </c-button>

        <c-tooltip :tooltip="$t('home.home')" position="bottom">
          <c-button to="/" circle variant="text" :aria-label="$t('home.home')">
            <NIcon size="25" :component="Home2" />
          </c-button>
        </c-tooltip>

        <c-tooltip :tooltip="$t('home.uiLib')" position="bottom">
          <c-button v-if="config.app.env === 'development'" to="/c-lib" circle variant="text" :aria-label="$t('home.uiLib')">
            <icon-mdi:brush-variant text-20px />
          </c-button>
        </c-tooltip>

        <command-palette />

        <locale-selector v-if="!styleStore.isSmallScreen" />

        <div>
          <NavbarButtons v-if="!styleStore.isSmallScreen" />
        </div>

        <c-tooltip position="bottom" tooltip="Star the ePlus.DEV fork on GitHub">
          <c-button
            round
            href="https://github.com/hoangsvit/it-tools"
            rel="noopener"
            target="_blank"
            class="support-button"
            :bordered="false"
            @click="() => tracker.trackEvent({ eventName: 'Fork star button clicked' })"
          >
            Star fork
            <NIcon v-if="!styleStore.isSmallScreen" :component="IconBrandGithub" ml-2 />
          </c-button>
        </c-tooltip>
      </div>
      <slot />
    </template>
  </MenuLayout>
</template>

<style lang="less" scoped>
.support-button {
  background: rgb(37, 99, 108);
  background: linear-gradient(48deg, rgba(37, 99, 108, 1) 0%, rgba(59, 149, 111, 1) 60%, rgba(20, 160, 88, 1) 100%);
  color: #fff !important;
  transition: padding ease 0.2s !important;

  &:hover {
    color: #fff;
    padding-left: 30px;
    padding-right: 30px;
  }
}

.footer {
  text-align: center;
  color: #838587;
  margin-top: 20px;
  padding: 20px 0;
}

.build-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 3px;
}

.build-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 1px 7px;
  border: 1px solid rgba(24, 160, 88, 0.25);
  border-radius: 999px;
  color: #18a058;
  font-size: 11px;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.upstream-credit {
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.8;
}

.sider-content {
  padding-top: 175px;
  padding-bottom: 200px;
}

.hero-wrapper {
  position: absolute;
  display: block;
  left: 0;
  width: 100%;
  z-index: 10;
  overflow: hidden;

  .gradient {
    margin-top: -65px;
  }

  .text-wrapper {
    position: absolute;
    left: 0;
    width: 100%;
    text-align: center;
    top: 12px;
    color: #fff;

    .title {
      font-size: 25px;
      font-weight: 600;
    }

    .edition-label {
      display: inline-block;
      margin: 2px 0 5px;
      padding: 2px 7px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.12);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .divider {
      width: 50px;
      height: 2px;
      border-radius: 4px;
      background-color: v-bind('themeVars.primaryColor');
      margin: 0 auto 5px;
    }

    .subtitle {
      font-size: 14px;
    }
  }
}
</style>
