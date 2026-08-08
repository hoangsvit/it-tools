import { describe, expect, it } from 'vitest';
import {
  bankSearchLabel,
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
  it('matches the vietqr.net reference payload without amount', () => {
    expect(makeVietQrContent({
      bankId: '970423',
      accountNo: '0123456789',
    })).toBe('00020101021138540010A00000072701240006970423011001234567890208QRIBFTTA53037045802VN6304F64B');
  });

  it('matches the vietqr.net reference payload with amount', () => {
    expect(makeVietQrContent({
      bankId: '963388',
      accountNo: '3456789143',
      amount: '2345123',
    })).toBe('00020101021138540010A00000072701240006963388011034567891430208QRIBFTTA5303704540723451235802VN6304EBDA');
  });

  it('matches the vietqr.net reference payload with amount and transfer content', () => {
    expect(makeVietQrContent({
      bankId: '963388',
      accountNo: '3456789143',
      amount: '2345123',
      description: 'thanh toan hoa don',
    })).toBe('00020101021138540010A00000072701240006963388011034567891430208QRIBFTTA5303704540723451235802VN62220818thanh toan hoa don630445F2');
  });

  it('normalizes and formats VND amounts', () => {
    expect(normalizeVietQrAmount('001,234,567 VND')).toBe('1234567');
    expect(formatVietQrAmount('001234567')).toBe('1,234,567');
  });

  it('never turns a negative raw amount into a positive QR payload', () => {
    expect(validateVietQrInput({
      bankId: '970436',
      accountNo: '123456789',
      amount: '-100',
    }).valid).toBe(false);

    expect(makeVietQrContent({
      bankId: '970436',
      accountNo: '123456789',
      amount: '-100',
    })).toBe('');
  });

  it('accepts account identifiers up to 25 letters or digits', () => {
    expect(validateVietQrInput({
      bankId: '970436',
      accountNo: '1234567890123456789012345',
    }).valid).toBe(true);
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
    expect(result.errors[0]).toBe('Please choose a bank from the list.');
  });

  it('supports internal lookup by bank name, BIN, code and SWIFT/BIC', () => {
    expect(matchesBankQuery(bank, 'vietcom')).toBe(true);
    expect(matchesBankQuery(bank, '970436')).toBe(true);
    expect(matchesBankQuery(bank, 'vcb')).toBe(true);
    expect(matchesBankQuery(bank, 'bftvvnvx')).toBe(true);
    expect(matchesBankQuery(bank, 'not-a-bank')).toBe(false);
  });

  it('shows a human-friendly bank label without technical codes', () => {
    expect(bankSearchLabel(bank)).toBe('Vietcombank — Ngân hàng TMCP Ngoại Thương Việt Nam');
    expect(bankSearchLabel(bank)).not.toContain('970436');
    expect(bankSearchLabel(bank)).not.toContain('BFTVVNVX');
  });
});
