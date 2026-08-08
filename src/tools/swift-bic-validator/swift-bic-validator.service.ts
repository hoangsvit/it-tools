export interface BicDetails {
  normalized: string
  valid: boolean
  institutionCode?: string
  countryCode?: string
  locationCode?: string
  branchCode?: string
  bic8?: string
  bic11?: string
}

const BIC_PATTERN = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/;

export function normalizeBic(value: string) {
  return value.toUpperCase().replace(/[\s-]+/g, '');
}

export function parseBic(value: string): BicDetails {
  const normalized = normalizeBic(value);
  if (!BIC_PATTERN.test(normalized)) {
    return {
      normalized,
      valid: false,
    };
  }

  const bic8 = normalized.slice(0, 8);
  const branchCode = normalized.length === 11 ? normalized.slice(8, 11) : 'XXX';

  return {
    normalized,
    valid: true,
    institutionCode: normalized.slice(0, 4),
    countryCode: normalized.slice(4, 6),
    locationCode: normalized.slice(6, 8),
    branchCode,
    bic8,
    bic11: `${bic8}${branchCode}`,
  };
}
