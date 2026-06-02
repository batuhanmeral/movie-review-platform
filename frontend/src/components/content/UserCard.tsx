import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { UserSearchResult } from '@/types/auth';

// Kullanıcı arama sonucu kartı — keşfet sayfası grid'inde kullanılır.
// Avatar + görünen ad + @kullanıcı adı + takipçi sayısı gösterir; profil sayfasına yönlendirir.
export function UserCard({ user }: { user: UserSearchResult }) {
  const { t } = useTranslation();
  const name = user.displayName ?? user.username;
  const initial = name.charAt(0).toUpperCase();

  return (
    <Link
      to={`/u/${user.username}`}
      className="group flex flex-col items-center gap-2 rounded-xl bg-surface-raised p-4 text-center ring-1 ring-white/5 transition-all duration-300 ease-spring hover:-translate-y-1 hover:ring-accent/50 hover:shadow-glow"
      aria-label={name}
    >
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#2C3440] to-[#14181C] text-2xl font-bold text-white ring-1 ring-white/10">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          initial
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="truncate text-xs text-ink-muted">@{user.username}</p>
      </div>
      <p className="text-[11px] text-ink-dim">
        {t('discover.followerCount', { count: user._count.followers })}
      </p>
    </Link>
  );
}
