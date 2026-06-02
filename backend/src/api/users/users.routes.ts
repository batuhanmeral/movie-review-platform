import { Router, type RequestHandler } from 'express';

import { Prisma } from '@prisma/client';

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
import { env } from '../../config/env.js';
import { listReviewsByUser } from '../reviews/reviews.service.js';
import { avatarUpload } from './avatar.middleware.js';
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

// Oturum açmış kullanıcının takip ettiği kullanıcıları (arkadaşlarını) listeler.
// Akış sayfasındaki "Arkadaşlarım" bölümünde kullanılır.
const getMyFollowing: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const rows = await prisma.follow.findMany({
      where: { followerId: req.auth.sub },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        following: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
    res.json(rows.map((r) => r.following));
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
  } catch (err) {
    // Benzersizlik ihlali (P2002): e-posta veya kullanıcı adı zaten kayıtlı
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      next(new ConflictError('Bu e-posta veya kullanıcı adı zaten kullanımda.'));
      return;
    }
    next(err);
  }
};

// Avatar fotoğrafı yükler: dosya diske kaydedilir (avatarUpload middleware'i),
// ardından kullanıcının avatarUrl'i servis edilen statik adrese güncellenir.
const uploadMyAvatar: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    if (!req.file) throw new BadRequestError('Dosya bulunamadı');
    const avatarUrl = `${env.APP_URL}/uploads/avatars/${req.file.filename}`;
    const updated = await prisma.user.update({
      where: { id: req.auth.sub },
      data: { avatarUrl },
      select: meSelect,
    });
    res.json(updated);
  } catch (err) {
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

// Kullanıcı adına göre herkese açık profili getirir.
// optionalAuth ile çağrılır: oturum açmış bir izleyici varsa, bu izleyicinin
// profil sahibini takip edip etmediğini (isFollowing) yanıta ekler.
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

    // İzleyici giriş yapmışsa ve başkasının profiline bakıyorsa takip durumunu hesapla
    let isFollowing = false;
    const viewerId = req.auth?.sub;
    if (viewerId && viewerId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
        select: { id: true },
      });
      isFollowing = Boolean(follow);
    }

    res.json({ ...user, isFollowing });
  } catch (err) {
    next(err);
  }
};

// Bir kullanıcının takipçilerini veya takip ettiklerini listeler.
// direction: 'followers' → bu kullanıcıyı takip edenler
//            'following'  → bu kullanıcının takip ettikleri
// optionalAuth: izleyici giriş yapmışsa, dönen her satıra izleyicinin o kişiyi
// takip edip etmediği (isFollowing) ve satırın izleyicinin kendisi mi olduğu
// (isSelf) eklenir; böylece liste içinde takip et/bırak butonu gösterilebilir.
function listFollows(direction: 'followers' | 'following'): RequestHandler {
  return async (req, res, next) => {
    try {
      const username = (req.params.username ?? '').toLowerCase();
      const owner = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (!owner) throw new NotFoundError('Kullanıcı bulunamadı');

      const userSelect = {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      } as const;

      // followers: followingId = owner → follower'ları getir
      // following: followerId  = owner → following'leri getir
      const users =
        direction === 'followers'
          ? (
              await prisma.follow.findMany({
                where: { followingId: owner.id },
                orderBy: { createdAt: 'desc' },
                select: { follower: userSelect },
              })
            ).map((r) => r.follower)
          : (
              await prisma.follow.findMany({
                where: { followerId: owner.id },
                orderBy: { createdAt: 'desc' },
                select: { following: userSelect },
              })
            ).map((r) => r.following);

      // İzleyicinin bu listedeki kişileri takip durumunu tek sorguda topla
      const viewerId = req.auth?.sub;
      let followedSet = new Set<string>();
      if (viewerId && users.length > 0) {
        const followed = await prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: users.map((u) => u.id) } },
          select: { followingId: true },
        });
        followedSet = new Set(followed.map((f) => f.followingId));
      }

      res.json(
        users.map((u) => ({
          ...u,
          isFollowing: followedSet.has(u.id),
          isSelf: u.id === viewerId,
        })),
      );
    } catch (err) {
      next(err);
    }
  };
}

// Bir kullanıcıyı takip eder. İdempotenttir: zaten takip ediliyorsa hata vermez.
const followUser: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const username = (req.params.username ?? '').toLowerCase();
    const target = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!target) throw new NotFoundError('Kullanıcı bulunamadı');
    if (target.id === req.auth.sub) throw new BadRequestError('Kendinizi takip edemezsiniz');

    try {
      await prisma.follow.create({
        data: { followerId: req.auth.sub, followingId: target.id },
      });
    } catch (err) {
      // Zaten takip ediliyorsa (unique ihlali) sessizce geç — istek idempotenttir
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
        throw err;
      }
    }

    const followerCount = await prisma.follow.count({ where: { followingId: target.id } });
    res.json({ following: true, followerCount });
  } catch (err) {
    next(err);
  }
};

// Bir kullanıcının takibini bırakır. İdempotenttir: takip edilmiyorsa hata vermez.
const unfollowUser: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const username = (req.params.username ?? '').toLowerCase();
    const target = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!target) throw new NotFoundError('Kullanıcı bulunamadı');

    await prisma.follow.deleteMany({
      where: { followerId: req.auth.sub, followingId: target.id },
    });

    const followerCount = await prisma.follow.count({ where: { followingId: target.id } });
    res.json({ following: false, followerCount });
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
usersRouter.get('/me/following', requireAuth, getMyFollowing);
usersRouter.patch('/me', requireAuth, validate(updateMeSchema), updateMe);

usersRouter.post(
  '/me/password',
  requireAuth,
  validate(changePasswordSchema),
  changePassword,
);
usersRouter.post('/me/avatar', requireAuth, avatarUpload, uploadMyAvatar);
usersRouter.delete('/me', requireAuth, deleteMe);
// Not: sabit yollar (/search) ve /:username/* alt rotaları /:username'den önce tanımlanmalı
usersRouter.get('/search', validate(userSearchSchema, 'query'), searchUsers);
usersRouter.get('/:username/favorites', getFavorites);
usersRouter.get('/:username/reviews', optionalAuth, getReviews);

// Takip et / takibi bırak
usersRouter.post('/:username/follow', requireAuth, followUser);
usersRouter.delete('/:username/follow', requireAuth, unfollowUser);

// Takipçi / takip edilen listeleri
usersRouter.get('/:username/followers', optionalAuth, listFollows('followers'));
usersRouter.get('/:username/following', optionalAuth, listFollows('following'));

usersRouter.get('/:username', optionalAuth, getByUsername);

