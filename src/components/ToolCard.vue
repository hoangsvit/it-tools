<script setup lang="ts">
import { useThemeVars } from 'naive-ui';
import FavoriteButton from './FavoriteButton.vue';
import type { Tool } from '@/tools/tools.types';

const props = defineProps<{ tool: Tool & { category: string } }>();
const { tool } = toRefs(props);
const theme = useThemeVars();

const privacyLabel = computed(() => {
  if (tool.value.privacy?.mode === 'external') {
    return 'External';
  }
  if (tool.value.privacy?.mode === 'mixed') {
    return 'Mixed';
  }
  if (tool.value.privacy?.mode === 'local') {
    return 'Local';
  }
  return 'Undeclared';
});
</script>

<template>
  <router-link :to="tool.path" class="decoration-none">
    <c-card class="h-full transition transition-duration-0.5s !border-2px !hover:border-primary">
      <div flex items-center justify-between>
        <n-icon class="text-neutral-400 dark:text-neutral-600" size="40" :component="tool.icon" />

        <div flex items-center gap-8px>
          <div class="privacy-mini" :class="`privacy-${tool.privacy?.mode ?? 'undeclared'}`">
            {{ privacyLabel }}
          </div>

          <div
            v-if="tool.origin && tool.origin !== 'core'"
            class="origin-mini"
          >
            {{ tool.origin === 'vietnam' ? 'VN' : tool.origin }}
          </div>

          <div
            v-if="tool.isNew"
            class="rounded-full px-8px py-3px text-xs text-white dark:text-neutral-800"
            :style="{
              'background-color': theme.primaryColor,
            }"
          >
            {{ $t('toolCard.new') }}
          </div>

          <FavoriteButton :tool="tool" />
        </div>
      </div>

      <div class="truncat my-5px text-lg text-black dark:text-white">
        {{ tool.name }}
      </div>

      <div class="line-clamp-2 text-neutral-500 dark:text-neutral-400">
        {{ tool.description }}
      </div>
    </c-card>
  </router-link>
</template>

<style scoped>
.privacy-mini,
.origin-mini {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.privacy-local {
  background: rgba(24, 160, 88, 0.1);
  color: #18a058;
}

.privacy-external {
  background: rgba(208, 48, 80, 0.1);
  color: #d03050;
}

.privacy-mixed {
  background: rgba(240, 160, 32, 0.1);
  color: #d28a10;
}

.privacy-undeclared {
  background: rgba(128, 128, 128, 0.1);
  color: rgba(128, 128, 128, 0.9);
}

.origin-mini {
  background: rgba(37, 99, 235, 0.09);
  color: #2563eb;
  text-transform: uppercase;
}
</style>
