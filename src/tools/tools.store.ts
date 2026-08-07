import { type MaybeRef, get, useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import type { Ref } from 'vue';
import _ from 'lodash';
import type { Tool, ToolCategory, ToolWithCategory } from './tools.types';
import { findRelatedTools } from './tool-recommendations';
import { toolsWithCategory } from './index';

const MAX_RECENT_TOOLS = 8;

export const useToolStore = defineStore('tools', () => {
  const favoriteToolsName = useStorage('favoriteToolsName', []) as Ref<string[]>;
  const recentToolPaths = useStorage('recentToolPaths', []) as Ref<string[]>;
  const { t } = useI18n();

  const tools = computed<ToolWithCategory[]>(() => toolsWithCategory.map((tool) => {
    const toolI18nKey = tool.path.replace(/\//g, '');

    return ({
      ...tool,
      path: tool.path,
      name: t(`tools.${toolI18nKey}.title`, tool.name),
      description: t(`tools.${toolI18nKey}.description`, tool.description),
      category: t(`tools.categories.${tool.category.toLowerCase()}`, tool.category),
    });
  }));

  const toolsByCategory = computed<ToolCategory[]>(() => {
    return _.chain(tools.value)
      .groupBy('category')
      .map((components, name, path) => ({
        name,
        path,
        components,
      }))
      .value();
  });

  const favoriteTools = computed(() => {
    return favoriteToolsName.value
      .map(favoriteName => tools.value.find(({ name, path }) => name === favoriteName || path === favoriteName))
      .filter(Boolean) as ToolWithCategory[]; // cast because .filter(Boolean) does not remove undefined from type
  });

  const recentTools = computed(() => {
    return recentToolPaths.value
      .map(path => tools.value.find(tool => tool.path === path))
      .filter(Boolean) as ToolWithCategory[];
  });

  return {
    tools,
    favoriteTools,
    recentTools,
    toolsByCategory,
    newTools: computed(() => tools.value.filter(({ isNew }) => isNew)),

    addToolToFavorites({ tool }: { tool: MaybeRef<Tool> }) {
      const toolPath = get(tool).path;
      if (toolPath) {
        favoriteToolsName.value.push(toolPath);
      }
    },

    removeToolFromFavorites({ tool }: { tool: MaybeRef<Tool> }) {
      favoriteToolsName.value = favoriteToolsName.value.filter(name => get(tool).name !== name && get(tool).path !== name);
    },

    isToolFavorite({ tool }: { tool: MaybeRef<Tool> }) {
      return favoriteToolsName.value.includes(get(tool).name)
        || favoriteToolsName.value.includes(get(tool).path);
    },

    updateFavoriteTools(newOrder: ToolWithCategory[]) {
      favoriteToolsName.value = newOrder.map(tool => tool.path);
    },

    markToolAsRecent(path: string) {
      if (!tools.value.some(tool => tool.path === path)) {
        return;
      }

      recentToolPaths.value = [
        path,
        ...recentToolPaths.value.filter(recentPath => recentPath !== path),
      ].slice(0, MAX_RECENT_TOOLS);
    },

    clearRecentTools() {
      recentToolPaths.value = [];
    },

    getRelatedTools({ toolPath, limit = 4 }: { toolPath: string; limit?: number }) {
      const source = tools.value.find(tool => tool.path === toolPath);
      return source ? findRelatedTools({ source, tools: tools.value, limit }) : [];
    },
  };
});
