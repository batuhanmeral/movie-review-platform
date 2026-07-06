import { Router } from 'express';
import * as c from './admin.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  announcementSchema,
  auditQuerySchema,
  bulkContentSchema,
  bulkUsersSchema,
  contentQuerySchema,
  reportActionSchema,
  reportsQuerySchema,
  suspendSchema,
  updateRoleSchema,
  usersQuerySchema,
} from './admin.validator.js';

export const adminRouter = Router();

// Tüm admin rotaları önce giriş, ardından ADMIN rolü gerektirir
adminRouter.use(requireAuth, requireRole('ADMIN'));

// Dashboard & istatistikler
adminRouter.get('/dashboard', c.dashboard);
adminRouter.get('/stats', c.stats);

// Kullanıcı yönetimi
adminRouter.get('/users', validate(usersQuerySchema, 'query'), c.users);
adminRouter.get('/users/export', c.exportUsers);
adminRouter.post('/users/bulk', validate(bulkUsersSchema), c.bulkUsers);
adminRouter.patch('/users/:id/role', validate(updateRoleSchema), c.updateRole);
adminRouter.patch('/users/:id/suspend', validate(suspendSchema), c.suspend);
adminRouter.delete('/users/:id', c.deleteUser);

// İçerik yönetimi
adminRouter.get('/content', validate(contentQuerySchema, 'query'), c.content);
adminRouter.get('/content/export', c.exportContent);
adminRouter.post('/content/bulk', validate(bulkContentSchema), c.bulkContent);
adminRouter.delete('/content/:id', c.deleteContentItem);

// Moderasyon (raporlar)
adminRouter.get('/reports', validate(reportsQuerySchema, 'query'), c.reports);
adminRouter.patch('/reports/:id', validate(reportActionSchema), c.updateReport);
adminRouter.delete('/reports/reviews/:reviewId', c.deleteReportedReview);
adminRouter.delete('/reports/comments/:commentId', c.deleteReportedComment);

// Duyurular
adminRouter.post('/announcements', validate(announcementSchema), c.announcement);

// Denetim kaydı
adminRouter.get('/audit', validate(auditQuerySchema, 'query'), c.audit);
