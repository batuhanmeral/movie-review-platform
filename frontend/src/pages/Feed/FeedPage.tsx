import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { reviewsApi, type PopularReview } from '@/api/reviews.api';
import { useAuthStore } from '@/features/auth/authStore';
import { FeedReviewCard } from '@/features/feed/FeedReviewCard';
import { FeedCardSkeleton } from '@/features/feed/FeedCardSkeleton';
import { FeedCommunity } from '@/features/feed/FeedCommunity';
import {
  FeedFilters,
  FEED_WINDOWS,
  MobileFeedBar,
  type FeedSortKey,
  type FeedSource,
  type FeedWindowKey,
} from '@/features/feed/FeedFilters';

// Çekilen incelemeleri seçilen ölçüte göre client-side sıralar.
function sortReviews(list: PopularReview[], sort: FeedSortKey): PopularReview[] {
  if (sort === 'relevant') return list; // API sırası (popülerlik)
  const arr = [...list];
  switch (sort) {
    case 'newest':
      return arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case 'mostLiked':
      return arr.sort((a, b) => b.likeCount - a.likeCount);
    case 'mostCommented':
      return arr.sort((a, b) => b.commentCount - a.commentCount);
    default:
      return arr;
  }
}

// Sosyal Feed (Akış) sayfası — 3 kolon: sol filtreler, orta akış, sağ topluluk.
// Veri reviewsApi.popular() ile gelir; sıralama client-side uygulanır.
export default function FeedPage() {
  const { t } = useTranslation();
  const isAuthed = useAuthStore((s) => Boolean(s.user));
  const [source, setSource] = useState<FeedSource>('popular');
  const [sort, setSort] = useState<FeedSortKey>('relevant');
  const [windowKey, setWindowKey] = useState<FeedWindowKey>('week');

  // Giriş yapılmamışsa takip akışı seçilemez; oturum kapanırsa popüler'e geri dön
  useEffect(() => {
    if (!isAuthed && source === 'following') setSource('popular');
  }, [isAuthed, source]);

  const days = FEED_WINDOWS.find((w) => w.key === windowKey)!.days;
  const isFollowing = source === 'following' && isAuthed;

  const feed = useQuery({
    queryKey: ['feed', source, days],
    queryFn: () => (isFollowing ? reviewsApi.following(days, 30) : reviewsApi.popular(days, 30)),
    staleTime: 5 * 60 * 1000,
  });

  const reviews = feed.data ?? [];
  const sorted = useMemo(() => sortReviews(reviews, sort), [reviews, sort]);

  const filterState = { source, setSource, sort, setSort, windowKey, setWindowKey, canFollow: isAuthed };

  return (
    <div className="flex justify-center gap-6 xl:gap-8">
      {/* SOL RAY — filtreler (lg+) */}
      <aside className="hidden w-52 shrink-0 lg:block">
        <div className="sticky top-20">
          <FeedFilters {...filterState} />
        </div>
      </aside>

      {/* ORTA — akış */}
      <div className="w-full max-w-2xl">
        <header className="mb-5">
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            {t('feed.title')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{t('feed.subtitle')}</p>
        </header>

        {/* Mobil/tablet filtre çubuğu */}
        <div className="mb-5 lg:hidden">
          <MobileFeedBar
            sort={sort}
            setSort={setSort}
            windowKey={windowKey}
            setWindowKey={setWindowKey}
          />
        </div>

        {feed.isLoading ? (
          <div className="space-y-5">
            <FeedCardSkeleton count={3} />
          </div>
        ) : feed.isError ? (
          <div className="card text-center text-sm text-ink-muted">{t('feed.error')}</div>
        ) : sorted.length === 0 ? (
          <div className="card text-center text-sm text-ink-muted">
            {isFollowing ? t('feed.emptyFollowing') : t('feed.empty')}
          </div>
        ) : (
          <div className="space-y-5">
            {sorted.map((review) => (
              <FeedReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>

      {/* SAĞ RAY — arkadaşlarım (xl+) */}
      <aside className="hidden w-72 shrink-0 xl:block">
        <div className="sticky top-20 space-y-5">
          <FeedCommunity />
        </div>
      </aside>
    </div>
  );
}
