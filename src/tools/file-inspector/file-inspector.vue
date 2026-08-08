<script setup lang="ts">
import type { WorkspaceFileInspection } from '@/modules/developer-workspace/workspace-file-inspector';
import {
  formatWorkspaceFileInspection,
  inspectWorkspaceFile,
} from '@/modules/developer-workspace/workspace-file-inspector';
import { useCopy } from '@/composable/copy';

const inspection = ref<WorkspaceFileInspection | null>(null);
const busy = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const { copy } = useCopy({ createToast: true });

async function inspect(file: File) {
  busy.value = true;
  try {
    inspection.value = await inspectWorkspaceFile(file);
  }
  finally {
    busy.value = false;
  }
}

async function onChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await inspect(file);
  }
  target.value = '';
}

async function onDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await inspect(file);
  }
}

function copyReport() {
  if (inspection.value) {
    copy(formatWorkspaceFileInspection(inspection.value));
  }
}
</script>

<template>
  <div class="file-inspector">
    <n-alert type="info" :bordered="false">
      Files stay in this browser. The inspector reads a local preview, detects common signatures and computes SHA-256 for files up to 20 MB.
    </n-alert>

    <input ref="fileInput" class="hidden-input" type="file" @change="onChange">

    <button class="drop-zone" type="button" @click="fileInput?.click()" @dragover.prevent @drop.prevent="onDrop">
      <strong>{{ busy ? 'Inspecting locally…' : 'Drop a file here or click to choose' }}</strong>
      <span>PNG · JPEG · WebP · PDF · ZIP · GZIP · PE · JSON · text/config files</span>
    </button>

    <div v-if="inspection" class="result-stack">
      <div class="result-heading">
        <div>
          <span>{{ inspection.kind }}</span>
          <h3>{{ inspection.name }}</h3>
        </div>
        <c-button @click="copyReport">
          Copy report
        </c-button>
      </div>

      <div class="fact-grid">
        <c-card title="File">
          <c-key-value-list
            :items="[
              { label: 'Size', value: `${inspection.size.toLocaleString()} bytes` },
              { label: 'MIME', value: inspection.mimeType },
              { label: 'Extension', value: inspection.extension || 'None' },
              { label: 'Kind', value: inspection.kind },
            ]"
          />
        </c-card>

        <c-card title="Inspection">
          <c-key-value-list
            :items="[
              { label: 'Dimensions', value: inspection.width && inspection.height ? `${inspection.width}×${inspection.height}` : 'Not available' },
              { label: 'Estimated pages', value: inspection.pageCount ?? 'Not available' },
              { label: 'Detected text', value: inspection.detectedTextKinds.join(', ') || 'None' },
            ]"
          />
        </c-card>
      </div>

      <c-card v-if="inspection.sha256" title="SHA-256">
        <c-text-copyable :value="inspection.sha256" break-all font-mono />
      </c-card>

      <c-card v-if="inspection.textPreview" title="Text preview">
        <n-input :value="inspection.textPreview" type="textarea" :autosize="{ minRows: 8, maxRows: 20 }" readonly />
      </c-card>
    </div>
  </div>
</template>

<style scoped>
.file-inspector,
.result-stack {
  display: grid;
  gap: 16px;
}

.hidden-input {
  display: none;
}

.drop-zone {
  display: grid;
  min-height: 180px;
  place-items: center;
  gap: 7px;
  padding: 28px;
  border: 2px dashed rgba(24, 160, 88, 0.28);
  border-radius: 16px;
  background: rgba(24, 160, 88, 0.035);
  color: inherit;
  cursor: pointer;
  text-align: center;
}

.drop-zone strong {
  font-size: 16px;
}

.drop-zone span {
  opacity: 0.55;
  font-size: 12px;
}

.result-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.result-heading span {
  color: #18a058;
  font-size: 10px;
  font-weight: 750;
  text-transform: uppercase;
}

.result-heading h3 {
  margin: 2px 0 0;
}

.fact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 700px) {
  .fact-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
