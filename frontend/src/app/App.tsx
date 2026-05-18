import { useEffect } from 'react';
import { AppProviders } from './providers';
import { AppRouter } from './router';
import { useAuthStore } from '@/features/auth/authStore';

// Uygulamanın kök bileşeni
// İlk yüklemede mevcut oturumu kontrol eder (token varsa kullanıcı bilgisini getirir)
// Provider'lar ve Router'ı sarmalayarak uygulamayı oluşturur
export function App() {
  // Zustand store'dan oturum başlatma fonksiyonunu al
  const initialize = useAuthStore((s) => s.initialize);

  // Bileşen mount olduğunda oturum durumunu kontrol et
  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
