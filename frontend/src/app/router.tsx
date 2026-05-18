import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RootLayout } from '@/components/layout/RootLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Lazy loading ile sayfa bileşenlerini dinamik olarak içe aktar
// Bu, ilk yükleme boyutunu küçültür ve performansı artırır
const HomePage = lazy(() => import('@/pages/Home/HomePage'));
const DiscoverPage = lazy(() => import('@/pages/Discover/DiscoverPage'));
const ContentDetailPage = lazy(() => import('@/pages/ContentDetail/ContentDetailPage'));
const LoginPage = lazy(() => import('@/pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/Auth/RegisterPage'));
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/Settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFound/NotFoundPage'));

// Sayfa bileşenleri yüklenirken gösterilecek yükleme göstergesi
function PageFallback() {
  return <div className="p-8 text-ink-muted">Yükleniyor…</div>;
}

// Uygulamanın tüm sayfa rotalarını tanımlayan yönlendirici bileşeni
// RootLayout içinde iç içe (nested) rotalar kullanır
export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Tüm sayfalar RootLayout (navbar + footer) içinde render edilir */}
        <Route element={<RootLayout />}>
          {/* Ana sayfa */}
          <Route path="/" element={<HomePage />} />
          {/* Keşfet sayfası - film/dizi arama ve filtreleme */}
          <Route path="/discover" element={<DiscoverPage />} />
          {/* Film detay sayfası - TMDB ID ile eşleşir */}
          <Route path="/movie/:tmdbId" element={<ContentDetailPage type="movie" />} />
          {/* Dizi detay sayfası - TMDB ID ile eşleşir */}
          <Route path="/tv/:tmdbId" element={<ContentDetailPage type="tv" />} />
          {/* Giriş ve kayıt sayfaları */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Kullanıcı profil sayfası - username parametresi ile */}
          <Route path="/u/:username" element={<ProfilePage />} />
          {/* Ayarlar sayfası - sadece giriş yapmış kullanıcılar erişebilir */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          {/* Eşleşmeyen tüm rotalar için 404 sayfası */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
