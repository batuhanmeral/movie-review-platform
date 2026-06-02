import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listsApi } from '@/api/lists.api';
import { PopularListCard } from '@/features/list/PopularListCard';

// Herkese açık popüler listeleri grid olarak gösteren sayfa (/lists).
// Her kart, ilgili listenin detay sayfasına bağlanır.
export default function PublicListsPage() {
  const { t } = useTranslation();
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
    return <div className="p-8 text-ink-muted">Yükleniyor…</div>;
  }

  if (error) {
    return <div className="p-8 text-ink-muted">Listeler yüklenemedi.</div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-white/10 bg-surface-raised">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-4xl font-bold text-ink">🎬 {t('nav.lists', 'Listeler')}</h1>
          <p className="mt-2 text-lg text-ink-muted">
            Kullanıcıların oluşturduğu ve beğendiği en iyi film ve dizi listeleri
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12">
        {!lists || lists.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-surface-raised p-12 text-center">
            <p className="mb-4 text-lg text-ink-muted">Henüz popüler liste yok.</p>
            <Link
              to="/discover"
              className="inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-surface transition-colors hover:bg-accent/90"
            >
              Keşfet'e git
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-8">
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
                  Daha Fazla Yükle
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
