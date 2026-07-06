import type { RequestHandler } from 'express';
import * as svc from './admin.service.js';
import { UnauthorizedError } from '../../utils/errors.js';
import type {
  AnnouncementInput,
  BulkContentInput,
  BulkUsersInput,
  ContentQuery,
  ReportActionInput,
  ReportsQuery,
  SuspendInput,
  UpdateRoleInput,
  UsersQuery,
  AuditQuery,
} from './admin.validator.js';

// Giriş yapan adminin id'sini güvenle döndürür
function adminId(req: Parameters<RequestHandler>[0]): string {
  if (!req.auth) throw new UnauthorizedError();
  return req.auth.sub;
}

export const dashboard: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await svc.getDashboard());
  } catch (err) {
    next(err);
  }
};

export const stats: RequestHandler = async (_req, res, next) => {
  try {
    res.json(await svc.getStats());
  } catch (err) {
    next(err);
  }
};

export const users: RequestHandler = async (req, res, next) => {
  try {
    res.json(await svc.listUsers(req.query as unknown as UsersQuery));
  } catch (err) {
    next(err);
  }
};

export const updateRole: RequestHandler = async (req, res, next) => {
  try {
    const { role } = req.body as UpdateRoleInput;
    res.json(await svc.updateUserRole(adminId(req), req.params.id as string, role));
  } catch (err) {
    next(err);
  }
};

export const suspend: RequestHandler = async (req, res, next) => {
  try {
    const { suspended } = req.body as SuspendInput;
    res.json(await svc.setUserSuspended(adminId(req), req.params.id as string, suspended));
  } catch (err) {
    next(err);
  }
};

export const deleteUser: RequestHandler = async (req, res, next) => {
  try {
    res.json(await svc.deleteUser(adminId(req), req.params.id as string));
  } catch (err) {
    next(err);
  }
};

export const content: RequestHandler = async (req, res, next) => {
  try {
    res.json(await svc.listContent(req.query as unknown as ContentQuery));
  } catch (err) {
    next(err);
  }
};

export const deleteContentItem: RequestHandler = async (req, res, next) => {
  try {
    res.json(await svc.deleteContent(adminId(req), req.params.id as string));
  } catch (err) {
    next(err);
  }
};

export const reports: RequestHandler = async (req, res, next) => {
  try {
    res.json(await svc.listReports(req.query as unknown as ReportsQuery));
  } catch (err) {
    next(err);
  }
};

export const updateReport: RequestHandler = async (req, res, next) => {
  try {
    const { status } = req.body as ReportActionInput;
    res.json(await svc.updateReport(adminId(req), req.params.id as string, status));
  } catch (err) {
    next(err);
  }
};

export const deleteReportedReview: RequestHandler = async (req, res, next) => {
  try {
    res.json(await svc.deleteReportedReview(adminId(req), req.params.reviewId as string));
  } catch (err) {
    next(err);
  }
};

export const deleteReportedComment: RequestHandler = async (req, res, next) => {
  try {
    res.json(await svc.deleteReportedComment(adminId(req), req.params.commentId as string));
  } catch (err) {
    next(err);
  }
};

export const bulkUsers: RequestHandler = async (req, res, next) => {
  try {
    const { ids, action } = req.body as BulkUsersInput;
    res.json(await svc.bulkSetUsersSuspended(adminId(req), ids, action === 'suspend'));
  } catch (err) {
    next(err);
  }
};

export const bulkContent: RequestHandler = async (req, res, next) => {
  try {
    const { ids } = req.body as BulkContentInput;
    res.json(await svc.bulkDeleteContent(adminId(req), ids));
  } catch (err) {
    next(err);
  }
};

export const exportUsers: RequestHandler = async (req, res, next) => {
  try {
    const csv = await svc.exportUsersCsv(adminId(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const exportContent: RequestHandler = async (req, res, next) => {
  try {
    const csv = await svc.exportContentCsv(adminId(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="content.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const announcement: RequestHandler = async (req, res, next) => {
  try {
    res.json(await svc.createAnnouncement(adminId(req), req.body as AnnouncementInput));
  } catch (err) {
    next(err);
  }
};

export const audit: RequestHandler = async (req, res, next) => {
  try {
    res.json(await svc.listAuditLogs(req.query as unknown as AuditQuery));
  } catch (err) {
    next(err);
  }
};
