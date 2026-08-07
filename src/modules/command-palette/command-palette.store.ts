import { defineStore } from 'pinia';
import _ from 'lodash';
import type { PaletteOption } from './command-palette.types';
import { useToolStore } from '@/tools/tools.store';
import { developerWorkflows } from '@/tools/developer-workflows';
import { useFuzzySearch } from '@/composable/fuzzySearch';
import { useStyleStore } from '@/stores/style.store';

import SunIcon from '~icons/mdi/white-balance-sunny';
import GithubIcon from '~icons/mdi/github';
import BugIcon from '~icons/mdi/bug-outline';
import DiceIcon from '~icons/mdi/dice-5';
import InfoIcon from '~icons/mdi/information-outline';
import HistoryIcon from '~icons/mdi/history';
import WorkspaceIcon from '~icons/mdi/view-dashboard-outline';

export const useCommandPaletteStore = defineStore('command-palette', () => {
  const toolStore = useToolStore();
  const styleStore = useStyleStore();
  const router = useRouter();
  const searchPrompt = ref('');

  const toolsOptions = toolStore.tools.map(tool => ({
    ...tool,
    to: tool.path,
    toolCategory: tool.category,
    category: 'Tools',
  }));

  const workflowOptions: PaletteOption[] = developerWorkflows.map(workflow => ({
    name: `Workflow: ${workflow.name}`,
    description: workflow.description,
    to: workflow.paths[0],
    category: 'Workflows',
    keywords: ['workflow', 'flow', ...workflow.keywords],
  }));

  const workspaceOption: PaletteOption = {
    name: 'Developer Workspace',
    description: 'Chain tools, keep local input/output context and hand results to the next step.',
    to: '/workspace',
    icon: WorkspaceIcon,
    category: 'Pages',
    keywords: ['workspace', 'pipeline', 'chain', 'handoff', 'workflow', 'local', 'output', 'input'],
    closeOnSelect: true,
  };

  const randomToolOption: PaletteOption = {
    name: 'Random tool',
    description: 'Get a random tool from the list.',
    action: () => {
      const { path } = _.sample(toolStore.tools)!;
      router.push(path);
    },
    icon: DiceIcon,
    category: 'Tools',
    keywords: ['random', 'tool', 'pick', 'choose', 'select'],
    closeOnSelect: true,
  };

  const toggleThemeOption: PaletteOption = {
    name: 'Toggle dark mode',
    description: 'Toggle dark mode on or off.',
    action: () => styleStore.toggleDark(),
    icon: SunIcon,
    category: 'Actions',
    keywords: ['dark', 'theme', 'toggle', 'mode', 'light', 'system'],
  };

  const clearRecentOption: PaletteOption = {
    name: 'Clear recent tools',
    description: 'Clear the locally stored recently used tool history.',
    action: () => toolStore.clearRecentTools(),
    icon: HistoryIcon,
    category: 'Actions',
    keywords: ['recent', 'history', 'clear', 'privacy', 'local'],
  };

  const searchOptions: PaletteOption[] = [
    ...toolsOptions,
    ...workflowOptions,
    workspaceOption,
    randomToolOption,
    toggleThemeOption,
    clearRecentOption,
    {
      name: 'Github repository',
      href: 'https://github.com/hoangsvit/it-tools',
      category: 'External',
      description: 'View the source code of the ePlus.DEV IT Tools fork on Github.',
      keywords: ['github', 'repo', 'repository', 'source', 'code', 'eplus'],
      icon: GithubIcon,
    },
    {
      name: 'Report a bug or an issue',
      description: 'Report a bug or an issue to help improve the ePlus.DEV edition.',
      href: 'https://github.com/hoangsvit/it-tools/issues/new/choose',
      category: 'Actions',
      keywords: ['report', 'issue', 'bug', 'problem', 'error'],
      icon: BugIcon,
    },
    {
      name: 'About',
      description: 'Learn more about IT-Tools.',
      to: '/about',
      category: 'Pages',
      keywords: ['about', 'learn', 'more', 'info', 'information'],
      icon: InfoIcon,
    },
  ];

  const { searchResult } = useFuzzySearch({
    search: searchPrompt,
    data: searchOptions,
    options: {
      keys: [{ name: 'name', weight: 2 }, 'description', 'keywords', 'category'],
      threshold: 0.3,
    },
  });

  const defaultSearchResult = computed<Record<string, PaletteOption[]>>(() => {
    const recentPaths = new Set(toolStore.recentTools.map(tool => tool.path));
    const recent = toolStore.recentTools.slice(0, 5).map(tool => ({
      ...tool,
      to: tool.path,
      category: 'Recent',
    }));
    const favorites = toolStore.favoriteTools
      .filter(tool => !recentPaths.has(tool.path))
      .slice(0, 5)
      .map(tool => ({
        ...tool,
        to: tool.path,
        category: 'Favorites',
      }));

    return {
      ...(recent.length > 0 ? { Recent: recent } : {}),
      ...(favorites.length > 0 ? { Favorites: favorites } : {}),
      'Workflows': workflowOptions,
      'Quick actions': [
        workspaceOption,
        randomToolOption,
        toggleThemeOption,
        ...(recent.length > 0 ? [clearRecentOption] : []),
      ],
      ...((recent.length === 0 && favorites.length === 0)
        ? { Tools: toolsOptions.slice(0, 5) }
        : {}),
    };
  });

  const filteredSearchResult = computed(() => {
    if (searchPrompt.value.trim() === '') {
      return defaultSearchResult.value;
    }

    return _.chain(searchResult.value)
      .groupBy('category')
      .mapValues(categoryOptions => _.take(categoryOptions, 5))
      .value();
  });

  return {
    filteredSearchResult,
    searchPrompt,
  };
});
