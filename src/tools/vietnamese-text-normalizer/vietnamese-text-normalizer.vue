<script setup lang="ts">
import { normalizeVietnameseText } from './vietnamese-text-normalizer.service';
import { useCopy } from '@/composable/copy';

const input = ref('');
const result = computed(() => normalizeVietnameseText(input.value));
const copySource = ref('');
const { copy } = useCopy({ source: copySource, text: 'Text copied to the clipboard', createToast: true });

async function copyValue(value: string) {
  copySource.value = value;
  await nextTick();
  await copy();
}
</script>

<template>
  <div class="normalizer-stack">
    <c-input-text
      v-model:value="input"
      label="Vietnamese text"
      placeholder="Nhập văn bản tiếng Việt..."
      rows="5"
      multiline
      autofocus
    />

    <div class="result-grid">
      <c-card title="Unicode NFC">
        <c-text-copyable :value="result.nfc" break-all />
      </c-card>

      <c-card title="ASCII without diacritics">
        <div class="result-value">
          {{ result.ascii || '—' }}
        </div>
        <c-button :disabled="!result.ascii" @click="copyValue(result.ascii)">
          Copy ASCII
        </c-button>
      </c-card>

      <c-card title="Compact whitespace">
        <div class="result-value">
          {{ result.compactWhitespace || '—' }}
        </div>
        <c-button :disabled="!result.compactWhitespace" @click="copyValue(result.compactWhitespace)">
          Copy compact text
        </c-button>
      </c-card>

      <c-card title="Lowercase ASCII">
        <div class="result-value monospace">
          {{ result.lowercaseAscii || '—' }}
        </div>
        <c-button :disabled="!result.lowercaseAscii" @click="copyValue(result.lowercaseAscii)">
          Copy normalized key
        </c-button>
      </c-card>
    </div>
  </div>
</template>

<style scoped>
.normalizer-stack {
  display: grid;
  gap: 16px;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.result-value {
  min-height: 52px;
  margin-bottom: 12px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.monospace {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
