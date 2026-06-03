import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { listsApi, type ListSummary, type ListVisibility } from '@/api/lists.api';
import { useInvalidateLists } from '@/features/list/useInvalidateLists';

// Düzenleme modunda verilen mevcut liste alanları
export interface EditableList {
  id: string;
  title: string;
  description: string | null;
  visibility: ListVisibility;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (list: ListSummary) => void;
  // Verilirse modal "düzenle" modunda açılır (alanlar önceden doldurulur)
  editList?: EditableList;
}

// CUSTOM liste oluşturma/düzenleme modalı (başlık + açıklama + görünürlük).
export function CreateListModal({ open, onClose, onSaved, editList }: Props) {
  const invalidateLists = useInvalidateLists();
  const isEdit = Boolean(editList);
  const [title, setTitle] = useState(editList?.title ?? '');
  const [description, setDescription] = useState(editList?.description ?? '');
  const [visibility, setVisibility] = useState<ListVisibility>(editList?.visibility ?? 'PRIVATE');

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        visibility,
      };
      return editList
        ? listsApi.updateList(editList.id, payload)
        : listsApi.createList(payload);
    },
    onSuccess: (list) => {
      invalidateLists();
      onSaved?.(list);
      if (!isEdit) reset();
      onClose();
    },
  });

  const reset = () => {
    setTitle('');
    setDescription('');
    setVisibility('PRIVATE');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/10 bg-surface-raised p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-ink">
          {isEdit ? 'Listeyi Düzenle' : 'Yeni Liste Oluştur'}
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm text-ink-muted">Başlık</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Liste adı"
              className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink-muted">Açıklama (opsiyonel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Bu liste hakkında kısa bir açıklama"
              className="w-full resize-y rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-ink-muted">Görünürlük</label>
            <div className="flex gap-2">
              {(['PRIVATE', 'PUBLIC'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    visibility === v
                      ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                      : 'bg-surface text-ink-muted ring-1 ring-white/10 hover:text-ink'
                  }`}
                >
                  {v === 'PRIVATE' ? '🔒 Özel' : '🌐 Herkese Açık'}
                </button>
              ))}
            </div>
          </div>

          {saveMutation.isError && (
            <p className="text-sm text-rating-low">İşlem başarısız, tekrar deneyin.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saveMutation.isPending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {saveMutation.isPending
                ? isEdit
                  ? 'Kaydediliyor…'
                  : 'Oluşturuluyor…'
                : isEdit
                  ? 'Kaydet'
                  : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
