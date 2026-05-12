import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reviewsApi } from '@/api/reviews.api';
import { useAuthStore } from '@/features/auth/authStore';
import { RatingStars } from '@/components/content/RatingStars';
import type { Review } from '@/types/review';
import { CommentThread } from './CommentThread';
import { ReviewForm } from './ReviewForm';

interface Props {
  review: Review;
  contentId: string;
  isOwn?: boolean;
}

export function ReviewItem({ review, contentId, isOwn = false }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);

  const like = useMutation({
    mutationFn: () => reviewsApi.toggleLike(review.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', contentId] });
    },
  });

  const initial = (review.user.displayName || review.user.username).charAt(0).toUpperCase();
  const date = new Date(review.createdAt).toLocaleDateString();
  const hidden = review.containsSpoiler && !showSpoiler;

  if (editing) {
    return (
      <ReviewForm
        contentId={contentId}
        existing={review}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article
      className={`card space-y-3 ${isOwn ? 'ring-1 ring-accent/40' : ''}`}
    >
      <header className="flex items-center gap-3">
        {review.user.avatarUrl ? (
          <img
            src={review.user.avatarUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-cyan font-semibold text-surface">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {review.user.displayName || review.user.username}
            {isOwn && (
              <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                {t('reviews.yours')}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-ink-muted">
            @{review.user.username} · {date}
          </p>
        </div>
        <RatingStars value={review.rating} size="sm" showValue />
      </header>

      {review.body && (
        <div className="text-sm leading-relaxed text-ink/90">
          {hidden ? (
            <button
              type="button"
              onClick={() => setShowSpoiler(true)}
              className="text-rating-mid hover:underline"
            >
              {t('reviews.spoilerHidden')}
            </button>
          ) : (
            <p className="whitespace-pre-wrap break-words">{review.body}</p>
          )}
        </div>
      )}

      <footer className="flex items-center gap-4 text-xs text-ink-muted">
        <button
          type="button"
          disabled={!me || like.isPending}
          onClick={() => like.mutate()}
          className={`flex items-center gap-1 transition-colors ${
            review.likedByMe ? 'text-rating-low' : 'hover:text-ink'
          } disabled:opacity-50`}
          aria-label={t('reviews.like')}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
          </svg>
          {review.likeCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1 hover:text-ink"
        >
          💬 {review.commentCount}
        </button>
        {review.isFlagged && (
          <span className="rounded-full bg-rating-low/20 px-2 py-0.5 text-rating-low">
            {t('reviews.flagged')}
          </span>
        )}
        {isOwn && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto rounded-md border border-white/10 px-2 py-1 text-xs text-ink-muted hover:border-accent hover:text-accent"
          >
            {t('reviews.edit')}
          </button>
        )}
      </footer>

      {showComments && <CommentThread reviewId={review.id} />}
    </article>
  );
}
