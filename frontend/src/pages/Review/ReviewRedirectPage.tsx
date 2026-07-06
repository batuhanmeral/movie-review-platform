import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reviewsApi } from '@/api/reviews.api';

// Bildirimlerden gelen "/review/:reviewId" bağlantısını, incelemenin bağlı
// olduğu içerik detay sayfasına (/movie/:tmdbId veya /tv/:tmdbId) çevirir.
// İnceleme silinmişse ana sayfaya döner.
export default function ReviewRedirectPage() {
  const { t } = useTranslation();
  const { reviewId } = useParams<{ reviewId: string }>();

  const { data, isError } = useQuery({
    queryKey: ['review-target', reviewId],
    queryFn: () => reviewsApi.target(reviewId as string),
    enabled: Boolean(reviewId),
    retry: false,
  });

  if (!reviewId || isError) return <Navigate to="/" replace />;
  if (!data) {
    return (
      <p className="py-16 text-center text-sm text-ink-muted">{t('notifications.loading')}</p>
    );
  }

  const base = data.content.type === 'MOVIE' ? '/movie' : '/tv';
  return <Navigate to={`${base}/${data.content.tmdbId}`} replace />;
}
