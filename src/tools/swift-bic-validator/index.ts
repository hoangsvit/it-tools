import { defineTool } from '../tool';
import BankCheck from '~icons/mdi/bank-check';

export const tool = defineTool({
  name: 'SWIFT / BIC validator & parser',
  path: '/swift-bic-validator',
  description: 'Validate the structure of a SWIFT/BIC code and split it into institution, country, location and branch identifiers.',
  keywords: ['swift', 'bic', 'bank', 'iso9362', 'validator', 'parser', 'routing'],
  component: () => import('./swift-bic-validator.vue'),
  icon: BankCheck,
  createdAt: new Date('2026-08-08'),
});
