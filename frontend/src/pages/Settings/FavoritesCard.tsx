import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/features/auth/authStore';
import { contentApi, langFromI18n } from '@/api/content.api';
import { usersApi } from '@/api/users.api';
import { useDebounce } from '@/hooks/useDebounce';
import { poster, profile } from '@/lib/tmdb';
import type { FavoriteContentRef } from '@/types/auth';
import type { ContentItem, PersonSearchResult } from '@/types/content';

const MAX_CONTENT = 4;

// Ayarlar sayfasındaki favori seçim kartı. Kullanıcı favori 4 içeriğini,
// favori oyuncusunu ve favori yönetmenini arama ile seçip kaydeder.
export function FavoritesCard() {
  const { t, i18n } = useTranslation();
  const language = langFromI18n(i18n.resolvedLanguage);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const queryClient = useQueryClient();

  // Düzenlenebilir yerel taslak (kullanıcının mevcut favorilerinden başlatılır)
  const [content, setContent] = useState<FavoriteContentRef[]>(user?.favoriteContent ?? []);
  const [actorId, setActorId] = useState<number | null>(user?.favoriteActorId ?? null);
  const [directorId, setDirectorId] = useState<number | null>(user?.favoriteDirectorId ?? null);
  // Henüz kaydedilmemiş (zenginleştirilmemiş) içeriklerin başlıklarını seçim anında tut
  const [titleCache, setTitleCache] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mevcut favorilerin etiket/görsellerini göstermek için zenginleştirilmiş veri
  const { data: enriched } = useQuery({
    queryKey: ['favorites', user?.username, language],
    queryFn: () => usersApi.favorites(user!.username, language),
    enabled: Boolean(user?.username),
  });

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await updateProfile({
        favoriteContent: content,
        favoriteActorId: actorId,
        favoriteDirectorId: directorId,
      });
      // Zenginleştirilmiş favori görünümlerini (ayarlar + profil) tazele
      await queryClient.invalidateQueries({ queryKey: ['favorites', user?.username] });
      setSuccess(t('settings.profileSaved'));
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? (err.response.data.message as string)
          : t('settings.saveError');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleContent = (item: ContentItem) => {
    // Başlığı önbelleğe al ki çip numara değil ad göstersin
    setTitleCache((prev) => ({ ...prev, [`${item.type}-${item.id}`]: item.title }));
    setContent((prev) => {
      const exists = prev.find((c) => c.tmdbId === item.id && c.type === item.type);
      if (exists) return prev.filter((c) => !(c.tmdbId === item.id && c.type === item.type));
      if (prev.length >= MAX_CONTENT) return prev; // en fazla 4
      return [...prev, { tmdbId: item.id, type: item.type }];
    });
  };

  return (
    <section className="card">
      <h2 className="text-base font-semibold text-ink">{t('favorites.editTitle')}</h2>
      <p className="mt-1 text-sm text-ink-muted">{t('favorites.editHelp')}</p>

      <div className="mt-4 space-y-6">
        {/* Favori içerikler */}
        <div>
          <span className="label">
            {t('favorites.content')} ({content.length}/{MAX_CONTENT})
          </span>
          <ContentSearch
            language={language}
            selected={content}
            onToggle={toggleContent}
            disabled={content.length >= MAX_CONTENT}
            enrichedTitles={enriched?.content ?? []}
            titleCache={titleCache}
            onRemove={(ref) =>
              setContent((prev) =>
                prev.filter((c) => !(c.tmdbId === ref.tmdbId && c.type === ref.type)),
              )
            }
          />
        </div>

        {/* Favori oyuncu */}
        <PersonSelect
          label={t('favorites.actor')}
          language={language}
          selectedId={actorId}
          selectedName={enriched?.actor?.id === actorId ? enriched?.actor?.name : undefined}
          selectedPhoto={enriched?.actor?.id === actorId ? enriched?.actor?.profilePath : undefined}
          onSelect={setActorId}
        />

        {/* Favori yönetmen */}
        <PersonSelect
          label={t('favorites.director')}
          language={language}
          selectedId={directorId}
          selectedName={enriched?.director?.id === directorId ? enriched?.director?.name : undefined}
          selectedPhoto={
            enriched?.director?.id === directorId ? enriched?.director?.profilePath : undefined
          }
          onSelect={setDirectorId}
        />

        {error && <p className="form-error">{error}</p>}
        {success && <p className="text-sm text-rating-high">{success}</p>}

        <button className="btn-primary" type="button" onClick={onSave} disabled={saving}>
          {saving ? t('settings.saving') : t('favorites.save')}
        </button>
      </div>
    </section>
  );
}

// İçerik araması + seçili içeriklerin gösterimi
function ContentSearch({
  language,
  selected,
  onToggle,
  disabled,
  enrichedTitles,
  titleCache,
  onRemove,
}: {
  language: ReturnType<typeof langFromI18n>;
  selected: FavoriteContentRef[];
  onToggle: (item: ContentItem) => void;
  disabled: boolean;
  enrichedTitles: { tmdbId: number; type: 'movie' | 'tv'; title: string; posterPath: string | null }[];
  titleCache: Record<string, string>;
  onRemove: (ref: FavoriteContentRef) => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const debounced = useDebounce(q.trim(), 300);
  const enabled = debounced.length >= 2;

  const { data } = useQuery({
    queryKey: ['favContentSearch', debounced, language],
    queryFn: () => contentApi.search(debounced, 'multi', language, 1),
    enabled,
  });

  const results = (data?.results ?? [])
    .filter((r) => r.type === 'movie' || r.type === 'tv')
    .slice(0, 8);

  // Seçili içerik için başlığı çöz: önce kaydedilmiş (zenginleştirilmiş) veri,
  // ardından bu oturumda seçilenlerin önbelleği, son çare tmdbId
  const titleFor = (ref: FavoriteContentRef): string => {
    const enrichedHit = enrichedTitles.find((e) => e.tmdbId === ref.tmdbId && e.type === ref.type);
    if (enrichedHit) return enrichedHit.title;
    const cached = titleCache[`${ref.type}-${ref.tmdbId}`];
    if (cached) return cached;
    return `#${ref.tmdbId}`;
  };

  const isSelected = (id: number, type: 'movie' | 'tv') =>
    selected.some((c) => c.tmdbId === id && c.type === type);

  return (
    <div className="space-y-3">
      {/* Seçili içerikler */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((ref) => (
              <span
                key={`${ref.type}-${ref.tmdbId}`}
                className="flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1 text-sm text-ink ring-1 ring-white/10"
              >
                {titleFor(ref)}
                <button
                  type="button"
                  onClick={() => onRemove(ref)}
                  className="text-ink-muted hover:text-ink"
                  aria-label={t('favorites.remove')}
                >
                  ✕
                </button>
              </span>
          ))}
        </div>
      )}

      {/* Arama girişi */}
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('favorites.searchContent')}
      />

      {/* Arama sonuçları */}
      {enabled && results.length > 0 && (
        <ul className="divide-y divide-white/5 rounded-lg bg-surface ring-1 ring-white/5">
          {results.map((item) => {
            const sel = isSelected(item.id, item.type);
            const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
            const posterUrl = poster(item.posterPath, 'w92');
            return (
              <li key={`${item.type}-${item.id}`}>
                <button
                  type="button"
                  onClick={() => onToggle(item)}
                  disabled={!sel && disabled}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-raised disabled:opacity-40"
                >
                  {posterUrl ? (
                    <img src={posterUrl} alt="" className="h-12 w-8 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-8 shrink-0 rounded bg-surface-muted" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                    <span className="block text-xs text-ink-muted">
                      {item.type === 'movie' ? t('content.movie') : t('content.tv')}
                      {year ? ` · ${year}` : ''}
                    </span>
                  </span>
                  {sel && <span className="text-accent">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Tek bir kişi (oyuncu/yönetmen) seçimi
function PersonSelect({
  label,
  language,
  selectedId,
  selectedName,
  selectedPhoto,
  onSelect,
}: {
  label: string;
  language: ReturnType<typeof langFromI18n>;
  selectedId: number | null;
  selectedName?: string | null;
  selectedPhoto?: string | null;
  onSelect: (id: number | null) => void;
}) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const debounced = useDebounce(q.trim(), 300);
  const enabled = debounced.length >= 2;

  const { data } = useQuery({
    queryKey: ['favPersonSearch', debounced, language],
    queryFn: () => contentApi.searchPerson(debounced, language, 1),
    enabled,
  });

  const results = (data ?? []).slice(0, 8);

  return (
    <div>
      <span className="label">{label}</span>

      {/* Seçili kişi */}
      {selectedId ? (
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-surface-raised px-3 py-2 ring-1 ring-white/10">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-muted">
            {selectedPhoto && (
              <img src={profile(selectedPhoto, 'w185')!} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
            {selectedName ?? `#${selectedId}`}
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-sm text-ink-muted hover:text-ink"
            aria-label={t('favorites.remove')}
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Arama girişi */}
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('favorites.searchPerson')}
      />

      {/* Arama sonuçları */}
      {enabled && results.length > 0 && (
        <ul className="mt-2 divide-y divide-white/5 rounded-lg bg-surface ring-1 ring-white/5">
          {results.map((p: PersonSearchResult) => {
            const photoUrl = profile(p.profilePath, 'w185');
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(p.id);
                    setQ('');
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-raised"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-muted">
                    {photoUrl && <img src={photoUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                    {p.knownForDepartment && (
                      <span className="block text-xs text-ink-muted">{p.knownForDepartment}</span>
                    )}
                  </span>
                  {selectedId === p.id && <span className="text-accent">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
