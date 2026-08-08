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

export interface VietQrBankApp {
  appId: string
  appLogo: string
  appName: string
  bankName: string
  monthlyInstall?: number
  deeplink: string
}

export interface VietQrInput {
  bankId: string
  accountNo: string
  template: VietQrTemplate
  amount?: string
  description?: string
  accountName?: string
}

export interface VietQrDeeplinkInput {
  appId: string
  accountNo: string
  bankCode: string
  amount?: string
  description?: string
  accountName?: string
  returnUrl?: string
}

export interface VietQrValidationResult {
  valid: boolean
  errors: string[]
}

const ACCOUNT_PATTERN = /^[A-Za-z0-9]{1,19}$/;
const AMOUNT_PATTERN = /^\d{1,13}$/;
const BANK_CODE_PATTERN = /^[A-Za-z0-9]{2,20}$/;
const APP_ID_PATTERN = /^[A-Za-z0-9._-]{1,50}$/;

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

export function validateVietQrDeeplinkInput(input: VietQrDeeplinkInput): VietQrValidationResult {
  const errors: string[] = [];
  const appId = input.appId.trim();
  const accountNo = input.accountNo.trim();
  const bankCode = input.bankCode.trim();
  const amount = input.amount?.trim() ?? '';
  const description = input.description?.trim() ?? '';
  const accountName = input.accountName?.trim() ?? '';
  const returnUrl = input.returnUrl?.trim() ?? '';

  if (!APP_ID_PATTERN.test(appId)) {
    errors.push('Select a bank app or provide a valid app ID.');
  }

  if (!ACCOUNT_PATTERN.test(accountNo)) {
    errors.push('Account number or alias must contain 1-19 letters or digits.');
  }

  if (!BANK_CODE_PATTERN.test(bankCode)) {
    errors.push('Recipient bank code must contain 2-20 letters or digits.');
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

  if (returnUrl) {
    try {
      const parsed = new URL(returnUrl);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        errors.push('Return URL must use http or https.');
      }
    }
    catch {
      errors.push('Return URL must be a valid URL.');
    }
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

export function buildVietQrDeeplink(input: VietQrDeeplinkInput) {
  const validation = validateVietQrDeeplinkInput(input);
  if (!validation.valid) {
    return '';
  }

  const params = new URLSearchParams({
    app: input.appId.trim().toLowerCase(),
    ba: `${input.accountNo.trim()}@${input.bankCode.trim().toLowerCase()}`,
  });

  if (input.amount?.trim()) {
    params.set('am', input.amount.trim());
  }
  if (input.description?.trim()) {
    params.set('tn', input.description.trim());
  }
  if (input.accountName?.trim()) {
    params.set('bn', input.accountName.trim());
  }
  if (input.returnUrl?.trim()) {
    params.set('url', input.returnUrl.trim());
  }

  return `https://dl.vietqr.io/pay?${params.toString()}`;
}

export function bankSearchLabel(bank: VietQrBank) {
  const swift = bank.swift_code ? ` · ${bank.swift_code}` : '';
  return `${bank.shortName} · BIN ${bank.bin} · ${bank.code}${swift}`;
}

export function bankAppSearchLabel(app: VietQrBankApp) {
  return `${app.appName} · ${app.bankName} · ${app.appId}`;
}

export function matchesBankQuery(bank: VietQrBank, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [bank.name, bank.shortName, bank.code, bank.bin, bank.swift_code ?? '']
    .some(value => value.toLowerCase().includes(normalized));
}
