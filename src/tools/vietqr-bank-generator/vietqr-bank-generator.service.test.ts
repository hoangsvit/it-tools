import { describe, expect, it } from 'vitest';
import {
  bankAppSearchLabel,
  bankSearchLabel,
  buildVietQrDeeplink,
  buildVietQrQuickLink,
  matchesBankQuery,
  validateVietQrDeeplinkInput,
  validateVietQrInput,
} from './vietqr-bank-generator.service';

const bank = {
  id: 43,
  name: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
  code: 'VCB',
  bin: '970436',
  shortName: 'Vietcombank',
  logo: 'https://cdn.vietqr.io/img/VCB.png',
  transferSupported: 1,
  lookupSupported: 1,
  swift_code: 'BFTVVNVX',
};

const bankApp = {
  appId: 'vcb',
  appLogo: 'https://example.test/vcb.png',
  appName: 'VCB Digibank',
  bankName: bank.name,
  monthlyInstall: 100000,
  deeplink: 'https://dl.vietqr.io/pay?app=vcb',
};

describe('VietQR bank generator service', () => {
  it('builds a Quick Link with encoded optional values', () => {
    expect(buildVietQrQuickLink({
      bankId: bank.bin,
      accountNo: '123456789',
      template: 'compact2',
      amount: '79000',
      description: 'Invoice 2026',
      accountName: 'EPLUS DEV',
    })).toBe('https://img.vietqr.io/image/970436-123456789-compact2.png?amount=79000&addInfo=Invoice+2026&accountName=EPLUS+DEV');
  });

  it('builds a VietQR bank app deeplink with payment hints', () => {
    expect(buildVietQrDeeplink({
      appId: bankApp.appId,
      accountNo: '123456789',
      bankCode: bank.code,
      amount: '79000',
      description: 'Invoice 2026',
      accountName: 'EPLUS DEV',
      returnUrl: 'https://tools.eplus.dev/done',
    })).toBe('https://dl.vietqr.io/pay?app=vcb&ba=123456789%40vcb&am=79000&tn=Invoice+2026&bn=EPLUS+DEV&url=https%3A%2F%2Ftools.eplus.dev%2Fdone');
  });

  it('rejects invalid account numbers and amounts', () => {
    const result = validateVietQrInput({
      bankId: bank.bin,
      accountNo: 'bad account!',
      template: 'compact',
      amount: '-100',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('validates deeplink app, recipient bank and return URL', () => {
    const result = validateVietQrDeeplinkInput({
      appId: '',
      accountNo: '123456789',
      bankCode: '!',
      returnUrl: 'javascript:alert(1)',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });

  it('supports lookup by bank name, BIN, code and SWIFT/BIC', () => {
    expect(matchesBankQuery(bank, 'vietcom')).toBe(true);
    expect(matchesBankQuery(bank, '970436')).toBe(true);
    expect(matchesBankQuery(bank, 'vcb')).toBe(true);
    expect(matchesBankQuery(bank, 'bftvvnvx')).toBe(true);
    expect(matchesBankQuery(bank, 'not-a-bank')).toBe(false);
  });

  it('creates useful bank and app search labels', () => {
    expect(bankSearchLabel(bank)).toContain('Vietcombank');
    expect(bankSearchLabel(bank)).toContain('970436');
    expect(bankSearchLabel(bank)).toContain('BFTVVNVX');
    expect(bankAppSearchLabel(bankApp)).toContain('VCB Digibank');
    expect(bankAppSearchLabel(bankApp)).toContain('vcb');
  });
});
