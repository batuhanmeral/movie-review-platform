import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { listsApi, type ListSummary, type ListVisibility } from '@/api/lists.api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (list: ListSummary) => void;
}

// Yeni CUSTOM liste oluşturma modalı (başlık + açıklama + görünürlük).
export function CreateListModal({ open, onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ListVisibility>('PRIVATE');

  const createMutation = useMutation({
    mutationFn: () =>
      listsApi.createList({
        title: title.trim(),
        description: description.trim() || null,
        visibility,
      }),
    onSuccess: (list) => {
      qc.invalidateQueries({ queryKey: ['my-lists'] });
      onCreated?.(list);
      reset();
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
        <h2 className="mb-4 text-lg font-bold text-ink">Yeni Liste Oluştur</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) createMutation.mutate();
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

          {createMutation.isError && (
            <p className="text-sm text-rating-low">Liste oluşturulamadı, tekrar deneyin.</p>
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
              disabled={!title.trim() || createMutation.isPending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
