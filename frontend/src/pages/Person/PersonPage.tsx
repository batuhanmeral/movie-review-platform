import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ContentCard } from '@/components/content/ContentCard';
import { PosterSkeleton } from '@/components/content/PosterSkeleton';
import { contentApi, langFromI18n } from '@/api/content.api';
import { departmentLabel, profile } from '@/lib/tmdb';
import type { PersonCredit } from '@/types/content';

// Oyuncu (kişi) sayfası: oyuncunun bilgileri + oynadığı yapımların filtrelenebilir,
// sıralanabilir listesi. Tüm filtreleme/sıralama client-side yapılır çünkü TMDB
// combined_credits tek istekte tüm yapımları döndürür.
export default function PersonPage() {
  const { personId = '' } = useParams();
  const { t, i18n } = useTranslation();
  const language = langFromI18n(i18n.resolvedLanguage);

  // Oyuncu profilini ve filmografisini getir
  const { data, isLoading, isError } = useQuery({
    queryKey: ['person', personId, language],
    queryFn: () => contentApi.person(Number(personId), language),
    enabled: Boolean(personId),
  });

  // Yapımları popülerliğe göre sıralanmış olarak göster
  const sortedCredits = useMemo(
    () => [...(data?.credits ?? [])].sort((a, b) => b.popularity - a.popularity),
    [data],
  );

  // Sayfalama: başlangıçta 4 satır (6×4 = 24), her "daha fazla" ile 24 daha
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Başka bir kişiye geçilince görünür sayıyı sıfırla
  useEffect(() => setVisibleCount(PAGE_SIZE), [personId]);

  const visibleCredits = sortedCredits.slice(0, visibleCount);
  const hasMore = visibleCount < sortedCredits.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="card h-64 animate-pulse" />
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

      {/* Filmografi — tam genişlik */}
      <section className="space-y-6">
        <header>
          <h2 className="font-display text-xl font-bold text-ink">{t('person.filmography')}</h2>
          <p className="text-sm text-ink-muted">
            {t('person.showing', { count: sortedCredits.length })}
          </p>
        </header>

        {sortedCredits.length === 0 ? (
          <div className="card text-center text-ink-muted">{t('person.noResults')}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {visibleCredits.map((credit: PersonCredit) => (
                <ContentCard key={`${credit.type}-${credit.id}`} item={credit} showType />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  {t('person.showMore', 'Daha fazla göster')}
                </button>
              </div>
            )}
          </>
        )}
      </section>
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
