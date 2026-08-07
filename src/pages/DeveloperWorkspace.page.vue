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
import { useClipboard } from '@vueuse/core';
import { useHead } from '@vueuse/head';
import { computed, onMounted, ref } from 'vue';
import type { WorkspaceStep } from '@/modules/developer-workspace/workspace.model';
import { getWorkspaceProgress } from '@/modules/developer-workspace/workspace.model';
import { useDeveloperWorkspaceStore } from '@/modules/developer-workspace/developer-workspace.store';
import { useToolStore } from '@/tools/tools.store';
import { createSeoHead } from '@/utils/seo';

const workspaceStore = useDeveloperWorkspaceStore();
const toolStore = useToolStore();
const router = useRouter();
const { copy, isSupported: clipboardSupported } = useClipboard();
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
  workspaceStore.createWorkspace(`Workspace ${workspaceStore.workspaces.length + 1}`, toolStore.recentTools[0]?.path ?? '');
}

function deleteWorkspace() {
  if (!workspace.value) {
    return;
  }

  if (workspaceStore.workspaces.length > 1 && !window.confirm(`Delete “${workspace.value.name}”?`)) {
    return;
  }

  workspaceStore.deleteWorkspace(workspace.value.id);
}

function openTool(step: WorkspaceStep) {
  if (!step.toolPath) {
    return;
  }

  const href = router.resolve(step.toolPath).href;
  window.open(href, '_blank', 'noopener,noreferrer');
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
  if (!workspace.value) {
    return;
  }

  copyValue(JSON.stringify(workspace.value, null, 2), 'workspace-json');
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
            Keep inputs, outputs and notes together, then hand the output of one tool to the next step.
            Everything is saved locally in this browser.
          </p>
        </div>
        <div class="privacy-badge">
          <span class="privacy-dot" />
          Browser-local only
        </div>
      </header>

      <section v-if="workspace" class="workspace-shell">
        <div class="workspace-toolbar">
          <div class="workspace-picker">
            <label>Workspace</label>
            <n-select
              :value="workspace.id"
              :options="workspaceOptions"
              filterable
              @update:value="workspaceStore.selectWorkspace"
            />
          </div>

          <div class="workspace-name">
            <label>Name</label>
            <n-input
              :value="workspace.name"
              maxlength="80"
              @update:value="value => workspaceStore.renameWorkspace(workspace.id, value)"
            />
          </div>

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
          <div>
            <strong>{{ progress.configured }}/{{ progress.total }}</strong>
            <span>steps configured</span>
          </div>
          <div>
            <strong>{{ progress.withOutput }}</strong>
            <span>steps with output</span>
          </div>
          <div class="status-tip">
            Tip: paste a tool result into Output, then use <b>Send to next</b>.
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

            <div class="step-content">
              <div class="step-header">
                <div class="step-tool-picker">
                  <span class="step-label">Tool</span>
                  <n-select
                    :value="step.toolPath"
                    :options="toolOptions"
                    filterable
                    clearable
                    placeholder="Choose a tool"
                    @update:value="value => workspaceStore.updateStep(workspace.id, step.id, { toolPath: value ?? '' })"
                  />
                </div>

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
                <div>
                  <span class="tool-category">{{ toolForStep(step)?.category }}</span>
                  <strong>{{ toolForStep(step)?.name }}</strong>
                  <span>{{ toolForStep(step)?.description }}</span>
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
                      <span>Input</span>
                      <small>Data prepared for this step</small>
                    </div>
                    <div class="panel-actions">
                      <n-button
                        v-if="index > 0"
                        size="tiny"
                        secondary
                        :disabled="!workspace.steps[index - 1]?.output"
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
                    @update:value="value => workspaceStore.updateStep(workspace.id, step.id, { input: value })"
                  />
                </div>

                <div class="handoff-arrow">
                  <n-icon :component="IconArrowRight" />
                </div>

                <div class="payload-panel">
                  <div class="panel-heading">
                    <div>
                      <span>Output</span>
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
                        :disabled="!step.output"
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
                    @update:value="value => workspaceStore.updateStep(workspace.id, step.id, { output: value })"
                  />
                </div>
              </div>

              <div class="notes-row">
                <span>Notes</span>
                <n-input
                  :value="step.notes"
                  placeholder="Optional context, assumptions, TODOs..."
                  @update:value="value => workspaceStore.updateStep(workspace.id, step.id, { notes: value })"
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
  opacity: 0.85;
}

.privacy-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #18a058;
  box-shadow: 0 0 0 4px rgba(24, 160, 88, 0.12);
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

.workspace-picker,
.workspace-name {
  display: grid;
  gap: 5px;

  label {
    font-size: 11px;
    font-weight: 650;
    opacity: 0.52;
    text-transform: uppercase;
  }
}

.toolbar-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.workspace-status {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
  background: rgba(24, 160, 88, 0.035);
  font-size: 12px;

  > div:not(.status-tip) {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
  }

  strong {
    color: #18a058;
  }

  span {
    opacity: 0.6;
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

.step-content {
  min-width: 0;
  margin-bottom: 14px;
  padding: 13px;
  border: 1px solid rgba(128, 128, 128, 0.16);
  border-radius: 13px;
  background: rgba(128, 128, 128, 0.025);
}

.step-header {
  display: flex;
  align-items: end;
  gap: 10px;
}

.step-tool-picker {
  display: grid;
  flex: 1;
  gap: 5px;
}

.step-label {
  font-size: 11px;
  font-weight: 650;
  opacity: 0.52;
  text-transform: uppercase;
}

.step-controls {
  display: flex;
  gap: 2px;
}

.tool-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 9px;
  padding: 9px 10px;
  border-radius: 9px;
  background: rgba(128, 128, 128, 0.055);

  > div {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
  }

  strong {
    flex: 0 0 auto;
    font-size: 12px;
  }

  span:last-child {
    overflow: hidden;
    opacity: 0.55;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
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
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;

  > div:first-child {
    display: grid;
  }

  span {
    font-size: 12px;
    font-weight: 650;
  }

  small {
    opacity: 0.48;
    font-size: 10px;
  }
}

.panel-actions {
  display: flex;
  gap: 4px;
}

.handoff-arrow {
  display: grid;
  place-items: center;
  opacity: 0.32;
}

.notes-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-top: 10px;

  > span {
    opacity: 0.5;
    font-size: 11px;
    font-weight: 650;
    text-transform: uppercase;
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

  .step-header {
    align-items: stretch;
    flex-direction: column;
  }

  .step-controls {
    justify-content: flex-end;
  }

  .panel-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .panel-actions {
    flex-wrap: wrap;
  }

  .notes-row {
    grid-template-columns: 1fr;
  }

  .add-step-row {
    padding-left: 46px;
  }
}
</style>
