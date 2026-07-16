import type { ContentType } from '@prisma/client';
import { prisma } from '../../config/db.js';
import * as tmdb from '../../services/tmdb.service.js';

// TMDB türünü (movie/tv) veritabanındaki ContentType enum'una dönüştürür
const tmdbToPrisma = (t: tmdb.TmdbType): ContentType => (t === 'movie' ? 'MOVIE' : 'TV');

// Belirli bir TMDB ID için içerik detayını getirir.
// İçeriğin minimal bir kopyasını kendi veritabanımızda (Content tablosu) günceller veya oluşturur.
// Kendi topluluğumuzun (platformdaki kullanıcıların) ortalama puanını (communityRating) sonuca ekler.
export async function getDetail(
  type: tmdb.TmdbType,
  tmdbId: number,
  language: tmdb.Lang,
  region = 'TR',
) {
  const detail = await tmdb.detail(type, tmdbId, language, region);

  // Upsert minimal cache row — sosyal etkileşim ilişkilerinin köşe taşı
  const content = await prisma.content.upsert({
    where: { tmdbId_type: { tmdbId, type: tmdbToPrisma(type) } },
    create: {
      tmdbId,
      type: tmdbToPrisma(type),
      title: detail.title,
      originalTitle: detail.originalTitle,
      overview: detail.overview,
      posterPath: detail.posterPath,
      backdropPath: detail.backdropPath,
      releaseDate: detail.releaseDate ? new Date(detail.releaseDate) : null,
      genres: detail.genres.map((g) => g.id),
      tmdbRating: detail.voteAverage,
      popularity: detail.popularity,
    },
    update: {
      title: detail.title,
      originalTitle: detail.originalTitle,
      overview: detail.overview,
      posterPath: detail.posterPath,
      backdropPath: detail.backdropPath,
      releaseDate: detail.releaseDate ? new Date(detail.releaseDate) : null,
      genres: detail.genres.map((g) => g.id),
      tmdbRating: detail.voteAverage,
      popularity: detail.popularity,
      cachedAt: new Date(),
    },
  });

  // Topluluk ortalaması (sistem genelinde Review tablosu)
  const agg = await prisma.review.aggregate({
    where: { contentId: content.id },
    _avg: { rating: true },
    _count: true,
  });

  return {
    ...detail,
    contentId: content.id,
    communityRating: agg._avg.rating ?? null,
    communityReviewCount: agg._count,
  };
}
