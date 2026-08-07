<script setup lang="ts">
import { storeToRefs } from 'pinia';
import _ from 'lodash';
import { useCommandPaletteStore } from './command-palette.store';
import type { PaletteOption } from './command-palette.types';

const isModalOpen = ref(false);
const inputRef = ref();
const router = useRouter();
const isMac = computed(() => window.navigator.userAgent.toLowerCase().includes('mac'));

const commandPaletteStore = useCommandPaletteStore();
const { searchPrompt, filteredSearchResult } = storeToRefs(commandPaletteStore);

const keys = useMagicKeys({
  passive: false,
  onEventFired(e) {
    if (e.ctrlKey && e.key === 'k' && e.type === 'keydown') {
      e.preventDefault();
    }

    if (e.metaKey && e.key === 'k' && e.type === 'keydown') {
      e.preventDefault();
    }
  },
});

whenever(isModalOpen, () => inputRef.value?.focus());

whenever(keys.ctrl_k, open);
whenever(keys.meta_k, open);
whenever(keys.escape, close);

function open() {
  selectedOptionIndex.value = 0;
  return isModalOpen.value = true;
}

function close() {
  isModalOpen.value = false;
  searchPrompt.value = '';
  selectedOptionIndex.value = 0;
}

const selectedOptionIndex = ref(0);

watch(searchPrompt, () => {
  selectedOptionIndex.value = 0;
});

function handleKeydown(event: KeyboardEvent) {
  const { key } = event;
  const isEnterPressed = key === 'Enter';
  const isArrowUpOrDown = ['ArrowUp', 'ArrowDown'].includes(key);
  const isArrowDown = key === 'ArrowDown';

  if (isArrowUpOrDown) {
    event.preventDefault();
    const increment = isArrowDown ? 1 : -1;
    const maxIndex = Math.max(_.chain(filteredSearchResult.value).values().flatten().size().value() - 1, 0);

    selectedOptionIndex.value = Math.min(Math.max(selectedOptionIndex.value + increment, 0), maxIndex);

    return;
  }

  if (isEnterPressed) {
    const option = _.chain(filteredSearchResult.value)
      .values()
      .flatten()
      .nth(selectedOptionIndex.value)
      .value();

    if (option) {
      activateOption(option);
    }
  }
}

function getOptionIndex(option: PaletteOption) {
  return _.chain(filteredSearchResult.value)
    .values()
    .flatten()
    .findIndex(o => o === option)
    .value();
}

function activateOption(option: PaletteOption) {
  const { closeOnSelect } = option;

  if (option.action) {
    option.action();

    if (closeOnSelect) {
      close();
    }

    return;
  }

  const closeAfterNavigation = closeOnSelect || _.isUndefined(closeOnSelect);

  if (option.to) {
    router.push(option.to);

    if (closeAfterNavigation) {
      close();
    }
    return;
  }

  if (option.href) {
    window.open(option.href, '_blank');

    if (closeAfterNavigation) {
      close();
    }
  }
}
</script>

<template>
  <div flex-1>
    <c-button w-full important:justify-start @click="open">
      <span flex items-center gap-3 op-40>
        <icon-mdi-search />
        {{ $t('search.label') }}

        <span hidden flex-1 border border-current border-op-40 rounded border-solid px-5px py-3px sm:inline>
          {{ isMac ? 'Cmd' : 'Ctrl' }}&nbsp;+&nbsp;K
        </span>
      </span>
    </c-button>

    <c-modal v-model:open="isModalOpen" class="palette-modal" shadow-xl important:max-w-650px important:pa-12px @keydown="handleKeydown">
      <div class="palette-title">
        <span>ePlus Smart Launcher</span>
        <span>Recent · Favorites · Commands</span>
      </div>

      <c-input-text
        ref="inputRef"
        v-model:value="searchPrompt"
        raw-text
        placeholder="Search tools, recent history or commands..."
        autofocus
        clearable
      />

      <div v-for="(options, category) in filteredSearchResult" :key="category">
        <div ml-3 mt-3 text-sm font-bold text-primary op-60>
          {{ category }}
        </div>
        <command-palette-option
          v-for="option in options"
          :key="`${category}-${option.name}`"
          :option="option"
          :selected="selectedOptionIndex === getOptionIndex(option)"
          @activated="activateOption"
        />
      </div>

      <div class="palette-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>Enter</kbd> open</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </c-modal>
  </div>
</template>

<style scoped lang="less">
.palette-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 2px 6px 10px;
  font-size: 12px;
  opacity: 0.55;

  span:first-child {
    font-weight: 700;
    color: #18a058;
    opacity: 1;
  }
}

.palette-footer {
  display: flex;
  gap: 14px;
  padding: 10px 7px 2px;
  font-size: 11px;
  opacity: 0.45;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  kbd {
    min-width: 20px;
    padding: 1px 4px;
    border: 1px solid currentColor;
    border-radius: 4px;
    text-align: center;
    font-family: inherit;
  }
}

.c-input-text {
  font-size: 18px;

  ::v-deep(.input-wrapper) {
    padding: 4px;
    padding-left: 18px;
  }
}

.c-modal--overlay {
  align-items: flex-start !important;
  padding-top: 80px;
}

@media (max-width: 640px) {
  .palette-title span:last-child,
  .palette-footer {
    display: none;
  }
}
</style>
