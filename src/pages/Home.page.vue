<script setup lang="ts">
import { IconBolt, IconDragDrop, IconHeart, IconHistory, IconLayoutDashboard, IconShieldCheck } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { computed } from 'vue';
import Draggable from 'vuedraggable';
import ColoredCard from '../components/ColoredCard.vue';
import ToolCard from '../components/ToolCard.vue';
import '@/modules/developer-workspace/developer-platform.i18n';
import { useToolStore } from '@/tools/tools.store';
import type { ToolWithCategory } from '@/tools/tools.types';
import { developerWorkflows } from '@/tools/developer-workflows';
import { config } from '@/config';
import { createSeoHead } from '@/utils/seo';

const toolStore = useToolStore();

useHead(createSeoHead());
const { t } = useI18n();

const favoriteTools = computed(() => toolStore.favoriteTools);
const recentTools = computed(() => toolStore.recentTools.slice(0, 4));
const workflows = computed(() => developerWorkflows
  .map((workflow, workflowIndex) => ({
    ...workflow,
    name: t(`developerPlatform.home.workflowCards.${workflowIndex}.name`, workflow.name),
    description: t(`developerPlatform.home.workflowCards.${workflowIndex}.description`, workflow.description),
    tools: workflow.paths
      .map(path => toolStore.tools.find(tool => tool.path === path))
      .filter((tool): tool is ToolWithCategory => Boolean(tool)),
  }))
  .filter(workflow => workflow.tools.length > 0));

function onUpdateFavoriteTools() {
  toolStore.updateFavoriteTools(favoriteTools.value);
}
</script>

<template>
  <div class="pt-50px">
    <div class="grid-wrapper">
      <div class="edition-banner">
        <div class="edition-badge">
          {{ $t('developerPlatform.home.edition') }}
        </div>
        <div class="edition-copy">
          <h1 class="edition-title">
            {{ $t('developerPlatform.home.title') }}
          </h1>
          <div class="edition-description">
            {{ $t('developerPlatform.home.description') }}
          </div>
        </div>
        <div class="platform-actions">
          <router-link to="/workbench" class="workspace-cta primary-cta">
            <n-icon :component="IconBolt" size="16" />
            {{ $t('developerPlatform.home.smartWorkbench') }}
          </router-link>
          <router-link to="/workspace" class="workspace-cta">
            <n-icon :component="IconLayoutDashboard" size="16" />
            {{ $t('developerPlatform.home.workflows') }}
          </router-link>
          <router-link to="/privacy" class="workspace-cta">
            <n-icon :component="IconShieldCheck" size="16" />
            {{ $t('developerPlatform.home.privacy') }}
          </router-link>
        </div>
        <div class="edition-shortcut">
          <span>{{ $t('developerPlatform.home.quickSearch') }}</span>
          <kbd>Ctrl / Cmd + K</kbd>
        </div>
      </div>

      <section class="workflow-section" :aria-label="$t('developerPlatform.home.workflowTitle')">
        <div class="workflow-heading">
          <div>
            <div class="workflow-title">
              {{ $t('developerPlatform.home.workflowTitle') }}
            </div>
            <div class="workflow-subtitle">
              {{ $t('developerPlatform.home.workflowSubtitle') }}
            </div>
          </div>
          <div class="workflow-count">
            {{ workflows.length }} {{ $t('developerPlatform.home.flows') }}
          </div>
        </div>

        <div class="workflow-grid">
          <article v-for="workflow in workflows" :key="workflow.name" class="workflow-card">
            <div class="workflow-name">
              {{ workflow.name }}
            </div>
            <div class="workflow-description">
              {{ workflow.description }}
            </div>
            <div class="workflow-steps">
              <router-link
                v-for="(tool, index) in workflow.tools"
                :key="tool.path"
                :to="tool.path"
                class="workflow-step"
              >
                <span class="step-number">{{ index + 1 }}</span>
                <span>{{ tool.name }}</span>
              </router-link>
            </div>
          </article>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
        <ColoredCard v-if="config.showBanner" :title="$t('home.follow.title')" :icon="IconHeart">
          {{ $t('home.follow.p1') }}
          <a
            href="https://github.com/hoangsvit/it-tools"
            rel="noopener"
            target="_blank"
            :aria-label="$t('home.follow.githubRepository')"
          >GitHub</a>
          {{ $t('home.follow.p2') }}
          <a
            href="https://twitter.com/david_nguyen94"
            rel="noopener"
            target="_blank"
            :aria-label="$t('home.follow.twitterXAccount')"
          >X</a>.
          {{ $t('home.follow.thankYou') }}
          <n-icon :component="IconHeart" />
        </ColoredCard>
      </div>

      <transition name="height">
        <div v-if="toolStore.favoriteTools.length > 0">
          <h3 class="mb-5px mt-25px text-neutral-400 font-500">
            {{ $t('home.categories.favoriteTools') }}
            <c-tooltip :tooltip="$t('home.categories.favoritesDndToolTip')">
              <n-icon :component="IconDragDrop" size="18" />
            </c-tooltip>
          </h3>
          <Draggable
            :list="favoriteTools"
            class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4"
            ghost-class="ghost-favorites-draggable"
            item-key="name"
            @end="onUpdateFavoriteTools"
          >
            <template #item="{ element: tool }">
              <ToolCard :tool="tool" />
            </template>
          </Draggable>
        </div>
      </transition>

      <div v-if="recentTools.length > 0">
        <h3 class="mb-5px mt-25px flex items-center gap-6px text-neutral-400 font-500">
          <n-icon :component="IconHistory" size="18" />
          {{ $t('developerPlatform.home.recentlyUsed') }}
        </h3>
        <div class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
          <ToolCard v-for="tool in recentTools" :key="tool.path" :tool="tool" />
        </div>
      </div>

      <div v-if="toolStore.newTools.length > 0">
        <h3 class="mb-5px mt-25px text-neutral-400 font-500">
          {{ t('home.categories.newestTools') }}
        </h3>
        <div class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
          <ToolCard v-for="tool in toolStore.newTools" :key="tool.name" :tool="tool" />
        </div>
      </div>

      <h3 class="mb-5px mt-25px text-neutral-400 font-500">
        {{ $t('home.categories.allTools') }}
      </h3>
      <div class="grid grid-cols-1 gap-12px lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4">
        <ToolCard v-for="tool in toolStore.tools" :key="tool.name" :tool="tool" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.edition-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(24, 160, 88, 0.22);
  border-radius: 12px;
  background: linear-gradient(110deg, rgba(24, 160, 88, 0.08), rgba(37, 99, 108, 0.05));
}

.edition-badge {
  flex: 0 0 auto;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(24, 160, 88, 0.14);
  color: #18a058;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.edition-copy {
  flex: 1;
}

.edition-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}

.edition-description {
  margin-top: 3px;
  opacity: 0.68;
  font-size: 12px;
}

.platform-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 6px;
}

.workspace-cta {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid rgba(24, 160, 88, 0.24);
  border-radius: 8px;
  background: rgba(24, 160, 88, 0.08);
  color: inherit;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:hover {
    border-color: rgba(24, 160, 88, 0.55);
    background: rgba(24, 160, 88, 0.14);
  }
}

.primary-cta {
  background: rgba(24, 160, 88, 0.14);
  color: #18a058;
}

.edition-shortcut {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.65;
  font-size: 12px;

  kbd {
    padding: 3px 7px;
    border: 1px solid currentColor;
    border-radius: 5px;
    font-family: inherit;
  }
}

.workflow-section {
  margin-top: 24px;
}

.workflow-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.workflow-title {
  color: rgba(128, 128, 128, 0.95);
  font-weight: 600;
}

.workflow-subtitle,
.workflow-count {
  font-size: 12px;
  opacity: 0.55;
}

.workflow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.workflow-card {
  padding: 14px;
  border: 1px solid rgba(128, 128, 128, 0.16);
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.035);
}

.workflow-name {
  font-weight: 650;
}

.workflow-description {
  min-height: 36px;
  margin: 4px 0 12px;
  font-size: 12px;
  opacity: 0.6;
}

.workflow-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.workflow-step {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border: 1px solid rgba(24, 160, 88, 0.18);
  border-radius: 999px;
  color: inherit;
  font-size: 11px;
  text-decoration: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:hover {
    border-color: rgba(24, 160, 88, 0.55);
    background: rgba(24, 160, 88, 0.08);
  }
}

.step-number {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(24, 160, 88, 0.12);
  color: #18a058;
  font-size: 9px;
  font-weight: 700;
}

.height-enter-active,
.height-leave-active {
  transition: all 0.5s ease-in-out;
  overflow: hidden;
  max-height: 500px;
}

.height-enter-from,
.height-leave-to {
  max-height: 42px;
  overflow: hidden;
  opacity: 0;
  margin-bottom: 0;
}

.ghost-favorites-draggable {
  opacity: 0.4;
  background-color: #ccc;
  border: 2px dashed #666;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
  animation: ghost-favorites-draggable-animation 0.2s ease-out;
}

@media (max-width: 1050px) {
  .edition-banner {
    flex-wrap: wrap;
  }

  .edition-copy {
    min-width: 220px;
  }

  .edition-shortcut {
    margin-left: auto;
  }
}

@media (max-width: 700px) {
  .edition-banner {
    align-items: flex-start;
    flex-direction: column;
  }

  .platform-actions {
    width: 100%;
  }

  .edition-shortcut {
    margin-left: 0;
  }

  .workflow-grid {
    grid-template-columns: 1fr;
  }
}

@keyframes ghost-favorites-draggable-animation {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 0.4;
    transform: scale(1.0);
  }
}
</style>
