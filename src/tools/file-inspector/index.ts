import { File } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'Browser file inspector',
  path: '/file-inspector',
  description: 'Inspect common file signatures, metadata, dimensions, text previews and SHA-256 without uploading the file.',
  keywords: ['file', 'inspect', 'metadata', 'sha256', 'png', 'jpeg', 'pdf', 'zip', 'binary', 'local'],
  component: () => import('./file-inspector.vue'),
  icon: File,
  origin: 'eplus',
  capabilities: ['file-input', 'clipboard', 'offline', 'sensitive-data'],
  privacy: {
    mode: 'local',
    summary: 'Selected files are inspected entirely in your browser and are never uploaded.',
  },
  createdAt: new Date('2026-08-08'),
});
