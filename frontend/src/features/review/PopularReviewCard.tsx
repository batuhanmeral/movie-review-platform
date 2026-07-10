import { Link } from 'react-router-dom';
import { RatingStars } from '@/components/content/RatingStars';
import { poster } from '@/lib/tmdb';
import type { PopularReview } from '@/api/reviews.api';

interface Props {
  review: PopularReview;
}

export function PopularReviewCard({ review }: Props) {
  const posterUrl = poster(review.content.posterPath, 'w185');
  const initial = (review.user.displayName || review.user.username).charAt(0).toUpperCase();
  const detailHref = `/${review.content.type === 'MOVIE' ? 'movie' : 'tv'}/${review.content.tmdbId}`;

  return (
    <article className="card-hover flex w-72 shrink-0 snap-start gap-3 sm:w-80">
      <Link to={detailHref} className="shrink-0">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={review.content.title}
            className="h-28 w-20 rounded-md object-cover ring-1 ring-white/10"
            loading="lazy"
          />
        ) : (
          <div className="h-28 w-20 rounded-md bg-surface-muted ring-1 ring-white/10" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={detailHref} className="block truncate font-semibold text-ink hover:text-accent">
          {review.content.title}
        </Link>
        <header className="mt-1 flex items-center gap-2">
          {review.user.avatarUrl ? (
            <img
              src={review.user.avatarUrl}
              alt=""
              className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-cyan text-xs font-semibold text-surface">
              {initial}
            </div>
          )}
          <span className="truncate text-xs text-ink-muted">@{review.user.username}</span>
          <RatingStars value={review.rating} size="sm" showValue />
        </header>
        {review.body && (
          <p className="mt-2 text-xs leading-relaxed text-ink/90 line-clamp-3">
            {review.containsSpoiler ? '⚠ Spoiler içeriyor' : review.body}
          </p>
        )}
        <footer className="mt-2 flex items-center gap-3 text-xs text-ink-muted">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
            </svg>
            {review.likeCount}
          </span>
          <span>💬 {review.commentCount}</span>
        </footer>
      </div>
    </article>
  );
}
