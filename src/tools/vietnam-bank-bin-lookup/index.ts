import { BuildingBank } from '@vicons/tabler';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'Vietnam bank BIN lookup',
  path: '/vietnam-bank-bin-lookup',
  description: 'Search Vietnamese banks by BIN, NAPAS code, name or SWIFT/BIC and jump directly to VietQR generation.',
  keywords: ['vietnam', 'bank', 'bin', 'napas', 'swift', 'bic', 'vietqr', 'lookup'],
  component: () => import('./vietnam-bank-bin-lookup.vue'),
  icon: BuildingBank,
  origin: 'vietnam',
  capabilities: ['text-input', 'clipboard', 'shareable-state', 'offline'],
  privacy: {
    mode: 'local',
    summary: 'Bank directory search runs entirely in your browser.',
  },
  createdAt: new Date('2026-08-08'),
});
