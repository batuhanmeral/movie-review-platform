import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications.api';
import { useAuthStore } from '@/features/auth/authStore';
import { useClickOutside } from '@/hooks/useClickOutside';
import { timeAgo } from '@/lib/timeAgo';
import { useNotificationPresenter } from '@/features/notifications/useNotificationPresenter';
import type { NotificationItem } from '@/types/notification';

// Navbar bildirim çanı: okunmamış sayısı 30 sn'de bir poll edilir (polling).
// Açıldığında son bildirimleri listeler; tıklamada okundu işaretler ve ilgili
// varlığa yönlendirir. Yalnızca giriş yapmış kullanıcıya render edilir.
export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open);
  const { messageFor, linkFor } = useNotificationPresenter();

  const enabled = Boolean(user);

  // Okunmamış sayısı — sekme öndeyken 30 sn'de bir poll edilir
  // (arka plandaki sekmede boşuna istek atılmaz)
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.unreadCount,
    enabled,
    refetchInterval: 30_000,
  });

  // Liste yalnızca panel açıkken yüklenir
  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list(1),
    enabled: enabled && open,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['notifications'] });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: invalidate,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });

  if (!user) return null;

  const unread = unreadQuery.data ?? 0;
  const lang = i18n.resolvedLanguage ?? 'tr';
  const items = listQuery.data?.items ?? [];

  const handleClick = (n: NotificationItem) => {
    if (!n.isRead) markOne.mutate(n.id);
    setOpen(false);
  };

  // Tek bir bildirim satırının iç içeriği
  const renderRow = (n: NotificationItem) => (
    <div className="flex gap-3">
      <div
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          n.isRead ? 'bg-transparent' : 'bg-accent'
        }`}
      />
      <div className="min-w-0">
        <p className="text-sm text-ink">{messageFor(n)}</p>
        {n.type === 'ADMIN_ANNOUNCEMENT' && n.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{n.body}</p>
        )}
        <p className="mt-0.5 text-xs text-ink-dim">{timeAgo(n.createdAt, lang)}</p>
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-muted
                   transition-colors hover:bg-surface-muted hover:text-ink"
        aria-label={t('notifications.title')}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex min-w-[1.15rem] items-center justify-center
                       rounded-full bg-accent px-1 text-[0.65rem] font-bold leading-4 text-surface"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 origin-top-right">
          <div className="glass overflow-hidden rounded-xl shadow-card">
            <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
              <p className="text-sm font-semibold text-ink">{t('notifications.title')}</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {listQuery.isLoading ? (
                <p className="px-3 py-8 text-center text-sm text-ink-muted">
                  {t('notifications.loading')}
                </p>
              ) : items.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-ink-muted">
                  {t('notifications.empty')}
                </p>
              ) : (
                items.map((n) => {
                  const to = linkFor(n);
                  const base = `block w-full px-3 py-2.5 text-left transition-colors hover:bg-surface-muted ${
                    n.isRead ? '' : 'bg-accent/5'
                  }`;
                  return to ? (
                    <Link key={n.id} to={to} onClick={() => handleClick(n)} className={base}>
                      {renderRow(n)}
                    </Link>
                  ) : (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className={base}
                    >
                      {renderRow(n)}
                    </button>
                  );
                })
              )}
            </div>

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-white/5 px-3 py-2.5 text-center text-xs font-medium text-accent hover:bg-surface-muted"
            >
              {t('notifications.viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
