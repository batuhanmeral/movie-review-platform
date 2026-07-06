import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listsApi } from '@/api/lists.api';
import { PopularListCard } from '@/features/list/PopularListCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuthStore } from '@/features/auth/authStore';

// Herkese açık popüler listeleri grid olarak gösteren sayfa (/lists).
// Her kart, ilgili listenin detay sayfasına bağlanır.
export default function PublicListsPage() {
  const { t } = useTranslation();
  const isAuthed = useAuthStore((s) => Boolean(s.user));
  const [limit, setLimit] = useState(20);

  const {
    data: lists,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['lists', 'popular', limit],
    queryFn: () => listsApi.popular(limit),
  });

  if (isLoading) {
    return <div className="p-8 text-ink-muted">{t('home.loading')}</div>;
  }

  if (error) {
    return <div className="p-8 text-ink-muted">{t('feed.error')}</div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-6xl px-4 pt-8 space-y-8">
        {/* Başlık kartı — altındaki grid ile hizalı, kompakt */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-surface-raised px-5 py-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
              🎬 {t('lists.title')}
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">{t('lists.subtitle')}</p>
          </div>

          {isAuthed && (
            <Link
              to="/my-lists"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent/90"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path fillRule="evenodd" d="M6 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7.414A2 2 0 0 0 15.414 6L12 2.586A2 2 0 0 0 10.586 2H6Zm5 6a1 1 0 1 0-2 0v2H7a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0v-2h2a1 1 0 1 0 0-2h-2V8Z" clipRule="evenodd" />
              </svg>
              {t('lists.myLists')}
            </Link>
          )}
        </div>

        {!lists || lists.length === 0 ? (
          <EmptyState
            icon="🎬"
            title={t('lists.empty')}
            actionLabel={t('discover.title')}
            actionTo="/discover"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lists.map((list) => (
                <PopularListCard key={list.id} list={list} to={`/lists/${list.id}`} />
              ))}
            </div>

            {lists.length >= limit && (
              <div className="mt-12 text-center">
                <button
                  onClick={() => setLimit((prev) => prev + 20)}
                  className="rounded-lg bg-white/10 px-6 py-3 font-semibold text-ink transition-all hover:bg-white/20"
                >
                  {t('lists.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
