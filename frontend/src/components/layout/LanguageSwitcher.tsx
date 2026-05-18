import { useTranslation } from 'react-i18next';

// Desteklenen dil seçenekleri
const LANGS = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
] as const;

// Navbar'daki dil değiştirme bileşeni
// Radyo buton grubu olarak TR/EN arasında geçiş sağlar
// Sadece küçük ekranların üstünde (sm+) görünür
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="hidden items-center gap-0.5 rounded-full bg-surface-raised p-0.5 ring-1 ring-white/5 sm:flex"
    >
      {LANGS.map(({ code, label }) => {
        const active = i18n.resolvedLanguage === code;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => void i18n.changeLanguage(code)}
            className={
              'rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ' +
              (active ? 'bg-accent text-surface' : 'text-ink-muted hover:text-ink')
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
