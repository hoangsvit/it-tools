import { defineTool } from '../tool';
import BankTransfer from '~icons/mdi/bank-transfer';

export const tool = defineTool({
  name: 'VietQR & Vietnam bank codes',
  path: '/vietqr-bank-generator',
  description: 'Search Vietnamese bank BIN and SWIFT/BIC codes, then generate a NAPAS VietQR bank-transfer payload and QR image locally in your browser.',
  keywords: ['vietqr', 'bank', 'bin', 'napas', 'swift', 'bic', 'qr', 'vietnam', 'payment', 'qribftta'],
  component: () => import('./vietqr-bank-generator.vue'),
  icon: BankTransfer,
  createdAt: new Date('2026-08-08'),
});
