<script setup lang="ts">
import { IconLink } from '@tabler/icons-vue';

const { copy, copied, isSupported } = useClipboard();

function copyToolLink() {
  if (isSupported.value) {
    copy(window.location.href);
  }
}
</script>

<template>
  <c-tooltip :tooltip="copied ? 'Link copied' : 'Copy tool link'">
    <c-button
      variant="text"
      circle
      :disabled="!isSupported"
      :aria-label="copied ? 'Tool link copied' : 'Copy tool link'"
      :style="{ opacity: copied ? 1 : 0.45 }"
      @click="copyToolLink"
    >
      <n-icon :component="IconLink" />
    </c-button>
  </c-tooltip>
</template>
