import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/admin.api';
import { PageHeader, StatCard } from './components';

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.dashboard,
  });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform genel görünümü" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Kullanıcı" value={isLoading ? '…' : data?.users ?? 0} />
        <StatCard label="İçerik" value={isLoading ? '…' : data?.content ?? 0} />
        <StatCard label="İnceleme" value={isLoading ? '…' : data?.reviews ?? 0} />
        <StatCard label="Liste" value={isLoading ? '…' : data?.lists ?? 0} />
        <StatCard label="Yorum" value={isLoading ? '…' : data?.comments ?? 0} />
        <StatCard
          label="Bekleyen Rapor"
          value={isLoading ? '…' : data?.pendingReports ?? 0}
          highlight={(data?.pendingReports ?? 0) > 0}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/admin/moderation"
          className="rounded-lg border border-white/10 bg-surface-raised px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/40"
        >
          🛡️ Moderasyon kuyruğu →
        </Link>
        <Link
          to="/admin/stats"
          className="rounded-lg border border-white/10 bg-surface-raised px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/40"
        >
          📈 Detaylı istatistikler →
        </Link>
        <Link
          to="/admin/announcements"
          className="rounded-lg border border-white/10 bg-surface-raised px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-accent/40"
        >
          📣 Duyuru gönder →
        </Link>
      </div>
    </div>
  );
}
