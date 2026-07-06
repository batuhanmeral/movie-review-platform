import { describe, it, expect } from 'vitest';
import { timeAgo } from './timeAgo';

describe('timeAgo', () => {
  it('60 saniyeden yeni tarihleri "now" olarak gösterir (en)', () => {
    const iso = new Date(Date.now() - 5_000).toISOString();
    expect(timeAgo(iso, 'en').toLowerCase()).toContain('now');
  });

  it('saatleri doğru birimle biçimlendirir (en)', () => {
    const iso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(iso, 'en')).toContain('hour');
  });

  it('aktif dile göre yerelleştirir (tr)', () => {
    const iso = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(iso, 'tr')).toContain('saat');
  });

  it('günleri doğru birimle biçimlendirir (en)', () => {
    const iso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(iso, 'en')).toContain('day');
  });
});
