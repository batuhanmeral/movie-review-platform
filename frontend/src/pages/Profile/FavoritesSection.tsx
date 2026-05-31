import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/api/users.api';
import { langFromI18n } from '@/api/content.api';
import { poster, profile } from '@/lib/tmdb';

// Profil sayfasında kullanıcının favori 4 içeriğini, favori oyuncusunu ve favori
// yönetmenini gösteren bölüm. Veriler TMDB ile zenginleştirilmiş halde
// /users/:username/favorites endpoint'inden gelir.
export function FavoritesSection({ username }: { username: string }) {
  const { t, i18n } = useTranslation();
  const language = langFromI18n(i18n.resolvedLanguage);

  const { data, isLoading } = useQuery({
    queryKey: ['favorites', username, language],
    queryFn: () => usersApi.favorites(username, language),
    enabled: Boolean(username),
  });

  if (isLoading) {
    return <div className="card h-40 animate-pulse" />;
  }

  const hasContent = (data?.content.length ?? 0) > 0;
  const hasPeople = Boolean(data?.actor || data?.director);

  // Hiç favori yoksa bölümü gösterme
  if (!hasContent && !hasPeople) {
    return <div className="card text-sm text-ink-muted">{t('favorites.empty')}</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr] lg:items-start">
      {/* Sol kart: favori filmler (4 afiş tek satır) */}
      {hasContent && (
        <section className="card">
          <h2 className="font-display text-lg font-bold text-ink">{t('favorites.content')}</h2>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {data!.content.map((c) => {
              const posterUrl = poster(c.posterPath, 'w342');
              const year = c.releaseDate ? new Date(c.releaseDate).getFullYear() : null;
              return (
                <Link
                  key={`${c.type}-${c.tmdbId}`}
                  to={`/${c.type}/${c.tmdbId}`}
                  className="group block"
                  aria-label={c.title}
                >
                  <div className="aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/10">
                    {posterUrl ? (
                      <img
                        src={posterUrl}
                        alt={c.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-end bg-gradient-to-br from-surface-muted to-surface-raised p-3">
                        <span className="font-display text-sm font-extrabold text-ink line-clamp-3">
                          {c.title}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-ink">{c.title}</p>
                  {year && <p className="text-xs text-ink-muted">{year}</p>}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Sağ kart: favori oyuncu ve yönetmen (en fazla birer tane) */}
      {hasPeople && (
        <section className="card">
          <h2 className="font-display text-lg font-bold text-ink">{t('favorites.people')}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {data!.actor && <PersonChip label={t('favorites.actor')} person={data!.actor} />}
            {data!.director && <PersonChip label={t('favorites.director')} person={data!.director} />}
          </div>
        </section>
      )}
    </div>
  );
}

// Favori oyuncu/yönetmen için dikey kart; oyuncu sayfasına link verir
function PersonChip({
  label,
  person,
}: {
  label: string;
  person: { id: number; name: string; profilePath: string | null };
}) {
  const photoUrl = profile(person.profilePath, 'w185');
  return (
    <Link to={`/person/${person.id}`} className="group block" aria-label={person.name}>
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-gradient-to-br from-accent to-accent-cyan ring-1 ring-white/10">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={person.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl font-bold text-surface">
            {person.name.charAt(0)}
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[11px] uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="truncate text-sm font-semibold text-ink">{person.name}</p>
    </Link>
  );
}
