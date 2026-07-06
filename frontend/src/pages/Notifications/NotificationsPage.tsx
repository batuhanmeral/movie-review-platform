import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications.api';
import { useNotificationPresenter } from '@/features/notifications/useNotificationPresenter';
import { EmptyState } from '@/components/common/EmptyState';
import { timeAgo } from '@/lib/timeAgo';
import type { NotificationItem } from '@/types/notification';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'tr';
  const qc = useQueryClient();
  const { messageFor, linkFor } = useNotificationPresenter();

  const query = useInfiniteQuery({
    queryKey: ['notifications', 'page'],
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['notifications'] });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: invalidate });
  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = query.data?.pages[0]?.unread ?? 0;

  const renderRow = (n: NotificationItem) => (
    <div className="flex items-start gap-3">
      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-accent'}`} />
      <div className="min-w-0">
        <p className="text-sm text-ink">{messageFor(n)}</p>
        {n.type === 'ADMIN_ANNOUNCEMENT' && n.body && (
          <p className="mt-0.5 text-xs text-ink-muted">{n.body}</p>
        )}
        <p className="mt-0.5 text-xs text-ink-dim">{timeAgo(n.createdAt, lang)}</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">{t('notifications.title')}</h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="text-sm font-medium text-accent hover:underline"
          >
            {t('notifications.markAllRead')}
          </button>
        )}
      </header>

      {query.isLoading ? (
        <p className="py-10 text-center text-sm text-ink-muted">{t('notifications.loading')}</p>
      ) : items.length === 0 ? (
        <EmptyState icon="🔔" title={t('notifications.empty')} />
      ) : (
        <>
          <ul className="overflow-hidden rounded-xl border border-white/5 bg-surface-raised divide-y divide-white/5">
            {items.map((n) => {
              const to = linkFor(n);
              const base = `block px-4 py-3 transition-colors hover:bg-surface-muted ${
                n.isRead ? '' : 'bg-accent/5'
              }`;
              const onClick = () => {
                if (!n.isRead) markOne.mutate(n.id);
              };
              return (
                <li key={n.id}>
                  {to ? (
                    <Link to={to} onClick={onClick} className={base}>
                      {renderRow(n)}
                    </Link>
                  ) : (
                    <button type="button" onClick={onClick} className={`${base} w-full text-left`}>
                      {renderRow(n)}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {query.hasNextPage && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                className="btn-outline px-6 py-2 text-sm disabled:opacity-60"
              >
                {query.isFetchingNextPage ? t('notifications.loading') : t('notifications.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
