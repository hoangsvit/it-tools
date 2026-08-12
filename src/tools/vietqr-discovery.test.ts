import { describe, expect, it } from 'vitest';

import { toolsWithCategory } from './index';

describe('VietQR tool discovery', () => {
  it('keeps VietQR registered in the menu registry with searchable keywords', () => {
    const vietQrTool = toolsWithCategory.find(tool => tool.path === '/vietqr-bank-generator');

    expect(vietQrTool).toBeDefined();
    expect(vietQrTool?.category).toBe('Vietnam');
    expect(vietQrTool?.keywords).toContain('vietqr');
    expect(vietQrTool?.keywords).toContain('bank');
  });
});
