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

export type ListType = 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'CUSTOM';
export type ListVisibility = 'PUBLIC' | 'PRIVATE';

// Liste özeti (kendi listelerim / profil listeleri kartları için)
export interface ListSummary {
  id: string;
  title: string;
  description: string | null;
  type: ListType;
  visibility: ListVisibility;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  likeCount: number;
}

// "Listeye Ekle" menüsünde her liste: o içerik listede ise itemId dolu, değilse null
export interface MyListSummary extends ListSummary {
  itemId?: string | null;
}

// Profil listelerinde önizleme posterleriyle birlikte
export interface UserListSummary extends ListSummary {
  previewPosters: string[];
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

  // Giriş yapan kullanıcının kendi listeleri. ref verilirse her listede o içeriğin
  // itemId'si döner ("Listeye Ekle" menüsü için).
  myLists: async (ref?: { tmdbId: number; type: 'movie' | 'tv' }): Promise<MyListSummary[]> => {
    const { data } = await apiClient.get<MyListSummary[]>('/lists/mine', {
      params: ref ? { tmdbId: ref.tmdbId, type: ref.type } : undefined,
    });
    return data;
  },

  // Bir kullanıcının herkese açık listeleri (profil sayfası için)
  userLists: async (username: string): Promise<UserListSummary[]> => {
    const { data } = await apiClient.get<UserListSummary[]>(`/lists/users/${username}`);
    return data;
  },

  // Yeni CUSTOM liste oluşturur
  createList: async (input: {
    title: string;
    description?: string | null;
    visibility?: ListVisibility;
  }): Promise<ListSummary> => {
    const { data } = await apiClient.post<ListSummary>('/lists', input);
    return data;
  },

  // Listeyi günceller
  updateList: async (
    listId: string,
    input: { title?: string; description?: string | null; visibility?: ListVisibility },
  ): Promise<ListSummary> => {
    const { data } = await apiClient.patch<ListSummary>(`/lists/${listId}`, input);
    return data;
  },

  // Listeyi siler
  deleteList: async (listId: string): Promise<void> => {
    await apiClient.delete(`/lists/${listId}`);
  },

  // Listeye içerik ekler (TMDB referansıyla)
  addItem: async (
    listId: string,
    input: { tmdbId: number; type: 'movie' | 'tv'; note?: string; language?: 'tr-TR' | 'en-US' },
  ): Promise<ListItemDetail> => {
    const { data } = await apiClient.post<ListItemDetail>(`/lists/${listId}/items`, input);
    return data;
  },

  // Listeden bir öğeyi kaldırır
  removeItem: async (listId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/lists/${listId}/items/${itemId}`);
  },
};
