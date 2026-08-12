import { describe, expect, it } from 'vitest';
import {
  VIETQR_MAX_AMOUNT,
  VIETQR_MAX_DESCRIPTION_LENGTH,
  bankSearchLabel,
  formatVietQrAmount,
  getVietQrDescriptionValidationError,
  isValidVietQrAccount,
  isValidVietQrAmount,
  isValidVietQrBankId,
  makeVietQrContent,
  matchesBankQuery,
  normalizeVietQrAmount,
  parseVietQrAmountInput,
  parseVietQrAmountTyping,
  sanitizeVietQrDescriptionInput,
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

  it('normalizes and formats VND amounts using locale grouping', () => {
    expect(normalizeVietQrAmount('001,234,567 VND')).toBe('1234567');
    expect(formatVietQrAmount('1234567', 'en-US')).toBe('1,234,567');
    expect(formatVietQrAmount('1234567', 'vi-VN')).toBe('1.234.567');
    expect(parseVietQrAmountInput('1,234,567')).toBe('1234567');
    expect(parseVietQrAmountInput('1.234.567')).toBe('1234567');
    expect(parseVietQrAmountInput('1 234 567')).toBe('1234567');
  });

  it('keeps live VND input stable while grouping separators move during typing', () => {
    expect(parseVietQrAmountTyping('4,324')).toBe('4324');
    expect(parseVietQrAmountTyping('4,3245')).toBe('43245');
    expect(parseVietQrAmountTyping('43.2456')).toBe('432456');
    expect(formatVietQrAmount(parseVietQrAmountTyping('4,3245'), 'vi-VN')).toBe('43.245');
  });

  it('accepts comma, dot and space formatted amounts', () => {
    expect(isValidVietQrAmount('371,891')).toBe(true);
    expect(isValidVietQrAmount('371.891')).toBe(true);
    expect(isValidVietQrAmount('371 891')).toBe(true);
    expect(parseVietQrAmountInput('371,891')).toBe('371891');

    const input = {
      bankId: '970436',
      accountNo: '123456789',
      amount: '371,891',
    };

    expect(validateVietQrInput(input).valid).toBe(true);
    expect(makeVietQrContent(input)).toContain('5406371891');
  });

  it('preserves malformed persisted amounts so validation can reject them', () => {
    expect(parseVietQrAmountInput('-100')).toBe('-100');
    expect(parseVietQrAmountInput('1.5')).toBe('1.5');
    expect(parseVietQrAmountInput('1,,000')).toBe('1,,000');
    expect(parseVietQrAmountInput('100 VND')).toBe('100 VND');

    expect(isValidVietQrAmount('-100')).toBe(false);
    expect(isValidVietQrAmount('1.5')).toBe(false);
    expect(isValidVietQrAmount('1,,000')).toBe(false);
    expect(isValidVietQrAmount('100 VND')).toBe(false);
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

  it('validates bank BIN, account identifiers and the VietQR amount boundary', () => {
    expect(isValidVietQrBankId('970436')).toBe(true);
    expect(isValidVietQrBankId('97043')).toBe(false);
    expect(isValidVietQrBankId('VCB')).toBe(false);

    expect(isValidVietQrAccount('1234567890123456789012345')).toBe(true);
    expect(isValidVietQrAccount('12345678901234567890123456')).toBe(false);
    expect(isValidVietQrAccount('bad account!')).toBe(false);

    expect(VIETQR_MAX_AMOUNT).toBe('9999999999999');
    expect(isValidVietQrAmount(VIETQR_MAX_AMOUNT)).toBe(true);
    expect(isValidVietQrAmount('10000000000000')).toBe(false);
    expect(isValidVietQrAmount('0')).toBe(false);
    expect(isValidVietQrAmount('')).toBe(true);
  });

  it('normalizes Vietnamese transfer content to unaccented text and keeps spaces', () => {
    expect(sanitizeVietQrDescriptionInput('trả tiền bảo hiểm')).toBe('tra tien bao hiem');
    expect(sanitizeVietQrDescriptionInput('Thanh toán  BH-123!')).toBe('Thanh toan BH123');
    expect(sanitizeVietQrDescriptionInput('noi\tdung\nchuyen khoan')).toBe('noi dung chuyen khoan');
  });

  it('validates transfer content length and charset separately', () => {
    expect(getVietQrDescriptionValidationError('thanh toan hoa don')).toBeNull();
    expect(getVietQrDescriptionValidationError('Thanh toán')).toBe('contentCharset');
    expect(VIETQR_MAX_DESCRIPTION_LENGTH).toBe(50);
    expect(getVietQrDescriptionValidationError('a'.repeat(VIETQR_MAX_DESCRIPTION_LENGTH))).toBeNull();
    expect(getVietQrDescriptionValidationError('a'.repeat(VIETQR_MAX_DESCRIPTION_LENGTH + 1))).toBe('contentLength');
  });

  it('accepts account identifiers up to 25 letters or digits', () => {
    expect(validateVietQrInput({
      bankId: '970436',
      accountNo: '1234567890123456789012345',
    }).valid).toBe(true);
  });

  it('rejects invalid input with stable validation keys', () => {
    const result = validateVietQrInput({
      bankId: 'VCB',
      accountNo: 'bad account!',
      amount: '-100',
      description: 'Thanh toán',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['chooseBank', 'account', 'amount', 'contentCharset']);
  });

  it('rejects malformed thousands separators instead of silently repairing persisted values', () => {
    const result = validateVietQrInput({
      bankId: '970436',
      accountNo: '123456789',
      amount: '1,,000',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('amount');
    expect(makeVietQrContent({
      bankId: '970436',
      accountNo: '123456789',
      amount: '1,,000',
    })).toBe('');
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
