<script setup lang="ts">
import type { WorkspaceFileInspection } from '@/modules/developer-workspace/workspace-file-inspector';
import {
  formatWorkspaceFileInspection,
  inspectWorkspaceFile,
} from '@/modules/developer-workspace/workspace-file-inspector';
import '@/modules/developer-workspace/developer-platform.i18n';
import { useCopy } from '@/composable/copy';

const { t } = useI18n();
const inspection = ref<WorkspaceFileInspection | null>(null);
const busy = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
let latestInspectionId = 0;
const { copy } = useCopy({ createToast: true });

const fileFacts = computed(() => inspection.value
  ? [
      { label: t('developerPlatform.workbench.size'), value: `${inspection.value.size.toLocaleString()} ${t('developerPlatform.common.bytes')}` },
      { label: t('developerPlatform.fileInspector.mime'), value: inspection.value.mimeType },
      { label: t('developerPlatform.fileInspector.extension'), value: inspection.value.extension || t('developerPlatform.common.none') },
      { label: t('developerPlatform.fileInspector.kind'), value: inspection.value.kind },
    ]
  : []);

const inspectionFacts = computed(() => inspection.value
  ? [
      { label: t('developerPlatform.fileInspector.dimensions'), value: inspection.value.width && inspection.value.height ? `${inspection.value.width}×${inspection.value.height}` : t('developerPlatform.common.notAvailable') },
      { label: t('developerPlatform.fileInspector.estimatedPages'), value: inspection.value.pageCount ?? t('developerPlatform.common.notAvailable') },
      { label: t('developerPlatform.fileInspector.detectedText'), value: inspection.value.detectedTextKinds.join(', ') || t('developerPlatform.common.none') },
    ]
  : []);

async function inspect(file: File) {
  const inspectionId = ++latestInspectionId;
  busy.value = true;
  try {
    const nextInspection = await inspectWorkspaceFile(file);
    if (inspectionId === latestInspectionId) {
      inspection.value = nextInspection;
    }
  }
  finally {
    if (inspectionId === latestInspectionId) {
      busy.value = false;
    }
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
      {{ $t('developerPlatform.fileInspector.alert') }}
    </n-alert>

    <input ref="fileInput" class="hidden-input" type="file" @change="onChange">

    <button class="drop-zone" type="button" @click="fileInput?.click()" @dragover.prevent @drop.prevent="onDrop">
      <strong>{{ busy ? $t('developerPlatform.fileInspector.inspecting') : $t('developerPlatform.fileInspector.choose') }}</strong>
      <span>{{ $t('developerPlatform.fileInspector.formats') }}</span>
    </button>

    <div v-if="inspection" class="result-stack">
      <div class="result-heading">
        <div>
          <span>{{ inspection.kind }}</span>
          <h3>{{ inspection.name }}</h3>
        </div>
        <c-button @click="copyReport">
          {{ $t('developerPlatform.fileInspector.copyReport') }}
        </c-button>
      </div>

      <div class="fact-grid">
        <c-card :title="$t('developerPlatform.fileInspector.file')">
          <c-key-value-list :items="fileFacts" />
        </c-card>

        <c-card :title="$t('developerPlatform.fileInspector.inspection')">
          <c-key-value-list :items="inspectionFacts" />
        </c-card>
      </div>

      <c-card v-if="inspection.sha256" :title="$t('developerPlatform.fileInspector.sha256')">
        <c-text-copyable :value="inspection.sha256" break-all font-mono />
      </c-card>

      <c-card v-if="inspection.textPreview" :title="$t('developerPlatform.fileInspector.textPreview')">
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
