<script setup lang="ts">
import {
  IconClipboard,
  IconExternalLink,
  IconFile,
  IconLayoutDashboard,
  IconPlus,
  IconShieldCheck,
} from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { useCopy } from '@/composable/copy';
import { useDeveloperWorkspaceStore } from '@/modules/developer-workspace/developer-workspace.store';
import { explainWorkspaceInput } from '@/modules/developer-workspace/workspace-explain';
import {
  formatWorkspaceFileInspection,
  inspectWorkspaceFile,
  type WorkspaceFileInspection,
} from '@/modules/developer-workspace/workspace-file-inspector';
import { buildWorkspaceShareUrl, decodeWorkspaceShare } from '@/modules/developer-workspace/workspace-share';
import {
  type WorkspaceToolSuggestion,
  detectWorkspaceInput,
  suggestWorkspaceTools,
} from '@/modules/developer-workspace/workspace-suggestions';
import { useToolStore } from '@/tools/tools.store';
import { createSeoHead } from '@/utils/seo';

const route = useRoute();
const router = useRouter();
const toolStore = useToolStore();
const workspaceStore = useDeveloperWorkspaceStore();
const { copy, isSupported: clipboardSupported } = useCopy({ createToast: false });

const input = ref('');
const copiedState = ref('');
const includeDataInShare = ref(false);
const fileInspection = ref<WorkspaceFileInspection | null>(null);
const fileBusy = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const importedRecipe = ref(false);

useHead(createSeoHead({
  title: 'Developer Workbench',
  description: 'Paste developer data or drop a file, auto-detect the format, explain it, find the right tools and build shareable browser-local workflows.',
  path: '/workbench',
  keywords: ['developer workbench', 'smart input', 'file inspector', 'workflow recipe', 'privacy', 'ePlus.DEV'],
}));

onMounted(() => {
  workspaceStore.ensureActiveWorkspace();

  const recipe = typeof route.query.recipe === 'string' ? route.query.recipe : '';
  if (recipe) {
    const decoded = decodeWorkspaceShare(recipe);
    if (decoded) {
      workspaceStore.importWorkspace(decoded);
      importedRecipe.value = true;
    }
  }
});

const workspace = computed(() => workspaceStore.activeWorkspace);
const detections = computed(() => detectWorkspaceInput(input.value));
const explanation = computed(() => explainWorkspaceInput(input.value));
const suggestions = computed(() => suggestWorkspaceTools({
  value: input.value,
  tools: toolStore.tools,
  limit: 5,
}));

const recipeTools = computed(() => (workspace.value?.steps ?? [])
  .map(step => ({
    step,
    tool: toolStore.tools.find(tool => tool.path === step.toolPath),
  }))
  .filter(item => Boolean(item.tool)));

const fileSuggestions = computed(() => {
  if (!fileInspection.value) {
    return [];
  }

  const paths = fileInspection.value.kind === 'pdf'
    ? ['/pdf-signature-checker', '/base64-file-converter']
    : fileInspection.value.kind === 'json'
      ? ['/json-viewer', '/json-to-yaml-converter', '/json-minify']
      : fileInspection.value.kind === 'text'
        ? ['/text-statistics', '/hash-text']
        : ['/base64-file-converter'];

  return paths
    .map(path => toolStore.tools.find(tool => tool.path === path))
    .filter(Boolean);
});

async function copyValue(value: string, state: string) {
  if (!clipboardSupported.value || !value) {
    return;
  }

  await copy(value);
  copiedState.value = state;
  window.setTimeout(() => {
    if (copiedState.value === state) {
      copiedState.value = '';
    }
  }, 1400);
}

async function openSuggestion(suggestion: WorkspaceToolSuggestion) {
  if (input.value.trim() && clipboardSupported.value) {
    await copyValue(input.value, `open-${suggestion.toolPath}`);
  }

  window.open(router.resolve(suggestion.toolPath).href, '_blank', 'noopener,noreferrer');
}

function addSuggestionToRecipe(suggestion: WorkspaceToolSuggestion) {
  const active = workspaceStore.ensureActiveWorkspace();
  const reusable = active.steps.find(step => !step.toolPath && !step.input.trim() && !step.output.trim() && !step.notes.trim());

  if (reusable) {
    workspaceStore.updateStep(active.id, reusable.id, {
      toolPath: suggestion.toolPath,
      input: input.value,
    });
    return;
  }

  const lastStep = active.steps[active.steps.length - 1];
  if (lastStep) {
    workspaceStore.addSuggestedStep(active.id, lastStep.id, suggestion.toolPath, input.value);
  }
}

async function copyRecipeLink() {
  if (!workspace.value || typeof window === 'undefined') {
    return;
  }

  const link = buildWorkspaceShareUrl({
    workspace: workspace.value,
    includeData: includeDataInShare.value,
    baseUrl: window.location.origin,
  }).replace('/workspace?', '/workbench?');

  await copyValue(link, 'recipe-link');
}

async function inspectFile(file: File) {
  fileBusy.value = true;
  try {
    const inspection = await inspectWorkspaceFile(file);
    fileInspection.value = inspection;

    if (inspection.textPreview && ['json', 'text'].includes(inspection.kind)) {
      input.value = inspection.textPreview;
    }
    else {
      input.value = formatWorkspaceFileInspection(inspection);
    }
  }
  finally {
    fileBusy.value = false;
  }
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await inspectFile(file);
  }
  target.value = '';
}

async function onDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await inspectFile(file);
  }
}

function clearWorkbench() {
  input.value = '';
  fileInspection.value = null;
}
</script>

<template>
  <div class="workbench-page">
    <div class="grid-wrapper">
      <header class="workbench-hero">
        <div>
          <div class="hero-kicker">
            ePlus.DEV Smart Developer Workbench
          </div>
          <h1>Start with the data, not the tool.</h1>
          <p>
            Paste anything or drop a file. Workbench identifies common developer formats, explains what it sees,
            recommends the best tools and lets you turn those choices into a shareable workflow recipe.
          </p>
        </div>
        <div class="hero-actions">
          <router-link to="/workspace" class="hero-link">
            <n-icon :component="IconLayoutDashboard" />
            Full workflow editor
          </router-link>
          <router-link to="/privacy" class="hero-link">
            <n-icon :component="IconShieldCheck" />
            Privacy dashboard
          </router-link>
        </div>
      </header>

      <n-alert v-if="importedRecipe" type="success" :bordered="false" class="import-alert">
        Shared recipe imported into a new local workspace. Its steps are now editable on this device.
      </n-alert>

      <section class="workbench-grid">
        <div class="smart-input-card">
          <div class="section-heading">
            <div>
              <span class="section-kicker">Universal input</span>
              <h2>Paste text, a URL, token, config or command</h2>
            </div>
            <div class="heading-actions">
              <n-button size="small" secondary @click="fileInput?.click()">
                <template #icon>
                  <n-icon :component="IconFile" />
                </template>
                Drop / open file
              </n-button>
              <n-button size="small" quaternary :disabled="!input" @click="clearWorkbench">
                Clear
              </n-button>
            </div>
          </div>

          <input ref="fileInput" type="file" class="hidden-file-input" @change="onFileChange">

          <div class="drop-zone" @dragover.prevent @drop.prevent="onDrop">
            <n-input
              v-model:value="input"
              type="textarea"
              :autosize="{ minRows: 9, maxRows: 18 }"
              placeholder="Try JWT, JSON, URL, YAML, XML, Base64, IPv4, SQL, cron, docker run... or drop a file here"
            />
            <div v-if="fileBusy" class="file-busy">
              Inspecting file locally…
            </div>
          </div>

          <div v-if="detections.length" class="detection-row">
            <span v-for="detection in detections.slice(0, 4)" :key="detection.kind" class="detection-pill">
              {{ detection.label }} · {{ Math.round(detection.confidence * 100) }}%
            </span>
          </div>

          <div v-if="explanation" class="explain-card">
            <div class="explain-title">
              <div>
                <span>Explain mode</span>
                <strong>{{ explanation.title }}</strong>
              </div>
              <n-button size="tiny" quaternary :disabled="!input" @click="copyValue(input, 'input')">
                {{ copiedState === 'input' ? 'Copied' : 'Copy input' }}
              </n-button>
            </div>
            <p>{{ explanation.summary }}</p>
            <div class="fact-grid">
              <div v-for="fact in explanation.facts" :key="`${fact.label}-${fact.value}`">
                <span>{{ fact.label }}</span>
                <strong>{{ fact.value }}</strong>
              </div>
            </div>
          </div>
        </div>

        <aside class="side-stack">
          <section class="side-card privacy-card">
            <div class="privacy-title">
              <n-icon :component="IconShieldCheck" />
              <strong>Browser-local first</strong>
            </div>
            <p>Detection, explanation, recipe serialization and file inspection run locally. Sensitive values are excluded from shared recipes by default.</p>
            <router-link to="/privacy">Inspect all tool privacy modes →</router-link>
          </section>

          <section v-if="fileInspection" class="side-card">
            <span class="section-kicker">File inspector</span>
            <h3>{{ fileInspection.name }}</h3>
            <div class="file-facts">
              <div><span>Kind</span><strong>{{ fileInspection.kind }}</strong></div>
              <div><span>Size</span><strong>{{ fileInspection.size.toLocaleString() }} bytes</strong></div>
              <div v-if="fileInspection.width && fileInspection.height"><span>Dimensions</span><strong>{{ fileInspection.width }}×{{ fileInspection.height }}</strong></div>
              <div v-if="fileInspection.pageCount"><span>Estimated pages</span><strong>{{ fileInspection.pageCount }}</strong></div>
              <div v-if="fileInspection.sha256"><span>SHA-256</span><strong class="hash-value">{{ fileInspection.sha256 }}</strong></div>
            </div>
            <div v-if="fileSuggestions.length" class="file-tool-list">
              <router-link v-for="tool in fileSuggestions" :key="tool?.path" :to="tool?.path ?? '/'">
                {{ tool?.name }} →
              </router-link>
            </div>
          </section>
        </aside>
      </section>

      <section class="suggestions-section">
        <div class="section-heading">
          <div>
            <span class="section-kicker">Smart tool discovery</span>
            <h2>{{ suggestions.length ? 'Recommended next actions' : 'Waiting for recognizable input' }}</h2>
          </div>
        </div>

        <div v-if="suggestions.length" class="suggestion-grid">
          <article v-for="(suggestion, index) in suggestions" :key="suggestion.toolPath" class="suggestion-card">
            <div class="suggestion-rank">
              {{ index + 1 }}
            </div>
            <div class="suggestion-copy">
              <span>{{ suggestion.category }} · {{ suggestion.label }}</span>
              <strong>{{ suggestion.toolName }}</strong>
              <p>{{ suggestion.description }}</p>
            </div>
            <div class="suggestion-actions">
              <n-button size="small" secondary @click="addSuggestionToRecipe(suggestion)">
                <template #icon>
                  <n-icon :component="IconPlus" />
                </template>
                Add to recipe
              </n-button>
              <n-button size="small" type="primary" secondary @click="openSuggestion(suggestion)">
                <template #icon>
                  <n-icon :component="IconExternalLink" />
                </template>
                {{ input.trim() && clipboardSupported ? 'Copy & open' : 'Open tool' }}
              </n-button>
            </div>
          </article>
        </div>
        <div v-else class="empty-suggestions">
          Workbench will never guess aggressively. Paste recognizable data or choose a tool from the full toolbox.
        </div>
      </section>

      <section v-if="workspace" class="recipe-section">
        <div class="section-heading recipe-heading">
          <div>
            <span class="section-kicker">Workflow recipe</span>
            <h2>{{ workspace.name }}</h2>
          </div>
          <div class="recipe-actions">
            <n-checkbox v-model:checked="includeDataInShare">
              Include input/output data
            </n-checkbox>
            <n-button secondary @click="copyRecipeLink">
              <template #icon>
                <n-icon :component="IconClipboard" />
              </template>
              {{ copiedState === 'recipe-link' ? 'Copied link' : 'Copy recipe link' }}
            </n-button>
            <router-link to="/workspace" class="edit-recipe-link">
              Edit full workflow →
            </router-link>
          </div>
        </div>

        <n-alert v-if="includeDataInShare" type="warning" :bordered="false" class="recipe-warning">
          This link will contain the current step inputs, outputs and notes. Only enable this for data you are comfortable placing in a URL.
        </n-alert>

        <div class="recipe-flow">
          <template v-for="(item, index) in recipeTools" :key="item.step.id">
            <router-link :to="item.tool?.path ?? '/'" class="recipe-step">
              <span>{{ index + 1 }}</span>
              <div>
                <small>{{ item.tool?.category }}</small>
                <strong>{{ item.tool?.name }}</strong>
              </div>
            </router-link>
            <div v-if="index < recipeTools.length - 1" class="recipe-arrow">
              →
            </div>
          </template>
          <div v-if="recipeTools.length === 0" class="empty-recipe">
            Add one of the smart suggestions above to start a reusable workflow.
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="less">
.workbench-page {
  padding: 42px 0 64px;
}

.workbench-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 24px;
  margin-bottom: 20px;

  h1 {
    max-width: 860px;
    margin: 5px 0 10px;
    font-size: clamp(30px, 4vw, 46px);
    line-height: 1.03;
    letter-spacing: -0.03em;
  }

  p {
    max-width: 800px;
    margin: 0;
    opacity: 0.62;
    line-height: 1.65;
  }
}

.hero-kicker,
.section-kicker {
  color: #18a058;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-actions {
  display: grid;
  gap: 8px;
}

.hero-link,
.edit-recipe-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border: 1px solid rgba(24, 160, 88, 0.2);
  border-radius: 9px;
  color: inherit;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
}

.import-alert {
  margin-bottom: 14px;
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 14px;
}

.smart-input-card,
.side-card,
.suggestions-section,
.recipe-section {
  border: 1px solid rgba(128, 128, 128, 0.16);
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.02);
}

.smart-input-card,
.suggestions-section,
.recipe-section {
  padding: 14px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;

  h2 {
    margin: 3px 0 0;
    font-size: 18px;
  }
}

.heading-actions,
.recipe-actions,
.suggestion-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.hidden-file-input {
  display: none;
}

.drop-zone {
  position: relative;
}

.file-busy {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 5px 8px;
  border-radius: 7px;
  background: rgba(24, 160, 88, 0.1);
  color: #18a058;
  font-size: 11px;
  font-weight: 650;
}

.detection-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.detection-pill {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(24, 160, 88, 0.08);
  color: #18a058;
  font-size: 10px;
  font-weight: 700;
}

.explain-card {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.035);

  p {
    margin: 7px 0 10px;
    opacity: 0.65;
    font-size: 12px;
    line-height: 1.55;
  }
}

.explain-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  div {
    display: grid;
  }

  span {
    opacity: 0.52;
    font-size: 10px;
    text-transform: uppercase;
  }
}

.fact-grid,
.file-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 7px;

  div {
    display: grid;
    gap: 2px;
    padding: 7px 8px;
    border-radius: 8px;
    background: rgba(128, 128, 128, 0.055);
  }

  span {
    opacity: 0.5;
    font-size: 9px;
    text-transform: uppercase;
  }

  strong {
    overflow-wrap: anywhere;
    font-size: 11px;
  }
}

.side-stack {
  display: grid;
  align-content: start;
  gap: 12px;
}

.side-card {
  padding: 13px;

  h3 {
    margin: 4px 0 10px;
    font-size: 15px;
  }
}

.privacy-card {
  border-color: rgba(24, 160, 88, 0.2);
  background: rgba(24, 160, 88, 0.035);

  p {
    margin: 8px 0 10px;
    opacity: 0.65;
    font-size: 11px;
    line-height: 1.55;
  }

  a {
    color: #18a058;
    font-size: 11px;
    font-weight: 650;
    text-decoration: none;
  }
}

.privacy-title {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #18a058;
}

.hash-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px !important;
}

.file-tool-list {
  display: grid;
  gap: 4px;
  margin-top: 10px;

  a {
    color: #18a058;
    font-size: 11px;
    text-decoration: none;
  }
}

.suggestions-section,
.recipe-section {
  margin-top: 14px;
}

.suggestion-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 10px;
}

.suggestion-card {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 9px;
  padding: 11px;
  border: 1px solid rgba(128, 128, 128, 0.13);
  border-radius: 12px;
}

.suggestion-rank {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  background: rgba(24, 160, 88, 0.1);
  color: #18a058;
  font-size: 11px;
  font-weight: 750;
}

.suggestion-copy {
  min-width: 0;

  > span {
    opacity: 0.5;
    font-size: 9px;
    text-transform: uppercase;
  }

  > strong {
    display: block;
    margin-top: 2px;
    font-size: 13px;
  }

  p {
    margin: 4px 0 8px;
    opacity: 0.58;
    font-size: 11px;
    line-height: 1.45;
  }
}

.suggestion-actions {
  grid-column: 2;
}

.empty-suggestions,
.empty-recipe {
  padding: 18px;
  border: 1px dashed rgba(128, 128, 128, 0.2);
  border-radius: 11px;
  opacity: 0.58;
  font-size: 12px;
  text-align: center;
}

.recipe-heading {
  align-items: center;
}

.recipe-warning {
  margin-bottom: 10px;
}

.edit-recipe-link {
  border: 0;
  color: #18a058;
}

.recipe-flow {
  display: flex;
  align-items: stretch;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.recipe-step {
  display: flex;
  min-width: 190px;
  align-items: center;
  gap: 8px;
  padding: 9px;
  border: 1px solid rgba(128, 128, 128, 0.13);
  border-radius: 10px;
  color: inherit;
  text-decoration: none;

  > span {
    display: grid;
    width: 24px;
    height: 24px;
    place-items: center;
    border-radius: 50%;
    background: rgba(24, 160, 88, 0.1);
    color: #18a058;
    font-size: 10px;
    font-weight: 750;
  }

  div {
    display: grid;
    min-width: 0;
  }

  small {
    opacity: 0.48;
    font-size: 9px;
  }

  strong {
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.recipe-arrow {
  display: grid;
  place-items: center;
  opacity: 0.4;
}

@media (max-width: 900px) {
  .workbench-hero,
  .workbench-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
  }
}

@media (max-width: 620px) {
  .workbench-page {
    padding-top: 24px;
  }

  .section-heading,
  .recipe-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .heading-actions,
  .recipe-actions {
    justify-content: flex-start;
  }

  .suggestion-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
