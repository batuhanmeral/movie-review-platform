import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { AuthShell } from '@/components/auth/AuthShell';
import { forgotPassword } from '@/api/auth.api';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';

// Şifremi unuttum sayfası
// E-posta adresini alır ve sıfırlama bağlantısı gönderilmesini ister.
// Adresin kayıtlı olup olmadığı kullanıcıya belli edilmez; her durumda aynı
// onay mesajı gösterilir (backend de aynı yanıtı döner).
export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await forgotPassword(values.email);
      setSent(true);
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      setServerError(message ?? t('auth.errors.unexpected'));
    }
  });

  const footer = (
    <Link to="/login" className="font-semibold text-accent hover:underline">
      {t('auth.backToLogin')}
    </Link>
  );

  // Talep alındıktan sonra form yerine onay mesajı gösterilir
  if (sent) {
    return (
      <AuthShell title={t('auth.forgotSentTitle')} footer={footer}>
        <p className="text-sm leading-relaxed text-ink-muted">{t('auth.forgotSentBody')}</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')} footer={footer}>
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="mehmet@test.dev"
            {...register('email')}
          />
          {errors.email && <p className="form-error">{t(errors.email.message!)}</p>}
        </div>

        {serverError && (
          <div className="rounded-md bg-rating-low/10 px-3 py-2 text-sm text-rating-low">
            {serverError}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? t('auth.forgotSending') : t('auth.forgotSubmit')}
        </button>
      </form>
    </AuthShell>
  );
}
