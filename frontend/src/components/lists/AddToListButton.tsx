import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listsApi, type MyListSummary } from '@/api/lists.api';
import { langFromI18n } from '@/api/content.api';
import { useAuthStore } from '@/features/auth/authStore';
import { Dropdown, DropdownItem } from '@/components/common/Dropdown';
import { CreateListModal } from './CreateListModal';

interface Props {
  tmdbId: number;
  type: 'movie' | 'tv';
}

// Liste tipine göre görünen etiket (sistem listeleri sabit, CUSTOM kendi başlığı)
function listLabel(list: MyListSummary): string {
  switch (list.type) {
    case 'WATCHED':
      return 'İzlenenler';
    case 'WATCHLIST':
      return 'İzlenecekler';
    case 'FAVORITES':
      return 'Favoriler';
    default:
      return list.title;
  }
}

// İçerik kartı/detayında "Listeye Ekle" butonu. Açılır menüde kullanıcının
// listeleri, içeriğin o listede olup olmadığı (✓) ile gösterilir; tıklayınca
// ekler/çıkarır. Alttan yeni liste oluşturulabilir. Sadece giriş yapana görünür.
export function AddToListButton({ tmdbId, type }: Props) {
  const user = useAuthStore((s) => s.user);
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const queryKey = ['my-lists', tmdbId, type] as const;
  const { data: lists, isLoading } = useQuery({
    queryKey,
    queryFn: () => listsApi.myLists({ tmdbId, type }),
    enabled: !!user,
  });

  const toggle = useMutation({
    mutationFn: async (list: MyListSummary) => {
      if (list.itemId) {
        await listsApi.removeItem(list.id, list.itemId);
      } else {
        await listsApi.addItem(list.id, { tmdbId, type, language: langFromI18n(i18n.language) });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  // Giriş yapılmamışsa buton gösterilmez (hook'lar yukarıda çağrıldı)
  if (!user) return null;

  return (
    <>
      <Dropdown
        align="left"
        triggerLabel="Listeye ekle"
        triggerClassName="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-all hover:bg-accent/20"
        trigger={
          <>
            <span className="text-base leading-none">＋</span>
            <span>Listeye Ekle</span>
          </>
        }
      >
        {() => (
          <div className="min-w-[15rem]">
            {isLoading ? (
              <DropdownItem disabled>Yükleniyor…</DropdownItem>
            ) : (
              (lists ?? []).map((list) => (
                <DropdownItem
                  key={list.id}
                  onClick={() => toggle.mutate(list)}
                  disabled={toggle.isPending}
                >
                  <span className="flex-1">{listLabel(list)}</span>
                  {list.itemId ? (
                    <span className="text-accent">✓</span>
                  ) : (
                    <span className="text-ink-muted">＋</span>
                  )}
                </DropdownItem>
              ))
            )}

            <div className="my-1 border-t border-white/10" />
            <DropdownItem onClick={() => setCreateOpen(true)}>
              <span className="text-accent">＋ Yeni liste oluştur</span>
            </DropdownItem>
          </div>
        )}
      </Dropdown>

      <CreateListModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
