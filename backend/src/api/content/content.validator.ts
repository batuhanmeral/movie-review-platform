import { z } from 'zod';

const langSchema = z.enum(['tr-TR', 'en-US']).default('tr-TR');
const typeSchema = z.enum(['movie', 'tv']);

export const searchSchema = z.object({
  q: z.string().min(1),
  type: z.enum(['movie', 'tv', 'multi']).default('multi'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: langSchema,
});

export const trendingSchema = z.object({
  type: z.enum(['movie', 'tv', 'all']).default('all'),
  window: z.enum(['day', 'week']).default('week'),
  language: langSchema,
});

export const popularSchema = z.object({
  type: typeSchema.default('movie'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: langSchema,
});

export const upcomingSchema = z.object({
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: langSchema,
});

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

export const detailParamsSchema = z.object({
  type: typeSchema,
  tmdbId: z.coerce.number().int().positive(),
});

export const detailQuerySchema = z.object({
  language: langSchema,
});

export const genresSchema = z.object({
  type: typeSchema.default('movie'),
  language: langSchema,
});

export const personParamsSchema = z.object({
  personId: z.coerce.number().int().positive(),
});

export const personQuerySchema = z.object({
  language: langSchema,
});

export const personSearchSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).max(500).default(1),
  language: langSchema,
});
