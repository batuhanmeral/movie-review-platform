import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { BarSeries, PageHeader, StatCard } from './components';

export function AdminStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
  });

  return (
    <div>
      <PageHeader title="İstatistikler" subtitle="Son 30 gün aktivitesi ve öne çıkanlar" />

      {isLoading || !data ? (
        <p className="text-sm text-ink-muted">Yükleniyor…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Kullanıcı" value={data.totals.users} />
            <StatCard label="İçerik" value={data.totals.content} />
            <StatCard label="İnceleme" value={data.totals.reviews} />
            <StatCard label="Liste" value={data.totals.lists} />
            <StatCard label="Yorum" value={data.totals.comments} />
            <StatCard
              label="Bekleyen Rapor"
              value={data.totals.pendingReports}
              highlight={data.totals.pendingReports > 0}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BarSeries data={data.signupsSeries} label="Günlük yeni kullanıcı (30 gün)" />
            <BarSeries data={data.reviewsSeries} label="Günlük inceleme (30 gün)" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-surface-raised p-4">
              <p className="mb-3 text-sm font-semibold text-ink">En çok incelenen içerikler</p>
              <ul className="space-y-2">
                {data.topContent.map((c, i) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-ink">
                      <span className="mr-2 text-ink-dim">{i + 1}.</span>
                      {c.title}
                    </span>
                    <span className="ml-2 shrink-0 text-ink-muted">{c.reviewCount} inceleme</span>
                  </li>
                ))}
                {data.topContent.length === 0 && (
                  <li className="text-sm text-ink-muted">Veri yok</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-white/5 bg-surface-raised p-4">
              <p className="mb-3 text-sm font-semibold text-ink">En aktif kullanıcılar</p>
              <ul className="space-y-2">
                {data.topUsers.map((u, i) => (
                  <li key={u.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-ink">
                      <span className="mr-2 text-ink-dim">{i + 1}.</span>
                      {u.displayName ?? u.username}
                      <span className="ml-1 text-xs text-ink-dim">@{u.username}</span>
                    </span>
                    <span className="ml-2 shrink-0 text-ink-muted">
                      {u.reviewCount} inceleme · {u.followerCount} takipçi
                    </span>
                  </li>
                ))}
                {data.topUsers.length === 0 && <li className="text-sm text-ink-muted">Veri yok</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
