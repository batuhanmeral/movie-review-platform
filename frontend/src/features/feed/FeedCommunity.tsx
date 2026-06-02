import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/features/auth/authStore';
import type { ReviewUser } from '@/types/review';

// Sağ kenar rayı: giriş yapan kullanıcının takip ettiği kişileri ("Arkadaşlarım")
// listeler. Giriş yapılmamışsa veya kimse takip edilmiyorsa hiç gösterilmez.
export function FeedCommunity() {
  const { t } = useTranslation();
  const isAuthed = useAuthStore((s) => Boolean(s.user));

  const friends = useQuery({
    queryKey: ['myFollowing'],
    queryFn: () => usersApi.myFollowing(),
    enabled: isAuthed,
    staleTime: 5 * 60 * 1000,
  });

  const users = friends.data ?? [];
  if (!isAuthed || users.length === 0) return null;

  return (
    <div className="card">
      <div className="mb-3">
        <h2 className="font-display text-base font-bold text-ink">{t('feed.friends.title')}</h2>
        <p className="text-xs text-ink-muted">{t('feed.friends.subtitle')}</p>
      </div>
      <ul className="space-y-0.5">
        {users.map((user) => (
          <li key={user.id}>
            <Link
              to={`/u/${user.username}`}
              className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface-muted"
            >
              <Avatar user={user} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {user.displayName || user.username}
                </p>
                <p className="truncate text-xs text-ink-muted">@{user.username}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Avatar({ user }: { user: ReviewUser }) {
  const initial = (user.displayName || user.username).charAt(0).toUpperCase();
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-cyan text-sm font-semibold text-surface">
      {initial}
    </div>
  );
}
