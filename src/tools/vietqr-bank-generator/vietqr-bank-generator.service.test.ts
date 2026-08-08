import { describe, expect, it } from 'vitest';
import {
  bankSearchLabel,
  buildVietQrQuickLink,
  matchesBankQuery,
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

  it('supports lookup by bank name, BIN, code and SWIFT/BIC', () => {
    expect(matchesBankQuery(bank, 'vietcom')).toBe(true);
    expect(matchesBankQuery(bank, '970436')).toBe(true);
    expect(matchesBankQuery(bank, 'vcb')).toBe(true);
    expect(matchesBankQuery(bank, 'bftvvnvx')).toBe(true);
    expect(matchesBankQuery(bank, 'not-a-bank')).toBe(false);
  });

  it('creates a useful bank search label', () => {
    expect(bankSearchLabel(bank)).toContain('Vietcombank');
    expect(bankSearchLabel(bank)).toContain('970436');
    expect(bankSearchLabel(bank)).toContain('BFTVVNVX');
  });
});
