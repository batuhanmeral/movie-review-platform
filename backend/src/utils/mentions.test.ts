import { describe, it, expect } from 'vitest';
import { extractMentions } from './mentions.js';

describe('extractMentions', () => {
  it('boş/None metinde boş dizi döndürür', () => {
    expect(extractMentions('')).toEqual([]);
    expect(extractMentions(null)).toEqual([]);
    expect(extractMentions(undefined)).toEqual([]);
  });

  it('tek bir @kullanıcı yakalar', () => {
    expect(extractMentions('harika inceleme @elifyilmaz')).toEqual(['elifyilmaz']);
  });

  it('birden çok bahsetmeyi yakalar ve tekilleştirir', () => {
    expect(extractMentions('@mert ve @zeynep, tekrar @mert')).toEqual(['mert', 'zeynep']);
  });

  it('kullanıcı adını küçük harfe normalize eder', () => {
    expect(extractMentions('@ElifYilmaz')).toEqual(['elifyilmaz']);
  });

  it('e-posta adresindeki @ işaretini yakalamaz', () => {
    expect(extractMentions('bana ulas: user@domain.com')).toEqual([]);
  });

  it('satır başındaki bahsetmeyi yakalar', () => {
    expect(extractMentions('@can selam')).toEqual(['can']);
  });
});
