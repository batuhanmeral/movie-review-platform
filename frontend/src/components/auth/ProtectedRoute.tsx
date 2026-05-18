import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

// Korumalı rota bileşeni
// Kullanıcı giriş yapmamışsa otomatik olarak login sayfasına yönlendirir
// Yönlendirme sırasında mevcut URL'i kaydeder (giriş sonrası geri dönmek için)
export function ProtectedRoute({ children }: PropsWithChildren) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Kullanıcı yoksa login sayfasına yönlendir, mevcut konumu state olarak aktar
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}
