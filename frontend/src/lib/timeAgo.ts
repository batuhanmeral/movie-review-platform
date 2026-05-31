// Göreceli zaman biçimlendirici ("3 saat önce" / "3 hours ago").
// Intl.RelativeTimeFormat ile aktif dile göre çıktı üretir; ekstra bağımlılık yok.

// Saniye cinsinden eşik değerleri ve karşılık gelen birimler (büyükten küçüğe)
const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 60 * 60 * 24 * 365 },
  { unit: 'month', seconds: 60 * 60 * 24 * 30 },
  { unit: 'week', seconds: 60 * 60 * 24 * 7 },
  { unit: 'day', seconds: 60 * 60 * 24 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'minute', seconds: 60 },
];

/**
 * ISO tarih dizesini göreceli, çevrilmiş bir ifadeye dönüştürür.
 * Örn. timeAgo('2024-...', 'tr') -> "3 saat önce"
 * @param iso  ISO 8601 tarih dizesi (review.createdAt gibi)
 * @param lang Aktif arayüz dili (i18n.resolvedLanguage); varsayılan 'en'
 */
export function timeAgo(iso: string, lang = 'en'): string {
  const date = new Date(iso);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000); // geçmiş için negatif
  const abs = Math.abs(diffSeconds);

  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

  // 60 saniyeden yeniyse "az önce" / "now" göster
  if (abs < 60) {
    return rtf.format(0, 'second');
  }

  for (const { unit, seconds } of UNITS) {
    if (abs >= seconds) {
      const value = Math.round(diffSeconds / seconds);
      return rtf.format(value, unit);
    }
  }

  return rtf.format(0, 'second');
}
