import { Router, type RequestHandler } from 'express';

import { prisma } from '../../config/db.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors.js';
import { changePasswordSchema, updateMeSchema } from './users.validator.js';

export const usersRouter = Router();


const meSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  location: true,
  language: true,
  role: true,
  createdAt: true,
} as const;

// Oturum açmış kullanıcının kendi profil bilgilerini getirir
const getMe: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub }, select: meSelect });
    if (!user) throw new NotFoundError();
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Oturum açmış kullanıcının kendi profil bilgilerini günceller (şifre hariç)
const updateMe: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const updated = await prisma.user.update({
      where: { id: req.auth.sub },
      data: req.body,
      select: meSelect,
    });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      next(new ConflictError('Bu e-posta veya kullanıcı adı zaten kullanımda.'));
      return;
    }
    next(err);
  }
};


// Şifre değiştirme: mevcut şifreyi doğrular ve yeniyi kaydeder
const changePassword: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub } });
    if (!user) throw new NotFoundError();
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestError('Mevcut şifre yanlış');
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    // Tüm refresh token'ları iptal et — başka oturumlar zorla kapanır
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revoked: false },
      data: { revoked: true },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Hesabı kalıcı olarak siler (cascade ile inceleme/liste/yorum/takip vb. silinir)
const deleteMe: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    await prisma.user.delete({ where: { id: req.auth.sub } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Kullanıcı adına göre herkese açık profili getirir
const getByUsername: RequestHandler = async (req, res, next) => {
  try {
    const username = (req.params.username ?? '').toLowerCase();
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        location: true,
        createdAt: true,
        _count: { select: { reviews: true, followers: true, following: true } },
      },
    });
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
    res.json(user);
  } catch (err) {
    next(err);
  }
};

usersRouter.get('/me', requireAuth, getMe);
usersRouter.patch('/me', requireAuth, validate(updateMeSchema), updateMe);

usersRouter.post(
  '/me/password',
  requireAuth,
  validate(changePasswordSchema),
  changePassword,
);
usersRouter.delete('/me', requireAuth, deleteMe);
usersRouter.get('/:username', getByUsername);

