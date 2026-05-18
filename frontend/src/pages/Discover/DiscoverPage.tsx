import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentCard } from '@/components/content/ContentCard';
import { PosterSkeleton } from '@/components/content/PosterSkeleton';
import { contentApi, langFromI18n } from '@/api/content.api';
import { useDebounce } from '@/hooks/useDebounce';
import { FilterPanel, type DiscoverFilterValues } from './FilterPanel';
import type { ContentPage } from '@/types/content';

// Keşfet sayfası bileşeni
// Film ve dizi keşfetme, filtreleme ve arama işlevselliği sağlar
// Sonsuz kaydırma (infinite scroll) ile sayfalı sonuç yükleme destekler
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
    type: 'movie',
    sortBy: 'popularity.desc',
  });

  // Seçili türe göre tür (genre) listesini getir
  const genresQuery = useQuery({
    queryKey: ['genres', filters.type, language],
    queryFn: () => contentApi.genres(filters.type, language),
    staleTime: 24 * 60 * 60 * 1000, // 24 saat önbellek
  });

  // Sonsuz kaydırma ile içerik listesini getir (arama veya keşfet moduna göre)
  const list = useInfiniteQuery<ContentPage>({
    queryKey: isSearching
      ? ['search', filters.type, debouncedQuery, language]
      : ['discover', filters, language],
    queryFn: ({ pageParam = 1 }) =>
      isSearching
        ? contentApi.search(debouncedQuery, filters.type, language, pageParam as number)
        : contentApi.discover({ ...filters, language, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  // Tüm sayfaların sonuçlarını tek bir diziye düzleştir
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.results) ?? [], [list.data]);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
      {/* Sol taraftaki filtreleme paneli */}
      <FilterPanel values={filters} onChange={setFilters} genres={genresQuery.data ?? []} />

      <div className="space-y-6">
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

        {/* İçerik kartları grid'i */}
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
      </div>
    </div>
  );
}
