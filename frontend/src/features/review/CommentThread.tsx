import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reviewsApi } from '@/api/reviews.api';
import { apiErrorMessage } from '@/lib/apiError';
import { useAuthStore } from '@/features/auth/authStore';
import type { ReviewComment } from '@/types/review';

interface Props {
  reviewId: string;
}

export function CommentThread({ reviewId }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [text, setText] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['reviewComments', reviewId],
    queryFn: () => reviewsApi.listComments(reviewId),
  });

  const add = useMutation({
    mutationFn: (body: string) => reviewsApi.addComment(reviewId, body),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['reviewComments', reviewId] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
      // Akıştaki kartın yorum sayacı da güncellensin
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => reviewsApi.deleteComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviewComments', reviewId] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
      // Akıştaki kartın yorum sayacı da güncellensin
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const report = useMutation({
    mutationFn: (v: { id: string; reason: string }) => reviewsApi.reportComment(v.id, v.reason),
    onSuccess: () => window.alert(t('reviews.reported')),
    onError: (err) => window.alert(apiErrorMessage(err, t('reviews.reportFailed'))),
  });

  const handleReport = (id: string) => {
    const reason = window.prompt(t('reviews.reportCommentPrompt'));
    if (reason && reason.trim()) report.mutate({ id, reason: reason.trim() });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (body.length === 0) return;
    add.mutate(body);
  };

  return (
    <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
      {comments.length === 0 ? (
        <p className="text-xs text-ink-muted">{t('reviews.comments.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c: ReviewComment) => (
            <li key={c.id} className="flex gap-3 text-sm">
              <Avatar user={c.user} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-ink">
                    {c.user.displayName || c.user.username}
                  </span>
                  <span className="text-ink-muted">@{c.user.username}</span>
                  <span className="text-ink-muted">·</span>
                  <time className="text-ink-muted">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </time>
                  <span className="ml-auto flex items-center gap-2">
                    {me && me.id !== c.user.id && me.role !== 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => handleReport(c.id)}
                        className="text-ink-dim hover:text-rating-low"
                      >
                        {t('reviews.report')}
                      </button>
                    )}
                    {(me?.id === c.user.id || me?.role === 'ADMIN') && (
                      <button
                        type="button"
                        onClick={() => remove.mutate(c.id)}
                        className="text-ink-muted hover:text-rating-low"
                      >
                        {t('reviews.comments.delete')}
                      </button>
                    )}
                  </span>
                </div>
                <p className="mt-0.5 text-ink/90 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {me ? (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('reviews.comments.placeholder')}
            maxLength={2000}
            className="flex-1 rounded-lg border border-white/10 bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            disabled={add.isPending}
          />
          <button
            type="submit"
            disabled={add.isPending || text.trim().length === 0}
            className="btn-outline text-xs"
          >
            {t('reviews.comments.send')}
          </button>
        </form>
      ) : (
        <p className="text-xs text-ink-muted">{t('reviews.comments.loginPrompt')}</p>
      )}
    </div>
  );
}

function Avatar({ user }: { user: { username: string; displayName: string | null; avatarUrl: string | null } }) {
  const initial = (user.displayName || user.username).charAt(0).toUpperCase();
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }
  return (
    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-cyan text-xs font-semibold text-surface">
      {initial}
    </div>
  );
}
