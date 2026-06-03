import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { poster } from '@/lib/tmdb';
import { listsApi } from '@/api/lists.api';
import { listDisplayName } from '@/features/list/listLabels';

// Profilde gösterilecek azami CUSTOM liste sayısı (fazlası "Tümünü göster" ile)
const CUSTOM_PREVIEW = 3;

// Profil sayfasında kullanıcının kendi (CUSTOM) listeleri kart olarak, en fazla 3 —
// gerisi "Tümünü göster" ile açılır. Sistem listeleri üstteki istatistik kısayollarında.
// Başkası bakıyorsa yalnızca herkese açık listeler gelir.
export function ProfileListsSection({ username }: { username: string }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const { data: lists } = useQuery({
    queryKey: ['user-lists', username],
    queryFn: () => listsApi.userLists(username),
    enabled: Boolean(username),
  });

  const custom = (lists ?? []).filter((l) => l.type === 'CUSTOM');

  if (custom.length === 0) return null;

  const shownCustom = showAll ? custom : custom.slice(0, CUSTOM_PREVIEW);

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-bold text-ink">Listeler</h2>

      {/* CUSTOM listeler — kartlar (en fazla 3) */}
      {custom.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shownCustom.map((list) => (
              <Link
                key={list.id}
                to={`/lists/${list.id}`}
                className="group rounded-2xl border border-white/10 bg-surface-raised p-4 transition-all hover:border-white/20"
              >
                {/* Poster önizleme şeridi */}
                <div className="grid aspect-[16/9] grid-cols-4 gap-0.5 overflow-hidden rounded-xl ring-1 ring-white/10">
                  {list.previewPosters.length > 0 ? (
                    list.previewPosters.slice(0, 4).map((p, i) => {
                      const url = poster(p, 'w185');
                      return (
                        <div key={i} className="h-full overflow-hidden">
                          {url ? (
                            <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-full w-full bg-surface-muted" />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-4 grid place-items-center bg-surface-muted text-xs text-ink-muted">
                      Boş liste
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs">{list.visibility === 'PUBLIC' ? '🌐' : '🔒'}</span>
                  <h3 className="truncate font-semibold text-ink group-hover:text-accent">
                    {listDisplayName(list, t)}
                  </h3>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-ink-muted">
                  <span>{list.itemCount} içerik</span>
                  <span>·</span>
                  <span>{list.likeCount} beğeni</span>
                </div>
              </Link>
            ))}
          </div>

          {/* 3'ten fazlaysa tümünü göster/gizle */}
          {custom.length > CUSTOM_PREVIEW && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll((v) => !v)}
                className="rounded-lg bg-white/10 px-5 py-2 text-sm font-semibold text-ink transition-all hover:bg-white/20"
              >
                {showAll ? 'Daha az göster' : `Tümünü göster (${custom.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
