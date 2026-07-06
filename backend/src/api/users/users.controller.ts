import type { RequestHandler } from 'express';

import { BadRequestError, UnauthorizedError } from '../../utils/errors.js';
import * as tmdb from '../../services/tmdb.service.js';
import * as service from './users.service.js';
import type { ChangePasswordInput } from './users.validator.js';

// Oturum açmış kullanıcının kendi profil bilgilerini getirir
export const getMeHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const user = await service.getMe(req.auth.sub);
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Oturum açmış kullanıcının takip ettiklerini (akış "Arkadaşlarım") listeler
export const getMyFollowingHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const result = await service.getMyFollowing(req.auth.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Oturum açmış kullanıcının kendi profil bilgilerini günceller (şifre hariç)
export const updateMeHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const updated = await service.updateMe(req.auth.sub, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// Avatar fotoğrafı yükler: dosya avatarUpload middleware'i ile diske kaydedilir,
// ardından kullanıcının avatarUrl'i güncellenir
export const uploadMyAvatarHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    if (!req.file) throw new BadRequestError('Dosya bulunamadı');
    const updated = await service.setAvatar(req.auth.sub, req.file.filename);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// Şifre değiştirme: mevcut şifreyi doğrular ve yeniyi kaydeder; başarıda 204 döner
export const changePasswordHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const { currentPassword, newPassword } = req.body as ChangePasswordInput;
    await service.changePassword(req.auth.sub, currentPassword, newPassword);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Hesabı kalıcı olarak siler; başarıda 204 döner
export const deleteMeHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    await service.deleteMe(req.auth.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Kullanıcı adına göre herkese açık profili getirir (izleyici varsa takip durumuyla)
export const getByUsernameHandler: RequestHandler = async (req, res, next) => {
  try {
    const username = (req.params.username ?? '').toLowerCase();
    const result = await service.getByUsername(username, req.auth?.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Bir kullanıcının takipçi veya takip ettikleri listesini döndüren handler üretir
function listFollowsHandler(direction: 'followers' | 'following'): RequestHandler {
  return async (req, res, next) => {
    try {
      const username = (req.params.username ?? '').toLowerCase();
      const result = await service.listFollows(username, direction, req.auth?.sub);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

export const listFollowersHandler = listFollowsHandler('followers');
export const listFollowingHandler = listFollowsHandler('following');

// Bir kullanıcıyı takip eder
export const followUserHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const username = (req.params.username ?? '').toLowerCase();
    const result = await service.followUser(req.auth.sub, username);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Bir kullanıcının takibini bırakır
export const unfollowUserHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const username = (req.params.username ?? '').toLowerCase();
    const result = await service.unfollowUser(req.auth.sub, username);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Bir kullanıcıyı engeller
export const blockUserHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const username = (req.params.username ?? '').toLowerCase();
    const result = await service.blockUser(req.auth.sub, username);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Engellemeyi kaldırır
export const unblockUserHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const username = (req.params.username ?? '').toLowerCase();
    const result = await service.unblockUser(req.auth.sub, username);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// İzleyicinin engellediği kullanıcıları listeler
export const listMyBlocksHandler: RequestHandler = async (req, res, next) => {
  try {
    if (!req.auth) throw new UnauthorizedError();
    const result = await service.listMyBlocks(req.auth.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Kullanıcının favorilerini TMDB metaverisiyle zenginleştirip döner
export const getFavoritesHandler: RequestHandler = async (req, res, next) => {
  try {
    const username = (req.params.username ?? '').toLowerCase();
    const language = ((req.query.language as string) ?? 'tr-TR') as tmdb.Lang;
    const result = await service.getFavorites(username, language);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Bir kullanıcının yazdığı incelemeleri listeler (en fazla 50)
export const getReviewsHandler: RequestHandler = async (req, res, next) => {
  try {
    const username = (req.params.username ?? '').toLowerCase();
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const result = await service.getReviews(username, limit, req.auth?.sub);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// İsme/kullanıcı adına göre kullanıcı araması yapar (arama çubuğu önerileri)
export const searchUsersHandler: RequestHandler = async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const result = await service.searchUsers(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
