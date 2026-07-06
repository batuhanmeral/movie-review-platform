import { describe, it, expect } from 'vitest';
import { apiErrorMessage } from './apiError';

describe('apiErrorMessage', () => {
  it('axios olmayan hatalarda yedek metni döndürür', () => {
    expect(apiErrorMessage(new Error('boom'), 'yedek')).toBe('yedek');
    expect(apiErrorMessage({ foo: 'bar' }, 'yedek')).toBe('yedek');
    expect(apiErrorMessage(null, 'yedek')).toBe('yedek');
  });

  it('sunucu mesajını axios hata gövdesinden çıkarır', () => {
    const axiosLike = {
      isAxiosError: true,
      response: { data: { error: { message: 'Son admin silinemez' } } },
    };
    expect(apiErrorMessage(axiosLike, 'yedek')).toBe('Son admin silinemez');
  });

  it('sunucu mesaj döndürmezse yedek metne düşer', () => {
    const axiosLike = { isAxiosError: true, response: { data: {} } };
    expect(apiErrorMessage(axiosLike, 'yedek')).toBe('yedek');
  });
});
