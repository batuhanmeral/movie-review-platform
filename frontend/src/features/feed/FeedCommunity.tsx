import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PopularReview } from '@/api/reviews.api';
import type { ReviewUser } from '@/types/review';

interface Props {
  reviews: PopularReview[];
}

// Sağ kenar rayı: akışta en aktif sinefilleri (gerçek incelemecileri) listeler.
// Takip özelliği Faz 5'te geleceği için "takip ettiklerin" yerine
// akışın kendi yazarlarından türetilmiş gerçek bir liste gösterir.
export function FeedCommunity({ reviews }: Props) {
  const { t } = useTranslation();

  const topUsers = useMemo(() => {
    const map = new Map<string, { user: ReviewUser; count: number }>();
    for (const r of reviews) {
      const entry = map.get(r.user.id);
      if (entry) entry.count += 1;
      else map.set(r.user.id, { user: r.user, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [reviews]);

  if (topUsers.length === 0) return null;

  return (
    <div className="card">
      <div className="mb-3">
        <h2 className="font-display text-base font-bold text-ink">{t('feed.community.title')}</h2>
        <p className="text-xs text-ink-muted">{t('feed.community.subtitle')}</p>
      </div>
      <ul className="space-y-0.5">
        {topUsers.map(({ user, count }) => (
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
              <span className="shrink-0 text-xs text-ink-dim">
                {t('feed.community.reviewCount', { count })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Akıştaki incelemelerden türetilmiş küçük istatistik kartı.
export function FeedStats({ reviews }: Props) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const users = new Set(reviews.map((r) => r.user.id));
    const rated = reviews.filter((r) => typeof r.rating === 'number');
    const avg =
      rated.length > 0 ? rated.reduce((sum, r) => sum + r.rating, 0) / rated.length : 0;
    return { reviews: reviews.length, users: users.size, avg };
  }, [reviews]);

  if (stats.reviews === 0) return null;

  return (
    <div className="card grid grid-cols-3 gap-2 text-center">
      <Stat value={stats.reviews} label={t('feed.stats.reviews')} />
      <Stat value={stats.users} label={t('feed.stats.cinephiles')} />
      <Stat value={`${stats.avg.toFixed(1)}★`} label={t('feed.stats.avg')} />
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <p className="font-display text-xl font-extrabold text-accent">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-ink-dim">{label}</p>
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
