import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// 404 Sayfa Bulunamadı bileşeni
// Eşleşmeyen rotalar için gösterilir, ana sayfaya dönüş bağlantısı içerir
export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="card text-center">
      <h1 className="font-display text-5xl text-brand-400">404</h1>
      <p className="mt-2 text-slate-400">{t('notFound.message')}</p>
      <Link to="/" className="btn-primary mt-4">
        {t('notFound.backHome')}
      </Link>
    </div>
  );
}
