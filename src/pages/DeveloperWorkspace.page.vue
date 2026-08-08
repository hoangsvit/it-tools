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
import '@/modules/developer-workspace/developer-workspace.i18n';
import { useDeveloperWorkspaceStore } from '@/modules/developer-workspace/developer-workspace.store';
import type { WorkspaceStep } from '@/modules/developer-workspace/workspace.model';
import { getWorkspaceProgress } from '@/modules/developer-workspace/workspace.model';
import type { WorkspaceToolSuggestion } from '@/modules/developer-workspace/workspace-suggestions';
import { suggestWorkspaceTools } from '@/modules/developer-workspace/workspace-suggestions';
import { useToolStore } from '@/tools/tools.store';
import { createSeoHead } from '@/utils/seo';

const workspaceStore = useDeveloperWorkspaceStore();
const toolStore = useToolStore();
const router = useRouter();
const dialog = useDialog();
const { t } = useI18n();
const { copy, isSupported: clipboardSupported } = useCopy({ createToast: false });
const copiedTarget = ref('');
const pastedTarget = ref('');

useHead(createSeoHead({
  title: t('developerWorkspace.seoTitle'),
  description: t('developerWorkspace.seoDescription'),
  path: '/workspace',
  keywords: ['developer workspace', 'smart tool suggestions', 'tool chaining', 'developer workflow', 'ePlus.DEV'],
}));

onMounted(() => {
  if (workspaceStore.workspaces.length === 0) {
    workspaceStore.createWorkspace(t('developerWorkspace.initialName'));
    return;
  }
  workspaceStore.ensureActiveWorkspace();
});

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
const clipboardReadSupported = computed(() => (
  typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText)
));

function toolForStep(step: WorkspaceStep) {
  return toolStore.tools.find(tool => tool.path === step.toolPath);
}

function suggestionSource(step: WorkspaceStep) {
  const output = step.output.trim();
  if (output) {
    return {
      kind: 'output' as const,
      value: output,
    };
  }

  return {
    kind: 'input' as const,
    value: step.input.trim(),
  };
}

function suggestionsForStep(step: WorkspaceStep) {
  const source = suggestionSource(step);
  return suggestWorkspaceTools({
    value: source.value,
    tools: toolStore.tools,
    excludePaths: step.toolPath ? [step.toolPath] : [],
    limit: 3,
  });
}

function detectionLabel(suggestion?: WorkspaceToolSuggestion) {
  if (!suggestion) {
    return '';
  }
  return t(`developerPlatform.detections.${suggestion.kind}`, suggestion.label);
}

function createWorkspace() {
  workspaceStore.createWorkspace(t('developerWorkspace.numberedName', {
    number: workspaceStore.workspaces.length + 1,
  }));
}

function deleteWorkspace() {
  if (!workspace.value) {
    return;
  }

  const workspaceId = workspace.value.id;
  const workspaceName = workspace.value.name;

  dialog.warning({
    title: t('developerWorkspace.deleteTitle'),
    content: t('developerWorkspace.deleteContent', { name: workspaceName }),
    positiveText: t('developerWorkspace.delete'),
    negativeText: t('developerWorkspace.cancel'),
    onPositiveClick: () => workspaceStore.deleteWorkspace(workspaceId),
  });
}

function openTool(step: WorkspaceStep) {
  if (!step.toolPath) {
    return;
  }

  if (step.input.trim() && clipboardSupported.value) {
    copyValue(step.input, `${step.id}-launch`).catch(() => undefined);
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

async function pasteValue(stepId: string, field: 'input' | 'output') {
  if (!workspace.value || !clipboardReadSupported.value) {
    return;
  }

  const workspaceId = workspace.value.id;

  try {
    const value = await navigator.clipboard.readText();
    if (!value) {
      return;
    }

    workspaceStore.updateStep(workspaceId, stepId, { [field]: value });
    const target = `${stepId}-${field}`;
    pastedTarget.value = target;

    window.setTimeout(() => {
      if (pastedTarget.value === target) {
        pastedTarget.value = '';
      }
    }, 1400);
  }
  catch {
    // Clipboard read can be denied by browser permissions. Keep the manual textarea fallback.
  }
}

function applySuggestion(step: WorkspaceStep, suggestion: WorkspaceToolSuggestion) {
  if (!workspace.value) {
    return;
  }

  const source = suggestionSource(step);
  if (source.kind === 'output') {
    workspaceStore.addSuggestedStep(
      workspace.value.id,
      step.id,
      suggestion.toolPath,
      source.value,
    );
    return;
  }

  workspaceStore.updateStep(workspace.value.id, step.id, {
    toolPath: suggestion.toolPath,
  });
}

function copyWorkspaceJson() {
  if (workspace.value) {
    copyValue(JSON.stringify(workspace.value, null, 2), 'workspace-json').catch(() => undefined);
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
        <div class="hero-copy">
          <div class="workspace-kicker">
            {{ $t('developerWorkspace.kicker') }}
          </div>
          <h1>{{ $t('developerWorkspace.title') }}</h1>
          <p>{{ $t('developerWorkspace.intro') }}</p>
        </div>

        <div class="hero-side">
          <div class="privacy-badge">
            <span /> {{ $t('developerWorkspace.browserLocalOnly') }}
          </div>
          <div class="smart-flow">
            <div><strong>1</strong><span>{{ $t('developerWorkspace.pasteInput') }}</span></div>
            <i>→</i>
            <div><strong>2</strong><span>{{ $t('developerWorkspace.autoDetect') }}</span></div>
            <i>→</i>
            <div><strong>3</strong><span>{{ $t('developerWorkspace.addNext') }}</span></div>
          </div>
        </div>
      </header>

      <section v-if="workspace" class="workspace-shell">
        <div class="workspace-toolbar">
          <label class="field">
            <span>{{ $t('developerWorkspace.workspace') }}</span>
            <n-select
              :value="workspace.id"
              :options="workspaceOptions"
              filterable
              @update:value="workspaceStore.selectWorkspace"
            />
          </label>

          <label class="field">
            <span>{{ $t('developerWorkspace.name') }}</span>
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
              {{ copiedTarget === 'workspace-json' ? $t('developerWorkspace.copiedJson') : $t('developerWorkspace.copyJson') }}
            </n-button>
            <n-button secondary @click="createWorkspace">
              <template #icon>
                <n-icon :component="IconPlus" />
              </template>
              {{ $t('developerWorkspace.new') }}
            </n-button>
            <n-button quaternary type="error" @click="deleteWorkspace">
              <template #icon>
                <n-icon :component="IconTrash" />
              </template>
              {{ $t('developerWorkspace.delete') }}
            </n-button>
          </div>
        </div>

        <div class="workspace-status">
          <div><strong>{{ progress.configured }}/{{ progress.total }}</strong> {{ $t('developerWorkspace.toolsSelected') }}</div>
          <div><strong>{{ progress.withOutput }}</strong> {{ $t('developerWorkspace.stepsCompleted') }}</div>
          <div class="status-tip">
            {{ $t('developerWorkspace.statusTip') }}
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
              <div class="step-topline">
                <div>
                  <strong>{{ $t('developerWorkspace.step', { number: index + 1 }) }}</strong>
                  <span v-if="toolForStep(step)">· {{ toolForStep(step)?.name }}</span>
                  <span v-else>· {{ $t('developerWorkspace.pasteForSuggestion') }}</span>
                </div>

                <div class="step-controls">
                  <n-button
                    quaternary
                    circle
                    size="small"
                    :disabled="index === 0"
                    :title="$t('developerWorkspace.moveUp')"
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
                    :title="$t('developerWorkspace.moveDown')"
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
                    :title="$t('developerWorkspace.removeStep')"
                    @click="workspaceStore.removeStep(workspace.id, step.id)"
                  >
                    <template #icon>
                      <n-icon :component="IconX" />
                    </template>
                  </n-button>
                </div>
              </div>

              <div class="handoff-grid">
                <div class="payload-panel">
                  <div class="panel-heading">
                    <div>
                      <strong>{{ $t('developerWorkspace.input') }}</strong>
                      <small>{{ $t('developerWorkspace.inputHint') }}</small>
                    </div>
                    <div class="panel-actions">
                      <n-button
                        v-if="index > 0"
                        size="tiny"
                        secondary
                        :disabled="!workspace.steps[index - 1]?.output.trim()"
                        @click="workspaceStore.usePreviousOutput(workspace.id, step.id)"
                      >
                        {{ $t('developerWorkspace.usePreviousOutput') }}
                      </n-button>
                      <n-button
                        size="tiny"
                        quaternary
                        :disabled="!clipboardReadSupported"
                        @click="pasteValue(step.id, 'input')"
                      >
                        {{ pastedTarget === `${step.id}-input` ? $t('developerWorkspace.pasted') : $t('developerWorkspace.paste') }}
                      </n-button>
                      <n-button
                        size="tiny"
                        quaternary
                        :disabled="!step.input || !clipboardSupported"
                        @click="copyValue(step.input, `${step.id}-input`)"
                      >
                        {{ copiedTarget === `${step.id}-input` ? $t('developerWorkspace.copied') : $t('developerWorkspace.copy') }}
                      </n-button>
                    </div>
                  </div>
                  <n-input
                    :value="step.input"
                    type="textarea"
                    :autosize="{ minRows: 5, maxRows: 14 }"
                    :placeholder="$t('developerWorkspace.inputPlaceholder')"
                    @update:value="updateStepText(step.id, 'input', $event)"
                  />
                </div>

                <div class="handoff-arrow">
                  <n-icon :component="IconArrowRight" />
                </div>

                <div class="payload-panel">
                  <div class="panel-heading">
                    <div>
                      <strong>{{ $t('developerWorkspace.output') }}</strong>
                      <small>{{ $t('developerWorkspace.outputHint') }}</small>
                    </div>
                    <div class="panel-actions">
                      <n-button
                        size="tiny"
                        quaternary
                        :disabled="!clipboardReadSupported"
                        @click="pasteValue(step.id, 'output')"
                      >
                        {{ pastedTarget === `${step.id}-output` ? $t('developerWorkspace.pasted') : $t('developerWorkspace.pasteResult') }}
                      </n-button>
                      <n-button
                        size="tiny"
                        quaternary
                        :disabled="!step.output || !clipboardSupported"
                        @click="copyValue(step.output, `${step.id}-output`)"
                      >
                        {{ copiedTarget === `${step.id}-output` ? $t('developerWorkspace.copied') : $t('developerWorkspace.copy') }}
                      </n-button>
                      <n-button
                        v-if="index < workspace.steps.length - 1"
                        size="tiny"
                        type="primary"
                        secondary
                        :disabled="!step.output.trim()"
                        @click="workspaceStore.sendOutputToNext(workspace.id, step.id)"
                      >
                        {{ $t('developerWorkspace.sendNext') }}
                      </n-button>
                    </div>
                  </div>
                  <n-input
                    :value="step.output"
                    type="textarea"
                    :autosize="{ minRows: 5, maxRows: 14 }"
                    :placeholder="$t('developerWorkspace.outputPlaceholder')"
                    @update:value="updateStepText(step.id, 'output', $event)"
                  />
                </div>
              </div>

              <div v-if="suggestionsForStep(step).length" class="smart-suggestions">
                <div class="suggestions-heading">
                  <div>
                    <span class="smart-label">{{ $t('developerWorkspace.smartSuggestions') }}</span>
                    <strong>{{ $t('developerWorkspace.detected', { label: detectionLabel(suggestionsForStep(step)[0]) }) }}</strong>
                    <small v-if="step.output.trim()">{{ $t('developerWorkspace.basedOnOutput') }}</small>
                    <small v-else>{{ $t('developerWorkspace.basedOnInput') }}</small>
                  </div>
                  <span class="confidence-pill">
                    {{ $t('developerWorkspace.confidence', { value: Math.round((suggestionsForStep(step)[0]?.confidence ?? 0) * 100) }) }}
                  </span>
                </div>

                <div class="suggestion-list">
                  <button
                    v-for="(suggestion, suggestionIndex) in suggestionsForStep(step)"
                    :key="`${step.id}-${suggestion.toolPath}`"
                    class="suggestion-card"
                    type="button"
                    @click="applySuggestion(step, suggestion)"
                  >
                    <span class="suggestion-rank">{{ suggestionIndex + 1 }}</span>
                    <span class="suggestion-copy">
                      <span class="suggestion-meta">{{ suggestion.category }}</span>
                      <strong>{{ suggestion.toolName }}</strong>
                      <small>{{ suggestion.description }}</small>
                    </span>
                    <span class="suggestion-action">
                      {{ step.output.trim() ? $t('developerWorkspace.addNext') : $t('developerWorkspace.useTool') }} →
                    </span>
                  </button>
                </div>
              </div>

              <div
                v-else-if="step.input.trim() && !step.output.trim() && !step.toolPath"
                class="no-suggestion"
              >
                {{ $t('developerWorkspace.noSuggestion') }}
              </div>

              <div class="tool-row">
                <label class="field step-tool">
                  <span>{{ step.toolPath ? $t('developerWorkspace.selectedTool') : $t('developerWorkspace.manualSelection') }}</span>
                  <n-select
                    :value="step.toolPath"
                    :options="toolOptions"
                    filterable
                    clearable
                    :placeholder="$t('developerWorkspace.searchTools')"
                    @update:value="updateStepTool(step.id, $event)"
                  />
                </label>

                <div v-if="toolForStep(step)" class="tool-summary">
                  <div class="tool-copy">
                    <span class="tool-category">{{ toolForStep(step)?.category }}</span>
                    <div>
                      <strong>{{ toolForStep(step)?.name }}</strong>
                      <span class="tool-description">{{ toolForStep(step)?.description }}</span>
                    </div>
                  </div>
                  <n-button size="small" type="primary" secondary @click="openTool(step)">
                    <template #icon>
                      <n-icon :component="IconExternalLink" />
                    </template>
                    {{ step.input.trim() && clipboardSupported ? $t('developerWorkspace.copyInputOpen') : $t('developerWorkspace.openTool') }}
                  </n-button>
                </div>
              </div>

              <div class="notes-row">
                <span>{{ $t('developerWorkspace.notes') }}</span>
                <n-input
                  :value="step.notes"
                  :placeholder="$t('developerWorkspace.notesPlaceholder')"
                  @update:value="updateStepText(step.id, 'notes', $event)"
                />
                <n-button
                  size="small"
                  quaternary
                  :disabled="!step.input && !step.output && !step.notes"
                  @click="workspaceStore.clearStepData(workspace.id, step.id)"
                >
                  {{ $t('developerWorkspace.clearData') }}
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
            {{ $t('developerWorkspace.addBlankStep') }}
          </n-button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="less">
.workspace-page {
  padding: 42px 0 64px;
}

.workspace-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 28px;
  margin-bottom: 20px;
}

.hero-copy {
  h1 {
    max-width: 850px;
    margin: 5px 0 10px;
    font-size: clamp(28px, 4vw, 44px);
    line-height: 1.04;
    letter-spacing: -0.025em;
  }

  p {
    max-width: 780px;
    margin: 0;
    opacity: 0.62;
    line-height: 1.65;
  }
}

.workspace-kicker {
  color: #18a058;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-side {
  display: grid;
  justify-items: end;
  gap: 10px;
}

.privacy-badge {
  display: inline-flex;
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

.smart-flow {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border: 1px solid rgba(128, 128, 128, 0.15);
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.035);

  div {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  strong {
    display: grid;
    width: 20px;
    height: 20px;
    place-items: center;
    border-radius: 50%;
    background: rgba(24, 160, 88, 0.12);
    color: #18a058;
    font-size: 10px;
  }

  span,
  i {
    opacity: 0.55;
    font-size: 11px;
    font-style: normal;
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
  padding: 14px;
  border: 1px solid rgba(128, 128, 128, 0.16);
  border-radius: 13px;
  background: rgba(128, 128, 128, 0.025);
}

.step-topline,
.tool-summary,
.panel-heading,
.notes-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-topline {
  justify-content: space-between;
  margin-bottom: 10px;

  > div:first-child {
    display: flex;
    gap: 5px;
    font-size: 12px;
  }

  span {
    opacity: 0.5;
  }
}

.handoff-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 26px minmax(0, 1fr);
  align-items: center;
  gap: 6px;
}

.payload-panel {
  min-width: 0;
}

.panel-heading {
  min-height: 34px;
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

.smart-suggestions {
  margin-top: 12px;
  padding: 11px;
  border: 1px solid rgba(24, 160, 88, 0.22);
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(24, 160, 88, 0.07), rgba(24, 160, 88, 0.025));
}

.suggestions-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;

  > div {
    display: grid;
    gap: 1px;
  }

  strong {
    font-size: 13px;
  }

  small {
    opacity: 0.52;
    font-size: 10px;
  }
}

.smart-label {
  color: #18a058;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.confidence-pill {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(24, 160, 88, 0.12);
  color: #18a058;
  font-size: 10px;
  font-weight: 650;
}

.suggestion-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.suggestion-card {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  position: relative;
  min-width: 0;
  padding: 9px 9px 28px;
  border: 1px solid rgba(128, 128, 128, 0.16);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.035);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(24, 160, 88, 0.42);
    background: rgba(24, 160, 88, 0.07);
  }
}

.suggestion-rank {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 7px;
  background: rgba(24, 160, 88, 0.12);
  color: #18a058;
  font-size: 10px;
  font-weight: 750;
}

.suggestion-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
  padding-left: 2px;

  strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    display: -webkit-box;
    overflow: hidden;
    opacity: 0.5;
    font-size: 10px;
    line-height: 1.35;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}

.suggestion-meta {
  color: #18a058;
  font-size: 9px;
  font-weight: 650;
  text-transform: uppercase;
}

.suggestion-action {
  position: absolute;
  right: 9px;
  bottom: 8px;
  color: #18a058;
  font-size: 10px;
  font-weight: 700;
}

.no-suggestion {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.055);
  opacity: 0.62;
  font-size: 11px;
}

.tool-row {
  display: grid;
  grid-template-columns: minmax(220px, 0.72fr) minmax(0, 1.28fr);
  align-items: end;
  gap: 10px;
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid rgba(128, 128, 128, 0.11);
}

.step-tool {
  min-width: 0;
}

.tool-summary {
  min-width: 0;
  justify-content: space-between;
  padding: 7px 8px;
  border-radius: 9px;
  background: rgba(128, 128, 128, 0.055);
}

.tool-copy {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;

  > div {
    display: grid;
    min-width: 0;
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

.tool-description {
  overflow: hidden;
  opacity: 0.55;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
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

@media (max-width: 1000px) {
  .workspace-hero {
    grid-template-columns: 1fr;
  }

  .hero-side {
    justify-items: start;
  }

  .suggestion-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
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

  .handoff-grid,
  .tool-row {
    grid-template-columns: 1fr;
  }

  .handoff-arrow {
    transform: rotate(90deg);
  }

  .tool-summary {
    align-items: stretch;
    flex-direction: column;
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

  .smart-flow {
    width: 100%;
    overflow-x: auto;
  }

  .step-card {
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 6px;
  }

  .step-index {
    width: 24px;
    height: 24px;
  }

  .step-topline,
  .panel-heading,
  .notes-row,
  .suggestions-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .step-controls {
    justify-content: flex-end;
  }

  .panel-actions {
    flex-wrap: wrap;
  }

  .confidence-pill {
    width: fit-content;
  }

  .add-step-row {
    padding-left: 46px;
  }
}
</style>
