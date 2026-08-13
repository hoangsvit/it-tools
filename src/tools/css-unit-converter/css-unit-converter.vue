<script setup lang="ts">
import {
  CSS_UNIT_DEFAULT_REFERENCES,
  type CssRelativeUnit,
  convertCssUnitToPx,
  convertPxToCssUnit,
  formatCssUnitValue,
  getCssUnitFormula,
} from './css-unit-converter.service';

type PairId = 'rem' | 'em' | 'percent';
type Direction = 'px-to-relative' | 'relative-to-px';

const { locale } = useI18n();
const isVietnamese = computed(() => locale.value === 'vi');

const copyState = ref<'idle' | 'copied'>('idle');
const pair = ref<PairId>('rem');
const direction = ref<Direction>('px-to-relative');
const inputValue = ref<number | null>(16);
const referencePx = ref<number | null>(CSS_UNIT_DEFAULT_REFERENCES.rem);

const pairConfig: Record<PairId, {
  relativeUnit: CssRelativeUnit
  label: string
  referenceLabel: { en: string; vi: string }
  referenceHint: { en: string; vi: string }
}> = {
  rem: {
    relativeUnit: 'rem',
    label: 'PX ↔ REM',
    referenceLabel: { en: 'Root font size', vi: 'Cỡ chữ gốc (root)' },
    referenceHint: {
      en: 'REM is relative to the root <html> font size. Browsers commonly default to 16px.',
      vi: 'REM dựa trên cỡ chữ của phần tử <html>. Trình duyệt thường mặc định là 16px.',
    },
  },
  em: {
    relativeUnit: 'em',
    label: 'PX ↔ EM',
    referenceLabel: { en: 'Parent font size', vi: 'Cỡ chữ phần tử cha' },
    referenceHint: {
      en: 'EM is relative to the relevant inherited/current font size. Set the parent/context size used by your CSS.',
      vi: 'EM phụ thuộc vào cỡ chữ của phần tử cha/ngữ cảnh hiện tại. Nhập cỡ chữ đang được CSS sử dụng.',
    },
  },
  percent: {
    relativeUnit: '%',
    label: 'PX ↔ %',
    referenceLabel: { en: 'Reference size', vi: 'Kích thước tham chiếu' },
    referenceHint: {
      en: 'Percentage needs a reference dimension. For example, 250px is 25% of a 1000px container.',
      vi: 'Phần trăm cần kích thước tham chiếu. Ví dụ 250px bằng 25% của container 1000px.',
    },
  },
};

const text = computed(() => isVietnamese.value
  ? {
      intro: 'Chuyển đổi nhanh giữa PX và các đơn vị CSS tương đối. Chọn nhóm đơn vị, nhập kích thước tham chiếu rồi đổi theo cả hai chiều.',
      value: 'Giá trị cần đổi',
      result: 'Kết quả',
      reference: pairConfig[pair.value].referenceLabel.vi,
      hint: pairConfig[pair.value].referenceHint.vi,
      swap: 'Đổi chiều',
      copy: 'Sao chép',
      copied: 'Đã sao chép',
      invalidReference: 'Kích thước tham chiếu phải lớn hơn 0px.',
      presets: 'Giá trị nhanh',
      pxToRelative: `PX → ${pairConfig[pair.value].relativeUnit.toUpperCase()}`,
      relativeToPx: `${pairConfig[pair.value].relativeUnit.toUpperCase()} → PX`,
    }
  : {
      intro: 'Quickly convert between PX and relative CSS units. Choose a unit family, set its reference size, and convert in either direction.',
      value: 'Value to convert',
      result: 'Result',
      reference: pairConfig[pair.value].referenceLabel.en,
      hint: pairConfig[pair.value].referenceHint.en,
      swap: 'Swap direction',
      copy: 'Copy',
      copied: 'Copied',
      invalidReference: 'Reference size must be greater than 0px.',
      presets: 'Quick values',
      pxToRelative: `PX → ${pairConfig[pair.value].relativeUnit.toUpperCase()}`,
      relativeToPx: `${pairConfig[pair.value].relativeUnit.toUpperCase()} → PX`,
    });

const currentRelativeUnit = computed(() => pairConfig[pair.value].relativeUnit);
const validReference = computed(() => referencePx.value !== null && Number.isFinite(referencePx.value) && referencePx.value > 0);

const result = computed(() => {
  if (inputValue.value === null || !Number.isFinite(inputValue.value) || !validReference.value || referencePx.value === null) {
    return null;
  }

  return direction.value === 'px-to-relative'
    ? convertPxToCssUnit(inputValue.value, currentRelativeUnit.value, referencePx.value)
    : convertCssUnitToPx(inputValue.value, currentRelativeUnit.value, referencePx.value);
});

const sourceUnit = computed(() => direction.value === 'px-to-relative' ? 'px' : currentRelativeUnit.value);
const targetUnit = computed(() => direction.value === 'px-to-relative' ? currentRelativeUnit.value : 'px');
const resultText = computed(() => result.value === null ? '—' : `${formatCssUnitValue(result.value)}${targetUnit.value}`);

const formula = computed(() => {
  if (result.value === null || inputValue.value === null || referencePx.value === null) {
    return '—';
  }

  return getCssUnitFormula({
    value: inputValue.value,
    unit: currentRelativeUnit.value,
    referencePx: referencePx.value,
    direction: direction.value,
    result: result.value,
  });
});

const presets = computed(() => {
  if (direction.value === 'px-to-relative') {
    return [8, 12, 14, 16, 18, 20, 24, 32, 48, 64];
  }

  return currentRelativeUnit.value === '%'
    ? [10, 25, 50, 75, 100, 125, 150]
    : [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
});

watch(pair, (nextPair) => {
  referencePx.value = CSS_UNIT_DEFAULT_REFERENCES[pairConfig[nextPair].relativeUnit];
  copyState.value = 'idle';
});

watch([inputValue, referencePx, direction], () => {
  copyState.value = 'idle';
});

function swapDirection() {
  const previousResult = result.value;
  direction.value = direction.value === 'px-to-relative' ? 'relative-to-px' : 'px-to-relative';

  if (previousResult !== null) {
    inputValue.value = previousResult;
  }
}

async function copyResult() {
  if (result.value === null) {
    return;
  }

  await navigator.clipboard.writeText(resultText.value);
  copyState.value = 'copied';
  window.setTimeout(() => {
    copyState.value = 'idle';
  }, 1400);
}
</script>

<template>
  <div class="css-unit-converter">
    <p class="intro">
      {{ text.intro }}
    </p>

    <n-radio-group v-model:value="pair" size="large" class="mode-selector">
      <n-radio-button v-for="(config, key) in pairConfig" :key="key" :value="key">
        {{ config.label }}
      </n-radio-button>
    </n-radio-group>

    <div class="converter-card">
      <div class="direction-row">
        <n-radio-group v-model:value="direction" size="small">
          <n-radio-button value="px-to-relative">
            {{ text.pxToRelative }}
          </n-radio-button>
          <n-radio-button value="relative-to-px">
            {{ text.relativeToPx }}
          </n-radio-button>
        </n-radio-group>

        <n-button secondary @click="swapDirection">
          ⇄ {{ text.swap }}
        </n-button>
      </div>

      <div class="conversion-grid">
        <div class="field-block">
          <div class="field-label">
            {{ text.value }}
          </div>
          <n-input-group>
            <n-input-number
              v-model:value="inputValue"
              :show-button="false"
              :placeholder="direction === 'px-to-relative' ? '16' : '1'"
              class="number-input"
            />
            <n-input-group-label class="unit-label">
              {{ sourceUnit }}
            </n-input-group-label>
          </n-input-group>
        </div>

        <div class="equals" aria-hidden="true">
          =
        </div>

        <div class="result-block">
          <div class="field-label">
            {{ text.result }}
          </div>
          <div class="result-value">
            <strong>{{ resultText }}</strong>
            <n-button size="small" quaternary :disabled="result === null" @click="copyResult">
              {{ copyState === 'copied' ? text.copied : text.copy }}
            </n-button>
          </div>
        </div>
      </div>

      <div class="reference-section">
        <div class="field-label">
          {{ text.reference }}
        </div>
        <n-input-group>
          <n-input-number
            v-model:value="referencePx"
            :min="0.000001"
            :show-button="false"
            class="number-input"
          />
          <n-input-group-label class="unit-label">
            px
          </n-input-group-label>
        </n-input-group>
        <p class="reference-hint">
          {{ text.hint }}
        </p>
        <n-alert v-if="!validReference" type="error" :show-icon="false" mt-2>
          {{ text.invalidReference }}
        </n-alert>
      </div>

      <div class="formula">
        <code>{{ formula }}</code>
      </div>
    </div>

    <div class="presets">
      <span>{{ text.presets }}</span>
      <div class="preset-buttons">
        <n-button v-for="preset in presets" :key="preset" size="tiny" secondary @click="inputValue = preset">
          {{ preset }}{{ sourceUnit }}
        </n-button>
      </div>
    </div>

    <div class="examples-grid">
      <div>
        <strong>PX ↔ REM</strong>
        <span>16px ↔ 1rem · 24px ↔ 1.5rem</span>
      </div>
      <div>
        <strong>PX ↔ EM</strong>
        <span>16px ↔ 1em · 32px ↔ 2em</span>
      </div>
      <div>
        <strong>PX ↔ %</strong>
        <span>250px ↔ 25% @ 1000px</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.css-unit-converter {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.intro {
  margin: 0;
  line-height: 1.6;
  opacity: 0.78;
}

.mode-selector {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
}

.mode-selector :deep(.n-radio-button) {
  width: 100%;
  text-align: center;
}

.converter-card {
  padding: 20px;
  border: 1px solid rgba(127, 127, 127, 0.2);
  border-radius: 14px;
  background: rgba(127, 127, 127, 0.04);
}

.direction-row,
.result-value,
.presets,
.preset-buttons {
  display: flex;
  align-items: center;
}

.direction-row {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.conversion-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: 14px;
}

.field-block,
.result-block,
.reference-section {
  min-width: 0;
}

.field-label {
  margin-bottom: 7px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.72;
}

.number-input {
  width: 100%;
}

.unit-label {
  width: 58px;
  justify-content: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  text-transform: lowercase;
}

.equals {
  padding-bottom: 8px;
  font-size: 22px;
  opacity: 0.45;
}

.result-value {
  justify-content: space-between;
  min-height: 34px;
  gap: 8px;
  padding: 0 4px;
}

.result-value strong {
  overflow-wrap: anywhere;
  font-size: 22px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.reference-section {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(127, 127, 127, 0.16);
}

.reference-section .n-input-group {
  max-width: 280px;
}

.reference-hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.55;
  opacity: 0.62;
}

.formula {
  margin-top: 16px;
  padding: 11px 12px;
  overflow-x: auto;
  border-radius: 8px;
  background: rgba(127, 127, 127, 0.1);
  text-align: center;
}

.formula code {
  white-space: nowrap;
  font-size: 12px;
}

.presets {
  align-items: flex-start;
  gap: 12px;
  font-size: 12px;
  opacity: 0.9;
}

.presets > span {
  flex: none;
  padding-top: 4px;
  font-weight: 600;
}

.preset-buttons {
  flex-wrap: wrap;
  gap: 6px;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.examples-grid > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 12px;
  border: 1px solid rgba(127, 127, 127, 0.16);
  border-radius: 10px;
  font-size: 11px;
}

.examples-grid span {
  opacity: 0.62;
}

@media (max-width: 640px) {
  .converter-card {
    padding: 15px;
  }

  .direction-row {
    align-items: stretch;
    flex-direction: column;
  }

  .direction-row :deep(.n-radio-group) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .direction-row :deep(.n-radio-button) {
    width: 100%;
    text-align: center;
  }

  .conversion-grid {
    grid-template-columns: 1fr;
  }

  .equals {
    display: none;
  }

  .examples-grid {
    grid-template-columns: 1fr;
  }

  .presets {
    flex-direction: column;
    gap: 7px;
  }
}
</style>
