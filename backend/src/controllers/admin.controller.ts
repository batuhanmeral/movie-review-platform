import type { RequestHandler } from 'express';
import * as svc from './admin.service.js';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors.js';

const adminOnly: RequestHandler = (req, res, next) => {
  if (!req.auth || req.auth.role !== 'ADMIN') throw new ForbiddenError('Admin only');
  next();
};

export const dashboard: RequestHandler = async (req, res, next) => {
  try {
    const data = await svc.getDashboard();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const users: RequestHandler = async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const data = await svc.listUsers(page);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const deleteUser: RequestHandler = async (req, res, next) => {
  try {
    await svc.deleteUser(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const updateRole: RequestHandler = async (req, res, next) => {
  try {
    await svc.updateUserRole(req.params.id, req.body.role);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const content: RequestHandler = async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const data = await svc.listContent(page);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const deleteContentItem: RequestHandler = async (req, res, next) => {
  try {
    await svc.deleteContent(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const withAdminAuth = adminOnly;
