import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { contentApi, langFromI18n } from '@/api/content.api';
import { useDebounce } from '@/hooks/useDebounce';
import { poster } from '@/lib/tmdb';
import type { ContentItem } from '@/types/content';

// Arama önerisi gösterebilmek için minimum karakter sayısı
const MIN_CHARS = 2;

// Navbar'daki arama çubuğu bileşeni
// Yazıldıkça (debounced) öneri listesi gösterir
// Form gönderildiğinde keşfet sayfasına yönlendirir
export function SearchBar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = langFromI18n(i18n.resolvedLanguage);
  const [params] = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLFormElement>(null);

  // URL'deki q parametresi değişirse arama değerini güncelle
  useEffect(() => {
    setValue(params.get('q') ?? '');
  }, [params]);

  // Arama değerini 250ms geciktir (gereksiz API çağrılarını önle)
  const debounced = useDebounce(value.trim(), 250);
  const enabled = debounced.length >= MIN_CHARS;

  // Arama önerileri için API sorgusu
  const { data, isFetching } = useQuery({
    queryKey: ['searchSuggest', debounced, language],
    queryFn: () => contentApi.search(debounced, 'multi', language, 1),
    enabled,
    staleTime: 30 * 1000,
  });

  // Sadece film/dizi sonuçlarını al, popülerliğe göre sırala ve ilk 8'ini göster
  const items = (data?.results ?? [])
    .filter((r) => r.type === 'movie' || r.type === 'tv')
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 8);

  // Dış tıklamada dropdown'ı kapat
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Form gönderildiğinde keşfet sayfasına yönlendir
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setOpen(false);
    navigate(`/discover?q=${encodeURIComponent(q)}`);
  };

  const showDropdown = open && enabled;

  return (
    <form ref={wrapRef} role="search" onSubmit={onSubmit} className="relative w-56 md:w-64">
      {/* Arama ikonu */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
        />
      </svg>
      {/* Arama giriş alanı */}
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t('nav.searchPlaceholder')}
        aria-label={t('nav.searchPlaceholder')}
        className="glass w-full rounded-full border-0 py-2 pl-9 pr-3 text-sm text-ink
                   placeholder:text-ink-muted focus:ring-2 focus:ring-accent/60"
      />

      {/* Arama önerileri dropdown'ı */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl bg-surface-raised shadow-card ring-1 ring-white/10">
          {isFetching && items.length === 0 ? (
            <div className="px-3 py-3 text-xs text-ink-muted">{t('nav.searching')}</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-3 text-xs text-ink-muted">{t('nav.noResults')}</div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((it) => (
                <li key={`${it.type}-${it.id}`}>
                  <SuggestRow item={it} onPick={() => setOpen(false)} />
                </li>
              ))}
              {/* "Tüm sonuçları gör" bağlantısı */}
              <li>
                <button
                  type="submit"
                  className="block w-full border-t border-white/5 px-3 py-2 text-left text-xs text-accent hover:bg-surface-muted"
                >
                  {t('nav.seeAllResults', { q: debounced })} →
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

// Arama önerisi satırı - poster küçük görseli, başlık, tür ve yıl bilgisi gösterir
function SuggestRow({ item, onPick }: { item: ContentItem; onPick: () => void }) {
  const { t } = useTranslation();
  const posterUrl = poster(item.posterPath, 'w92');
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;

  return (
    <Link
      to={`/${item.type}/${item.id}`}
      onClick={onPick}
      className="flex items-center gap-3 px-3 py-2 hover:bg-surface-muted"
    >
      {/* Poster küçük görseli veya yer tutucu */}
      {posterUrl ? (
        <img
          src={posterUrl}
          alt=""
          className="h-12 w-8 shrink-0 rounded object-cover ring-1 ring-white/10"
          loading="lazy"
        />
      ) : (
        <div className="h-12 w-8 shrink-0 rounded bg-surface-muted ring-1 ring-white/10" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
        <p className="truncate text-xs text-ink-muted">
          {item.type === 'movie' ? t('content.movie') : t('content.tv')}
          {year ? ` · ${year}` : ''}
        </p>
      </div>
    </Link>
  );
}
