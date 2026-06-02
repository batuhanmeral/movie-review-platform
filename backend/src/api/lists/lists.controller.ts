import type { RequestHandler } from 'express';

import { UnauthorizedError } from '../../utils/errors.js';
import * as service from './lists.service.js';

// Herkese açık popüler listeleri döndürür (limit en fazla 50)
export const popularHandler: RequestHandler = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const result = await service.listPopularLists(limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Tek bir listenin detayını öğeleriyle döndürür (giriş opsiyonel; varsa beğeni/sahiplik eklenir)
export const getListDetailHandler: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const result = await service.getListDetail(id, req.auth?.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Liste öğelerinin sırasını günceller (yalnızca sahibi)
export const reorderListItemsHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const result = await service.reorderListItems(req.auth.sub, id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Listeye beğeniyi açıp kapatır; güncel beğeni durumu ve sayısını döndürür
export const toggleListLikeHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const result = await service.toggleListLike(req.auth.sub, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
