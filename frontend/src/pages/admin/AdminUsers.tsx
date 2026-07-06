import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type Role } from '@/api/admin.api';
import { useDebounce } from '@/hooks/useDebounce';
import { apiErrorMessage } from '@/lib/apiError';
import { downloadTextFile } from '@/lib/download';
import {
  AdminTable,
  Badge,
  EmptyRow,
  PageHeader,
  Pagination,
  SearchInput,
} from './components';

export function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 300);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, debouncedSearch],
    queryFn: () => adminApi.users({ page, pageSize: 10, search: debouncedSearch || undefined }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    setSelected(new Set());
  };
  const onError = (err: unknown) => window.alert(apiErrorMessage(err, 'İşlem başarısız'));

  const roleMut = useMutation({
    mutationFn: (v: { id: string; role: Role }) => adminApi.updateRole(v.id, v.role),
    onSuccess: invalidate,
    onError,
  });
  const suspendMut = useMutation({
    mutationFn: (v: { id: string; suspended: boolean }) => adminApi.suspend(v.id, v.suspended),
    onSuccess: invalidate,
    onError,
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: invalidate,
    onError,
  });
  const bulkMut = useMutation({
    mutationFn: (action: 'suspend' | 'unsuspend') => adminApi.bulkUsers([...selected], action),
    onSuccess: invalidate,
    onError,
  });
  const exportMut = useMutation({
    mutationFn: () => adminApi.exportUsers(),
    onSuccess: (csv) => downloadTextFile('users.csv', csv),
    onError,
  });

  const users = data?.users ?? [];
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      if (users.every((u) => prev.has(u.id))) {
        const next = new Set(prev);
        users.forEach((u) => next.delete(u.id));
        return next;
      }
      return new Set([...prev, ...users.map((u) => u.id)]);
    });

  return (
    <div>
      <PageHeader
        title="Kullanıcılar"
        subtitle="Rol yönetimi, askıya alma ve silme"
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
          placeholder="Kullanıcı adı veya e-posta ara…"
        />
        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-sm">
            <span className="text-ink-muted">{selected.size} seçili</span>
            <button
              type="button"
              onClick={() => bulkMut.mutate('suspend')}
              className="rounded-md border border-white/10 px-2.5 py-1 text-xs transition-colors hover:bg-white/5"
            >
              Askıya al
            </button>
            <button
              type="button"
              onClick={() => bulkMut.mutate('unsuspend')}
              className="rounded-md border border-white/10 px-2.5 py-1 text-xs transition-colors hover:bg-white/5"
            >
              Askıyı kaldır
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
            <th className="px-4 py-3">Kullanıcı</th>
            <th className="px-4 py-3">E-posta</th>
            <th className="px-4 py-3">İnceleme</th>
            <th className="px-4 py-3">Durum</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3 text-right">İşlemler</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={7} label="Yükleniyor…" />
        ) : users.length === 0 ? (
          <EmptyRow colSpan={7} label="Kullanıcı bulunamadı" />
        ) : (
          users.map((u) => (
            <tr key={u.id} className="text-ink transition-colors hover:bg-white/5">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onChange={() => toggleOne(u.id)}
                  aria-label={`${u.username} seç`}
                />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">{u.displayName ?? u.username}</div>
                <div className="text-xs text-ink-muted">@{u.username}</div>
              </td>
              <td className="px-4 py-3 text-xs text-ink-muted">{u.email}</td>
              <td className="px-4 py-3 text-ink-muted">{u._count.reviews}</td>
              <td className="px-4 py-3">
                {u.isSuspended ? (
                  <Badge tone="danger">Askıda</Badge>
                ) : (
                  <Badge tone="success">Aktif</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <select
                  value={u.role}
                  onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value as Role })}
                  className="rounded-md border border-white/10 bg-surface px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => suspendMut.mutate({ id: u.id, suspended: !u.isSuspended })}
                    className="rounded-md border border-white/10 px-2.5 py-1 text-xs transition-colors hover:bg-white/5"
                  >
                    {u.isSuspended ? 'Askıyı kaldır' : 'Askıya al'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`@${u.username} kullanıcısı silinsin mi? Bu işlem geri alınamaz.`)) {
                        deleteMut.mutate(u.id);
                      }
                    }}
                    className="rounded-md border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 transition-colors hover:bg-rose-500/10"
                  >
                    Sil
                  </button>
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
