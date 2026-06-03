import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { listsApi, type MyListSummary } from '@/api/lists.api';
import { useInvalidateLists } from '@/features/list/useInvalidateLists';
import { CreateListModal, type EditableList } from '@/components/lists/CreateListModal';

// Liste tipi → görünen etiket
function typeLabel(type: MyListSummary['type'], title: string): string {
  switch (type) {
    case 'WATCHED':
      return 'İzlenenler';
    case 'WATCHLIST':
      return 'İzlenecekler';
    case 'FAVORITES':
      return 'Favoriler';
    default:
      return title;
  }
}

// Giriş yapan kullanıcının kendi listelerini yönettiği sayfa (/my-lists).
// Sistem listeleri + oluşturulan CUSTOM listeler; yeni liste oluşturma ve silme.
export default function MyListsPage() {
  const invalidateLists = useInvalidateLists();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EditableList | null>(null);

  const { data: lists, isLoading, error } = useQuery({
    queryKey: ['my-lists'],
    queryFn: () => listsApi.myLists(),
  });

  const deleteMutation = useMutation({
    mutationFn: (listId: string) => listsApi.deleteList(listId),
    onSuccess: invalidateLists,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink">Listelerim</h1>
          <p className="mt-1 text-sm text-ink-muted">Film ve dizilerini koleksiyonlarda topla.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent/90"
        >
          ＋ Yeni Liste
        </button>
      </div>

      {isLoading ? (
        <div className="text-ink-muted">Yükleniyor…</div>
      ) : error ? (
        <div className="text-ink-muted">Listeler yüklenemedi.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(lists ?? []).map((list) => (
            <div
              key={list.id}
              className="group relative rounded-2xl border border-white/10 bg-surface-raised p-5 transition-all hover:border-white/20"
            >
              <Link to={`/lists/${list.id}`} className="block">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-ink group-hover:text-accent">
                    {typeLabel(list.type, list.title)}
                  </h3>
                  <span className="text-xs">{list.visibility === 'PUBLIC' ? '🌐' : '🔒'}</span>
                </div>
                {list.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{list.description}</p>
                )}
                <div className="mt-4 flex gap-3 text-xs text-ink-muted">
                  <span>{list.itemCount} içerik</span>
                  <span>·</span>
                  <span>{list.likeCount} beğeni</span>
                </div>
              </Link>

              {/* Sadece CUSTOM listeler düzenlenebilir/silinebilir */}
              {list.type === 'CUSTOM' && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-all group-hover:opacity-100">
                  <button
                    onClick={() =>
                      setEditing({
                        id: list.id,
                        title: list.title,
                        description: list.description,
                        visibility: list.visibility,
                      })
                    }
                    className="rounded-md p-1 text-ink-muted hover:text-accent"
                    aria-label="Listeyi düzenle"
                    title="Listeyi düzenle"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`"${list.title}" listesini silmek istediğine emin misin?`)) {
                        deleteMutation.mutate(list.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="rounded-md p-1 text-ink-muted hover:text-rating-low disabled:opacity-40"
                    aria-label="Listeyi sil"
                    title="Listeyi sil"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateListModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {/* Koşullu mount → her açılışta alanlar mevcut listeden taze doldurulur */}
      {editing && (
        <CreateListModal open editList={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
