// CSV üretim yardımcıları (admin dışa aktarımları için).

// Excel/Sheets, "=", "+", "-", "@" veya tab/CR ile başlayan hücreleri formül
// olarak çalıştırabilir (CSV injection). Kullanıcı kaynaklı değerler
// (username, displayName, title...) dışa aktarıldığından bu hücreler tek
// tırnak ile nötrlenir.
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

export function csvEscape(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (FORMULA_PREFIX_RE.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
}
