import { env } from '../config/env.js';
import { cached } from './cache.service.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export type TmdbType = 'movie' | 'tv';
export type Lang = 'tr-TR' | 'en-US';

export interface TmdbItem {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
  type: TmdbType;
}

export interface TmdbPage<T> {
  page: number;
  totalPages: number;
  totalResults: number;
  results: T[];
}

export interface TmdbDetail extends TmdbItem {
  runtime: number | null;
  tagline: string | null;
  genres: { id: number; name: string }[];
  cast: { id: number; name: string; character: string; profilePath: string | null }[];
  videos: { key: string; site: string; type: string; name: string }[];
  lastAirDate?: string | null;
  status?: string;
  inProduction?: boolean;
}

interface RawListResponse {
  page: number;
  total_pages: number;
  total_results: number;
  results: RawItem[];
}

interface RawItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  genre_ids?: number[];
}

interface RawDetailResponse extends RawItem {
  runtime?: number | null;
  episode_run_time?: number[];
  tagline?: string | null;
  genres?: { id: number; name: string }[];
  credits?: {
    cast?: { id: number; name: string; character: string; profile_path: string | null }[];
  };
  videos?: {
    results?: { key: string; site: string; type: string; name: string }[];
  };
  last_air_date?: string | null;
  status?: string;
  in_production?: boolean;
}

// Bir kişinin (oyuncu) profil bilgileri ve oynadığı yapımlar
export interface TmdbPerson {
  id: number;
  name: string;
  profilePath: string | null;
  biography: string;
  knownForDepartment: string | null;
  birthday: string | null;
  placeOfBirth: string | null;
  // Oynadığı film/diziler (her biri karaktere ek olarak normalize edilmiş içerik)
  credits: (TmdbItem & { character: string })[];
}

interface RawPersonResponse {
  id: number;
  name: string;
  profile_path: string | null;
  biography?: string;
  known_for_department?: string | null;
  birthday?: string | null;
  place_of_birth?: string | null;
  combined_credits?: {
    cast?: (RawItem & { media_type?: string; character?: string })[];
  };
}

const BASE = env.TMDB_BASE_URL;
const KEY = env.TMDB_API_KEY;
const TTL = env.TMDB_CACHE_TTL_SECONDS;

// TMDB API'sine genel bir fetch isteği atar
// Hataları yakalar, 401/404 gibi durumları işler ve belli durumlarda yeniden dener (retry logic)
async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  const attempts = 3;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 401) {
        throw new AppError('TMDB anahtarı geçersiz', 502, 'TMDB_AUTH');
      }
      if (res.status === 404) {
        throw new AppError('TMDB kaynağı bulunamadı', 404, 'TMDB_NOT_FOUND');
      }
      if (!res.ok) {
        if (res.status >= 500 && i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
          continue;
        }
        throw new AppError(`TMDB hatası (${res.status})`, 502, 'TMDB_UPSTREAM');
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (i === attempts - 1) {
        logger.error({ err, path }, 'TMDB isteği başarısız');
        throw new AppError('TMDB ulaşılamıyor', 502, 'TMDB_NETWORK');
      }
      await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  throw new AppError('TMDB isteği başarısız', 502, 'TMDB_UPSTREAM');
}

// TMDB'den dönen karmaşık (raw) yanıtları, kendi uygulamamızın kullanacağı daha sade
// TmdbItem arayüzüne dönüştürür (normalize eder)
function normalize(raw: RawItem, fallbackType?: TmdbType): TmdbItem {
  const type: TmdbType =
    raw.media_type === 'movie' || raw.media_type === 'tv'
      ? (raw.media_type as TmdbType)
      : raw.title
        ? 'movie'
        : raw.name
          ? 'tv'
          : (fallbackType ?? 'movie');

  return {
    id: raw.id,
    type,
    title: raw.title ?? raw.name ?? '',
    originalTitle: raw.original_title ?? raw.original_name ?? '',
    overview: raw.overview ?? '',
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: raw.release_date ?? raw.first_air_date ?? null,
    voteAverage: raw.vote_average ?? 0,
    voteCount: raw.vote_count ?? 0,
    popularity: raw.popularity ?? 0,
    genreIds: raw.genre_ids ?? [],
  };
}

function normalizePage<T extends RawItem>(
  raw: RawListResponse,
  fallbackType?: TmdbType,
): TmdbPage<TmdbItem> {
  return {
    page: raw.page,
    totalPages: raw.total_pages,
    totalResults: raw.total_results,
    results: (raw.results as T[]).filter((r) => r.id).map((r) => normalize(r, fallbackType)),
  };
}

// TMDB'den dönen liste sayfalarını (search, discover vb.) normalize eder
export async function search(
  query: string,
  type: TmdbType | 'multi',
  page: number,
  language: Lang,
) {
  const path = type === 'multi' ? '/search/multi' : `/search/${type}`;
  return cached(`tmdb:search:${type}:${language}:${page}:${query}`, TTL, async () => {
    const raw = await tmdbFetch<RawListResponse>(path, {
      query,
      page,
      language,
      include_adult: 'false',
    });
    return normalizePage(raw, type === 'multi' ? undefined : type);
  });
}

// Trend içerikleri (günlük veya haftalık) getirir
export async function trending(type: TmdbType | 'all', window: 'day' | 'week', language: Lang) {
  return cached(`tmdb:trending:${type}:${window}:${language}`, TTL, async () => {
    const raw = await tmdbFetch<RawListResponse>(`/trending/${type}/${window}`, { language });
    return normalizePage(raw, type === 'all' ? undefined : type);
  });
}

// Popüler içerikleri getirir
export async function popular(type: TmdbType, page: number, language: Lang) {
  return cached(`tmdb:popular:${type}:${language}:${page}`, TTL, async () => {
    const raw = await tmdbFetch<RawListResponse>(`/${type}/popular`, { page, language });
    return normalizePage(raw, type);
  });
}

// Yakında çıkacak (upcoming) filmleri getirir
export async function upcoming(page: number, language: Lang) {
  return cached(`tmdb:upcoming:movie:${language}:${page}`, TTL, async () => {
    const raw = await tmdbFetch<RawListResponse>('/movie/upcoming', { page, language });
    return normalizePage(raw, 'movie');
  });
}

export interface DiscoverParams {
  type: TmdbType;
  page: number;
  language: Lang;
  year?: number;
  genre?: number;
  minRating?: number;
  sortBy?:
  | 'popularity.desc'
  | 'vote_average.desc'
  | 'vote_count.desc'
  | 'release_date.desc'
  | 'primary_release_date.desc';
}

// Çeşitli filtrelere göre (yıl, tür, puan vs.) içerik keşfetme (discover) araması yapar
export async function discover(p: DiscoverParams) {
  const yearKey = p.type === 'movie' ? 'primary_release_year' : 'first_air_date_year';
  const sort = p.sortBy ?? 'popularity.desc';
  const cacheKey = `tmdb:discover:${p.type}:${p.language}:${p.page}:${sort}:${p.year ?? ''}:${p.genre ?? ''}:${p.minRating ?? ''}`;
  return cached(cacheKey, TTL, async () => {
    const raw = await tmdbFetch<RawListResponse>(`/discover/${p.type}`, {
      page: p.page,
      language: p.language,
      sort_by: sort,
      [yearKey]: p.year,
      with_genres: p.genre,
      'vote_average.gte': p.minRating,
      'vote_count.gte': 50,
      include_adult: 'false',
    });
    return normalizePage(raw, p.type);
  });
}

// Belirli bir içeriğin detaylı bilgilerini, fragmanlarını ve oyuncu kadrosunu getirir
export async function detail(type: TmdbType, id: number, language: Lang): Promise<TmdbDetail> {
  return cached(`tmdb:detail:${type}:${id}:${language}`, TTL, async () => {
    const raw = await tmdbFetch<RawDetailResponse>(`/${type}/${id}`, {
      language,
      append_to_response: 'credits,videos',
    });
    const base = normalize(raw, type);
    const runtime = type === 'movie' ? (raw.runtime ?? null) : (raw.episode_run_time?.[0] ?? null);
    return {
      ...base,
      runtime,
      tagline: raw.tagline ?? null,
      genres: raw.genres ?? [],
      lastAirDate: raw.last_air_date ?? null,
      status: raw.status,
      inProduction: raw.in_production,
      cast: (raw.credits?.cast ?? []).slice(0, 12).map((c) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path,
      })),
      videos: (raw.videos?.results ?? [])
        .filter((v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
        .slice(0, 3)
        .map((v) => ({ key: v.key, site: v.site, type: v.type, name: v.name })),
    };
  });
}

// Kişi (oyuncu/yönetmen) arama sonucundaki tek bir öğe
export interface TmdbPersonResult {
  id: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null;
}

interface RawPersonSearchResponse {
  results?: {
    id: number;
    name: string;
    profile_path: string | null;
    known_for_department?: string | null;
    popularity?: number;
  }[];
}

// İsme göre kişi (oyuncu/yönetmen) araması yapar. Favori oyuncu/yönetmen
// seçiminde kullanılır; popülerliğe göre sıralı ilk sonuçları döndürür.
export async function searchPerson(query: string, page: number, language: Lang) {
  return cached(`tmdb:searchPerson:${language}:${page}:${query}`, TTL, async () => {
    const raw = await tmdbFetch<RawPersonSearchResponse>('/search/person', {
      query,
      page,
      language,
      include_adult: 'false',
    });
    return (raw.results ?? [])
      .filter((r) => r.id)
      .map<TmdbPersonResult>((r) => ({
        id: r.id,
        name: r.name,
        profilePath: r.profile_path,
        knownForDepartment: r.known_for_department ?? null,
      }));
  });
}

// Bir kişinin (oyuncu) profil bilgilerini ve oynadığı tüm film/dizileri getirir.
// combined_credits tek istekte tüm yapımları döndürür; sayfalama yoktur, bu yüzden
// filtreleme/sıralama ön yüzde (client-side) yapılır. Aynı yapımda birden fazla
// rolde görünen kişiler için (id+type) bazında tekilleştirme uygulanır.
export async function person(id: number, language: Lang): Promise<TmdbPerson> {
  return cached(`tmdb:person:${id}:${language}`, TTL, async () => {
    const raw = await tmdbFetch<RawPersonResponse>(`/person/${id}`, {
      language,
      append_to_response: 'combined_credits',
    });

    const seen = new Set<string>();
    const credits = (raw.combined_credits?.cast ?? [])
      .filter((c) => c.id && (c.media_type === 'movie' || c.media_type === 'tv'))
      .map((c) => {
        const item = normalize(c, c.media_type as TmdbType);
        return { ...item, character: c.character ?? '' };
      })
      .filter((c) => {
        const key = `${c.type}-${c.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return {
      id: raw.id,
      name: raw.name,
      profilePath: raw.profile_path,
      biography: raw.biography ?? '',
      knownForDepartment: raw.known_for_department ?? null,
      birthday: raw.birthday ?? null,
      placeOfBirth: raw.place_of_birth ?? null,
      credits,
    };
  });
}

// Film veya diziler için TMDB üzerindeki kategori (tür) listesini getirir
export async function genres(type: TmdbType, language: Lang) {
  return cached(`tmdb:genres:${type}:${language}`, TTL, async () => {
    const raw = await tmdbFetch<{ genres: { id: number; name: string }[] }>(`/genre/${type}/list`, {
      language,
    });
    return raw.genres;
  });
}
