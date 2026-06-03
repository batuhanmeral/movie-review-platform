import { useQueryClient } from '@tanstack/react-query';

// Liste ile ilgili tüm sorgu ailelerini geçersiz kılan ortak yardımcı.
// Bir liste mutasyonundan (ekle/çıkar/oluştur/güncelle/sil/sırala/beğeni) sonra
// çağrılır; böylece içerik detayı, Listelerim, liste detayı, profil listeleri ve
// popüler listeler sayfalarının hepsi tutarlı şekilde tazelenir (prefix eşleşmesi).
export function useInvalidateLists() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['my-lists'] }); // ['my-lists'] + ['my-lists', tmdbId, type]
    qc.invalidateQueries({ queryKey: ['list'] }); // liste detayı ['list', listId]
    qc.invalidateQueries({ queryKey: ['user-lists'] }); // profil listeleri
    qc.invalidateQueries({ queryKey: ['lists'] }); // popüler listeler
  };
}
