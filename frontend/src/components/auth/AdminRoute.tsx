import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

// Yalnızca ADMIN rolüne sahip kullanıcıların erişebileceği rota koruması.
// - Giriş yapılmamışsa login sayfasına yönlendirir (geri dönüş için konumu taşır).
// - Giriş yapılmış ama rol ADMIN değilse ana sayfaya yönlendirir.
export function AdminRoute({ children }: PropsWithChildren) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
