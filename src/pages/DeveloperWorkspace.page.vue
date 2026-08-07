<script setup lang="ts">
import {
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconClipboard,
  IconExternalLink,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { computed, onMounted, ref } from 'vue';
import { useCopy } from '@/composable/copy';
import { useDeveloperWorkspaceStore } from '@/modules/developer-workspace/developer-workspace.store';
import type { WorkspaceStep } from '@/modules/developer-workspace/workspace.model';
import { getWorkspaceProgress } from '@/modules/developer-workspace/workspace.model';
import { useToolStore } from '@/tools/tools.store';
import { createSeoHead } from '@/utils/seo';

const workspaceStore = useDeveloperWorkspaceStore();
const toolStore = useToolStore();
const router = useRouter();
const dialog = useDialog();
const { copy, isSupported: clipboardSupported } = useCopy({ createToast: false });
const copiedTarget = ref('');

useHead(createSeoHead({
  title: 'Developer Workspace',
  description: 'Build local multi-step developer workflows with IT Tools, pass output between steps and keep work-in-progress private in your browser.',
  path: '/workspace',
  keywords: ['developer workspace', 'tool chaining', 'developer workflow', 'ePlus.DEV'],
}));

onMounted(() => workspaceStore.ensureActiveWorkspace(toolStore.recentTools[0]?.path ?? ''));

const workspace = computed(() => workspaceStore.activeWorkspace);
const workspaceOptions = computed(() => workspaceStore.workspaces.map(item => ({
  label: item.name,
  value: item.id,
})));
const toolOptions = computed(() => toolStore.tools.map(tool => ({
  label: tool.name,
  value: tool.path,
})));
const progress = computed(() => getWorkspaceProgress(workspace.value?.steps ?? []));

function toolForStep(step: WorkspaceStep) {
  return toolStore.tools.find(tool => tool.path === step.toolPath);
}

function createWorkspace() {
  workspaceStore.createWorkspace(
    `Workspace ${workspaceStore.workspaces.length + 1}`,
    toolStore.recentTools[0]?.path ?? '',
  );
}

function deleteWorkspace() {
  if (!workspace.value) {
    return;
  }

  const workspaceId = workspace.value.id;
  const workspaceName = workspace.value.name;

  dialog.warning({
    title: 'Delete workspace',
    content: `Delete “${workspaceName}” and its locally stored step data?`,
    positiveText: 'Delete',
    negativeText: 'Cancel',
    onPositiveClick: () => workspaceStore.deleteWorkspace(workspaceId),
  });
}

function openTool(step: WorkspaceStep) {
  if (!step.toolPath) {
    return;
  }

  window.open(router.resolve(step.toolPath).href, '_blank', 'noopener,noreferrer');
}

async function copyValue(value: string, target: string) {
  if (!clipboardSupported.value || !value) {
    return;
  }

  await copy(value);
  copiedTarget.value = target;

  window.setTimeout(() => {
    if (copiedTarget.value === target) {
      copiedTarget.value = '';
    }
  }, 1400);
}

function copyWorkspaceJson() {
  if (workspace.value) {
    copyValue(JSON.stringify(workspace.value, null, 2), 'workspace-json');
  }
}

function renameActiveWorkspace(value: string) {
  if (workspace.value) {
    workspaceStore.renameWorkspace(workspace.value.id, value);
  }
}

function updateStepTool(stepId: string, value: string | null) {
  if (workspace.value) {
    workspaceStore.updateStep(workspace.value.id, stepId, { toolPath: value ?? '' });
  }
}

function updateStepText(stepId: string, field: 'input' | 'output' | 'notes', value: string) {
  if (workspace.value) {
    workspaceStore.updateStep(workspace.value.id, stepId, { [field]: value });
  }
}
</script>

<template>
  <div class="workspace-page">
    <div class="grid-wrapper">
      <header class="workspace-hero">
        <div>
          <div class="workspace-kicker">
            ePlus.DEV Developer Workspace
          </div>
          <h1>Chain tools without losing context</h1>
          <p>
            Keep input, output and notes together, then hand a result to the next tool.
            Workspace content stays in this browser.
          </p>
        </div>
        <div class="privacy-badge">
          <span /> Browser-local only
        </div>
      </header>

      <section v-if="workspace" class="workspace-shell">
        <div class="workspace-toolbar">
          <label class="field">
            <span>Workspace</span>
            <n-select
              :value="workspace.id"
              :options="workspaceOptions"
              filterable
              @update:value="workspaceStore.selectWorkspace"
            />
          </label>

          <label class="field">
            <span>Name</span>
            <n-input
              :value="workspace.name"
              maxlength="80"
              @update:value="renameActiveWorkspace"
            />
          </label>

          <div class="toolbar-actions">
            <n-button secondary @click="copyWorkspaceJson">
              <template #icon>
                <n-icon :component="IconClipboard" />
              </template>
              {{ copiedTarget === 'workspace-json' ? 'Copied JSON' : 'Copy JSON' }}
            </n-button>
            <n-button secondary @click="createWorkspace">
              <template #icon>
                <n-icon :component="IconPlus" />
              </template>
              New
            </n-button>
            <n-button quaternary type="error" @click="deleteWorkspace">
              <template #icon>
                <n-icon :component="IconTrash" />
              </template>
              Delete
            </n-button>
          </div>
        </div>

        <div class="workspace-status">
          <div><strong>{{ progress.configured }}/{{ progress.total }}</strong> steps configured</div>
          <div><strong>{{ progress.withOutput }}</strong> steps with output</div>
          <div class="status-tip">
            Paste a result into Output, then use <b>Send to next</b>.
          </div>
        </div>

        <div class="pipeline">
          <article v-for="(step, index) in workspace.steps" :key="step.id" class="step-card">
            <div class="step-rail">
              <div class="step-index">
                {{ index + 1 }}
              </div>
              <div v-if="index < workspace.steps.length - 1" class="step-line" />
            </div>

            <div class="step-body">
              <div class="step-header">
                <label class="field step-tool">
                  <span>Tool</span>
                  <n-select
                    :value="step.toolPath"
                    :options="toolOptions"
                    filterable
                    clearable
                    placeholder="Choose a tool"
                    @update:value="updateStepTool(step.id, $event)"
                  />
                </label>

                <div class="step-controls">
                  <n-button
                    quaternary
                    circle
                    size="small"
                    :disabled="index === 0"
                    title="Move step up"
                    @click="workspaceStore.moveStep(workspace.id, step.id, -1)"
                  >
                    <template #icon>
                      <n-icon :component="IconArrowUp" />
                    </template>
                  </n-button>
                  <n-button
                    quaternary
                    circle
                    size="small"
                    :disabled="index === workspace.steps.length - 1"
                    title="Move step down"
                    @click="workspaceStore.moveStep(workspace.id, step.id, 1)"
                  >
                    <template #icon>
                      <n-icon :component="IconArrowDown" />
                    </template>
                  </n-button>
                  <n-button
                    quaternary
                    circle
                    size="small"
                    type="error"
                    title="Remove step"
                    @click="workspaceStore.removeStep(workspace.id, step.id)"
                  >
                    <template #icon>
                      <n-icon :component="IconX" />
                    </template>
                  </n-button>
                </div>
              </div>

              <div v-if="toolForStep(step)" class="tool-summary">
                <div class="tool-copy">
                  <span class="tool-category">{{ toolForStep(step)?.category }}</span>
                  <strong>{{ toolForStep(step)?.name }}</strong>
                  <span class="tool-description">{{ toolForStep(step)?.description }}</span>
                </div>
                <n-button size="small" secondary @click="openTool(step)">
                  <template #icon>
                    <n-icon :component="IconExternalLink" />
                  </template>
                  Open tool
                </n-button>
              </div>

              <div class="handoff-grid">
                <div class="payload-panel">
                  <div class="panel-heading">
                    <div>
                      <strong>Input</strong>
                      <small>Prepared for this tool</small>
                    </div>
                    <div class="panel-actions">
                      <n-button
                        v-if="index > 0"
                        size="tiny"
                        secondary
                        :disabled="!workspace.steps[index - 1]?.output.trim()"
                        @click="workspaceStore.usePreviousOutput(workspace.id, step.id)"
                      >
                        Use previous output
                      </n-button>
                      <n-button
                        size="tiny"
                        quaternary
                        :disabled="!step.input || !clipboardSupported"
                        @click="copyValue(step.input, `${step.id}-input`)"
                      >
                        {{ copiedTarget === `${step.id}-input` ? 'Copied' : 'Copy' }}
                      </n-button>
                    </div>
                  </div>
                  <n-input
                    :value="step.input"
                    type="textarea"
                    :autosize="{ minRows: 5, maxRows: 14 }"
                    placeholder="Paste or prepare input for this tool..."
                    @update:value="updateStepText(step.id, 'input', $event)"
                  />
                </div>

                <div class="handoff-arrow">
                  <n-icon :component="IconArrowRight" />
                </div>

                <div class="payload-panel">
                  <div class="panel-heading">
                    <div>
                      <strong>Output</strong>
                      <small>Result produced by this step</small>
                    </div>
                    <div class="panel-actions">
                      <n-button
                        size="tiny"
                        quaternary
                        :disabled="!step.output || !clipboardSupported"
                        @click="copyValue(step.output, `${step.id}-output`)"
                      >
                        {{ copiedTarget === `${step.id}-output` ? 'Copied' : 'Copy' }}
                      </n-button>
                      <n-button
                        v-if="index < workspace.steps.length - 1"
                        size="tiny"
                        type="primary"
                        secondary
                        :disabled="!step.output.trim()"
                        @click="workspaceStore.sendOutputToNext(workspace.id, step.id)"
                      >
                        Send to next
                      </n-button>
                    </div>
                  </div>
                  <n-input
                    :value="step.output"
                    type="textarea"
                    :autosize="{ minRows: 5, maxRows: 14 }"
                    placeholder="Paste the tool result here..."
                    @update:value="updateStepText(step.id, 'output', $event)"
                  />
                </div>
              </div>

              <div class="notes-row">
                <span>Notes</span>
                <n-input
                  :value="step.notes"
                  placeholder="Optional context, assumptions, TODOs..."
                  @update:value="updateStepText(step.id, 'notes', $event)"
                />
                <n-button
                  size="small"
                  quaternary
                  :disabled="!step.input && !step.output && !step.notes"
                  @click="workspaceStore.clearStepData(workspace.id, step.id)"
                >
                  Clear data
                </n-button>
              </div>
            </div>
          </article>
        </div>

        <div class="add-step-row">
          <n-button dashed block @click="workspaceStore.addStep(workspace.id)">
            <template #icon>
              <n-icon :component="IconPlus" />
            </template>
            Add another tool step
          </n-button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="less">
.workspace-page {
  padding: 46px 0 64px;
}

.workspace-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;

  h1 {
    margin: 4px 0 8px;
    font-size: clamp(26px, 4vw, 42px);
    line-height: 1.05;
  }

  p {
    max-width: 760px;
    margin: 0;
    opacity: 0.62;
    line-height: 1.6;
  }
}

.workspace-kicker {
  color: #18a058;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.privacy-badge {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border: 1px solid rgba(24, 160, 88, 0.24);
  border-radius: 999px;
  background: rgba(24, 160, 88, 0.07);
  font-size: 12px;

  span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #18a058;
    box-shadow: 0 0 0 4px rgba(24, 160, 88, 0.12);
  }
}

.workspace-shell {
  overflow: hidden;
  border: 1px solid rgba(128, 128, 128, 0.18);
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.025);
}

.workspace-toolbar {
  display: grid;
  grid-template-columns: minmax(190px, 0.8fr) minmax(240px, 1.2fr) auto;
  align-items: end;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.14);
}

.field {
  display: grid;
  min-width: 0;
  gap: 5px;

  > span {
    font-size: 11px;
    font-weight: 650;
    opacity: 0.52;
    text-transform: uppercase;
  }
}

.toolbar-actions,
.step-controls,
.panel-actions {
  display: flex;
  gap: 5px;
}

.toolbar-actions {
  justify-content: flex-end;
}

.workspace-status {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
  background: rgba(24, 160, 88, 0.035);
  font-size: 12px;

  strong {
    color: #18a058;
  }
}

.status-tip {
  margin-left: auto;
  opacity: 0.55;
}

.pipeline {
  padding: 16px 14px 0;
}

.step-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
}

.step-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-index {
  display: grid;
  z-index: 1;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: #18a058;
  color: white;
  font-size: 12px;
  font-weight: 750;
}

.step-line {
  width: 1px;
  flex: 1;
  min-height: 18px;
  background: rgba(24, 160, 88, 0.28);
}

.step-body {
  min-width: 0;
  margin-bottom: 14px;
  padding: 13px;
  border: 1px solid rgba(128, 128, 128, 0.16);
  border-radius: 13px;
  background: rgba(128, 128, 128, 0.025);
}

.step-header,
.tool-summary,
.panel-heading,
.notes-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-header {
  align-items: end;
}

.step-tool {
  flex: 1;
}

.tool-summary {
  justify-content: space-between;
  margin-top: 9px;
  padding: 9px 10px;
  border-radius: 9px;
  background: rgba(128, 128, 128, 0.055);
}

.tool-copy {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.tool-category {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(24, 160, 88, 0.09);
  color: #18a058;
  font-size: 10px;
  font-weight: 650;
}

.tool-description {
  overflow: hidden;
  opacity: 0.55;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.handoff-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 26px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  margin-top: 12px;
}

.payload-panel {
  min-width: 0;
}

.panel-heading {
  min-height: 32px;
  justify-content: space-between;
  margin-bottom: 6px;

  > div:first-child {
    display: grid;
  }

  strong {
    font-size: 12px;
  }

  small {
    opacity: 0.48;
    font-size: 10px;
  }
}

.handoff-arrow {
  display: grid;
  place-items: center;
  opacity: 0.32;
}

.notes-row {
  margin-top: 10px;

  > span {
    opacity: 0.5;
    font-size: 11px;
    font-weight: 650;
    text-transform: uppercase;
  }

  :deep(.n-input) {
    flex: 1;
  }
}

.add-step-row {
  padding: 0 58px 16px;
}

@media (max-width: 900px) {
  .workspace-hero,
  .tool-summary {
    align-items: stretch;
    flex-direction: column;
  }

  .workspace-toolbar {
    grid-template-columns: 1fr 1fr;
  }

  .toolbar-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .workspace-status {
    flex-wrap: wrap;
  }

  .status-tip {
    width: 100%;
    margin-left: 0;
  }

  .handoff-grid {
    grid-template-columns: 1fr;
  }

  .handoff-arrow {
    transform: rotate(90deg);
  }
}

@media (max-width: 600px) {
  .workspace-page {
    padding-top: 24px;
  }

  .workspace-toolbar {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    grid-column: auto;
  }

  .step-card {
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 6px;
  }

  .step-index {
    width: 24px;
    height: 24px;
  }

  .step-header,
  .panel-heading,
  .notes-row {
    align-items: stretch;
    flex-direction: column;
  }

  .step-controls {
    justify-content: flex-end;
  }

  .panel-actions {
    flex-wrap: wrap;
  }

  .add-step-row {
    padding-left: 46px;
  }
}
</style>
