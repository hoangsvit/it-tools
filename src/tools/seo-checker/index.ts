import { Search } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'SEO checker',
  path: '/seo-checker',
  description: 'Audit pasted HTML for essential technical SEO, social metadata, headings, canonicals, robots and image accessibility.',
  keywords: ['seo', 'audit', 'meta', 'title', 'description', 'canonical', 'robots', 'open graph', 'twitter card', 'headings'],
  component: () => import('./seo-checker.vue'),
  icon: Search,
  createdAt: new Date('2026-08-09'),
  privacy: {
    mode: 'local',
    summary: 'Pasted HTML is audited entirely in your browser and is never uploaded.',
  },
  capabilities: ['text-input', 'clipboard', 'offline'],
});
