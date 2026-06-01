import { Router, type RequestHandler } from 'express';

import { prisma } from '../../config/db.js';
import { optionalAuth, requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors.js';
import * as tmdb from '../../services/tmdb.service.js';
import { listReviewsByUser } from '../reviews/reviews.service.js';
import { changePasswordSchema, updateMeSchema, userSearchSchema } from './users.validator.js';

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
  favoriteContent: true,
  favoriteActorId: true,
  favoriteDirectorId: true,
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

// Favori içerik referansının şekli (DB'de Json olarak saklanır)
interface FavoriteContentRef {
  tmdbId: number;
  type: tmdb.TmdbType;
}

// Saklanan favoriteContent JSON'unu güvenli şekilde ayrıştırır
function parseFavoriteContent(value: unknown): FavoriteContentRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is FavoriteContentRef =>
        !!v &&
        typeof v === 'object' &&
        typeof (v as FavoriteContentRef).tmdbId === 'number' &&
        ((v as FavoriteContentRef).type === 'movie' || (v as FavoriteContentRef).type === 'tv'),
    )
    .slice(0, 4);
}

// Bir kişinin (oyuncu/yönetmen) favori kart verisini TMDB'den getirir; bulunamazsa null
async function enrichPerson(id: number | null, language: tmdb.Lang) {
  if (!id) return null;
  try {
    const p = await tmdb.person(id, language);
    return { id: p.id, name: p.name, profilePath: p.profilePath };
  } catch {
    return null;
  }
}

// Kullanıcının favorilerini TMDB metaverisiyle zenginleştirip döner.
// Profil sayfasını hafif tutmak için ana profil sorgusundan ayrı bir endpoint'tir.
const getFavorites: RequestHandler = async (req, res, next) => {
  try {
    const username = (req.params.username ?? '').toLowerCase();
    const language = ((req.query.language as string) ?? 'tr-TR') as tmdb.Lang;

    const user = await prisma.user.findUnique({
      where: { username },
      select: { favoriteContent: true, favoriteActorId: true, favoriteDirectorId: true },
    });
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');

    const refs = parseFavoriteContent(user.favoriteContent);

    // Tüm TMDB çağrılarını paralel yap (hepsi cache'li); silinmiş öğeleri ele
    const [contentResults, actor, director] = await Promise.all([
      Promise.all(
        refs.map(async (ref) => {
          try {
            const d = await tmdb.detail(ref.type, ref.tmdbId, language);
            return {
              tmdbId: d.id,
              type: d.type,
              title: d.title,
              posterPath: d.posterPath,
              releaseDate: d.releaseDate,
              voteAverage: d.voteAverage,
            };
          } catch {
            return null;
          }
        }),
      ),
      enrichPerson(user.favoriteActorId, language),
      enrichPerson(user.favoriteDirectorId, language),
    ]);

    res.json({
      content: contentResults.filter((c) => c !== null),
      actor,
      director,
    });
  } catch (err) {
    next(err);
  }
};

// Bir kullanıcının yazdığı incelemeleri (içerik bilgisiyle) listeler
const getReviews: RequestHandler = async (req, res, next) => {
  try {
    const username = (req.params.username ?? '').toLowerCase();
    const limit = Math.min(Number(req.query.limit ?? 20), 50);

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundError('Kullanıcı bulunamadı');

    const reviews = await listReviewsByUser(user.id, limit, req.auth?.sub);
    res.json(reviews);
  } catch (err) {
    next(err);
  }
};

// İsme/kullanıcı adına göre kullanıcı araması yapar (arama çubuğu önerileri için).
// En fazla 8 sonuç döndürür; sonuçlar prefix eşleşenler öne gelecek şekilde sıralanır.
const searchUsers: RequestHandler = async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const users = await prisma.user.findMany({
      where: {
        isSuspended: false,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        _count: { select: { followers: true } },
      },
      take: 8,
    });
    // Sorguyla başlayan kullanıcı adlarını öne al, ardından takipçi sayısına göre sırala
    const lower = q.toLowerCase();
    users.sort((a, b) => {
      const ap = a.username.toLowerCase().startsWith(lower) ? 0 : 1;
      const bp = b.username.toLowerCase().startsWith(lower) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return b._count.followers - a._count.followers;
    });
    res.json(users);
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
// Not: sabit yollar (/search) ve /:username/* alt rotaları /:username'den önce tanımlanmalı
usersRouter.get('/search', validate(userSearchSchema, 'query'), searchUsers);
usersRouter.get('/:username/favorites', getFavorites);
usersRouter.get('/:username/reviews', optionalAuth, getReviews);
usersRouter.get('/:username', getByUsername);

