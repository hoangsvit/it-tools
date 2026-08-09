import { FileCode } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'Schema checker',
  path: '/schema-checker',
  description: 'Extract and validate JSON-LD structured data from HTML, with Schema.org-focused checks and Google-oriented guidance.',
  keywords: ['schema', 'schema.org', 'json-ld', 'structured data', 'seo', 'rich results', 'google', 'validator'],
  component: () => import('./schema-checker.vue'),
  icon: FileCode,
  createdAt: new Date('2026-08-09'),
  privacy: {
    mode: 'local',
    summary: 'Pasted HTML and JSON-LD are parsed locally in your browser.',
  },
  capabilities: ['text-input', 'clipboard', 'offline'],
});
