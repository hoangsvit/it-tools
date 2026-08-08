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

export interface VietQrValidationResult {
  valid: boolean
  errors: string[]
}

const ACCOUNT_PATTERN = /^[A-Za-z0-9]{1,25}$/;
const AMOUNT_PATTERN = /^\d{1,13}$/;
const BANK_BIN_PATTERN = /^\d{6}$/;
const DESCRIPTION_PATTERN = /^[A-Za-z0-9 ]*$/;
const FORMATTED_AMOUNT_PATTERN = /^[\d,\s]*$/;

function tlv(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`;
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

export function formatVietQrAmount(value: string) {
  const normalized = normalizeVietQrAmount(value);
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function normalizeVietQrInput(input: VietQrInput): VietQrInput {
  const rawAmount = input.amount?.trim() ?? '';

  return {
    bankId: input.bankId.trim(),
    accountNo: input.accountNo.trim(),
    amount: FORMATTED_AMOUNT_PATTERN.test(rawAmount)
      ? normalizeVietQrAmount(rawAmount)
      : rawAmount,
    description: input.description?.trim() ?? '',
  };
}

export function validateVietQrInput(input: VietQrInput): VietQrValidationResult {
  const errors: string[] = [];
  const normalized = normalizeVietQrInput(input);
  const bankId = normalized.bankId;
  const accountNo = normalized.accountNo;
  const amount = normalized.amount ?? '';
  const description = normalized.description ?? '';

  if (!BANK_BIN_PATTERN.test(bankId)) {
    errors.push('Please choose a bank from the list.');
  }

  if (!ACCOUNT_PATTERN.test(accountNo)) {
    errors.push('Account number or alias must contain 1-25 letters or digits.');
  }

  if (amount && (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0)) {
    errors.push('Amount must be a positive VND integer with at most 13 digits.');
  }

  if (description.length > 25) {
    errors.push('Transfer content must be 25 characters or fewer.');
  }
  else if (description && !DESCRIPTION_PATTERN.test(description)) {
    errors.push('Transfer content must use unaccented letters, numbers and spaces only.');
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
