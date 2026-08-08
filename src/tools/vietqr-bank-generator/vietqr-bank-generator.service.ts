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
  amount?: string
  description?: string
}

export type VietQrValidationError =
  | 'chooseBank'
  | 'account'
  | 'amount'
  | 'contentLength'
  | 'contentCharset';

export interface VietQrValidationResult {
  valid: boolean
  errors: VietQrValidationError[]
}

const ACCOUNT_PATTERN = /^[A-Za-z0-9]{1,25}$/;
const AMOUNT_PATTERN = /^\d{1,13}$/;
const BANK_BIN_PATTERN = /^\d{6}$/;
const DESCRIPTION_PATTERN = /^[A-Za-z0-9 ]*$/;
const PLAIN_AMOUNT_PATTERN = /^\d+$/;
const COMMA_FORMATTED_AMOUNT_PATTERN = /^\d{1,3}(?:,\d{3})+$/;
const SPACE_FORMATTED_AMOUNT_PATTERN = /^\d{1,3}(?: \d{3})+$/;

function tlv(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`;
}

function isAcceptedAmountInput(value: string) {
  return PLAIN_AMOUNT_PATTERN.test(value)
    || COMMA_FORMATTED_AMOUNT_PATTERN.test(value)
    || SPACE_FORMATTED_AMOUNT_PATTERN.test(value);
}

export function crc16(value: string) {
  let crc = 0xFFFF;

  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0
        ? (crc << 1) ^ 0x1021
        : crc << 1;
    }
  }

  return (crc & 0xFFFF).toString(16).padStart(4, '0').toUpperCase();
}

export function normalizeVietQrAmount(value: string) {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13);
}

/**
 * Parse a user-entered amount without turning invalid input into a different
 * valid amount. Valid thousands separators are normalized; invalid input is
 * preserved so the field validator can report it to the user.
 */
export function parseVietQrAmountInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (!isAcceptedAmountInput(trimmed)) {
    return value;
  }

  return normalizeVietQrAmount(trimmed);
}

export function formatVietQrAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  // Keep invalid raw input visible instead of masking the validation error.
  if (!PLAIN_AMOUNT_PATTERN.test(trimmed)) {
    return value;
  }

  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function isValidVietQrBankId(value: string) {
  return BANK_BIN_PATTERN.test(value.trim());
}

export function isValidVietQrAccount(value: string) {
  return ACCOUNT_PATTERN.test(value.trim());
}

export function isValidVietQrAmount(value: string) {
  const raw = value.trim();
  if (!raw) {
    return true;
  }

  if (!isAcceptedAmountInput(raw)) {
    return false;
  }

  const normalized = normalizeVietQrAmount(raw);
  return AMOUNT_PATTERN.test(normalized) && Number(normalized) > 0;
}

export function getVietQrDescriptionValidationError(value: string): VietQrValidationError | null {
  const normalized = value.trim();
  if (normalized.length > 25) {
    return 'contentLength';
  }

  if (normalized && !DESCRIPTION_PATTERN.test(normalized)) {
    return 'contentCharset';
  }

  return null;
}

export function normalizeVietQrInput(input: VietQrInput): VietQrInput {
  const rawAmount = input.amount?.trim() ?? '';

  return {
    bankId: input.bankId.trim(),
    accountNo: input.accountNo.trim(),
    amount: rawAmount && isAcceptedAmountInput(rawAmount)
      ? normalizeVietQrAmount(rawAmount)
      : rawAmount,
    description: input.description?.trim() ?? '',
  };
}

export function validateVietQrInput(input: VietQrInput): VietQrValidationResult {
  const errors: VietQrValidationError[] = [];
  const normalized = normalizeVietQrInput(input);
  const bankId = normalized.bankId;
  const accountNo = normalized.accountNo;
  const amount = normalized.amount ?? '';
  const description = normalized.description ?? '';

  if (!isValidVietQrBankId(bankId)) {
    errors.push('chooseBank');
  }

  if (!isValidVietQrAccount(accountNo)) {
    errors.push('account');
  }

  if (!isValidVietQrAmount(amount)) {
    errors.push('amount');
  }

  const descriptionError = getVietQrDescriptionValidationError(description);
  if (descriptionError) {
    errors.push(descriptionError);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function makeVietQrContent(input: VietQrInput) {
  const normalizedInput = normalizeVietQrInput(input);
  const validation = validateVietQrInput(normalizedInput);

  if (!validation.valid) {
    return '';
  }

  const beneficiary = tlv('00', normalizedInput.bankId) + tlv('01', normalizedInput.accountNo);
  const merchantAccount = tlv('00', 'A000000727')
    + tlv('01', beneficiary)
    + tlv('02', 'QRIBFTTA');

  // Keep point-of-initiation method 11 to match vietqr.net's reference
  // implementation and its published payload test vectors, including QR codes
  // that contain a prefilled amount.
  let payload = tlv('00', '01')
    + tlv('01', '11')
    + tlv('38', merchantAccount)
    + tlv('53', '704');

  if (normalizedInput.amount) {
    payload += tlv('54', normalizedInput.amount);
  }

  payload += tlv('58', 'VN');

  if (normalizedInput.description) {
    payload += tlv('62', tlv('08', normalizedInput.description));
  }

  payload += '6304';
  return payload + crc16(payload);
}

export function bankSearchLabel(bank: VietQrBank) {
  if (bank.name.toLowerCase().includes(bank.shortName.toLowerCase())) {
    return bank.name;
  }

  return `${bank.shortName} — ${bank.name}`;
}

export function matchesBankQuery(bank: VietQrBank, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [bank.name, bank.shortName, bank.code, bank.bin, bank.swift_code ?? '']
    .some(value => value.toLowerCase().includes(normalized));
}
