import { apiClient } from './client';

// Popüler liste verisi için arayüz tanımı
// Kullanıcıların oluşturduğu film/dizi listelerini temsil eder
export interface PopularList {
  id: string;
  title: string;
  description: string | null;
  type: 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'CUSTOM'; // Liste türü
  coverImage: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  likeCount: number;       // Listeyi beğenen kullanıcı sayısı
  itemCount: number;       // Listedeki içerik sayısı
  previewPosters: string[]; // Önizleme için poster görselleri
}

// Liste ile ilgili API çağrılarını içeren nesne
export const listsApi = {
  // En popüler listeleri getirir (varsayılan limit: 10)
  popular: async (limit = 10): Promise<PopularList[]> => {
    const { data } = await apiClient.get<PopularList[]>('/lists/popular', {
      params: { limit },
    });
    return data;
  },
};
