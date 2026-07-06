import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/api/admin.api';
import { timeAgo } from '@/lib/timeAgo';
import { AdminTable, Badge, EmptyRow, PageHeader, Pagination } from './components';

export function AdminAudit() {
  const [page, setPage] = useState(1);
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? 'tr';

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: () => adminApi.audit({ page, pageSize: 15 }),
  });

  const logs = data?.logs ?? [];

  return (
    <div>
      <PageHeader title="Denetim Kaydı" subtitle="Admin işlemlerinin geçmişi" />

      <AdminTable
        head={
          <tr>
            <th className="px-4 py-3">İşlem</th>
            <th className="px-4 py-3">Hedef</th>
            <th className="px-4 py-3">Admin</th>
            <th className="px-4 py-3">Zaman</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={4} label="Yükleniyor…" />
        ) : logs.length === 0 ? (
          <EmptyRow colSpan={4} label="Kayıt yok" />
        ) : (
          logs.map((l) => (
            <tr key={l.id} className="text-ink transition-colors hover:bg-white/5">
              <td className="px-4 py-3">
                <Badge tone="accent">{l.action}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-ink-muted">
                {l.targetType}: <span className="font-mono">{l.targetId.slice(0, 8)}…</span>
              </td>
              <td className="px-4 py-3 text-xs text-ink-muted">
                {l.adminUsername ? `@${l.adminUsername}` : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-ink-dim">{timeAgo(l.createdAt, lang)}</td>
            </tr>
          ))
        )}
      </AdminTable>

      {data && (
        <Pagination page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
      )}
    </div>
  );
}
