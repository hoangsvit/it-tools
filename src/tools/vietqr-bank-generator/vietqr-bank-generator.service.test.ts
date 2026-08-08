import { describe, expect, it } from 'vitest';
import {
  bankSearchLabel,
  crc16,
  formatVietQrAmount,
  makeVietQrContent,
  matchesBankQuery,
  normalizeVietQrAmount,
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
  it('matches the reference static VietQR payload', () => {
    expect(makeVietQrContent({
      bankId: '970423',
      accountNo: '0123456789',
    })).toBe('00020101021138540010A00000072701240006970423011001234567890208QRIBFTTA53037045802VN6304F64B');
  });

  it('uses a dynamic point-of-initiation method when an amount is present', () => {
    const content = makeVietQrContent({
      bankId: bank.bin,
      accountNo: '123456789',
      amount: '79000',
      description: 'Invoice 2026',
    });

    expect(content).toContain('010212');
    expect(content).toContain('540579000');
    expect(content).toContain('0812Invoice 2026');
    expect(content.endsWith(crc16(content.slice(0, -4)))).toBe(true);
  });

  it('normalizes and formats VND amounts', () => {
    expect(normalizeVietQrAmount('001,234,567 VND')).toBe('1234567');
    expect(formatVietQrAmount('001234567')).toBe('1,234,567');
  });

  it('rejects invalid bank, account, amount and accented transfer content', () => {
    const result = validateVietQrInput({
      bankId: 'VCB',
      accountNo: 'bad account!',
      amount: '-100',
      description: 'Thanh toán',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
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
