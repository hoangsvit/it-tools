import type { VietQrBank } from '../vietqr-bank-generator/vietqr-bank-generator.service';

export function matchesVietnamBank(bank: VietQrBank, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!query) {
    return true;
  }

  return [
    bank.bin,
    bank.code,
    bank.shortName,
    bank.name,
    bank.swift_code ?? '',
  ].some(value => value.toLowerCase().includes(query));
}

export function rankVietnamBanks(banks: VietQrBank[], rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return [...banks].sort((a, b) => a.shortName.localeCompare(b.shortName));
  }

  return banks
    .filter(bank => matchesVietnamBank(bank, query))
    .sort((a, b) => {
      const aExact = [a.bin, a.code, a.shortName, a.swift_code ?? '']
        .some(value => value.toLowerCase() === query);
      const bExact = [b.bin, b.code, b.shortName, b.swift_code ?? '']
        .some(value => value.toLowerCase() === query);

      if (aExact !== bExact) {
        return aExact ? -1 : 1;
      }

      return a.shortName.localeCompare(b.shortName);
    });
}
