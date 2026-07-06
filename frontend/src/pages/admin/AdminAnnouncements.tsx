import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { apiErrorMessage } from '@/lib/apiError';
import { PageHeader } from './components';

export function AdminAnnouncements() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const mut = useMutation({
    mutationFn: () => adminApi.announce(title.trim(), body.trim()),
    onSuccess: (res) => {
      window.alert(`Duyuru ${res.count} kullanıcıya gönderildi.`);
      setTitle('');
      setBody('');
    },
    onError: (err) => window.alert(apiErrorMessage(err, 'Duyuru gönderilemedi')),
  });

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !mut.isPending;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Duyurular"
        subtitle="Tüm kullanıcılara bildirim olarak gönderilir"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) mut.mutate();
        }}
        className="space-y-4 rounded-xl border border-white/5 bg-surface-raised p-5"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Başlık</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Örn. Yeni özellik: Bildirimler!"
            className="w-full rounded-md border border-white/10 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">İçerik</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Duyuru metni…"
            className="w-full resize-y rounded-md border border-white/10 bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mut.isPending ? 'Gönderiliyor…' : 'Duyuruyu Gönder'}
        </button>
      </form>
    </div>
  );
}
