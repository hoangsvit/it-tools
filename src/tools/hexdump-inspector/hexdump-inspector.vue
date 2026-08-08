<script setup lang="ts">
import { useCopy } from '@/composable/copy';
import { hexToText, isValidHexInput, textToHexdump } from './hexdump-inspector.service';

const textInput = ref('Hello, ePlus.DEV!');
const hexInput = ref('48 65 6c 6c 6f');
const decodeError = ref('');

const hexdump = computed(() => textToHexdump(textInput.value));
const decodedText = computed(() => {
  decodeError.value = '';
  if (!hexInput.value.trim()) {
    return '';
  }

  try {
    return hexToText(hexInput.value);
  }
  catch (error) {
    decodeError.value = error instanceof Error ? error.message : 'Invalid hex input.';
    return '';
  }
});

const { copy: copyHexdump } = useCopy({ source: hexdump, text: 'Hexdump copied to the clipboard' });
const { copy: copyDecodedText } = useCopy({ source: decodedText, text: 'Decoded text copied to the clipboard' });
</script>

<template>
  <c-card title="Text to hexdump">
    <c-input-text
      v-model:value="textInput"
      multiline
      raw-text
      rows="6"
      label="UTF-8 text"
      placeholder="Paste text to inspect its bytes..."
      mb-4
    />

    <c-input-text
      :value="hexdump"
      multiline
      readonly
      rows="10"
      label="Hexdump"
      placeholder="Byte offsets, hex values and ASCII preview will appear here"
      mb-4
    />

    <div flex justify-center>
      <c-button :disabled="!hexdump" @click="copyHexdump()">
        Copy hexdump
      </c-button>
    </div>
  </c-card>

  <c-card title="Hex bytes to UTF-8 text">
    <c-input-text
      v-model:value="hexInput"
      multiline
      raw-text
      rows="6"
      label="Hex bytes"
      placeholder="48 65 6c 6c 6f or 0x48 0x65..."
      mb-3
    />

    <n-alert v-if="hexInput.trim() && !isValidHexInput(hexInput)" type="warning" :bordered="false" mb-4>
      Hex input must contain complete byte pairs.
    </n-alert>

    <n-alert v-if="decodeError" type="error" :bordered="false" mb-4>
      {{ decodeError }}
    </n-alert>

    <c-input-text
      :value="decodedText"
      multiline
      readonly
      rows="6"
      label="Decoded UTF-8 text"
      placeholder="Decoded text will appear here"
      mb-4
    />

    <div flex justify-center>
      <c-button :disabled="!decodedText" @click="copyDecodedText()">
        Copy decoded text
      </c-button>
    </div>
  </c-card>
</template>
