import type { RequestHandler } from 'express';
import * as service from './notifications.service.js';
import { UnauthorizedError } from '../../utils/errors.js';

// Giriş yapan kullanıcının bildirimlerini sayfalı listeler
export const listHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const page = Number(req.query.page ?? 1);
    const result = await service.listNotifications(req.auth.sub, Number.isFinite(page) ? page : 1);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Okunmamış bildirim sayısı (navbar rozeti — polling)
export const unreadCountHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const result = await service.getUnreadCount(req.auth.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Tek bildirimi okundu işaretle
export const markReadHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    await service.markRead(req.auth.sub, req.params.id as string);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// Tüm bildirimleri okundu işaretle
export const markAllReadHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const result = await service.markAllRead(req.auth.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
