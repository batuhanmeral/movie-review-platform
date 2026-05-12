import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reviewsApi } from '@/api/reviews.api';
import { RatingStarsInput } from '@/components/content/RatingStarsInput';
import type { Review } from '@/types/review';

interface Props {
  contentId: string;
  existing: Review | null;
  onDone?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({ contentId, existing, onDone, onCancel }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [rating, setRating] = useState<number>(existing?.rating ?? 0);
  const [body, setBody] = useState<string>(existing?.body ?? '');
  const [spoiler, setSpoiler] = useState<boolean>(existing?.containsSpoiler ?? false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRating(existing?.rating ?? 0);
    setBody(existing?.body ?? '');
    setSpoiler(existing?.containsSpoiler ?? false);
  }, [existing?.id]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['reviews', contentId] });
    qc.invalidateQueries({ queryKey: ['reviews', contentId, 'me'] });
    qc.invalidateQueries({ queryKey: ['content'] });
  };

  const create = useMutation({
    mutationFn: () =>
      reviewsApi.create({ contentId, rating, body: body || undefined, containsSpoiler: spoiler }),
    onSuccess: () => {
      setError(null);
      invalidate();
      onDone?.();
    },
    onError: (err: any) =>
      setError(err?.response?.data?.error?.message ?? t('reviews.form.saveFailed')),
  });

  const update = useMutation({
    mutationFn: () =>
      reviewsApi.update(existing!.id, { rating, body: body || null, containsSpoiler: spoiler }),
    onSuccess: () => {
      setError(null);
      invalidate();
      onDone?.();
    },
    onError: (err: any) =>
      setError(err?.response?.data?.error?.message ?? t('reviews.form.updateFailed')),
  });

  const remove = useMutation({
    mutationFn: () => reviewsApi.remove(existing!.id),
    onSuccess: () => {
      setRating(0);
      setBody('');
      setSpoiler(false);
      invalidate();
      onDone?.();
    },
  });

  const isPending = create.isPending || update.isPending || remove.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 0.5) {
      setError(t('reviews.form.selectRating'));
      return;
    }
    if (existing) update.mutate();
    else create.mutate();
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink">
          {existing ? t('reviews.form.editTitle') : t('reviews.form.writeTitle')}
        </h3>
        <RatingStarsInput value={rating} onChange={setRating} size="md" disabled={isPending} />
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={5000}
        placeholder={t('reviews.form.bodyPlaceholder')}
        className="w-full resize-y rounded-lg border border-white/10 bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
        disabled={isPending}
      />

      <label className="flex items-center gap-2 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={spoiler}
          onChange={(e) => setSpoiler(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 accent-accent"
        />
        {t('reviews.form.spoiler')}
      </label>

      {error && <p className="text-sm text-rating-low">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {existing && (
          <button
            type="button"
            onClick={() => {
              if (confirm(t('reviews.form.deleteConfirm'))) remove.mutate();
            }}
            className="btn-ghost text-rating-low"
            disabled={isPending}
          >
            {t('reviews.form.delete')}
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost" disabled={isPending}>
            {t('reviews.cancel')}
          </button>
        )}
        <button type="submit" className="btn-outline" disabled={isPending}>
          {isPending
            ? t('reviews.form.saving')
            : existing
              ? t('reviews.form.update')
              : t('reviews.form.publish')}
        </button>
      </div>
    </form>
  );
}
