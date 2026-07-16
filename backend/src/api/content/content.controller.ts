import type { RequestHandler } from 'express';

import * as tmdb from '../../services/tmdb.service.js';
import { getDetail } from './content.service.js';

// TMDB API üzerinden film, dizi veya çoklu arama yapar
export const searchHandler: RequestHandler = async (req, res, next) => {
  try {
    const { q, type, page, language } = req.query as unknown as {
      q: string;
      type: 'movie' | 'tv' | 'multi';
      page: number;
      language: tmdb.Lang;
    };
    const data = await tmdb.search(q, type, page, language);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// TMDB API üzerinden trend olan (gündemdeki) içerikleri getirir
export const trendingHandler: RequestHandler = async (req, res, next) => {
  try {
    const { type, window, language } = req.query as unknown as {
      type: 'movie' | 'tv' | 'all';
      window: 'day' | 'week';
      language: tmdb.Lang;
    };
    const data = await tmdb.trending(type, window, language);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// TMDB API üzerinden popüler içerikleri getirir
export const popularHandler: RequestHandler = async (req, res, next) => {
  try {
    const { type, page, language } = req.query as unknown as {
      type: tmdb.TmdbType;
      page: number;
      language: tmdb.Lang;
    };
    const data = await tmdb.popular(type, page, language);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// TMDB API üzerinden yakında çıkacak filmleri getirir
export const upcomingHandler: RequestHandler = async (req, res, next) => {
  try {
    const { page, language } = req.query as unknown as { page: number; language: tmdb.Lang };
    const data = await tmdb.upcoming(page, language);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Çeşitli filtrelere göre TMDB üzerinden içerik keşfetmeyi (discover) sağlar
export const discoverHandler: RequestHandler = async (req, res, next) => {
  try {
    const data = await tmdb.discover(req.query as unknown as tmdb.DiscoverParams);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Film veya diziler için kullanılabilir tür (genre) listesini döner
export const genresHandler: RequestHandler = async (req, res, next) => {
  try {
    const { type, language } = req.query as unknown as {
      type: tmdb.TmdbType;
      language: tmdb.Lang;
    };
    const data = await tmdb.genres(type, language);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// İsme göre kişi (oyuncu/yönetmen) araması yapar — favori seçiminde kullanılır
export const personSearchHandler: RequestHandler = async (req, res, next) => {
  try {
    const { q, page, language } = req.query as unknown as {
      q: string;
      page: number;
      language: tmdb.Lang;
    };
    const data = await tmdb.searchPerson(q, page, language);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Bir kişinin (oyuncu) profilini ve oynadığı yapımları getirir
export const personHandler: RequestHandler = async (req, res, next) => {
  try {
    const { personId } = req.params as unknown as { personId: number };
    const { language } = req.query as unknown as { language: tmdb.Lang };
    const data = await tmdb.person(personId, language);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Belirli bir TMDB ID'ye sahip içeriğin detaylı bilgilerini (cast, videolar vs.) getirir
export const detailHandler: RequestHandler = async (req, res, next) => {
  try {
    const { type, tmdbId } = req.params as unknown as { type: tmdb.TmdbType; tmdbId: number };
    const { language, region } = req.query as unknown as { language: tmdb.Lang; region: string };
    const data = await getDetail(type, tmdbId, language, region);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
