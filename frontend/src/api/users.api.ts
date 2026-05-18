import { apiClient } from './client';
import type { AuthUser, Language } from '@/types/auth';

// Profil güncelleme için girdi alanları
export interface UpdateMeInput {
  displayName?: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
  language?: Language;
  email?: string;
  username?: string;
}

// Şifre değiştirme için girdi alanları
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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


  // Kullanıcının şifresini değiştirir (mevcut şifre doğrulamasıyla)
  changePassword: async (input: ChangePasswordInput): Promise<void> => {
    await apiClient.post('/users/me/password', input);
  },

  // Kullanıcı hesabını kalıcı olarak siler
  deleteMe: async (): Promise<void> => {
    await apiClient.delete('/users/me');
  },
};
