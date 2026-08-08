import { describe, expect, it } from 'vitest';
import { hexToText, isValidHexInput, normalizeHexInput, textToHexdump } from './hexdump-inspector.service';

describe('hexdump inspector', () => {
  it('renders offsets, bytes and ASCII preview', () => {
    expect(textToHexdump('Hello')).toBe('00000000  48 65 6c 6c 6f                                   |Hello|');
  });

  it('normalizes common hex input formats', () => {
    expect(normalizeHexInput('0x48 0x65 6c:6c:6f')).toBe('48656c6c6f');
    expect(isValidHexInput('48 65 6c 6c 6f')).toBe(true);
    expect(isValidHexInput('4')).toBe(false);
  });

  it('decodes UTF-8 byte sequences', () => {
    expect(hexToText('48 65 6c 6c 6f')).toBe('Hello');
    expect(hexToText('56 69 e1 bb 87 74 20 4e 61 6d')).toBe('Việt Nam');
  });
});
