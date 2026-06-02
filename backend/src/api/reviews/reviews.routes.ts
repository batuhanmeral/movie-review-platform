import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createCommentHandler,
  createReviewHandler,
  deleteCommentHandler,
  deleteReviewHandler,
  listCommentsHandler,
  followingReviewsHandler,
  listContentReviewsHandler,
  myReviewHandler,
  popularReviewsHandler,
  toggleLikeHandler,
  updateCommentHandler,
  updateReviewHandler,
} from './reviews.controller.js';
import { optionalAuth } from '../../middleware/auth.middleware.js';
import {
  createCommentSchema,
  createReviewSchema,
  listReviewsQuerySchema,
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

// İnceleme güncelleme/silme (sahibi veya admin)
reviewsRouter.put('/:id', requireAuth, validate(updateReviewSchema), updateReviewHandler);
reviewsRouter.delete('/:id', requireAuth, deleteReviewHandler);

// Beğeni toggle
reviewsRouter.post('/:id/likes', requireAuth, toggleLikeHandler);

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
