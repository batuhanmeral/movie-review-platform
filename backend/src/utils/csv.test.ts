import { describe, it, expect } from 'vitest';
import { csvEscape, toCsv } from './csv.js';

describe('csvEscape', () => {
  it('null/undefined değerleri boş hücreye çevirir', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('virgül, tırnak ve satır sonu içeren değerleri tırnaklar', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('de"di')).toBe('"de""di"');
    expect(csvEscape('iki\nsatır')).toBe('"iki\nsatır"');
  });

  it('formül başlangıçlarını nötrler (CSV injection)', () => {
    expect(csvEscape('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvEscape('+1+1')).toBe("'+1+1");
    expect(csvEscape('-2+3')).toBe("'-2+3");
    expect(csvEscape('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('normal değerlere dokunmaz', () => {
    expect(csvEscape('elifyilmaz')).toBe('elifyilmaz');
    expect(csvEscape(42)).toBe('42');
    expect(csvEscape('2024-01-01')).toBe('2024-01-01');
  });
});

describe('toCsv', () => {
  it('başlık + satırları birleştirir', () => {
    const csv = toCsv(['id', 'name'], [['1', 'Ali'], ['2', 'Veli,Deli']]);
    expect(csv).toBe('id,name\n1,Ali\n2,"Veli,Deli"');
  });
});
