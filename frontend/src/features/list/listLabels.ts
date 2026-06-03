import type { TFunction } from 'i18next';
import type { ListType } from '@/api/lists.api';

// Liste için gösterilecek ad: sistem listeleri (WATCHED/WATCHLIST/FAVORITES) i18n'den
// çevrilir (dil değişince güncellenir); CUSTOM listeler kullanıcının kendi başlığını gösterir.
export function listDisplayName(list: { type: ListType; title: string }, t: TFunction): string {
  return list.type === 'CUSTOM' ? list.title : t(`list.types.${list.type}`);
}
