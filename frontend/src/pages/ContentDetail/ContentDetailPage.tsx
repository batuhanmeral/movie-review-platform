import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { contentApi, langFromI18n } from '@/api/content.api';
import { backdrop, poster, profile, youtubeEmbed, youtubeThumb } from '@/lib/tmdb';
import { RatingStars } from '@/components/content/RatingStars';
import { ReviewsSection } from '@/features/reviews/ReviewsSection';
import type { TmdbType } from '@/types/content';

interface ContentDetailPageProps {
  type: TmdbType; // Film veya dizi
}

// İçerik detay sayfası bileşeni
// Film/dizi hakkında kapsamlı bilgi gösterir: poster, özet, tür, oyuncular, fragmanlar ve incelemeler
export default function ContentDetailPage({ type }: ContentDetailPageProps) {
  const { tmdbId } = useParams<{ tmdbId: string }>();
  const { t, i18n } = useTranslation();
  const language = langFromI18n(i18n.resolvedLanguage);
  const id = Number(tmdbId);

  // İçerik detay verisini API'den getir
  const { data, isLoading, isError } = useQuery({
    queryKey: ['content', type, id, language],
    queryFn: () => contentApi.detail(type as TmdbType, id, language),
    enabled: Boolean(type && id),
  });

  const [trailerOpen, setTrailerOpen] = useState(false);
  const castScrollRef = useRef<HTMLDivElement>(null);

  // Oyuncu kadrosu bölümünü yatay kaydır
  const scrollCast = (direction: 'left' | 'right') => {
    if (!castScrollRef.current) return;
    const scrollAmount = castScrollRef.current.clientWidth * 0.75;
    castScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Yükleme durumunda iskelet göster
  if (isLoading) return <DetailSkeleton />;

  // Hata veya veri bulunamadı
  if (isError || !data) {
    return <div className="card text-center text-ink-muted">{t('content.notFound')}</div>;
  }

  const backdropUrl = backdrop(data.backdropPath, 'w1280');
  const posterUrl = poster(data.posterPath, 'w500');
  const year = data.releaseDate ? new Date(data.releaseDate).getFullYear() : null;
  const lastYear = data.lastAirDate ? new Date(data.lastAirDate).getFullYear() : null;
  
  // Tarih gösterimini içerik türüne göre formatla
  let dateDisplay = '';
  if (data.type === 'movie') {
    dateDisplay = year ? ` · ${year}` : '';
  } else if (year) {
    if (data.inProduction || data.status === 'Returning Series') {
      dateDisplay = ` · ${year} - ${t('content.ongoing', 'Devam Ediyor')}`;
    } else if (lastYear && lastYear !== year) {
      dateDisplay = ` · ${year} - ${lastYear}`;
    } else {
      dateDisplay = ` · ${year}`;
    }
  }

  // TMDB 10'luk puanı 5'lik sisteme dönüştür
  const fiveStar = data.voteAverage ? +(data.voteAverage / 2).toFixed(1) : 0;
  const trailer = data.videos[0];

  return (
    <div className="space-y-10">
      {/* Hero bölümü: arka plan görseli, poster, başlık ve detaylar — viewport tam genişlik */}
      <section className="relative -mt-8 overflow-hidden" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
        {backdropUrl && (
          <>
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backdropUrl})` }} aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/60 to-transparent" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/40" aria-hidden="true" />
            <div className="absolute inset-0 backdrop-blur-md" aria-hidden="true" />
          </>
        )}

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[260px,1fr] md:items-center">
          {/* Poster görseli */}
          {posterUrl ? (
            <img src={posterUrl} alt={data.title} className="aspect-[2/3] w-full max-w-[260px] rounded-xl shadow-card ring-1 ring-white/10" />
          ) : (
            <div className="aspect-[2/3] w-full max-w-[260px] rounded-xl bg-surface-muted ring-1 ring-white/10" />
          )}

          <div className="text-balance">
            {/* İçerik türü ve tarih */}
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">
              {data.type === 'movie' ? t('content.movie') : t('content.tv')}{dateDisplay}
            </p>
            {/* Başlık */}
            <h1 className="font-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">{data.title}</h1>
            {data.tagline && <p className="mt-2 text-base italic text-ink-muted">{data.tagline}</p>}

            {/* Meta bilgiler: süre, puan, oy sayısı, topluluk puanı */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              {data.runtime && (
                <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs font-semibold text-ink">{data.runtime} dk</span>
              )}
              <RatingStars value={fiveStar} showValue />
              <span>{data.voteCount.toLocaleString()} {t('content.tmdbVotes')}</span>
              {data.communityRating !== null && (
                <span className="text-accent">
                  {t('content.communityRating')} <strong>{data.communityRating.toFixed(1)}</strong> · {data.communityReviewCount} {t('content.reviews')}
                </span>
              )}
            </div>

            {/* Tür etiketleri */}
            <div className="mt-3 flex flex-wrap gap-2">
              {data.genres.map((g) => (
                <span key={g.id} className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs text-ink-muted ring-1 ring-white/5">{g.name}</span>
              ))}
            </div>

            {/* Özet */}
            {data.overview && (
              <div className="mt-6">
                <h2 className="font-display text-lg font-bold text-ink">{t('content.overview')}</h2>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink/90">{data.overview}</p>
              </div>
            )}

            {/* Aksiyon butonları */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="btn-outline">{t('content.addWatchlist')}</button>
              {trailer && (
                <button type="button" className="btn-ghost" onClick={() => setTrailerOpen(true)}>▶ {t('content.trailer')}</button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Oyuncu kadrosu bölümü */}
      {data.cast.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="section-title !mb-0"><h2>{t('content.cast')}</h2></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => scrollCast('left')} className="grid h-8 w-8 place-items-center rounded-full bg-surface-raised text-ink transition-colors hover:bg-surface-muted ring-1 ring-white/5" aria-label="Sola kaydır">←</button>
              <button type="button" onClick={() => scrollCast('right')} className="grid h-8 w-8 place-items-center rounded-full bg-surface-raised text-ink transition-colors hover:bg-surface-muted ring-1 ring-white/5" aria-label="Sağa kaydır">→</button>
            </div>
          </div>
          {/* Yatay kaydırılabilir oyuncu kartları */}
          <div ref={castScrollRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
            {data.cast.map((member) => (
              <article key={member.id} className="card-hover w-36 shrink-0 snap-start overflow-hidden p-0 ring-white/5 sm:w-40">
                {member.profilePath ? (
                  <img src={profile(member.profilePath, 'w185')!} alt={member.name} className="aspect-[2/3] w-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid aspect-[2/3] place-items-center bg-gradient-to-br from-surface-muted to-surface-raised text-2xl font-bold text-ink-muted">{member.name.charAt(0)}</div>
                )}
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
                  <p className="truncate text-xs text-ink-muted">{member.character}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <ReviewsSection contentId={data.contentId} />

      {/* Fragman modal'ı */}
      {trailer && trailerOpen && (
        <div role="dialog" aria-modal="true" aria-label={trailer.name} className="fixed inset-0 z-50 grid place-items-center bg-surface/80 p-4 backdrop-blur-md" onClick={() => setTrailerOpen(false)}>
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setTrailerOpen(false)} className="absolute -top-10 right-0 text-sm text-ink-muted hover:text-ink">✕ {t('content.close')}</button>
            <div className="aspect-video overflow-hidden rounded-xl shadow-card ring-1 ring-white/10">
              <iframe src={youtubeEmbed(trailer.key)} title={trailer.name} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Ek videolar bölümü */}
      {data.videos.length > 1 && !trailerOpen && (
        <section>
          <div className="section-title"><h2>{t('content.videos')}</h2></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.videos.map((v) => (
              <button key={v.key} type="button" onClick={() => setTrailerOpen(true)} className="card-hover relative overflow-hidden p-0 text-left">
                <img src={youtubeThumb(v.key)} alt={v.name} className="aspect-video w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 grid place-items-center bg-surface/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-surface">▶ {v.type}</span>
                </div>
                <p className="truncate p-2 text-xs text-ink-muted">{v.name}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Detay sayfası yükleme iskeleti
function DetailSkeleton() {
  return (
    <div className="space-y-10">
      <div className="grid gap-8 md:grid-cols-[260px,1fr]">
        <div className="aspect-[2/3] w-full max-w-[260px] animate-pulse rounded-xl bg-surface-muted" />
        <div className="space-y-3">
          <div className="h-10 w-2/3 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}
