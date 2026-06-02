import { Router } from 'express';

import { optionalAuth, requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  getListDetailHandler,
  popularHandler,
  reorderListItemsHandler,
  toggleListLikeHandler,
} from './lists.controller.js';
import { reorderItemsSchema } from './lists.validator.js';

export const listsRouter = Router();

// Herkese açık popüler listeler
// Not: sabit '/popular' yolu, '/:id'den ÖNCE tanımlanmalı
listsRouter.get('/popular', popularHandler);

// Liste detayı (giriş opsiyonel — beğeni/sahiplik bilgisi için)
listsRouter.get('/:id', optionalAuth, getListDetailHandler);

// Liste öğelerini yeniden sırala (yalnızca sahibi)
listsRouter.patch(
  '/:id/items/reorder',
  requireAuth,
  validate(reorderItemsSchema),
  reorderListItemsHandler,
);

// Beğeni toggle
listsRouter.post('/:id/like', requireAuth, toggleListLikeHandler);
