import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { AuthShell } from '@/components/auth/AuthShell';
import { registerSchema, type RegisterValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/features/auth/authStore';

// Kayıt sayfası bileşeni
// E-posta, kullanıcı adı, görünen ad ve şifre alanlarıyla yeni hesap oluşturma formu
// Başarılı kayıtta otomatik giriş yapılır ve ana sayfaya yönlendirilir
export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [serverError, setServerError] = useState<string | null>(null);

  // React Hook Form ile form yönetimi ve Zod doğrulaması
  const {
    register: rhfRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  // Form gönderildiğinde kayıt işlemini başlat
  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await register({
        email: values.email,
        username: values.username,
        password: values.password,
        displayName: values.displayName || undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      setServerError(message ?? t('auth.errors.unexpected'));
    }
  });

  return (
    <AuthShell
      title={t('auth.registerTitle')}
      footer={
        <>
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            {t('auth.login')}
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {/* E-posta alanı */}
        <div>
          <label className="label" htmlFor="email">{t('auth.email')}</label>
          <input id="email" type="email" autoComplete="email" className="input" placeholder="mehmet@test.dev" {...rhfRegister('email')} />
          {errors.email && <p className="form-error">{t(errors.email.message!)}</p>}
        </div>

        {/* Kullanıcı adı alanı */}
        <div>
          <label className="label" htmlFor="username">{t('auth.username')}</label>
          <input id="username" autoComplete="username" className="input" placeholder="mehmet" {...rhfRegister('username')} />
          {errors.username && <p className="form-error">{t(errors.username.message!)}</p>}
        </div>

        {/* Görünen ad alanı (opsiyonel) */}
        <div>
          <label className="label" htmlFor="displayName">
            {t('auth.displayName')} <span className="text-ink-dim">({t('auth.optional')})</span>
          </label>
          <input id="displayName" className="input" placeholder="Mehmet K." {...rhfRegister('displayName')} />
        </div>

        {/* Şifre alanı */}
        <div>
          <label className="label" htmlFor="password">{t('auth.password')}</label>
          <input id="password" type="password" autoComplete="new-password" className="input" placeholder="••••••••" {...rhfRegister('password')} />
          {errors.password && <p className="form-error">{t(errors.password.message!)}</p>}
        </div>

        {/* Sunucu hata mesajı */}
        {serverError && (
          <div className="rounded-md bg-rating-low/10 px-3 py-2 text-sm text-rating-low">{serverError}</div>
        )}

        {/* Kayıt butonu */}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? t('auth.registering') : t('auth.createAccount')}
        </button>
      </form>
    </AuthShell>
  );
}
