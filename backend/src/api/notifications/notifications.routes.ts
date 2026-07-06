import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  listHandler,
  markAllReadHandler,
  markReadHandler,
  unreadCountHandler,
} from './notifications.controller.js';

export const notificationsRouter = Router();

// Tüm bildirim rotaları giriş gerektirir
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', listHandler);
notificationsRouter.get('/unread-count', unreadCountHandler);
// Toplu işaretleme; tekil :id rotasından önce tanımlanır
notificationsRouter.patch('/read-all', markAllReadHandler);
notificationsRouter.patch('/:id/read', markReadHandler);
