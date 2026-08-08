import { describe, expect, it } from 'vitest';
import {
  compactVietnameseWhitespace,
  normalizeVietnameseText,
  stripVietnameseDiacritics,
} from './vietnamese-text-normalizer.service';

describe('Vietnamese text normalizer', () => {
  it('removes Vietnamese diacritics including đ/Đ', () => {
    expect(stripVietnameseDiacritics('Đặng Thị Hồng')).toBe('Dang Thi Hong');
  });

  it('compacts repeated whitespace', () => {
    expect(compactVietnameseWhitespace('  Xin\n chào   Việt Nam  ')).toBe('Xin chào Việt Nam');
  });

  it('returns stable NFC and ASCII variants', () => {
    const decomposed = 'a\u0301';
    const result = normalizeVietnameseText(`Ch${decomposed}o Việt Nam`);

    expect(result.nfc).toBe('Cháo Việt Nam');
    expect(result.ascii).toBe('Chao Viet Nam');
    expect(result.lowercaseAscii).toBe('chao viet nam');
  });
});
