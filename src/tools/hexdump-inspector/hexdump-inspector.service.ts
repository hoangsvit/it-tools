export function textToHexdump(value: string, bytesPerRow = 16) {
  const bytes = new TextEncoder().encode(value);
  const rows: string[] = [];

  for (let offset = 0; offset < bytes.length; offset += bytesPerRow) {
    const row = bytes.slice(offset, offset + bytesPerRow);
    const hex = [...row]
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(' ')
      .padEnd(bytesPerRow * 3 - 1, ' ');
    const ascii = [...row]
      .map(byte => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.')
      .join('');

    rows.push(`${offset.toString(16).padStart(8, '0')}  ${hex}  |${ascii}|`);
  }

  return rows.join('\n');
}

export function normalizeHexInput(value: string) {
  return value
    .replace(/0x/gi, '')
    .replace(/[^0-9a-f]/gi, '');
}

export function isValidHexInput(value: string) {
  const normalized = normalizeHexInput(value);
  return normalized.length > 0 && normalized.length % 2 === 0;
}

export function hexToText(value: string) {
  const normalized = normalizeHexInput(value);
  if (!normalized || normalized.length % 2 !== 0) {
    throw new Error('Hex input must contain complete bytes.');
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}
