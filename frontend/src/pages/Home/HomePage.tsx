import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ContentCard } from '@/components/content/ContentCard';
import { PosterSkeleton } from '@/components/content/PosterSkeleton';
import { Slider } from '@/components/layout/Slider';
import { contentApi, langFromI18n } from '@/api/content.api';
import { reviewsApi } from '@/api/reviews.api';
import { listsApi } from '@/api/lists.api';
import { backdrop, poster } from '@/lib/tmdb';
import { RatingStars } from '@/components/content/RatingStars';
import { PopularReviewCard } from '@/features/reviews/PopularReviewCard';
import { PopularListCard } from '@/features/lists/PopularListCard';
import type { ContentItem } from '@/types/content';

// Ana sayfa bileşeni
// Öne çıkan içerik hero'su, popüler filmler, popüler incelemeler,
// popüler listeler ve yakında çıkacak filmler bölümlerini içerir
export default function HomePage() {
  const { t, i18n } = useTranslation();
  const language = langFromI18n(i18n.resolvedLanguage);

  // Haftalık trend içerikler (hero bölümü için)
  const trending = useQuery({
    queryKey: ['trending', 'all', 'week', language],
    queryFn: () => contentApi.trending('all', 'week', language),
    staleTime: 60 * 60 * 1000, // 1 saat önbellek
  });

  // Popüler filmler
  const popularMovies = useQuery({
    queryKey: ['popular', 'movie', language],
    queryFn: () => contentApi.popular('movie', language, 1),
    staleTime: 60 * 60 * 1000,
  });

  // Yakında vizyona girecek filmler
  const upcoming = useQuery({
    queryKey: ['upcoming', language],
    queryFn: () => contentApi.upcoming(language, 1),
    staleTime: 60 * 60 * 1000,
  });
  // Son 7 günün popüler incelemeleri
  const popularReviews = useQuery({
    queryKey: ['reviews', 'popular', 'week'],
    queryFn: () => reviewsApi.popular(7, 12),
    staleTime: 10 * 60 * 1000,
  });

  const popularLists = useQuery({
    queryKey: ['lists', 'popular'],
    queryFn: () => listsApi.popular(10),
    staleTime: 10 * 60 * 1000,
  });

  // Hero bölümü için öne çıkan içerik index'i
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const featuredItems = trending.data?.results.slice(0, 5) ?? [];
  const featured = featuredItems[featuredIndex];
  const popularItems = popularMovies.data?.results.slice(0, 12) ?? [];

  // Bugünden sonraki tarihe sahip filmleri filtrele (gerçekten "yakında" olanlar)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingItems = (upcoming.data?.results ?? [])
    .filter((m) => m.releaseDate && new Date(m.releaseDate) > today)
    .slice(0, 12);

  return (
    <div className="space-y-12">
      {/* Öne çıkan içerik hero bölümü */}
      {featuredItems.length > 0 && featured ? (
        <FeaturedHero
          item={featured}
          onNext={() => setFeaturedIndex((i) => (i + 1) % featuredItems.length)}
          onPrev={() => setFeaturedIndex((i) => (i === 0 ? featuredItems.length - 1 : i - 1))}
        />
      ) : (
        <HeroSkeleton />
      )}

      {/* Popüler filmler bölümü */}
      <section>
        <div className="section-title">
          <h2>{t('home.sections.popular')}</h2>
          <Link to="/discover">{t('home.sections.seeAll')} →</Link>
        </div>
        {popularMovies.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <PosterSkeleton count={6} />
          </div>
        ) : (
          <Slider ariaLabel={t('home.sections.popular')}>
            {popularItems.map((m) => (
              <div key={`${m.type}-${m.id}`} className="w-40 shrink-0 snap-start sm:w-44">
                <ContentCard item={m} />
              </div>
            ))}
          </Slider>
        )}
      </section>


      {/* Popüler listeler bölümü */}
      <section>
        <div className="section-title">
          <h2>{t('home.sections.popularReviews')}</h2>
          <Link to="/discover">{t('home.sections.seeAll')} →</Link>
        </div>
        {popularReviews.isLoading ? (
          <div className="card text-sm text-ink-muted">{t('home.loading')}</div>
        ) : (popularReviews.data ?? []).length === 0 ? (
          <div className="card text-center text-sm text-ink-muted">
            {t('home.empty.reviews')}
          </div>
        ) : (
          <Slider ariaLabel={t('home.sections.popularReviews')}>
            {popularReviews.data!.map((r) => (
              <PopularReviewCard key={r.id} review={r} />
            ))}
          </Slider>
        )}
      </section>

      <section>
        <div className="section-title">
          <h2>{t('home.sections.popularLists')}</h2>
        </div>
        {popularLists.isLoading ? (
          <div className="card text-sm text-ink-muted">{t('home.loading')}</div>
        ) : (popularLists.data ?? []).length === 0 ? (
          <div className="card text-center text-sm text-ink-muted">{t('home.empty.lists')}</div>
        ) : (
          <Slider ariaLabel={t('home.sections.popularLists')}>
            {popularLists.data!.map((l) => (
              <PopularListCard key={l.id} list={l} />
            ))}
          </Slider>
        )}
      </section>

      {/* Yakında vizyonda bölümü */}
      <section>
        <div className="section-title">
          <h2>{t('home.sections.upcoming')}</h2>
          <Link to="/discover">{t('home.sections.seeAll')} →</Link>
        </div>
        {upcoming.isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <PosterSkeleton count={4} />
          </div>
        ) : (
          <Slider ariaLabel={t('home.sections.upcoming')}>
            {upcomingItems.map((m) => (
              <div key={`${m.type}-${m.id}`} className="w-40 shrink-0 snap-start sm:w-44">
                <ContentCard item={m} />
              </div>
            ))}
          </Slider>
        )}
      </section>
    </div>
  );
}

// Öne çıkan içerik hero bileşeni
// Arka plan görseli, poster, başlık, özet ve aksiyon butonlarıyla zengin görsel sunum
function FeaturedHero({ item, onNext, onPrev }: { item: ContentItem; onNext: () => void; onPrev: () => void }) {
  const { t } = useTranslation();
  const backdropUrl = backdrop(item.backdropPath, 'w1280');
  const posterUrl = poster(item.posterPath, 'w500');
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
  const fiveStar = item.voteAverage ? +(item.voteAverage / 2).toFixed(1) : 0;

  return (
    <section className="relative -mt-8" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }} aria-labelledby="hero-title">
      <div className="relative overflow-hidden">
        {/* Arka plan görseli ve kaplama katmanları — tam genişlik */}
        {backdropUrl && (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backdropUrl})` }} aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/60 to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-surface/40" aria-hidden="true" />
        <div className="absolute inset-0 backdrop-blur-md" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-14 md:grid-cols-[220px,1fr] md:items-center">
          {/* Poster */}
          {posterUrl ? (
            <img src={posterUrl} alt={item.title} className="aspect-[2/3] w-full max-w-[220px] rounded-xl shadow-card ring-1 ring-white/10" />
          ) : (
            <div className="aspect-[2/3] w-full max-w-[220px] rounded-xl bg-surface-muted" />
          )}

          <div className="text-balance">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">{t('home.hero.eyebrow')}</p>
            <h1 id="hero-title" className="font-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">{item.title}</h1>
            {item.overview && (
              <p className="mt-2 max-w-prose text-sm text-ink-muted line-clamp-3 sm:text-base">{item.overview}</p>
            )}

            {/* Yıl, puan ve oy sayısı */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
              {year && (
                <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs font-semibold text-ink">{year}</span>
              )}
              <RatingStars value={fiveStar} showValue />
              <span>{item.voteCount.toLocaleString()} {t('home.hero.reviews')}</span>
            </div>

            {/* Aksiyon butonları */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={`/${item.type}/${item.id}`} className="btn-primary">{t('home.hero.review')}</Link>
              <Link to={`/${item.type}/${item.id}`} className="btn-outline">{t('home.hero.watchlist')}</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Önceki/Sonraki navigasyon butonları */}
      <button onClick={onPrev} className="absolute left-4 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-ink shadow-card ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-surface-raised" aria-label="Önceki">←</button>
      <button onClick={onNext} className="absolute right-4 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-ink shadow-card ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-surface-raised" aria-label="Sonraki">→</button>
    </section>
  );
}

// Hero bölümü yükleme iskeleti
function HeroSkeleton() {
  return (
    <div className="-mt-8 grid animate-pulse gap-8 bg-surface-raised p-6 sm:p-10 md:grid-cols-[220px,1fr]" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
      <div className="aspect-[2/3] w-full max-w-[220px] rounded-xl bg-surface-muted" />
      <div className="space-y-3">
        <div className="h-10 w-2/3 rounded bg-surface-muted" />
        <div className="h-4 w-full rounded bg-surface-muted" />
        <div className="h-4 w-5/6 rounded bg-surface-muted" />
      </div>
    </div>
  );
}
