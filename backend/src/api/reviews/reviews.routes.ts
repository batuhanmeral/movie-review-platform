import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createCommentHandler,
  createReviewHandler,
  deleteCommentHandler,
  deleteReviewHandler,
  getReviewTargetHandler,
  listCommentsHandler,
  followingReviewsHandler,
  listContentReviewsHandler,
  myReviewHandler,
  popularReviewsHandler,
  reportCommentHandler,
  reportReviewHandler,
  toggleLikeHandler,
  updateCommentHandler,
  updateReviewHandler,
} from './reviews.controller.js';
import { optionalAuth } from '../../middleware/auth.middleware.js';
import {
  createCommentSchema,
  createReviewSchema,
  listReviewsQuerySchema,
  reportSchema,
  updateCommentSchema,
  updateReviewSchema,
} from './reviews.validator.js';

export const reviewsRouter = Router();

// Popüler incelemeler (zaman penceresine göre)
reviewsRouter.get('/popular', optionalAuth, popularReviewsHandler);

// Takip edilen kullanıcıların incelemeleri (akış "Takip Ettiklerin" kaynağı)
reviewsRouter.get('/following', requireAuth, followingReviewsHandler);

// Yeni inceleme oluşturma
reviewsRouter.post('/', requireAuth, validate(createReviewSchema), createReviewHandler);

// İncelemenin bağlı olduğu içeriğin adresi (bildirim yönlendirmeleri için).
// Not: '/popular' ve '/following' gibi sabit yollardan sonra tanımlanmalı.
reviewsRouter.get('/:id/target', getReviewTargetHandler);

// İnceleme güncelleme/silme (sahibi veya admin)
reviewsRouter.put('/:id', requireAuth, validate(updateReviewSchema), updateReviewHandler);
reviewsRouter.delete('/:id', requireAuth, deleteReviewHandler);

// Beğeni toggle
reviewsRouter.post('/:id/likes', requireAuth, toggleLikeHandler);

// İncelemeyi raporla (moderasyon)
reviewsRouter.post('/:id/report', requireAuth, validate(reportSchema), reportReviewHandler);

// Yorumlar
reviewsRouter.get('/:id/comments', listCommentsHandler);
reviewsRouter.post('/:id/comments', requireAuth, validate(createCommentSchema), createCommentHandler);
reviewsRouter.put(
  '/comments/:commentId',
  requireAuth,
  validate(updateCommentSchema),
  updateCommentHandler,
);
reviewsRouter.delete('/comments/:commentId', requireAuth, deleteCommentHandler);
// Yorumu raporla (moderasyon)
reviewsRouter.post(
  '/comments/:commentId/report',
  requireAuth,
  validate(reportSchema),
  reportCommentHandler,
);

// İçeriğe ait incelemeler ve kullanıcının kendi incelemesi
// Bu rotalar /api/content altında mount edilir.
export const contentReviewsRouter = Router({ mergeParams: true });
contentReviewsRouter.get(
  '/',
  optionalAuth,
  validate(listReviewsQuerySchema, 'query'),
  listContentReviewsHandler,
);
contentReviewsRouter.get('/me', requireAuth, myReviewHandler);
