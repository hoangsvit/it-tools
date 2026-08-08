import { describe, expect, it } from 'vitest';
import type { VietQrBank } from '../vietqr-bank-generator/vietqr-bank-generator.service';
import { matchesVietnamBank, rankVietnamBanks } from './vietnam-bank-bin-lookup.service';

const banks: VietQrBank[] = [
  {
    id: 1,
    name: 'Ngân hàng TMCP Á Châu',
    code: 'ACB',
    bin: '970416',
    shortName: 'ACB',
    logo: '',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'ASCBVNVX',
  },
  {
    id: 2,
    name: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
    code: 'VCB',
    bin: '970436',
    shortName: 'Vietcombank',
    logo: '',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'BFTVVNVX',
  },
];

describe('Vietnam bank BIN lookup', () => {
  it('matches BIN, code, name and SWIFT', () => {
    expect(matchesVietnamBank(banks[0], '970416')).toBe(true);
    expect(matchesVietnamBank(banks[0], 'ascb')).toBe(true);
    expect(matchesVietnamBank(banks[1], 'Ngoại Thương')).toBe(true);
  });

  it('ranks exact identifiers first', () => {
    expect(rankVietnamBanks(banks, 'VCB')[0]?.code).toBe('VCB');
  });
});
