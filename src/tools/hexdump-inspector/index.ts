import { File } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'Hexdump inspector',
  path: '/hexdump-inspector',
  description: 'Turn text into a classic hex dump and decode hex bytes back into UTF-8 text in your browser.',
  keywords: ['hex', 'hexdump', 'bytes', 'binary', 'utf8', 'ascii', 'decode', 'encode', 'inspector'],
  component: () => import('./hexdump-inspector.vue'),
  icon: File,
  createdAt: new Date('2026-08-09'),
  privacy: {
    mode: 'local',
    summary: 'Text and byte conversion is performed locally in your browser.',
  },
  capabilities: ['text-input', 'clipboard', 'offline'],
});
