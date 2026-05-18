import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/features/auth/authStore';
import { usersApi } from '@/api/users.api';
import type { Language } from '@/types/auth';

// Veritabanı dil kodu ↔ i18n dil kodu eşleştirmeleri
const LANG_TO_I18N: Record<Language, 'tr' | 'en'> = { TR: 'tr', EN: 'en' };
const I18N_TO_LANG: Record<'tr' | 'en', Language> = { tr: 'TR', en: 'EN' };

// API hata yanıtından okunabilir hata mesajı çıkarır
// Doğrulama hataları varsa alan bazlı mesajları birleştirir
function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as {
      code?: string;
      message?: string;
      details?: { fieldErrors?: Record<string, string[]> };
    };
    if (data.code === 'VALIDATION_ERROR' && data.details?.fieldErrors) {
      const fields = Object.values(data.details.fieldErrors).flat();
      if (fields.length > 0) return fields.join(', ');
    }
    if (data.message) return data.message;
  }
  return fallback;
}

// Ayarlar sayfası ana bileşeni
// Profil düzenleme, şifre değiştirme, dil seçimi ve hesap silme bölümlerini içerir
export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const clearAuth = useAuthStore((s) => s.clear);

  return (
    <div className="space-y-6">
      {/* Sayfa başlığı */}
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('settings.subtitle')}</p>
      </header>

      {/* Profil bilgileri düzenleme kartı */}
      <ProfileCard />
      {/* Şifre değiştirme kartı */}
      <PasswordCard />
      {/* Dil tercihi kartı */}
      <LanguageCard
        current={i18n.resolvedLanguage as 'tr' | 'en' | undefined}
        persisted={user ? LANG_TO_I18N[user.language] : undefined}
        onChange={async (code) => {
          const previous = i18n.resolvedLanguage as 'tr' | 'en' | undefined;
          await i18n.changeLanguage(code);
          try {
            await updateProfile({ language: I18N_TO_LANG[code] });
          } catch (err) {
            // Kaydetme başarısız olursa önceki dile geri dön
            if (previous) await i18n.changeLanguage(previous);
            throw err;
          }
        }}
      />
      {/* Tehlikeli bölge: hesap silme */}
      <DangerCard
        onDeleted={() => {
          clearAuth();
          navigate('/');
        }}
      />
    </div>
  );

  // Profil bilgileri düzenleme kartı iç bileşeni
  function ProfileCard() {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    return (
      <section className="card">
        <h2 className="text-base font-semibold text-ink">{t('settings.profile')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('settings.profileHelp')}</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);
            const formData = new FormData(e.currentTarget);
            const input = Object.fromEntries(formData.entries()) as Record<string, string>;
            setSaving(true);
            try {
              await updateProfile(input);
              setSuccess(t('settings.profileSaved'));
            } catch (err) {
              setError(extractError(err, t('settings.saveError')));
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* E-posta alanı */}
            <div>
              <label className="label" htmlFor="email">{t('auth.email')}</label>
              <input className="input" id="email" name="email" type="email" defaultValue={user?.email ?? ''} />
            </div>
            {/* Kullanıcı adı alanı */}
            <div>
              <label className="label" htmlFor="username">{t('auth.username')}</label>
              <input className="input" id="username" name="username" defaultValue={user?.username ?? ''} />
            </div>
            {/* Görünen ad alanı */}
            <div>
              <label className="label" htmlFor="displayName">{t('auth.displayName')}</label>
              <input className="input" id="displayName" name="displayName" defaultValue={user?.displayName ?? ''} />
            </div>
            {/* Konum alanı */}
            <div>
              <label className="label" htmlFor="location">{t('settings.location')}</label>
              <input className="input" id="location" name="location" placeholder={t('settings.locationPlaceholder')} defaultValue={user?.location ?? ''} maxLength={100} />
            </div>
            {/* Avatar URL alanı */}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="avatarUrl">{t('settings.avatarUrl')}</label>
              <input className="input" id="avatarUrl" name="avatarUrl" type="url" placeholder="https://…" defaultValue={user?.avatarUrl ?? ''} />
            </div>
            {/* Biyografi alanı */}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bio">{t('settings.bio')}</label>
              <textarea className="input min-h-[88px] resize-y" id="bio" name="bio" maxLength={280} placeholder={t('settings.bioPlaceholder')} defaultValue={user?.bio ?? ''} />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="text-sm text-rating-high">{success}</p>}

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? t('settings.saving') : t('settings.saveProfile')}
          </button>
        </form>
      </section>
    );
  }

  // Şifre değiştirme kartı iç bileşeni
  function PasswordCard() {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    return (
      <section className="card">
        <h2 className="text-base font-semibold text-ink">{t('settings.password')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('settings.passwordHelp')}</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);
            const form = e.currentTarget;
            const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
            // Yeni şifre ve onay eşleşmesini kontrol et
            if (data.newPassword !== data.confirmPassword) {
              setError(t('settings.passwordMismatch'));
              return;
            }
            setSaving(true);
            try {
              await usersApi.changePassword({
                currentPassword: data.currentPassword ?? '',
                newPassword: data.newPassword ?? '',
                confirmPassword: data.confirmPassword ?? '',
              });
              setSuccess(t('settings.passwordSaved'));
              form.reset();
            } catch (err) {
              setError(extractError(err, t('settings.saveError')));
            } finally {
              setSaving(false);
            }
          }}
        >
          {/* Mevcut şifre */}
          <div>
            <label className="label" htmlFor="currentPassword">{t('settings.currentPassword')}</label>
            <input className="input" id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Yeni şifre */}
            <div>
              <label className="label" htmlFor="newPassword">{t('settings.newPassword')}</label>
              <input className="input" id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            {/* Yeni şifre onayı */}
            <div>
              <label className="label" htmlFor="confirmPassword">{t('settings.confirmPassword')}</label>
              <input className="input" id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="text-sm text-rating-high">{success}</p>}

          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? t('settings.saving') : t('settings.savePassword')}
          </button>
        </form>
      </section>
    );
  }
}

// Dil tercihi kartı bileşeni
interface LanguageCardProps {
  current: 'tr' | 'en' | undefined;   // Şu anki aktif dil
  persisted: 'tr' | 'en' | undefined; // Sunucuda kayıtlı dil
  onChange: (code: 'tr' | 'en') => Promise<void>;
}

// Dil değiştirme kartı - TR/EN butonlarıyla dil tercihi yönetimi
function LanguageCard({ current, persisted, onChange }: LanguageCardProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="card">
      <h2 className="text-base font-semibold text-ink">{t('settings.language')}</h2>
      <p className="mt-1 text-sm text-ink-muted">{t('settings.languageHelp')}</p>
      <div className="mt-3 flex gap-2">
        {(['tr', 'en'] as const).map((code) => {
          const active = current === code;
          const isPersisted = persisted === code;
          return (
            <button
              key={code}
              type="button"
              onClick={async () => {
                setError(null);
                setSaving(true);
                try {
                  await onChange(code);
                } catch (err) {
                  setError(extractError(err, t('settings.saveError')));
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving || active}
              className={active ? 'btn-primary' : 'btn-outline'}
            >
              {code.toUpperCase()}
              {/* Sunucuda kayıtlı dili işaretle */}
              {isPersisted && (
                <span className="ml-1 text-[10px] font-bold uppercase text-accent">●</span>
              )}
            </button>
          );
        })}
        {saving && <span className="self-center text-xs text-ink-muted">{t('settings.saving')}</span>}
      </div>
      {error && <p className="form-error mt-2">{error}</p>}
    </section>
  );
}

// Tehlikeli bölge kartı - hesap silme işlevi
function DangerCard({ onDeleted }: { onDeleted: () => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="card border-rating-low/40">
      <h2 className="text-base font-semibold text-rating-low">{t('settings.dangerZone')}</h2>
      <p className="mt-1 text-sm text-ink-muted">{t('settings.deleteHelp')}</p>
      {error && <p className="form-error mt-2">{error}</p>}
      {/* Hesap silme butonu - onay penceresi gösterir */}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!confirm(t('settings.deleteConfirm'))) return;
          setBusy(true);
          setError(null);
          try {
            await usersApi.deleteMe();
            onDeleted();
          } catch (err) {
            setError(extractError(err, t('settings.saveError')));
          } finally {
            setBusy(false);
          }
        }}
        className="mt-3 rounded-lg border border-rating-low/50 px-4 py-2 text-sm font-semibold text-rating-low transition-colors hover:bg-rating-low/10 disabled:opacity-50"
      >
        {busy ? t('settings.saving') : t('settings.deleteAccount')}
      </button>
    </section>
  );
}
