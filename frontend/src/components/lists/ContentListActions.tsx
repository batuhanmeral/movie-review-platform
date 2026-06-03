import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listsApi, type MyListSummary } from '@/api/lists.api';
import { langFromI18n } from '@/api/content.api';
import { useAuthStore } from '@/features/auth/authStore';
import { useInvalidateLists } from '@/features/list/useInvalidateLists';
import { listDisplayName } from '@/features/list/listLabels';
import { Dropdown, DropdownItem } from '@/components/common/Dropdown';
import { CreateListModal } from './CreateListModal';

interface Props {
  tmdbId: number;
  type: 'movie' | 'tv';
}

// İçerik detayındaki liste aksiyonları: tek tıkla "İzledim" (WATCHED) ve
// "İzleyeceğim" (WATCHLIST) toggle butonları + tüm listeler için "Listeye Ekle"
// açılır menüsü (yeni liste oluşturma dahil). Sadece giriş yapana görünür.
export function ContentListActions({ tmdbId, type }: Props) {
  const user = useAuthStore((s) => s.user);
  const { t, i18n } = useTranslation();
  const invalidateLists = useInvalidateLists();
  const [createOpen, setCreateOpen] = useState(false);

  const queryKey = ['my-lists', tmdbId, type] as const;
  const { data: lists } = useQuery({
    queryKey,
    queryFn: () => listsApi.myLists({ tmdbId, type }),
    enabled: !!user,
  });

  // Bir listede üyeliği aç/kapat (itemId varsa çıkar, yoksa ekle)
  const toggle = useMutation({
    mutationFn: async (list: MyListSummary) => {
      if (list.itemId) {
        await listsApi.removeItem(list.id, list.itemId);
      } else {
        await listsApi.addItem(list.id, { tmdbId, type, language: langFromI18n(i18n.language) });
      }
    },
    onSuccess: invalidateLists,
  });

  if (!user) return null;

  const watched = lists?.find((l) => l.type === 'WATCHED');
  const watchlist = lists?.find((l) => l.type === 'WATCHLIST');
  const favorites = lists?.find((l) => l.type === 'FAVORITES');

  // Tek-tık sistem listesi butonu (aktifse accent dolu)
  const quickButton = (list: MyListSummary | undefined, activeText: string, idleText: string) => {
    if (!list) return null;
    const active = Boolean(list.itemId);
    return (
      <button
        type="button"
        onClick={() => toggle.mutate(list)}
        disabled={toggle.isPending}
        className={`${active ? 'btn-primary' : 'btn-outline'} disabled:opacity-50`}
      >
        {active ? `✓ ${activeText}` : idleText}
      </button>
    );
  };

  // Favorilere ekle/çıkar — kalp ikonu (dolu kırmızı = favorilerde)
  const favoriteButton = () => {
    if (!favorites) return null;
    const active = Boolean(favorites.itemId);
    return (
      <button
        type="button"
        onClick={() => toggle.mutate(favorites)}
        disabled={toggle.isPending}
        aria-label={active ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        title={active ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        className={`btn-outline px-3 text-lg leading-none disabled:opacity-50 ${
          active ? 'border-rating-low text-rating-low hover:text-rating-low' : ''
        }`}
      >
        {active ? '❤️' : '🤍'}
      </button>
    );
  };

  return (
    <>
      {quickButton(watched, 'İzledim', '＋ İzledim')}
      {quickButton(watchlist, 'İzleme Listemde', '＋ İzleyeceğim')}
      {favoriteButton()}

      {/* Tüm listeler için açılır menü */}
      <Dropdown
        align="left"
        placement="top"
        triggerLabel="Listeye ekle"
        triggerClassName="btn-outline"
        trigger={<span>＋ Listeye Ekle ▾</span>}
      >
        {() => (
          <div className="min-w-[15rem]">
            {(lists ?? []).map((list) => (
              <DropdownItem
                key={list.id}
                onClick={() => toggle.mutate(list)}
                disabled={toggle.isPending}
              >
                <span className="flex-1">{listDisplayName(list, t)}</span>
                {list.itemId ? (
                  <span className="text-accent">✓</span>
                ) : (
                  <span className="text-ink-muted">＋</span>
                )}
              </DropdownItem>
            ))}
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
