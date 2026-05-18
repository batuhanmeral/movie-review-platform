// TMDB görsel CDN'inin temel URL'i
const IMAGE_BASE =
  (import.meta.env.VITE_TMDB_IMAGE_BASE as string | undefined) ?? 'https://image.tmdb.org/t/p';

// TMDB poster görselleri için kullanılabilecek boyut seçenekleri
export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
// TMDB arka plan görselleri için kullanılabilecek boyut seçenekleri
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
// TMDB profil (oyuncu) görselleri için kullanılabilecek boyut seçenekleri
export type ProfileSize = 'w45' | 'w185' | 'h632' | 'original';

// TMDB poster görseli için tam URL oluşturur
// Poster yolu null ise null döner
export function poster(path: string | null, size: PosterSize = 'w342'): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

// TMDB arka plan görseli için tam URL oluşturur
export function backdrop(path: string | null, size: BackdropSize = 'w1280'): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

// TMDB oyuncu profil görseli için tam URL oluşturur
export function profile(path: string | null, size: ProfileSize = 'w185'): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

// YouTube embed (gömülü) iframe URL'i oluşturur
export function youtubeEmbed(key: string): string {
  return `https://www.youtube.com/embed/${key}`;
}

// YouTube video küçük görselinin (thumbnail) URL'ini oluşturur
export function youtubeThumb(key: string): string {
  return `https://img.youtube.com/vi/${key}/hqdefault.jpg`;
}
