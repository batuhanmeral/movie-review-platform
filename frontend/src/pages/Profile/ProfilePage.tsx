import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/features/auth/authStore';

// Herkese açık kullanıcı profil verisi arayüzü
interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  createdAt: string;
  watchedCount?: number;
  _count: { reviews: number; followers: number; following: number };
}

// Kullanıcı profil sayfası bileşeni
// URL'deki username parametresine göre kullanıcı bilgilerini getirir ve gösterir
// Avatar, bio, konum, istatistikler ve düzenleme/takip butonları içerir
export default function ProfilePage() {
  const { username = '' } = useParams();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const bioMaxLength = 160;

  // Kullanıcı profilini API'den getir
  const { data, isLoading, isError } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await apiClient.get<PublicProfile>(`/users/${username}`);
      return data;
    },
    enabled: Boolean(username),
  });

  // Yükleme durumu iskeleti
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-24 w-24 rounded-full bg-surface-muted" />
        <div className="mt-4 h-6 w-48 rounded bg-surface-muted" />
        <div className="mt-2 h-4 w-32 rounded bg-surface-muted" />
      </div>
    );
  }

  // Hata veya profil bulunamadı durumu
  if (isError || !data) {
    return <div className="card text-center text-ink-muted">{t('profile.notFound')}</div>;
  }

  const initial = (data.displayName ?? data.username).charAt(0).toUpperCase();
  const isOwnProfile = Boolean(user && user.username === data.username);
  const watchedCount = data.watchedCount ?? 0;
  // Bio metnini belirli uzunlukta kes
  const bioText = (data.bio ?? '').trim();
  const bioDisplay =
    bioText.length > bioMaxLength ? `${bioText.slice(0, bioMaxLength)}…` : bioText;

  return (
    <div className="space-y-6">
      {/* Profil başlık kartı */}
      <header className="card relative overflow-hidden">
        {/* Dekoratif arka plan gradient'i */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-accent/30 via-accent-cyan/20 to-transparent blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Sol bölüm: Avatar, isim, konum */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:w-[34%] lg:pr-6">
            {/* Avatar */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-cyan text-3xl font-bold text-surface ring-4 ring-surface">
              {data.avatarUrl ? (
                <img src={data.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold text-ink">{data.displayName ?? data.username}</h1>
                {/* Kendi profilinse düzenle, değilse takip et butonu */}
                {isOwnProfile ? (
                  <Link to="/settings" className="btn-outline px-3 py-1 text-xs">{t('profile.editProfile')}</Link>
                ) : (
                  <button type="button" disabled title={t('profile.followComingSoon')} className="btn-outline px-3 py-1 text-xs">{t('profile.follow')}</button>
                )}
              </div>
              <p className="text-sm text-ink-muted">@{data.username}</p>
              {/* Konum bilgisi */}
              {data.location && (
                <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z" />
                  </svg>
                  {data.location}
                </p>
              )}
            </div>
          </div>
          {/* Orta bölüm: Biyografi */}
          {bioDisplay && (
            <div className="lg:flex-1 lg:self-stretch lg:border-l lg:border-white/10 lg:pl-6">
              <p className="max-w-prose text-sm text-ink">{bioDisplay}</p>
            </div>
          )}
          {/* Sağ bölüm: İstatistikler */}
          <div className="lg:w-[30%] lg:self-stretch lg:border-l lg:border-white/10 lg:pl-6">
            <div className="grid grid-cols-2 gap-3 text-center">
              <Stat label={t('profile.watched')} value={watchedCount} />
              <Stat label={t('profile.reviews')} value={data._count.reviews} />
              <Stat label={t('profile.followers')} value={data._count.followers} />
              <Stat label={t('profile.following')} value={data._count.following} />
            </div>
          </div>
        </div>
      </header>

      {/* İçerik alanı yer tutucusu */}
      <div className="card text-sm text-ink-muted">{t('profile.empty')}</div>
    </div>
  );
}

// İstatistik göstergesi bileşeni (izlenen, inceleme, takipçi, takip sayıları)
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-xl font-bold text-ink">{value}</div>
      <div className="text-xs uppercase tracking-wider text-ink-muted">{label}</div>
    </div>
  );
}
