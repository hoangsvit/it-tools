<script setup lang="ts">
import { useHead } from '@vueuse/head';
import { createSeoHead } from '@/utils/seo';

useHead(createSeoHead({
  title: 'About',
  description: 'About IT Tools by ePlus.DEV, a free and open-source collection of useful online utilities for developers and IT professionals.',
  path: '/about',
}));
</script>

<template>
  <c-markdown :markdown="$t('about.content')" mx-auto mt-50px max-w-600px />
</template>
