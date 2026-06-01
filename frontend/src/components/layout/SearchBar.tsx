import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { contentApi, langFromI18n } from '@/api/content.api';
import { useDebounce } from '@/hooks/useDebounce';
import { departmentLabel, poster, profile } from '@/lib/tmdb';
import type { ContentItem, PersonSearchResult } from '@/types/content';

// Arama önerisi gösterebilmek için minimum karakter sayısı
const MIN_CHARS = 2;

// Navbar'daki arama bileşeni.
// Varsayılan olarak yalnızca bir büyüteç ikonu gösterir; tıklanınca arama çubuğu açılır.
// Yazıldıkça (debounced) hem içerik hem de kişi (oyuncu/yönetmen) önerileri listelenir.
export function SearchBar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = langFromI18n(i18n.resolvedLanguage);
  const [params] = useSearchParams();
  const [value, setValue] = useState(params.get('q') ?? '');
  const [open, setOpen] = useState(false);
  // Arama çubuğu açık mı (büyüteç ikonuna basılınca açılır)
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // URL'deki q parametresi değişirse arama değerini güncelle
  useEffect(() => {
    setValue(params.get('q') ?? '');
  }, [params]);

  // Açıldığında giriş alanına odaklan
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  // Arama değerini 250ms geciktir (gereksiz API çağrılarını önle)
  const debounced = useDebounce(value.trim(), 250);
  const enabled = debounced.length >= MIN_CHARS;

  // İçerik önerileri
  const contentQuery = useQuery({
    queryKey: ['searchSuggest', 'content', debounced, language],
    queryFn: () => contentApi.search(debounced, 'multi', language, 1),
    enabled,
    staleTime: 30 * 1000,
  });

  // Kişi (oyuncu/yönetmen) önerileri
  const peopleQuery = useQuery({
    queryKey: ['searchSuggest', 'person', debounced, language],
    queryFn: () => contentApi.searchPerson(debounced, language, 1),
    enabled,
    staleTime: 30 * 1000,
  });

  // Sadece film/dizi sonuçlarını al; posteri olmayan çöp kayıtları (TMDB'nin kişi
  // adıyla oluşturduğu sahte "dizi" girişleri vb.) ele, popülerliğe göre sırala ve
  // ilk 6'sını göster.
  const items = (contentQuery.data?.results ?? [])
    .filter((r) => (r.type === 'movie' || r.type === 'tv') && r.posterPath)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 6);

  // Posteri olan kişileri öne al, ilk 4'ünü göster
  const people = (peopleQuery.data ?? []).slice(0, 4);

  const isFetching = contentQuery.isFetching || peopleQuery.isFetching;
  const hasResults = items.length > 0 || people.length > 0;

  // Dış tıklamada dropdown'ı kapat; arama boşsa çubuğu da daralt
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        if (!value.trim()) setExpanded(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [value]);

  // Form gönderildiğinde keşfet sayfasına yönlendir
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setOpen(false);
    navigate(`/discover?q=${encodeURIComponent(q)}`);
  };

  const showDropdown = open && enabled;

  // Daraltılmış durum: yalnızca büyüteç ikonu
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setExpanded(true);
          setOpen(true);
        }}
        aria-label={t('nav.openSearch')}
        className="grid h-9 w-9 place-items-center rounded-full bg-surface-raised text-ink-muted ring-1 ring-white/5 transition-colors hover:text-ink"
      >
        <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        </svg>
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="relative w-56 md:w-72">
      <form role="search" onSubmit={onSubmit}>
        {/* Arama ikonu */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
        </svg>
        {/* Arama giriş alanı */}
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              if (!value.trim()) setExpanded(false);
            }
          }}
          placeholder={t('nav.searchPlaceholder')}
          aria-label={t('nav.searchPlaceholder')}
          className="glass w-full rounded-full border-0 py-2 pl-9 pr-3 text-sm text-ink
                     placeholder:text-ink-muted focus:ring-2 focus:ring-accent/60"
        />
      </form>

      {/* Arama önerileri dropdown'ı */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl bg-surface-raised shadow-card ring-1 ring-white/10">
          {isFetching && !hasResults ? (
            <div className="px-3 py-3 text-xs text-ink-muted">{t('nav.searching')}</div>
          ) : !hasResults ? (
            <div className="px-3 py-3 text-xs text-ink-muted">{t('nav.noResults')}</div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto">
              {/* İçerik sonuçları */}
              {items.length > 0 && (
                <>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-dim">
                    {t('nav.sectionContent')}
                  </p>
                  <ul>
                    {items.map((it) => (
                      <li key={`${it.type}-${it.id}`}>
                        <ContentRow item={it} onPick={() => setOpen(false)} />
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Kişi sonuçları */}
              {people.length > 0 && (
                <>
                  <p className="border-t border-white/5 px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-dim">
                    {t('nav.sectionPeople')}
                  </p>
                  <ul>
                    {people.map((p) => (
                      <li key={p.id}>
                        <PersonRow person={p} onPick={() => setOpen(false)} />
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* "Tüm sonuçları gör" bağlantısı */}
              <button
                type="button"
                onClick={onSubmit}
                className="block w-full border-t border-white/5 px-3 py-2 text-left text-xs text-accent hover:bg-surface-muted"
              >
                {t('nav.seeAllResults', { q: debounced })} →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// İçerik öneri satırı - poster küçük görseli, başlık, tür ve yıl bilgisi
function ContentRow({ item, onPick }: { item: ContentItem; onPick: () => void }) {
  const { t } = useTranslation();
  const posterUrl = poster(item.posterPath, 'w92');
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;

  return (
    <Link
      to={`/${item.type}/${item.id}`}
      onClick={onPick}
      className="flex items-center gap-3 px-3 py-2 hover:bg-surface-muted"
    >
      {posterUrl ? (
        <img src={posterUrl} alt="" className="h-12 w-8 shrink-0 rounded object-cover ring-1 ring-white/10" loading="lazy" />
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

// Kişi öneri satırı - profil küçük görseli, isim ve bilinen alan; oyuncu sayfasına link
function PersonRow({ person, onPick }: { person: PersonSearchResult; onPick: () => void }) {
  const { t } = useTranslation();
  const photoUrl = profile(person.profilePath, 'w45');
  const department = departmentLabel(person.knownForDepartment, t);

  return (
    <Link
      to={`/person/${person.id}`}
      onClick={onPick}
      className="flex items-center gap-3 px-3 py-2 hover:bg-surface-muted"
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-muted ring-1 ring-white/10">
        {photoUrl && <img src={photoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{person.name}</p>
        {department && (
          <p className="truncate text-xs text-ink-muted">{department}</p>
        )}
      </div>
    </Link>
  );
}
