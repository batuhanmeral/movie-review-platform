import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ContentCard } from '@/components/content/ContentCard';
import { PosterSkeleton } from '@/components/content/PosterSkeleton';
import { contentApi, langFromI18n } from '@/api/content.api';
import { departmentLabel, profile } from '@/lib/tmdb';
import type { Genre, PersonCredit } from '@/types/content';
import { PersonFilterPanel, type PersonFilterValues } from './PersonFilterPanel';

// Oyuncu (kişi) sayfası: oyuncunun bilgileri + oynadığı yapımların filtrelenebilir,
// sıralanabilir listesi. Tüm filtreleme/sıralama client-side yapılır çünkü TMDB
// combined_credits tek istekte tüm yapımları döndürür.
export default function PersonPage() {
  const { personId = '' } = useParams();
  const { t, i18n } = useTranslation();
  const language = langFromI18n(i18n.resolvedLanguage);

  const [filters, setFilters] = useState<PersonFilterValues>({ type: 'all', sort: 'popularity' });

  // Oyuncu profilini ve filmografisini getir
  const { data, isLoading, isError } = useQuery({
    queryKey: ['person', personId, language],
    queryFn: () => contentApi.person(Number(personId), language),
    enabled: Boolean(personId),
  });

  // Tür adlarını çözmek için film ve dizi tür listelerini getir (24s önbellek)
  const movieGenres = useQuery({
    queryKey: ['genres', 'movie', language],
    queryFn: () => contentApi.genres('movie', language),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const tvGenres = useQuery({
    queryKey: ['genres', 'tv', language],
    queryFn: () => contentApi.genres('tv', language),
    staleTime: 24 * 60 * 60 * 1000,
  });

  // id → tür adı eşlemesi (film + dizi türleri birleşik)
  const genreNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of [...(movieGenres.data ?? []), ...(tvGenres.data ?? [])]) {
      if (!map.has(g.id)) map.set(g.id, g.name);
    }
    return map;
  }, [movieGenres.data, tvGenres.data]);

  const credits = useMemo(() => data?.credits ?? [], [data]);

  // Filtre panelinde gösterilecek seçenekler: yalnızca bu oyuncunun yapımlarında geçenler
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const c of credits) {
      if (c.releaseDate) years.add(new Date(c.releaseDate).getFullYear());
    }
    return [...years].sort((a, b) => b - a);
  }, [credits]);

  const availableGenres = useMemo<Genre[]>(() => {
    const ids = new Set<number>();
    for (const c of credits) for (const id of c.genreIds) ids.add(id);
    return [...ids]
      .map((id) => ({ id, name: genreNameById.get(id) ?? '' }))
      .filter((g) => g.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [credits, genreNameById]);

  // Filtreleri uygula, ardından sırala
  const visibleCredits = useMemo(() => {
    const filtered = credits.filter((c) => {
      if (filters.type !== 'all' && c.type !== filters.type) return false;
      if (filters.year) {
        const y = c.releaseDate ? new Date(c.releaseDate).getFullYear() : null;
        if (y !== filters.year) return false;
      }
      if (filters.genre && !c.genreIds.includes(filters.genre)) return false;
      if (filters.minRating && c.voteAverage < filters.minRating) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (filters.sort) {
        case 'releaseDate':
          return (b.releaseDate ?? '').localeCompare(a.releaseDate ?? '');
        case 'rating':
          return b.voteAverage - a.voteAverage;
        case 'name':
          return a.title.localeCompare(b.title);
        case 'popularity':
        default:
          return b.popularity - a.popularity;
      }
    });
    return sorted;
  }, [credits, filters]);

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <div className="card h-96 animate-pulse" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          <PosterSkeleton count={10} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <div className="card text-center text-ink-muted">{t('person.notFound')}</div>;
  }

  const profileUrl = profile(data.profilePath, 'h632');
  // Doğum tarihini yerelleştirilmiş tam tarih olarak biçimlendir
  const birthday = data.birthday
    ? new Date(data.birthday).toLocaleDateString(i18n.resolvedLanguage, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Oyuncu başlık kartı: solda büyük portre, sağda alt alta detaylar */}
      <header className="card flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-accent to-accent-cyan ring-1 ring-white/10 sm:w-52">
          {profileUrl ? (
            <img src={profileUrl} alt={data.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-6xl font-bold text-surface">
              {data.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">{data.name}</h1>
            <p className="mt-1 text-xs uppercase tracking-wider text-ink-muted">
              {t('person.creditCount', { count: data.credits.length })}
            </p>
          </div>

          {/* Künye: etiketli detay satırları, alt alta */}
          <dl className="space-y-2 text-sm">
            {data.knownForDepartment && (
              <DetailRow
                label={t('person.knownFor')}
                value={departmentLabel(data.knownForDepartment, t) ?? data.knownForDepartment}
              />
            )}
            {birthday && <DetailRow label={t('person.born')} value={birthday} />}
            {data.placeOfBirth && <DetailRow label={t('person.placeOfBirth')} value={data.placeOfBirth} />}
          </dl>

          {/* Biyografi */}
          {data.biography && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {t('person.biography')}
              </dt>
              <p className="mt-1 max-w-prose whitespace-pre-line text-sm leading-relaxed text-ink/90 line-clamp-6">
                {data.biography}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Filtre paneli + filmografi grid'i */}
      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <PersonFilterPanel
          values={filters}
          onChange={setFilters}
          genres={availableGenres}
          years={availableYears}
        />

        <div className="space-y-6">
          <header>
            <h2 className="font-display text-xl font-bold text-ink">{t('person.filmography')}</h2>
            <p className="text-sm text-ink-muted">
              {t('person.showing', { count: visibleCredits.length })}
            </p>
          </header>

          {visibleCredits.length === 0 ? (
            <div className="card text-center text-ink-muted">{t('person.noResults')}</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {visibleCredits.map((credit: PersonCredit) => (
                <ContentCard key={`${credit.type}-${credit.id}`} item={credit} showType />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Künyedeki tek bir etiket/değer satırı (ör. Doğum · 1 Ocak 1980)
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-ink">{value}</dd>
    </div>
  );
}
