import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Uygulama teması: koyu (varsayılan) veya açık
export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

// Seçili temayı <html> elementine uygular.
// Koyu tema varsayılan (sınıf yok); açık tema 'light' sınıfıyla aktifleşir.
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('light', theme === 'light');
}

// Tema tercihi store'u — localStorage'da kalıcı, <html> sınıfını senkronize tutar
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
    }),
    {
      name: 'cp-theme',
      // Sayfa yenilendiğinde kalıcı temayı <html>'e geri uygula
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

// Modül yüklenir yüklenmez kalıcı temayı uygula (tema yanıp sönmesini/FOUC önler)
applyTheme(useThemeStore.getState().theme);
