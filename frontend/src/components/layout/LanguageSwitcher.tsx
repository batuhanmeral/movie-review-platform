import { useTranslation } from 'react-i18next';

// Navbar'daki dil değiştirme butonu.
// Yalnızca aktif dilin kodunu (TR / EN) gösterir; basıldığında diğer dile geçer.
// Sadece küçük ekranların üstünde (sm+) görünür.
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const isTurkish = i18n.resolvedLanguage !== 'en';

  // Basınca geçilecek dil ve butonda yazan aktif dilin kodu
  const nextCode = isTurkish ? 'en' : 'tr';
  const activeLabel = isTurkish ? 'TR' : 'EN';
  const hint = isTurkish ? t('language.switchToEnglish') : t('language.switchToTurkish');

  return (
    <button
      type="button"
      onClick={() => void i18n.changeLanguage(nextCode)}
      aria-label={hint}
      title={hint}
      className="hidden h-9 min-w-9 place-items-center rounded-full bg-surface-raised px-2.5 text-[11px] font-bold text-ink-muted ring-1 ring-white/5 transition-colors hover:text-ink sm:grid"
    >
      {activeLabel}
    </button>
  );
}
