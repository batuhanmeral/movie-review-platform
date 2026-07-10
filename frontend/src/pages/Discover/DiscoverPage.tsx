import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentCard } from '@/components/content/ContentCard';
import { PersonCard } from '@/components/content/PersonCard';
import { UserCard } from '@/components/content/UserCard';
import { PosterSkeleton } from '@/components/content/PosterSkeleton';
import { contentApi, langFromI18n } from '@/api/content.api';
import { usersApi } from '@/api/users.api';
import { useDebounce } from '@/hooks/useDebounce';
import { FilterPanel, type DiscoverFilterValues } from './FilterPanel';
import type { ContentPage } from '@/types/content';

// Keşfet sayfası bileşeni
// Yapım / kişi / kullanıcı keşfetme, filtreleme ve arama işlevselliği sağlar.
// Sol paneldeki "kapsam" seçimine göre hangi sonuçların gösterileceği belirlenir.
export default function DiscoverPage() {
  const { t, i18n } = useTranslation();
  const language = langFromI18n(i18n.resolvedLanguage);
  const [searchParams] = useSearchParams();
  // URL'den arama sorgusunu al
  const queryFromUrl = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(queryFromUrl);

  // URL'deki sorgu değiştiğinde state'i güncelle
  useEffect(() => {
    setQuery(queryFromUrl);
  }, [queryFromUrl]);

  // Arama sorgusunu 350ms geciktir
  const debouncedQuery = useDebounce(query, 350);
  const isSearching = debouncedQuery.trim().length >= 2;

  // Filtreleme değerleri state'i
  const [filters, setFilters] = useState<DiscoverFilterValues>({
    scope: 'titles',
    type: 'movie',
    sortBy: 'popularity.desc',
    personDept: 'all',
  });

  const scope = filters.scope;
  const showTitles = scope === 'titles';
  const showPeople = scope === 'people';
  const showUsers = scope === 'users';

  // Seçili türe göre tür (genre) listesini getir
  const genresQuery = useQuery({
    queryKey: ['genres', filters.type, language],
    queryFn: () => contentApi.genres(filters.type, language),
    staleTime: 24 * 60 * 60 * 1000, // 24 saat önbellek
  });

  // Sonsuz kaydırma ile içerik listesini getir (yalnızca "Yapımlar" kapsamında)
  const list = useInfiniteQuery<ContentPage>({
    queryKey: isSearching
      ? ['search', filters.type, debouncedQuery, language]
      : ['discover', filters.type, filters.sortBy, filters.year, filters.genre, filters.minRating, language],
    queryFn: ({ pageParam = 1 }) =>
      isSearching
        ? contentApi.search(debouncedQuery, filters.type, language, pageParam as number)
        : contentApi.discover({ ...filters, language, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: showTitles,
  });

  // Kişi (oyuncu/yönetmen) sonuçları — arama modunda, kapsam izin veriyorsa
  const peopleQuery = useQuery({
    queryKey: ['searchPeople', debouncedQuery, language],
    queryFn: () => contentApi.searchPerson(debouncedQuery, language, 1),
    enabled: isSearching && showPeople,
    staleTime: 30 * 1000,
  });

  // Kullanıcı sonuçları — arama modunda, kapsam izin veriyorsa
  const usersQuery = useQuery({
    queryKey: ['searchUsers', debouncedQuery],
    queryFn: () => usersApi.search(debouncedQuery),
    enabled: isSearching && showUsers,
    staleTime: 30 * 1000,
  });

  // Kişileri meslek (departman) filtresine göre süz
  const people = useMemo(() => {
    const all = peopleQuery.data ?? [];
    if (filters.personDept === 'all') return all;
    return all.filter((p) => p.knownForDepartment === filters.personDept);
  }, [peopleQuery.data, filters.personDept]);

  const users = usersQuery.data ?? [];

  // Tüm sayfaların sonuçlarını tek bir diziye düzleştir
  // Arama modunda TMDB search API filtre/sıralama desteklemez; client-side uygula
  const items = useMemo(() => {
    const raw = list.data?.pages.flatMap((p) => p.results) ?? [];
    if (!isSearching) return raw;

    // Filtreleme
    const filtered = raw.filter((item) => {
      if (filters.year) {
        const itemYear = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
        if (itemYear !== filters.year) return false;
      }
      if (filters.genre && item.genreIds && !item.genreIds.includes(filters.genre)) return false;
      if (filters.minRating && (item.voteAverage ?? 0) < filters.minRating) return false;
      return true;
    });

    // Sıralama
    const sorted = [...filtered];
    switch (filters.sortBy) {
      case 'vote_average.desc':
        sorted.sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));
        break;
      case 'vote_count.desc':
        sorted.sort((a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0));
        break;
      case 'release_date.desc':
      case 'primary_release_date.desc':
        sorted.sort((a, b) => {
          const da = a.releaseDate ? +new Date(a.releaseDate) : 0;
          const db = b.releaseDate ? +new Date(b.releaseDate) : 0;
          return db - da;
        });
        break;
      default: // popularity.desc — API varsayılan sırası zaten popülerlik
        break;
    }
    return sorted;
  }, [list.data, isSearching, filters.year, filters.genre, filters.minRating, filters.sortBy]);

  // Kişiler/Kullanıcılar kapsamı arama gerektirir; sorgu yoksa ipucu göster
  const needsQuery = !showTitles && !isSearching;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
      {/* Sol taraftaki filtreleme paneli */}
      <FilterPanel values={filters} onChange={setFilters} genres={genresQuery.data ?? []} />

      <div className="space-y-8">
        {/* Arama yapılırken aranan sorguyu göster */}
        {isSearching && (
          <p className="text-sm text-ink-muted">{t('discover.searchingFor', { q: debouncedQuery })}</p>
        )}

        {/* Kişiler/Kullanıcılar kapsamı seçili ama arama yapılmadıysa ipucu */}
        {needsQuery && (
          <div className="card text-center text-ink-muted">{t('discover.searchPrompt')}</div>
        )}

        {/* ── YAPIMLAR ──────────────────────────────────────────────── */}
        {showTitles && (
          <section className="space-y-3">
            {isSearching && (
              <h2 className="font-display text-lg font-bold text-ink">{t('discover.titles')}</h2>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {list.isLoading && <PosterSkeleton count={10} />}
              {items.map((item) => (
                <ContentCard key={`${item.type}-${item.id}`} item={item} showType={isSearching} />
              ))}
              {list.isFetchingNextPage && <PosterSkeleton count={5} />}
            </div>

            {/* Sonuç bulunamadı durumu */}
            {!list.isLoading && items.length === 0 && (
              <div className="card text-center text-ink-muted">{t('discover.empty')}</div>
            )}

            {/* Daha fazla yükle butonu */}
            {list.hasNextPage && !list.isFetchingNextPage && items.length > 0 && (
              <div className="flex justify-center">
                <button type="button" onClick={() => list.fetchNextPage()} className="btn-outline">
                  {t('discover.loadMore')}
                </button>
              </div>
            )}

            {/* Hata durumu */}
            {list.isError && (
              <div className="card text-center text-rating-low">{t('discover.error')}</div>
            )}
          </section>
        )}

        {/* ── KİŞİLER ───────────────────────────────────────────────── */}
        {showPeople && isSearching && people.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink">{t('discover.people')}</h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {people.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          </section>
        )}
        {showPeople && isSearching && people.length === 0 && (
          <div className="card text-center text-ink-muted">{t('discover.empty')}</div>
        )}

        {/* ── KULLANICILAR ──────────────────────────────────────────── */}
        {showUsers && isSearching && users.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink">{t('discover.users')}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {users.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          </section>
        )}
        {showUsers && isSearching && users.length === 0 && (
          <div className="card text-center text-ink-muted">{t('discover.empty')}</div>
        )}
      </div>
    </div>
  );
}
