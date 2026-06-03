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

// Giriş yapan kullanıcının kendi listeleri. tmdbId+type query verilirse her listede
// o içeriğin itemId'si eklenir ("Listeye Ekle" menüsü için).
export const myListsHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const tmdbId = req.query.tmdbId ? Number(req.query.tmdbId) : undefined;
    const type = req.query.type as 'movie' | 'tv' | undefined;
    const ref = tmdbId && (type === 'movie' || type === 'tv') ? { tmdbId, type } : undefined;
    const result = await service.getMyLists(req.auth.sub, ref);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Bir kullanıcının (herkese açık) listelerini döndürür
export const userListsHandler: RequestHandler = async (req, res, next) => {
  try {
    const username = (req.params.username ?? '').toLowerCase();
    const result = await service.getUserLists(username, req.auth?.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Yeni CUSTOM liste oluşturur
export const createListHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const result = await service.createList(req.auth.sub, req.body);
    res.status(201).json(result);
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

// Listeyi günceller (yalnızca sahibi)
export const updateListHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const result = await service.updateList(req.auth.sub, id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Listeyi siler (yalnızca sahibi; sistem listeleri silinemez)
export const deleteListHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    await service.deleteList(req.auth.sub, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Listeye içerik ekler (yalnızca sahibi)
export const addItemHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const result = await service.addItem(req.auth.sub, id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// Listeden bir öğeyi kaldırır (yalnızca sahibi)
export const removeItemHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const id = req.params.id as string;
    const itemId = req.params.itemId as string;
    await service.removeItem(req.auth.sub, id, itemId);
    res.status(204).send();
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
