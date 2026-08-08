export interface VietnameseTextNormalizationResult {
  nfc: string
  ascii: string
  compactWhitespace: string
  lowercaseAscii: string
}

const VIETNAMESE_D = /đ/gi;

export function stripVietnameseDiacritics(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(VIETNAMESE_D, match => match === 'Đ' ? 'D' : 'd');
}

export function compactVietnameseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeVietnameseText(value: string): VietnameseTextNormalizationResult {
  const nfc = value.normalize('NFC');
  const compactWhitespace = compactVietnameseWhitespace(nfc);
  const ascii = stripVietnameseDiacritics(nfc);

  return {
    nfc,
    ascii,
    compactWhitespace,
    lowercaseAscii: stripVietnameseDiacritics(compactWhitespace).toLowerCase(),
  };
}
