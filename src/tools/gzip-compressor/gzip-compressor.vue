<script setup lang="ts">
import { useCopy } from '@/composable/copy';
import {
  gunzipBase64ToText,
  gzipTextToBase64,
  isLikelyGzipBase64,
  supportsGzipStreams,
} from './gzip-compressor.service';

const textInput = ref('');
const gzipOutput = ref('');
const gzipInput = ref('');
const textOutput = ref('');
const compressing = ref(false);
const decompressing = ref(false);
const compressError = ref('');
const decompressError = ref('');
const supported = supportsGzipStreams();

const { copy: copyCompressed } = useCopy({ source: gzipOutput, text: 'Compressed GZip Base64 copied to the clipboard' });
const { copy: copyDecompressed } = useCopy({ source: textOutput, text: 'Decompressed text copied to the clipboard' });

async function compress() {
  compressError.value = '';
  gzipOutput.value = '';
  if (!textInput.value) {
    return;
  }

  compressing.value = true;
  try {
    gzipOutput.value = await gzipTextToBase64(textInput.value);
  }
  catch (error) {
    compressError.value = error instanceof Error ? error.message : 'Unable to compress this text.';
  }
  finally {
    compressing.value = false;
  }
}

async function decompress() {
  decompressError.value = '';
  textOutput.value = '';
  if (!gzipInput.value.trim()) {
    return;
  }

  decompressing.value = true;
  try {
    textOutput.value = await gunzipBase64ToText(gzipInput.value.trim());
  }
  catch {
    decompressError.value = 'Invalid or unsupported GZip Base64 payload.';
  }
  finally {
    decompressing.value = false;
  }
}
</script>

<template>
  <n-alert v-if="!supported" type="warning" :bordered="false" mb-4>
    This browser does not expose the Compression Streams API required by this tool.
  </n-alert>

  <c-card title="Text to GZip Base64">
    <c-input-text
      v-model:value="textInput"
      multiline
      raw-text
      rows="7"
      label="Text to compress"
      placeholder="Paste JSON, logs, XML or any UTF-8 text..."
      mb-4
    />

    <div flex justify-center mb-4>
      <c-button :disabled="!supported || !textInput" :loading="compressing" @click="compress">
        Compress with GZip
      </c-button>
    </div>

    <n-alert v-if="compressError" type="error" :bordered="false" mb-4>
      {{ compressError }}
    </n-alert>

    <c-input-text
      :value="gzipOutput"
      multiline
      readonly
      rows="7"
      label="GZip payload (Base64)"
      placeholder="Compressed Base64 output will appear here"
      mb-4
    />

    <div flex justify-center>
      <c-button :disabled="!gzipOutput" @click="copyCompressed()">
        Copy compressed payload
      </c-button>
    </div>
  </c-card>

  <c-card title="GZip Base64 to text">
    <c-input-text
      v-model:value="gzipInput"
      multiline
      raw-text
      rows="7"
      label="GZip Base64 payload"
      placeholder="Usually starts with H4sI..."
      mb-2
    />

    <n-alert v-if="gzipInput.trim() && !isLikelyGzipBase64(gzipInput)" type="warning" :bordered="false" mb-4>
      This value does not look like a standard GZip Base64 payload, but you can still try to decompress it.
    </n-alert>

    <div flex justify-center mb-4>
      <c-button :disabled="!supported || !gzipInput.trim()" :loading="decompressing" @click="decompress">
        Decompress GZip
      </c-button>
    </div>

    <n-alert v-if="decompressError" type="error" :bordered="false" mb-4>
      {{ decompressError }}
    </n-alert>

    <c-input-text
      :value="textOutput"
      multiline
      readonly
      rows="7"
      label="Decompressed text"
      placeholder="Decompressed UTF-8 text will appear here"
      mb-4
    />

    <div flex justify-center>
      <c-button :disabled="!textOutput" @click="copyDecompressed()">
        Copy decompressed text
      </c-button>
    </div>
  </c-card>
</template>
