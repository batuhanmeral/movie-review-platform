import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type ReportStatus } from '@/api/admin.api';
import { apiErrorMessage } from '@/lib/apiError';
import { Badge, EmptyRow, PageHeader, Pagination, AdminTable } from './components';

const STATUS_TABS: { value: ReportStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Bekleyen' },
  { value: 'REVIEWED', label: 'İncelendi' },
  { value: 'RESOLVED', label: 'Çözüldü' },
  { value: 'DISMISSED', label: 'Reddedildi' },
  { value: 'ALL', label: 'Tümü' },
];

const statusTone: Record<ReportStatus, 'warning' | 'accent' | 'success' | 'neutral'> = {
  PENDING: 'warning',
  REVIEWED: 'accent',
  RESOLVED: 'success',
  DISMISSED: 'neutral',
};

export function AdminModeration() {
  const [tab, setTab] = useState<ReportStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', tab, page],
    queryFn: () =>
      adminApi.reports({ page, pageSize: 10, status: tab === 'ALL' ? undefined : tab }),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
  const onError = (err: unknown) => window.alert(apiErrorMessage(err, 'İşlem başarısız'));

  const actionMut = useMutation({
    mutationFn: (v: { id: string; status: Exclude<ReportStatus, 'PENDING'> }) =>
      adminApi.updateReport(v.id, v.status),
    onSuccess: invalidate,
    onError,
  });
  const deleteReviewMut = useMutation({
    mutationFn: (reviewId: string) => adminApi.deleteReportedReview(reviewId),
    onSuccess: invalidate,
    onError,
  });
  const deleteCommentMut = useMutation({
    mutationFn: (commentId: string) => adminApi.deleteReportedComment(commentId),
    onSuccess: invalidate,
    onError,
  });

  const reports = data?.reports ?? [];

  return (
    <div>
      <PageHeader title="Moderasyon" subtitle="Kullanıcıların raporladığı incelemeler" />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => {
              setTab(s.value);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === s.value ? 'bg-accent text-surface' : 'bg-white/5 text-ink-muted hover:text-ink'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <AdminTable
        head={
          <tr>
            <th className="px-4 py-3">İçerik</th>
            <th className="px-4 py-3">Tür</th>
            <th className="px-4 py-3">Sebep</th>
            <th className="px-4 py-3">Raporlayan</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3 text-right">İşlemler</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={6} label="Yükleniyor…" />
        ) : reports.length === 0 ? (
          <EmptyRow colSpan={6} label="Bu kategoride rapor yok" />
        ) : (
          reports.map((r) => (
            <tr key={r.id} className="align-top text-ink transition-colors hover:bg-white/5">
              <td className="max-w-xs px-4 py-3">
                {r.review ? (
                  <>
                    <div className="text-xs text-ink-muted">
                      {r.review.content.title} · @{r.review.user.username}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm">{r.review.body || '(metin yok)'}</p>
                  </>
                ) : r.comment ? (
                  <>
                    <div className="text-xs text-ink-muted">
                      {r.comment.review.content.title} · @{r.comment.user.username}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm">{r.comment.body}</p>
                  </>
                ) : (
                  <span className="text-xs text-ink-dim">İçerik silinmiş</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone={r.comment ? 'neutral' : 'accent'}>
                  {r.comment ? 'Yorum' : 'İnceleme'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm">{r.reason}</div>
                {r.description && (
                  <div className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{r.description}</div>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-ink-muted">
                {r.reporter ? `@${r.reporter.username}` : '—'}
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone[r.status]}>{r.status}</Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => actionMut.mutate({ id: r.id, status: 'DISMISSED' })}
                        className="rounded-md border border-white/10 px-2.5 py-1 text-xs transition-colors hover:bg-white/5"
                      >
                        Reddet
                      </button>
                      <button
                        type="button"
                        onClick={() => actionMut.mutate({ id: r.id, status: 'RESOLVED' })}
                        className="rounded-md border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-300 transition-colors hover:bg-emerald-500/10"
                      >
                        Çözüldü
                      </button>
                    </>
                  )}
                  {r.review && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Raporlanan inceleme silinsin mi? Bu işlem geri alınamaz.')) {
                          deleteReviewMut.mutate(r.review!.id);
                        }
                      }}
                      className="rounded-md border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 transition-colors hover:bg-rose-500/10"
                    >
                      İncelemeyi sil
                    </button>
                  )}
                  {r.comment && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Raporlanan yorum silinsin mi? Bu işlem geri alınamaz.')) {
                          deleteCommentMut.mutate(r.comment!.id);
                        }
                      }}
                      className="rounded-md border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 transition-colors hover:bg-rose-500/10"
                    >
                      Yorumu sil
                    </button>
                  )}
                </div>
              </td>
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
