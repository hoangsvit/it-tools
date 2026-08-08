import { File } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'GZip compressor & decompressor',
  path: '/gzip-compressor',
  description: 'Compress text to GZip or decompress Base64-encoded GZip data entirely in your browser.',
  keywords: ['gzip', 'compress', 'decompress', 'deflate', 'base64', 'archive', 'browser', 'local'],
  component: () => import('./gzip-compressor.vue'),
  icon: File,
  createdAt: new Date('2026-08-09'),
  privacy: {
    mode: 'local',
    summary: 'Compression and decompression run locally in your browser using the Compression Streams API.',
  },
  capabilities: ['text-input', 'clipboard', 'offline', 'file-export'],
});
