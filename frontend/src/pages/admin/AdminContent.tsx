import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { useDebounce } from '@/hooks/useDebounce';
import { apiErrorMessage } from '@/lib/apiError';
import { downloadTextFile } from '@/lib/download';
import { AdminTable, Badge, EmptyRow, PageHeader, Pagination, SearchInput } from './components';

export function AdminContent() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 300);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'content', page, debouncedSearch],
    queryFn: () => adminApi.content({ page, pageSize: 10, search: debouncedSearch || undefined }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'content'] });
    setSelected(new Set());
  };
  const onError = (err: unknown) => window.alert(apiErrorMessage(err, 'İşlem başarısız'));

  const del = useMutation({
    mutationFn: (id: string) => adminApi.deleteContent(id),
    onSuccess: invalidate,
    onError,
  });
  const bulkDel = useMutation({
    mutationFn: () => adminApi.bulkDeleteContent([...selected]),
    onSuccess: invalidate,
    onError,
  });
  const exportMut = useMutation({
    mutationFn: () => adminApi.exportContent(),
    onSuccess: (csv) => downloadTextFile('content.csv', csv),
    onError,
  });

  const items = data?.content ?? [];
  const allSelected = items.length > 0 && items.every((c) => selected.has(c.id));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      if (items.every((c) => prev.has(c.id))) {
        const next = new Set(prev);
        items.forEach((c) => next.delete(c.id));
        return next;
      }
      return new Set([...prev, ...items.map((c) => c.id)]);
    });

  return (
    <div>
      <PageHeader
        title="İçerik"
        subtitle="Önbelleğe alınmış film/dizi kayıtları"
        actions={
          <button
            type="button"
            onClick={() => exportMut.mutate()}
            disabled={exportMut.isPending}
            className="rounded-md border border-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            ⬇ CSV dışa aktar
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Başlık ara…"
        />
        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 text-sm">
            <span className="text-ink-muted">{selected.size} seçili</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`${selected.size} içerik silinsin mi? Bu işlem geri alınamaz.`)) {
                  bulkDel.mutate();
                }
              }}
              className="rounded-md border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 transition-colors hover:bg-rose-500/10"
            >
              Seçileni sil
            </button>
          </div>
        )}
      </div>

      <AdminTable
        head={
          <tr>
            <th className="w-10 px-4 py-3">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Tümünü seç" />
            </th>
            <th className="px-4 py-3">Başlık</th>
            <th className="px-4 py-3">Tür</th>
            <th className="px-4 py-3">İnceleme</th>
            <th className="px-4 py-3 text-right">İşlem</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={5} label="Yükleniyor…" />
        ) : items.length === 0 ? (
          <EmptyRow colSpan={5} label="İçerik bulunamadı" />
        ) : (
          items.map((c) => (
            <tr key={c.id} className="text-ink transition-colors hover:bg-white/5">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggleOne(c.id)}
                  aria-label={`${c.title} seç`}
                />
              </td>
              <td className="px-4 py-3 font-medium">{c.title}</td>
              <td className="px-4 py-3">
                <Badge tone={c.type === 'MOVIE' ? 'accent' : 'neutral'}>{c.type}</Badge>
              </td>
              <td className="px-4 py-3 text-ink-muted">{c._count.reviews}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`"${c.title}" ve tüm incelemeleri silinsin mi?`)) {
                      del.mutate(c.id);
                    }
                  }}
                  className="rounded-md border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 transition-colors hover:bg-rose-500/10"
                >
                  Sil
                </button>
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
