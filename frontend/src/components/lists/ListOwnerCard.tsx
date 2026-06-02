import { Link } from 'react-router-dom';
import type { ListDetailResponse } from '@/api/lists.api';

interface Props {
  user: ListDetailResponse['user'];
}

// Liste detay sayfasında listenin sahibini gösteren, profile bağlanan kart
export function ListOwnerCard({ user }: Props) {
  const initial = (user.displayName || user.username).charAt(0).toUpperCase();
  const joinedYear = new Date(user.createdAt).getFullYear();

  return (
    <Link
      to={`/u/${user.username}`}
      className="group block rounded-lg border border-white/10 bg-surface-raised p-6 transition-all hover:border-white/20"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10 transition-all group-hover:ring-accent/50"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-cyan text-2xl font-bold text-surface transition-all group-hover:ring-2 group-hover:ring-accent/50">
              {initial}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-ink transition-colors group-hover:text-accent">
            {user.displayName || user.username}
          </h3>
          <p className="text-sm text-ink-muted">@{user.username}</p>

          {user.bio && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{user.bio}</p>}

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-muted">
            {user.location && (
              <span className="flex items-center gap-1">
                <span>📍</span>
                {user.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span>🎬</span>
              {joinedYear}'de katıldı
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
