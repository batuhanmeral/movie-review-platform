import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { AuthShell } from '@/components/auth/AuthShell';
import { resetPassword } from '@/api/auth.api';
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas';

// Şifre sıfırlama sayfası
// E-postadaki bağlantıdan `?token=...` ile açılır, yeni şifreyi belirler.
// Başarılı sıfırlamada tüm oturumlar backend tarafında düşürülür; kullanıcı
// yeni şifresiyle giriş yapmak üzere giriş sayfasına yönlendirilir.
export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  const footer = (
    <Link to="/login" className="font-semibold text-accent hover:underline">
      {t('auth.backToLogin')}
    </Link>
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return;
    setServerError(null);
    try {
      await resetPassword(token, values.password);
      // Yeni şifreyle giriş yapılabilsin diye giriş sayfasına bilgi mesajıyla dön
      navigate('/login', { replace: true, state: { notice: t('auth.resetSuccess') } });
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      setServerError(message ?? t('auth.errors.unexpected'));
    }
  });

  // Bağlantı token'sız açılmışsa form gösterilmez
  if (!token) {
    return (
      <AuthShell title={t('auth.resetTitle')} footer={footer}>
        <div className="rounded-md bg-rating-low/10 px-3 py-2 text-sm text-rating-low">
          {t('auth.resetMissingToken')}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')} footer={footer}>
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="password">
            {t('auth.newPassword')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="input"
            placeholder="••••••••"
            {...register('password')}
          />
          {errors.password && <p className="form-error">{t(errors.password.message!)}</p>}
        </div>

        <div>
          <label className="label" htmlFor="confirmPassword">
            {t('auth.confirmPassword')}
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="input"
            placeholder="••••••••"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="form-error">{t(errors.confirmPassword.message!)}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md bg-rating-low/10 px-3 py-2 text-sm text-rating-low">
            {serverError}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? t('auth.resetSubmitting') : t('auth.resetSubmit')}
        </button>
      </form>
    </AuthShell>
  );
}
