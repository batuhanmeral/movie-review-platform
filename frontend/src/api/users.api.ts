import { apiClient } from './client';
import type { AuthUser, FavoriteContentRef, Language, UserSearchResult } from '@/types/auth';
import type { Lang, UserFavorites } from '@/types/content';
import type { ReviewUser } from '@/types/review';
import type { PopularReview } from './reviews.api';

// Profil güncelleme için girdi alanları
export interface UpdateMeInput {
  displayName?: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
  language?: Language;
  email?: string;
  username?: string;
  // Favoriler: favoriteContent en fazla 4 öğe; id'ler null gönderilerek temizlenebilir
  favoriteContent?: FavoriteContentRef[];
  favoriteActorId?: number | null;
  favoriteDirectorId?: number | null;
}

// Şifre değiştirme için girdi alanları
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Takip et/bırak işlemlerinin döndürdüğü güncel durum
export interface FollowState {
  following: boolean;
  followerCount: number;
}

// Takipçi/takip listesindeki bir kullanıcı satırı
export interface FollowUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isFollowing: boolean; // izleyici bu kişiyi takip ediyor mu
  isSelf: boolean; // bu satır izleyicinin kendisi mi
}

// Kullanıcı profili ile ilgili tüm API çağrılarını içeren nesne
export const usersApi = {
  // Giriş yapan kullanıcının kendi profil bilgilerini getirir
  me: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get<AuthUser>('/users/me');
    return data;
  },

  // Giriş yapan kullanıcının profil bilgilerini günceller
  updateMe: async (input: UpdateMeInput): Promise<AuthUser> => {
    const { data } = await apiClient.patch<AuthUser>('/users/me', input);
    return data;
  },

  // Avatar fotoğrafı yükler (multipart/form-data); güncellenmiş kullanıcıyı döner
  uploadAvatar: async (file: File): Promise<AuthUser> => {
    const form = new FormData();
    form.append('avatar', file);
    const { data } = await apiClient.post<AuthUser>('/users/me/avatar', form);
    return data;
  },


  // Kullanıcının şifresini değiştirir (mevcut şifre doğrulamasıyla)
  changePassword: async (input: ChangePasswordInput): Promise<void> => {
    await apiClient.post('/users/me/password', input);
  },

  // Kullanıcı hesabını kalıcı olarak siler
  deleteMe: async (): Promise<void> => {
    await apiClient.delete('/users/me');
  },

  // Belirtilen kullanıcıyı takip eder
  follow: async (username: string): Promise<FollowState> => {
    const { data } = await apiClient.post<FollowState>(`/users/${username}/follow`);
    return data;
  },

  // Belirtilen kullanıcının takibini bırakır
  unfollow: async (username: string): Promise<FollowState> => {
    const { data } = await apiClient.delete<FollowState>(`/users/${username}/follow`);
    return data;
  },

  // Bir kullanıcının takipçilerini getirir
  followers: async (username: string): Promise<FollowUser[]> => {
    const { data } = await apiClient.get<FollowUser[]>(`/users/${username}/followers`);
    return data;
  },

  // Bir kullanıcının takip ettiklerini getirir
  following: async (username: string): Promise<FollowUser[]> => {
    const { data } = await apiClient.get<FollowUser[]>(`/users/${username}/following`);
    return data;
  },

  // Bir kullanıcının favorilerini (TMDB ile zenginleştirilmiş) getirir
  favorites: async (username: string, language: Lang): Promise<UserFavorites> => {
    const { data } = await apiClient.get<UserFavorites>(`/users/${username}/favorites`, {
      params: { language },
    });
    return data;
  },

  // Bir kullanıcının yazdığı incelemeleri (içerik bilgisiyle) getirir
  reviews: async (username: string, limit = 20): Promise<PopularReview[]> => {
    const { data } = await apiClient.get<PopularReview[]>(`/users/${username}/reviews`, {
      params: { limit },
    });
    return data;
  },

  // İsme/kullanıcı adına göre kullanıcı arar (arama çubuğu önerileri için)
  search: async (q: string): Promise<UserSearchResult[]> => {
    const { data } = await apiClient.get<UserSearchResult[]>('/users/search', {
      params: { q },
    });
    return data;
  },

  // Giriş yapan kullanıcının takip ettiği kişiler (akış "Arkadaşlarım" bölümü)
  myFollowing: async (): Promise<ReviewUser[]> => {
    const { data } = await apiClient.get<ReviewUser[]>('/users/me/following');
    return data;
  },
};
