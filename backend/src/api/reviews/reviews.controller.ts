import type { RequestHandler } from 'express';
import * as service from './reviews.service.js';
import { UnauthorizedError } from '../../utils/errors.js';
import type { ListReviewsQuery } from './reviews.validator.js';

// Yeni inceleme oluşturur ve 201 ile döndürür (giriş zorunlu)
export const createReviewHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const result = await service.createReview(req.auth.sub, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// Mevcut incelemeyi günceller (yalnızca sahibi; yetki kontrolü serviste)
export const updateReviewHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const result = await service.updateReview(req.auth.sub, id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// İncelemeyi siler (sahibi veya admin); başarıda 204 döner
export const deleteReviewHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    await service.deleteReview(req.auth.sub, req.auth.role, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Bir içeriğe ait incelemeleri sayfalı listeler (giriş opsiyonel; varsa beğeni durumu eklenir)
export const listContentReviewsHandler: RequestHandler = async (req, res, next) => {
  try {
    const contentId = req.params.contentId as string;
    const result = await service.listReviewsForContent(
      contentId,
      req.query as unknown as ListReviewsQuery,
      req.auth?.sub,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Belirtilen zaman penceresindeki popüler incelemeleri döndürür (limit en fazla 50)
export const popularReviewsHandler: RequestHandler = async (req, res, next) => {
  try {
    const windowDays = Number(req.query.windowDays ?? 7);
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const result = await service.listPopularReviews(windowDays, limit, req.auth?.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Akış "Takip Ettiklerin" kaynağı — giriş yapmış kullanıcının takip ettiklerinin
// incelemelerini döndürür. Viewer kimliği şart olduğundan requireAuth ile korunur.
export const followingReviewsHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const windowDays = Number(req.query.windowDays ?? 7);
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const result = await service.listFollowingReviews(req.auth.sub, windowDays, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Giriş yapan kullanıcının ilgili içerik için kendi incelemesini döndürür (yoksa null)
export const myReviewHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const contentId = req.params.contentId as string;
    const result = await service.getMyReviewForContent(req.auth.sub, contentId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// İncelemeye beğeniyi açıp kapatır; güncel beğeni durumu ve sayısını döndürür
export const toggleLikeHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const result = await service.toggleLike(req.auth.sub, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// İncelemeye ait yorumları (eskiden yeniye) listeler
export const listCommentsHandler: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const result = await service.listComments(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// İncelemeye yeni yorum ekler ve 201 ile döndürür
export const createCommentHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const result = await service.createComment(req.auth.sub, id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// Yorumu günceller (yalnızca sahibi; yetki kontrolü serviste)
export const updateCommentHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const commentId = req.params.commentId as string;
    const result = await service.updateComment(req.auth.sub, commentId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Yorumu siler (sahibi veya admin); başarıda 204 döner
export const deleteCommentHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const commentId = req.params.commentId as string;
    await service.deleteComment(req.auth.sub, req.auth.role, commentId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
