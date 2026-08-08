<script setup lang="ts">
import { normalizeVietnameseText } from './vietnamese-text-normalizer.service';
import '@/modules/developer-workspace/developer-platform.i18n';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();
const input = ref('');
const result = computed(() => normalizeVietnameseText(input.value));
const copySource = ref('');
const { copy } = useCopy({ source: copySource, text: t('developerPlatform.vietnameseNormalizer.copiedToast'), createToast: true });

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
      :label="$t('developerPlatform.vietnameseNormalizer.label')"
      :placeholder="$t('developerPlatform.vietnameseNormalizer.placeholder')"
      rows="5"
      multiline
      autofocus
    />

    <div class="result-grid">
      <c-card :title="$t('developerPlatform.vietnameseNormalizer.unicodeNfc')">
        <c-text-copyable :value="result.nfc" break-all />
      </c-card>

      <c-card :title="$t('developerPlatform.vietnameseNormalizer.asciiNoDiacritics')">
        <div class="result-value">
          {{ result.ascii || '—' }}
        </div>
        <c-button :disabled="!result.ascii" @click="copyValue(result.ascii)">
          {{ $t('developerPlatform.vietnameseNormalizer.copyAscii') }}
        </c-button>
      </c-card>

      <c-card :title="$t('developerPlatform.vietnameseNormalizer.compactWhitespace')">
        <div class="result-value">
          {{ result.compactWhitespace || '—' }}
        </div>
        <c-button :disabled="!result.compactWhitespace" @click="copyValue(result.compactWhitespace)">
          {{ $t('developerPlatform.vietnameseNormalizer.copyCompact') }}
        </c-button>
      </c-card>

      <c-card :title="$t('developerPlatform.vietnameseNormalizer.lowercaseAscii')">
        <div class="result-value monospace">
          {{ result.lowercaseAscii || '—' }}
        </div>
        <c-button :disabled="!result.lowercaseAscii" @click="copyValue(result.lowercaseAscii)">
          {{ $t('developerPlatform.vietnameseNormalizer.copyNormalized') }}
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
