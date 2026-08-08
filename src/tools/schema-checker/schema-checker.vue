<script setup lang="ts">
import { useCopy } from '@/composable/copy';
import { auditSchema } from './schema-checker.service';

const input = ref('');
const result = computed(() => auditSchema(input.value));
const report = computed(() => JSON.stringify({
  summary: result.value.items,
  entities: result.value.entities.map(entity => ({ type: entity.type, raw: entity.raw })),
}, null, 2));
const { copy } = useCopy({ source: report, text: 'Schema audit report copied to the clipboard' });

function levelType(level: string) {
  if (level === 'error') return 'error';
  if (level === 'warning') return 'warning';
  if (level === 'passed') return 'success';
  return 'info';
}
</script>

<template>
  <c-card title="Schema checker">
    <c-input-text
      v-model:value="input"
      multiline
      rows="14"
      raw-text
      label="HTML or JSON-LD"
      placeholder="Paste a full HTML document or a JSON-LD object here..."
      mb-4
    />

    <div v-if="input.trim()" flex flex-col gap-3>
      <n-alert
        v-for="(item, index) in result.items"
        :key="`${item.level}-${index}`"
        :type="levelType(item.level)"
        :title="item.path || item.level.toUpperCase()"
      >
        {{ item.message }}
      </n-alert>

      <c-card v-if="result.entities.length" title="Detected entities">
        <div v-for="(entity, index) in result.entities" :key="index" mb-3>
          <strong>{{ entity.type.join(', ') }}</strong>
          <pre mt-2 overflow-auto>{{ JSON.stringify(entity.raw, null, 2) }}</pre>
        </div>
      </c-card>

      <div flex justify-center>
        <c-button @click="copy()">Copy JSON report</c-button>
      </div>
    </div>
  </c-card>
</template>
