<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';

import BaseLayout from './base.layout.vue';
import FavoriteButton from '@/components/FavoriteButton.vue';
import ToolShareButton from '@/components/ToolShareButton.vue';
import ToolCard from '@/components/ToolCard.vue';
import type { Tool } from '@/tools/tools.types';
import { useToolStore } from '@/tools/tools.store';
import { createSeoHead } from '@/utils/seo';

const route = useRoute();
const { t } = useI18n();
const toolStore = useToolStore();

const i18nKey = computed<string>(() => route.path.trim().replace('/', ''));
const toolTitle = computed<string>(() => t(`tools.${i18nKey.value}.title`, String(route.meta.name)));
const toolDescription = computed<string>(() => t(`tools.${i18nKey.value}.description`, String(route.meta.description)));
const relatedTools = computed(() => toolStore.getRelatedTools({ toolPath: route.path, limit: 4 }));
const wideContent = computed(() => route.meta.wideContent === true);

watch(
  () => route.path,
  path => toolStore.markToolAsRecent(path),
  { immediate: true },
);

const head = computed(() => createSeoHead({
  title: toolTitle.value,
  description: toolDescription.value,
  path: route.path,
  keywords: (route.meta.keywords ?? []) as string[],
}));
useHead(head);
</script>

<template>
  <BaseLayout>
    <div class="tool-layout" :class="{ 'tool-layout-wide': wideContent }">
      <div class="tool-header">
        <div flex flex-nowrap items-center justify-between gap-2>
          <n-h1>
            {{ toolTitle }}
          </n-h1>

          <div flex items-center>
            <ToolShareButton :path="route.path" />
            <FavoriteButton :tool="{ name: route.meta.name, path: route.path } as Tool" />
          </div>
        </div>

        <div class="separator" />

        <div class="description">
          {{ toolDescription }}
        </div>
      </div>
    </div>

    <div class="tool-content" :class="{ 'tool-content-wide': wideContent }">
      <slot />
    </div>

    <section v-if="relatedTools.length > 0" class="related-tools" aria-label="Related tools">
      <div class="related-heading">
        <span>Related tools</span>
        <span class="related-caption">Smart picks based on category and shared keywords</span>
      </div>
      <div class="related-grid">
        <ToolCard v-for="tool in relatedTools" :key="tool.path" :tool="tool" />
      </div>
    </section>
  </BaseLayout>
</template>

<style lang="less" scoped>
.tool-content {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;

  ::v-deep(& > *) {
    flex: 0 1 600px;
  }
}

.tool-content-wide {
  ::v-deep(& > *) {
    flex-basis: 1220px;
    max-width: 100%;
  }
}

.tool-layout {
  max-width: 600px;
  margin: 0 auto;
  box-sizing: border-box;

  .tool-header {
    padding: 40px 0;
    width: 100%;

    .n-h1 {
      opacity: 0.9;
      font-size: 40px;
      font-weight: 400;
      margin: 0;
      line-height: 1;
    }

    .separator {
      width: 200px;
      height: 2px;
      background: rgb(161, 161, 161);
      opacity: 0.2;
      margin: 10px 0;
    }

    .description {
      margin: 0;
      opacity: 0.7;
    }
  }
}

.tool-layout-wide {
  max-width: 1220px;
}

.related-tools {
  max-width: 1220px;
  margin: 36px auto 20px;
  padding: 0 12px;
}

.related-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: rgba(128, 128, 128, 0.9);
  font-weight: 500;
}

.related-caption {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.65;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1000px) {
  .related-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .related-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .related-grid {
    grid-template-columns: 1fr;
  }
}
</style>