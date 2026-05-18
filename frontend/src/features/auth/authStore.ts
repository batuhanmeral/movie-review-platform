import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, AuthUser } from '@/types/auth';
import * as authApi from '@/api/auth.api';
import { usersApi, type UpdateMeInput } from '@/api/users.api';

// Kimlik doğrulama (auth) state arayüzü
// Kullanıcı bilgileri, token'lar ve auth işlemlerini tanımlar
interface AuthState {
  user: AuthUser | null;            // Giriş yapan kullanıcının bilgileri
  accessToken: string | null;       // JWT erişim token'ı
  refreshToken: string | null;      // JWT yenileme token'ı
  isLoading: boolean;               // İşlem devam ediyor mu
  initialize: () => Promise<void>;  // Mevcut oturumu kontrol et
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UpdateMeInput) => Promise<void>;
  setSession: (data: AuthResponse) => void;  // Token ve kullanıcı bilgilerini ayarla
  clear: () => void;                          // Oturum verilerini temizle
}

// Zustand ile oluşturulmuş merkezi kimlik doğrulama store'u
// persist middleware'i ile localStorage'da kalıcı olarak saklanır
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      // Oturum bilgilerini (kullanıcı + token'lar) store'a kaydet
      setSession: (data) =>
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        }),

      // Tüm oturum verilerini temizle (çıkış veya token geçersizliğinde)
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),

      // Uygulama ilk yüklendiğinde mevcut token ile kullanıcı bilgilerini getir
      // Token yoksa sessizce çık, token geçersizse oturumu temizle
      initialize: async () => {
        const token = get().accessToken;
        if (!token) return;
        try {
          const user = await usersApi.me();
          set({ user });
        } catch {
          get().clear();
        }
      },

      // E-posta/kullanıcı adı ve şifre ile giriş yap
      login: async (identifier, password) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login(identifier, password);
          get().setSession(data);
        } finally {
          set({ isLoading: false });
        }
      },

      // Yeni kullanıcı kaydı oluştur ve otomatik giriş yap
      register: async (input) => {
        set({ isLoading: true });
        try {
          const data = await authApi.register(input);
          get().setSession(data);
        } finally {
          set({ isLoading: false });
        }
      },

      // Çıkış yap - sunucuda refresh token'ı geçersiz kıl ve yerel verileri temizle
      logout: async () => {
        const token = get().refreshToken;
        if (token) {
          await authApi.logout(token).catch(() => undefined);
        }
        get().clear();
      },

      // Kullanıcı profil bilgilerini güncelle ve store'daki kullanıcıyı yenile
      updateProfile: async (input) => {
        const updated = await usersApi.updateMe(input);
        set({ user: updated });
      },
    }),
    {
      name: 'sf-auth', // localStorage anahtarı
      // Sadece gerekli alanları kalıcı olarak sakla (fonksiyonlar hariç)
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
    },
  ),
);
