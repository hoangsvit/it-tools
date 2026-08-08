import { ValidationErrorsIBAN } from 'ibantools';

export { buildIban, computeIbanCheckDigits, getFriendlyErrors, normalizeIbanPart };

const ibanErrorToMessage = {
  [ValidationErrorsIBAN.NoIBANProvided]: 'No IBAN provided',
  [ValidationErrorsIBAN.NoIBANCountry]: 'No IBAN country',
  [ValidationErrorsIBAN.WrongBBANLength]: 'Wrong BBAN length',
  [ValidationErrorsIBAN.WrongBBANFormat]: 'Wrong BBAN format',
  [ValidationErrorsIBAN.ChecksumNotNumber]: 'Checksum is not a number',
  [ValidationErrorsIBAN.WrongIBANChecksum]: 'Wrong IBAN checksum',
  [ValidationErrorsIBAN.WrongAccountBankBranchChecksum]: 'Wrong account bank branch checksum',
  [ValidationErrorsIBAN.QRIBANNotAllowed]: 'QR-IBAN not allowed',
};

function getFriendlyErrors(errorCodes: ValidationErrorsIBAN[]) {
  return errorCodes.map(errorCode => ibanErrorToMessage[errorCode]).filter(Boolean);
}

function normalizeIbanPart(value: string) {
  return value.toUpperCase().replace(/[\s-]+/g, '');
}

function appendMod97(remainder: number, value: string) {
  let next = remainder;
  for (const digit of value) {
    next = (next * 10 + Number(digit)) % 97;
  }
  return next;
}

function computeIbanCheckDigits(countryCode: string, bban: string) {
  const country = normalizeIbanPart(countryCode);
  const normalizedBban = normalizeIbanPart(bban);

  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error('Country code must contain exactly two letters.');
  }
  if (!/^[A-Z0-9]+$/.test(normalizedBban)) {
    throw new Error('BBAN must contain only letters and digits.');
  }

  const rearranged = `${normalizedBban}${country}00`;
  let remainder = 0;

  for (const char of rearranged) {
    const numeric = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    remainder = appendMod97(remainder, numeric);
  }

  return String(98 - remainder).padStart(2, '0');
}

function buildIban(countryCode: string, bban: string) {
  const country = normalizeIbanPart(countryCode);
  const normalizedBban = normalizeIbanPart(bban);

  if (!country || !normalizedBban) {
    return '';
  }

  return `${country}${computeIbanCheckDigits(country, normalizedBban)}${normalizedBban}`;
}
