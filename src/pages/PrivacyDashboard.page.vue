<script setup lang="ts">
import { IconExternalLink, IconLock, IconNetwork, IconShieldCheck } from '@tabler/icons-vue';
import { useHead } from '@vueuse/head';
import { useToolStore } from '@/tools/tools.store';
import { createSeoHead } from '@/utils/seo';

const toolStore = useToolStore();
const query = ref('');
const mode = ref<'all' | 'local' | 'external' | 'mixed'>('all');

useHead(createSeoHead({
  title: 'Privacy Dashboard',
  description: 'See which developer tools run locally in your browser, which capabilities they use, and whether any tool sends data to external services.',
  path: '/privacy',
  keywords: ['privacy', 'local tools', 'browser tools', 'developer privacy', 'ePlus.DEV'],
}));

const stats = computed(() => {
  const tools = toolStore.tools;
  return {
    total: tools.length,
    local: tools.filter(tool => tool.privacy?.mode === 'local').length,
    external: tools.filter(tool => tool.privacy?.mode === 'external').length,
    mixed: tools.filter(tool => tool.privacy?.mode === 'mixed').length,
    offline: tools.filter(tool => tool.capabilities?.includes('offline')).length,
  };
});

const filteredTools = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase();
  return toolStore.tools.filter((tool) => {
    const privacyMode = tool.privacy?.mode ?? 'local';
    if (mode.value !== 'all' && privacyMode !== mode.value) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return `${tool.name} ${tool.description} ${tool.category} ${tool.origin ?? ''} ${(tool.capabilities ?? []).join(' ')}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
});

function modeLabel(toolMode?: string) {
  if (toolMode === 'external') {
    return 'External processing';
  }
  if (toolMode === 'mixed') {
    return 'Mixed';
  }
  return 'Local only';
}
</script>

<template>
  <div class="privacy-page">
    <div class="grid-wrapper">
      <header class="privacy-hero">
        <div>
          <div class="privacy-kicker">
            Privacy is a product feature
          </div>
          <h1>Know where your data goes.</h1>
          <p>
            Every tool exposes a privacy mode and capabilities. Local-only tools process input in this browser;
            tools that need network access can declare that explicitly instead of hiding it in implementation details.
          </p>
        </div>
        <div class="hero-badge">
          <n-icon :component="IconShieldCheck" size="28" />
          <div>
            <strong>{{ stats.local }}/{{ stats.total }}</strong>
            <span>tools declared local</span>
          </div>
        </div>
      </header>

      <section class="stat-grid">
        <article>
          <n-icon :component="IconLock" />
          <strong>{{ stats.local }}</strong>
          <span>Local only</span>
        </article>
        <article>
          <n-icon :component="IconNetwork" />
          <strong>{{ stats.external }}</strong>
          <span>External</span>
        </article>
        <article>
          <n-icon :component="IconExternalLink" />
          <strong>{{ stats.mixed }}</strong>
          <span>Mixed</span>
        </article>
        <article>
          <n-icon :component="IconShieldCheck" />
          <strong>{{ stats.offline }}</strong>
          <span>Offline capable</span>
        </article>
      </section>

      <section class="privacy-shell">
        <div class="filters">
          <n-input v-model:value="query" clearable placeholder="Search tool, category or capability..." />
          <n-select
            v-model:value="mode"
            :options="[
              { label: 'All privacy modes', value: 'all' },
              { label: 'Local only', value: 'local' },
              { label: 'External processing', value: 'external' },
              { label: 'Mixed', value: 'mixed' },
            ]"
          />
        </div>

        <div class="tool-list">
          <router-link v-for="tool in filteredTools" :key="tool.path" :to="tool.path" class="privacy-tool">
            <div class="tool-main">
              <div class="tool-title-row">
                <strong>{{ tool.name }}</strong>
                <span class="privacy-pill" :class="`mode-${tool.privacy?.mode ?? 'local'}`">
                  {{ modeLabel(tool.privacy?.mode) }}
                </span>
              </div>
              <p>{{ tool.privacy?.summary ?? 'Input is processed locally in your browser.' }}</p>
              <div class="tool-meta">
                <span>{{ tool.category }}</span>
                <span>{{ tool.origin ?? 'core' }}</span>
                <span v-for="capability in tool.capabilities ?? []" :key="capability">{{ capability }}</span>
              </div>
            </div>
            <span class="open-arrow">→</span>
          </router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="less">
.privacy-page {
  padding: 42px 0 64px;
}

.privacy-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 24px;
  margin-bottom: 20px;

  h1 {
    margin: 5px 0 10px;
    font-size: clamp(28px, 4vw, 44px);
    line-height: 1.04;
  }

  p {
    max-width: 780px;
    margin: 0;
    opacity: 0.62;
    line-height: 1.65;
  }
}

.privacy-kicker {
  color: #18a058;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(24, 160, 88, 0.24);
  border-radius: 14px;
  background: rgba(24, 160, 88, 0.06);
  color: #18a058;

  div {
    display: grid;
  }

  strong {
    font-size: 20px;
  }

  span {
    opacity: 0.7;
    font-size: 11px;
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;

  article {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 2px 9px;
    padding: 12px;
    border: 1px solid rgba(128, 128, 128, 0.14);
    border-radius: 12px;
    background: rgba(128, 128, 128, 0.025);
  }

  strong {
    font-size: 18px;
  }

  span {
    grid-column: 2;
    opacity: 0.55;
    font-size: 11px;
  }
}

.privacy-shell {
  overflow: hidden;
  border: 1px solid rgba(128, 128, 128, 0.16);
  border-radius: 16px;
}

.filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
}

.tool-list {
  display: grid;
}

.privacy-tool {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
  color: inherit;
  text-decoration: none;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: rgba(24, 160, 88, 0.035);
  }
}

.tool-main {
  min-width: 0;
  flex: 1;

  p {
    margin: 5px 0 8px;
    opacity: 0.62;
    font-size: 12px;
  }
}

.tool-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.privacy-pill {
  padding: 3px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.mode-local {
  background: rgba(24, 160, 88, 0.1);
  color: #18a058;
}

.mode-external {
  background: rgba(208, 48, 80, 0.1);
  color: #d03050;
}

.mode-mixed {
  background: rgba(240, 160, 32, 0.1);
  color: #d28a10;
}

.tool-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;

  span {
    padding: 2px 6px;
    border-radius: 6px;
    background: rgba(128, 128, 128, 0.08);
    opacity: 0.68;
    font-size: 10px;
  }
}

.open-arrow {
  color: #18a058;
  font-size: 20px;
}

@media (max-width: 760px) {
  .privacy-hero {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-badge {
    width: fit-content;
  }

  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
