import { defineTool } from '../tool';
import { vietQrToolMetaMessages } from './vietqr-bank-generator.meta-i18n';
import { i18n, translate } from '@/plugins/i18n.plugin';
import BankTransfer from '~icons/mdi/bank-transfer';

Object.entries(vietQrToolMetaMessages).forEach(([locale, message]) => {
  i18n.global.mergeLocaleMessage(locale, {
    tools: {
      'vietqr-bank-generator': message,
    },
  });
});

export const tool = defineTool({
  name: translate('tools.vietqr-bank-generator.title'),
  path: '/vietqr-bank-generator',
  description: translate('tools.vietqr-bank-generator.description'),
  keywords: ['vietqr', 'bank', 'bin', 'napas', 'swift', 'bic', 'qr', 'vietnam', 'payment', 'qribftta'],
  component: () => import('./vietqr-bank-generator.vue'),
  icon: BankTransfer,
  createdAt: new Date('2026-08-08'),
});
