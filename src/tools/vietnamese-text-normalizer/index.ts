import { Language } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'Vietnamese text normalizer',
  path: '/vietnamese-text-normalizer',
  description: 'Normalize Vietnamese Unicode, remove diacritics, compact whitespace and create ASCII comparison keys locally.',
  keywords: ['vietnamese', 'unicode', 'nfc', 'diacritics', 'ascii', 'normalize', 'tiếng việt'],
  component: () => import('./vietnamese-text-normalizer.vue'),
  icon: Language,
  origin: 'vietnam',
  capabilities: ['text-input', 'clipboard', 'shareable-state', 'offline', 'sensitive-data'],
  privacy: {
    mode: 'local',
    summary: 'Vietnamese text is normalized entirely in your browser.',
  },
  createdAt: new Date('2026-08-08'),
});
