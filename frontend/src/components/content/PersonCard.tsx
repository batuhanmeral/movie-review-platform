import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { departmentLabel, profile } from '@/lib/tmdb';
import type { PersonSearchResult } from '@/types/content';

// Kişi (oyuncu/yönetmen) arama sonucu kartı — keşfet sayfası grid'inde kullanılır.
// Profil fotoğrafı + isim + bilinen alan gösterir; oyuncu sayfasına yönlendirir.
export function PersonCard({ person }: { person: PersonSearchResult }) {
  const { t } = useTranslation();
  const photoUrl = profile(person.profilePath, 'w185');
  const initial = person.name.charAt(0).toUpperCase();
  const department = departmentLabel(person.knownForDepartment, t);

  return (
    <Link to={`/person/${person.id}`} className="group block" aria-label={person.name}>
      <div className="aspect-[2/3] overflow-hidden rounded-lg bg-[#1B1F2B] ring-1 ring-white/5 transition-all duration-300 ease-spring group-hover:-translate-y-1.5 group-hover:ring-accent/50 group-hover:shadow-glow">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={person.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#2C3440] to-[#14181C] text-4xl font-bold text-white">
            {initial}
          </div>
        )}
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold text-ink">{person.name}</p>
      {department && (
        <p className="truncate text-xs text-ink-muted">{department}</p>
      )}
    </Link>
  );
}
