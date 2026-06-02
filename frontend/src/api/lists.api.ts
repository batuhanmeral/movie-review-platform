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

// Liste detayındaki tek bir öğe (içerik + sıralama notu)
export interface ListItemDetail {
  id: string;
  contentId: string;
  position: number;
  note: string | null;
  addedAt: string;
  content: {
    id: string;
    title: string;
    posterPath: string | null;
    tmdbId: number;
    type: 'MOVIE' | 'TV';
    releaseDate: string | null;
    overview: string | null;
  };
}

// Tek bir listenin tam detayı (öğeler, sahip bilgisi, beğeni/sahiplik durumu)
export interface ListDetailResponse {
  id: string;
  title: string;
  description: string | null;
  type: 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'CUSTOM';
  visibility: 'PUBLIC' | 'PRIVATE';
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    location: string | null;
    createdAt: string;
  };
  items: ListItemDetail[];
  likeCount: number;
  likedByMe: boolean;
  isOwner: boolean;
}

// Beğeni toggle yanıtı
interface ToggleLikeResponse {
  liked: boolean;
  likeCount: number;
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

  // Tek bir listenin detayını getirir
  getListDetail: async (listId: string): Promise<ListDetailResponse> => {
    const { data } = await apiClient.get<ListDetailResponse>(`/lists/${listId}`);
    return data;
  },

  // Liste öğelerinin sırasını günceller
  reorderListItems: async (
    listId: string,
    items: Array<{ id: string; position: number }>,
  ): Promise<{ items: ListItemDetail[] }> => {
    const { data } = await apiClient.patch<{ items: ListItemDetail[] }>(
      `/lists/${listId}/items/reorder`,
      { items },
    );
    return data;
  },

  // Listeye beğeniyi açıp kapatır
  toggleListLike: async (listId: string): Promise<ToggleLikeResponse> => {
    const { data } = await apiClient.post<ToggleLikeResponse>(`/lists/${listId}/like`, {});
    return data;
  },
};
