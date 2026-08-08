export type VietQrTemplate = 'compact2' | 'compact' | 'qr_only' | 'print' | 'loax';

export interface VietQrBank {
  id: number
  name: string
  code: string
  bin: string
  shortName: string
  logo: string
  transferSupported: number
  lookupSupported: number
  swift_code?: string | null
}

export interface VietQrInput {
  bankId: string
  accountNo: string
  template: VietQrTemplate
  amount?: string
  description?: string
  accountName?: string
}

export interface VietQrValidationResult {
  valid: boolean
  errors: string[]
}

const ACCOUNT_PATTERN = /^[A-Za-z0-9]{1,19}$/;
const AMOUNT_PATTERN = /^\d{1,13}$/;

export function validateVietQrInput(input: VietQrInput): VietQrValidationResult {
  const errors: string[] = [];
  const bankId = input.bankId.trim();
  const accountNo = input.accountNo.trim();
  const amount = input.amount?.trim() ?? '';
  const description = input.description?.trim() ?? '';
  const accountName = input.accountName?.trim() ?? '';

  if (!bankId) {
    errors.push('Select a bank or provide a bank BIN/code.');
  }

  if (!ACCOUNT_PATTERN.test(accountNo)) {
    errors.push('Account number or alias must contain 1-19 letters or digits.');
  }

  if (amount && (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0)) {
    errors.push('Amount must be a positive integer with at most 13 digits.');
  }

  if (description.length > 50) {
    errors.push('Transfer description must be 50 characters or fewer.');
  }

  if (accountName.length > 50) {
    errors.push('Account name must be 50 characters or fewer.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildVietQrQuickLink(input: VietQrInput) {
  const validation = validateVietQrInput(input);
  if (!validation.valid) {
    return '';
  }

  const bankId = input.bankId.trim();
  const accountNo = input.accountNo.trim();
  const baseUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-${input.template}.png`;
  const params = new URLSearchParams();

  if (input.amount?.trim()) {
    params.set('amount', input.amount.trim());
  }
  if (input.description?.trim()) {
    params.set('addInfo', input.description.trim());
  }
  if (input.accountName?.trim()) {
    params.set('accountName', input.accountName.trim());
  }

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

export function bankSearchLabel(bank: VietQrBank) {
  const swift = bank.swift_code ? ` · ${bank.swift_code}` : '';
  return `${bank.shortName} · BIN ${bank.bin} · ${bank.code}${swift}`;
}

export function matchesBankQuery(bank: VietQrBank, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [bank.name, bank.shortName, bank.code, bank.bin, bank.swift_code ?? '']
    .some(value => value.toLowerCase().includes(normalized));
}
