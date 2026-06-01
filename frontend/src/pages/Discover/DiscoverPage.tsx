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

// "Yapımlar" görünümünde ikincil bölümlerde (kişiler/kullanıcılar) gösterilecek
// önizleme adedi — yaklaşık 2 satırı dolduracak şekilde sınırlanır.
const PEOPLE_PREVIEW = 16;
const USERS_PREVIEW = 12;

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
  const showPeople = scope === 'titles' || scope === 'people';
  const showUsers = scope === 'titles' || scope === 'users';

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

  // "Yapımlar" görünümünde ikincil bölümler önizleme adediyle sınırlanır;
  // kendi kapsamlarında ise tüm sonuçlar gösterilir.
  const peopleShown = showTitles ? people.slice(0, PEOPLE_PREVIEW) : people;
  const usersShown = showTitles ? users.slice(0, USERS_PREVIEW) : users;

  // Tüm sayfaların sonuçlarını tek bir diziye düzleştir
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.results) ?? [], [list.data]);

  // Kişiler/Kullanıcılar kapsamı arama gerektirir; sorgu yoksa ipucu göster
  const needsQuery = !showTitles && !isSearching;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
      {/* Sol taraftaki filtreleme paneli */}
      <FilterPanel values={filters} onChange={setFilters} genres={genresQuery.data ?? []} />

      <div className="space-y-8">
        {/* Sayfa başlığı ve arama durumu bilgisi */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{t('discover.title')}</h1>
            <p className="text-sm text-ink-muted">
              {isSearching
                ? t('discover.searchingFor', { q: debouncedQuery })
                : t('discover.subtitle')}
            </p>
          </div>
        </header>

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
        {showPeople && isSearching && peopleShown.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink">{t('discover.people')}</h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {peopleShown.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
          </section>
        )}
        {scope === 'people' && isSearching && peopleShown.length === 0 && (
          <div className="card text-center text-ink-muted">{t('discover.empty')}</div>
        )}

        {/* ── KULLANICILAR ──────────────────────────────────────────── */}
        {showUsers && isSearching && usersShown.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink">{t('discover.users')}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {usersShown.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          </section>
        )}
        {scope === 'users' && isSearching && usersShown.length === 0 && (
          <div className="card text-center text-ink-muted">{t('discover.empty')}</div>
        )}
      </div>
    </div>
  );
}
