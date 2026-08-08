<script setup lang="ts">
import { useCopy } from '@/composable/copy';
import { auditSeo } from './seo-checker.service';

const input = ref('');
const items = computed(() => auditSeo(input.value));
const grouped = computed(() => items.value.reduce<Record<string, typeof items.value>>((groups, item) => {
  (groups[item.category] ||= []).push(item);
  return groups;
}, {}));
const report = computed(() => JSON.stringify({ audit: items.value }, null, 2));
const { copy } = useCopy({ source: report, text: 'SEO audit report copied to the clipboard' });

function levelType(level: string) {
  if (level === 'error') return 'error';
  if (level === 'warning') return 'warning';
  if (level === 'passed') return 'success';
  return 'info';
}
</script>

<template>
  <c-card title="SEO checker">
    <c-input-text
      v-model:value="input"
      multiline
      rows="16"
      raw-text
      label="Page HTML"
      placeholder="Paste the rendered or server HTML you want to audit..."
      mb-4
    />

    <div v-if="input.trim()" flex flex-col gap-4>
      <c-card v-for="(categoryItems, category) in grouped" :key="category" :title="category">
        <n-alert
          v-for="(item, index) in categoryItems"
          :key="`${category}-${index}`"
          :type="levelType(item.level)"
          :title="item.level.toUpperCase()"
          mb-2
        >
          {{ item.message }}
        </n-alert>
      </c-card>

      <div flex justify-center>
        <c-button @click="copy()">Copy JSON report</c-button>
      </div>
    </div>
  </c-card>
</template>
