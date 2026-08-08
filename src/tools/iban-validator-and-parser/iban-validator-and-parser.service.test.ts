import { describe, expect, it } from 'vitest';
import { buildIban, computeIbanCheckDigits, normalizeIbanPart } from './iban-validator-and-parser.service';

describe('IBAN builder helpers', () => {
  it('normalizes spaces, dashes and casing', () => {
    expect(normalizeIbanPart('gb-nwbk 6016')).toBe('GBNWBK6016');
  });

  it('computes known IBAN check digits', () => {
    expect(computeIbanCheckDigits('GB', 'NWBK60161331926819')).toBe('29');
    expect(computeIbanCheckDigits('DE', '370400440532013000')).toBe('89');
  });

  it('builds known valid IBAN examples from country and BBAN', () => {
    expect(buildIban('GB', 'NWBK60161331926819')).toBe('GB29NWBK60161331926819');
    expect(buildIban('DE', '370400440532013000')).toBe('DE89370400440532013000');
  });

  it('rejects malformed country codes and BBAN values', () => {
    expect(() => computeIbanCheckDigits('G1', 'NWBK60161331926819')).toThrow();
    expect(() => computeIbanCheckDigits('GB', 'BAD!BBAN')).toThrow();
  });
});
