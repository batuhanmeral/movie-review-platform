import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useState, type PropsWithChildren } from 'react';

// Tüm uygulamayı saran üst düzey Provider bileşeni
// React Query (veri çekme/cache) ve React Router (sayfa yönlendirme) sağlayıcılarını içerir
export function AppProviders({ children }: PropsWithChildren) {
  // QueryClient'ı lazy olarak oluştur (her renderda yeniden oluşmasını engelle)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,          // Veriler 60 saniye boyunca "taze" kabul edilir
            refetchOnWindowFocus: false, // Pencere odağı değiştiğinde yeniden sorgu atma
            retry: 1,                   // Başarısız sorgularda en fazla 1 kez tekrar dene
          },
        },
      }),
  );

  return (
    // QueryClientProvider: Veri çekme ve önbellek yönetimi sağlar
    // BrowserRouter: Tarayıcı tabanlı sayfa yönlendirmesi sağlar
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}
