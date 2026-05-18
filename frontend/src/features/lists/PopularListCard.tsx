import { Link } from 'react-router-dom';
import { poster } from '@/lib/tmdb';
import type { PopularList } from '@/api/lists.api';

interface Props {
  list: PopularList;
}

// Popüler liste kartı bileşeni
// Ana sayfada kullanıcıların oluşturduğu popüler listeleri göstermek için kullanılır
// Poster önizlemeleri, liste başlığı, kullanıcı bilgileri ve istatistikleri içerir
export function PopularListCard({ list }: Props) {
  // Liste sahibinin adının ilk harfini avatar olarak kullan
  const initial = (list.user.displayName || list.user.username).charAt(0).toUpperCase();
  // İlk 4 posteri önizleme olarak göster
  const posters = list.previewPosters.slice(0, 4);

  return (
    <article className="card w-72 shrink-0 snap-start sm:w-80">
      {/* Poster önizleme alanı - 4 poster yan yana */}
      <div className="relative grid aspect-[16/10] grid-cols-4 overflow-hidden rounded-lg ring-1 ring-white/10">
        {posters.length > 0 ? (
          posters.map((p, i) => {
            const url = poster(p, 'w185');
            return (
              <div key={i} className="relative h-full overflow-hidden">
                {url ? (
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-full w-full bg-surface-muted" />
                )}
              </div>
            );
          })
        ) : (
          // Liste boşsa yer tutucu göster
          <div className="col-span-4 grid place-items-center bg-gradient-to-br from-surface-muted to-surface-raised text-xs text-ink-muted">
            Boş liste
          </div>
        )}
        {/* Alt gradient kaplama */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent" />
      </div>

      {/* Liste bilgileri */}
      <div className="mt-3">
        <h3 className="truncate font-semibold text-ink">{list.title}</h3>
        {list.description && (
          <p className="mt-1 text-xs text-ink-muted line-clamp-2">{list.description}</p>
        )}
        {/* Alt bilgi: kullanıcı avatarı, içerik sayısı, beğeni sayısı */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <Link
            to={`/u/${list.user.username}`}
            className="flex items-center gap-2 text-ink-muted hover:text-ink"
          >
            {/* Kullanıcı avatarı veya ilk harf */}
            {list.user.avatarUrl ? (
              <img
                src={list.user.avatarUrl}
                alt=""
                className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10"
              />
            ) : (
              <div className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-cyan text-[10px] font-bold text-surface">
                {initial}
              </div>
            )}
            <span>@{list.user.username}</span>
          </Link>
          <div className="flex items-center gap-3 text-ink-muted">
            {/* İçerik sayısı */}
            <span>{list.itemCount} 🎬</span>
            {/* Beğeni sayısı */}
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
              </svg>
              {list.likeCount}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
