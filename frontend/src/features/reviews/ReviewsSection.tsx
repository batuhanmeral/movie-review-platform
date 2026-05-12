import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
import { reviewsApi } from '@/api/reviews.api';
import { useAuthStore } from '@/features/auth/authStore';
import type { ReviewSort } from '@/types/review';
import { ReviewForm } from './ReviewForm';
import { ReviewItem } from './ReviewItem';

interface Props {
  contentId: string;
}

export function ReviewsSection({ contentId }: Props) {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const [sort, setSort] = useState<ReviewSort>('newest');

  const { data: list, isLoading } = useQuery({
    queryKey: ['reviews', contentId, sort],
    queryFn: () => reviewsApi.listForContent(contentId, sort, 1, 20),
  });

  const { data: mine } = useQuery({
    queryKey: ['reviews', contentId, 'me'],
    queryFn: () => reviewsApi.myForContent(contentId),
    enabled: Boolean(me),
  });

  const otherItems = (list?.items ?? []).filter((r) => r.id !== mine?.id);

  return (
    <section className="space-y-5">
      <div className="section-title flex items-center justify-between">
        <h2>{t('reviews.title')}</h2>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-ink-muted">{t('reviews.sortLabel')}</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ReviewSort)}
            className="rounded-lg border border-white/10 bg-surface-raised px-2 py-1 text-ink focus:border-accent focus:outline-none"
          >
            <option value="newest">{t('reviews.sortNewest')}</option>
            <option value="popular">{t('reviews.sortPopular')}</option>
          </select>
        </div>
      </div>

      {!me && (
        <div className="card text-center text-sm text-ink-muted">
          <Trans
            i18nKey="reviews.loginPrompt"
            components={[<Link key="login" to="/login" className="text-accent hover:underline" />]}
          />
        </div>
      )}

      {me && !mine && <ReviewForm contentId={contentId} existing={null} />}

      {mine && <ReviewItem review={mine} contentId={contentId} isOwn />}

      {isLoading ? (
        <div className="card text-center text-sm text-ink-muted">{t('reviews.loading')}</div>
      ) : otherItems.length === 0 && !mine ? (
        <div className="card text-center text-sm text-ink-muted">{t('reviews.empty')}</div>
      ) : (
        <div className="space-y-3">
          {otherItems.map((r) => (
            <ReviewItem key={r.id} review={r} contentId={contentId} />
          ))}
        </div>
      )}
    </section>
  );
}
