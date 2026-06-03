import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { poster } from '@/lib/tmdb';
import { listsApi, type UserListSummary } from '@/api/lists.api';

// Liste tipi → etiket
function typeLabel(list: UserListSummary): string {
  switch (list.type) {
    case 'WATCHED':
      return 'İzlenenler';
    case 'WATCHLIST':
      return 'İzlenecekler';
    case 'FAVORITES':
      return 'Favoriler';
    default:
      return list.title;
  }
}

// Profil sayfasında kullanıcının listelerini gösteren bölüm.
// Başkası bakıyorsa yalnızca herkese açık listeler; sahibi ise özeller de gelir (backend).
export function ProfileListsSection({ username }: { username: string }) {
  const { data: lists } = useQuery({
    queryKey: ['user-lists', username],
    queryFn: () => listsApi.userLists(username),
    enabled: Boolean(username),
  });

  // İzlenenler ve İzleme Listesi her zaman gösterilir (zorunlu/erişilebilir listeler);
  // Favoriler ve diğerleri yalnızca içerik varsa, CUSTOM listeler her zaman.
  const visible = (lists ?? []).filter(
    (l) =>
      l.type === 'WATCHED' ||
      l.type === 'WATCHLIST' ||
      l.type === 'CUSTOM' ||
      l.itemCount > 0,
  );
  if (visible.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-bold text-ink">Listeler</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((list) => (
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
              <h3 className="truncate font-semibold text-ink group-hover:text-accent">
                {typeLabel(list)}
              </h3>
              <span className="text-xs">{list.visibility === 'PUBLIC' ? '🌐' : '🔒'}</span>
            </div>
            <div className="mt-1 flex gap-3 text-xs text-ink-muted">
              <span>{list.itemCount} içerik</span>
              <span>·</span>
              <span>{list.likeCount} beğeni</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
