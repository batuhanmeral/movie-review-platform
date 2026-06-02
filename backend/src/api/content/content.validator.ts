import { z } from 'zod';

// TMDB isteklerinde kullanılan ortak dil parametresi (varsayılan Türkçe)
const langSchema = z.enum(['tr-TR', 'en-US']).default('tr-TR');
// İçerik türü: film veya dizi
const typeSchema = z.enum(['movie', 'tv']);

// Arama sorgusu; 'multi' film+dizi karışık sonuç döndürür, sayfa TMDB sınırı 500
export const searchSchema = z.object({
  q: z.string().min(1),
  type: z.enum(['movie', 'tv', 'multi']).default('multi'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: langSchema,
});

// Trend içerikler; günlük veya haftalık pencere seçilebilir
export const trendingSchema = z.object({
  type: z.enum(['movie', 'tv', 'all']).default('all'),
  window: z.enum(['day', 'week']).default('week'),
  language: langSchema,
});

// Popüler içerikler (film/dizi), sayfalı
export const popularSchema = z.object({
  type: typeSchema.default('movie'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: langSchema,
});

// Yakında çıkacak içerikler, sayfalı
export const upcomingSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: langSchema,
});

// Gelişmiş keşif; yıl, tür, minimum puan ve sıralama ölçütüne göre filtreleme
export const discoverSchema = z.object({
  type: typeSchema.default('movie'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: langSchema,
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  genre: z.coerce.number().int().positive().optional(),
  minRating: z.coerce.number().min(0).max(10).optional(),
  sortBy: z
    .enum([
      'popularity.desc',
      'vote_average.desc',
      'vote_count.desc',
      'release_date.desc',
      'primary_release_date.desc',
    ])
    .default('popularity.desc'),
});

// İçerik detayı route parametreleri: tür + TMDB kimliği
export const detailParamsSchema = z.object({
  type: typeSchema,
  tmdbId: z.coerce.number().int().positive(),
});

// İçerik detayı sorgu parametreleri (yalnızca dil)
export const detailQuerySchema = z.object({
  language: langSchema,
});

// Tür (genre) listesi; film/dizi için ayrı listeler döner
export const genresSchema = z.object({
  type: typeSchema.default('movie'),
  language: langSchema,
});

// Kişi detayı route parametreleri (TMDB kişi kimliği)
export const personParamsSchema = z.object({
  personId: z.coerce.number().int().positive(),
});

// Kişi detayı sorgu parametreleri (yalnızca dil)
export const personQuerySchema = z.object({
  language: langSchema,
});

// Kişi arama sorgusu, sayfalı
export const personSearchSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: langSchema,
});
