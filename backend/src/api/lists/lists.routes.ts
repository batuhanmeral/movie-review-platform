import { Router } from 'express';

import { optionalAuth, requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  addItemHandler,
  createListHandler,
  deleteListHandler,
  getListDetailHandler,
  myListsHandler,
  popularHandler,
  removeItemHandler,
  reorderListItemsHandler,
  toggleListLikeHandler,
  updateListHandler,
  userListsHandler,
} from './lists.controller.js';
import { addItemSchema, createListSchema, reorderItemsSchema, updateListSchema } from './lists.validator.js';

export const listsRouter = Router();

// Not: sabit yollar (/popular, /mine, /users/:username) '/:id'den ÖNCE tanımlanmalı

// Herkese açık popüler listeler
listsRouter.get('/popular', popularHandler);

// Giriş yapan kullanıcının kendi listeleri (+ opsiyonel içerik üyeliği)
listsRouter.get('/mine', requireAuth, myListsHandler);

// Bir kullanıcının herkese açık listeleri (profil sayfası için)
listsRouter.get('/users/:username', optionalAuth, userListsHandler);

// Yeni CUSTOM liste oluştur
listsRouter.post('/', requireAuth, validate(createListSchema), createListHandler);

// Liste detayı (giriş opsiyonel — beğeni/sahiplik bilgisi için)
listsRouter.get('/:id', optionalAuth, getListDetailHandler);

// Liste güncelle / sil (yalnızca sahibi)
listsRouter.patch('/:id', requireAuth, validate(updateListSchema), updateListHandler);
listsRouter.delete('/:id', requireAuth, deleteListHandler);

// Listeye içerik ekle / çıkar (yalnızca sahibi)
listsRouter.post('/:id/items', requireAuth, validate(addItemSchema), addItemHandler);
listsRouter.delete('/:id/items/:itemId', requireAuth, removeItemHandler);

// Liste öğelerini yeniden sırala (yalnızca sahibi)
listsRouter.patch('/:id/items/reorder', requireAuth, validate(reorderItemsSchema), reorderListItemsHandler);

// Beğeni toggle
listsRouter.post('/:id/like', requireAuth, toggleListLikeHandler);
