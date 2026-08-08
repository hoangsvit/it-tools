import { defineTool } from '../tool';
import BankTransfer from '~icons/mdi/bank-transfer';

export const tool = defineTool({
  name: 'VietQR & Vietnam bank codes',
  path: '/vietqr-bank-generator',
  description: 'Search Vietnamese bank BIN and SWIFT/BIC codes, then build a VietQR Quick Link with amount and transfer content.',
  keywords: ['vietqr', 'bank', 'bin', 'napas', 'swift', 'bic', 'qr', 'vietnam', 'payment'],
  component: () => import('./vietqr-bank-generator.vue'),
  icon: BankTransfer,
  createdAt: new Date('2026-08-08'),
});
