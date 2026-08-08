import { describe, expect, it } from 'vitest';
import { normalizeBic, parseBic } from './swift-bic-validator.service';

describe('SWIFT/BIC parser', () => {
  it('normalizes spaces, hyphens and case', () => {
    expect(normalizeBic('bftv vn vx')).toBe('BFTVVNVX');
    expect(normalizeBic('bftv-vn-vx-xxx')).toBe('BFTVVNVXXXX');
  });

  it('parses an 8-character BIC and expands the head-office branch', () => {
    expect(parseBic('BFTVVNVX')).toEqual({
      normalized: 'BFTVVNVX',
      valid: true,
      institutionCode: 'BFTV',
      countryCode: 'VN',
      locationCode: 'VX',
      branchCode: 'XXX',
      bic8: 'BFTVVNVX',
      bic11: 'BFTVVNVXXXX',
    });
  });

  it('parses an 11-character BIC', () => {
    const result = parseBic('DEUTDEFF500');
    expect(result.valid).toBe(true);
    expect(result.institutionCode).toBe('DEUT');
    expect(result.countryCode).toBe('DE');
    expect(result.locationCode).toBe('FF');
    expect(result.branchCode).toBe('500');
  });

  it('rejects structurally invalid BIC values', () => {
    expect(parseBic('ABC').valid).toBe(false);
    expect(parseBic('BFTV1NVX').valid).toBe(false);
    expect(parseBic('BFTVVNVXTOOLONG').valid).toBe(false);
  });
});
