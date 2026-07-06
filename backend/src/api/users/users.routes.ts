import { Router } from 'express';

import { optionalAuth, requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { avatarUpload } from '../../middleware/avatar.middleware.js';
import {
  blockUserHandler,
  changePasswordHandler,
  deleteMeHandler,
  followUserHandler,
  getByUsernameHandler,
  getFavoritesHandler,
  getMeHandler,
  getMyFollowingHandler,
  getReviewsHandler,
  listFollowersHandler,
  listFollowingHandler,
  listMyBlocksHandler,
  searchUsersHandler,
  unblockUserHandler,
  unfollowUserHandler,
  updateMeHandler,
  uploadMyAvatarHandler,
} from './users.controller.js';
import { changePasswordSchema, updateMeSchema, userSearchSchema } from './users.validator.js';

export const usersRouter = Router();

// Kendi profil işlemleri (oturum gerektirir)
usersRouter.get('/me', requireAuth, getMeHandler);
usersRouter.get('/me/following', requireAuth, getMyFollowingHandler);
usersRouter.patch('/me', requireAuth, validate(updateMeSchema), updateMeHandler);
usersRouter.post('/me/password', requireAuth, validate(changePasswordSchema), changePasswordHandler);
usersRouter.post('/me/avatar', requireAuth, avatarUpload, uploadMyAvatarHandler);
usersRouter.get('/me/blocks', requireAuth, listMyBlocksHandler);
usersRouter.delete('/me', requireAuth, deleteMeHandler);

// Not: sabit yollar (/search) ve /:username/* alt rotaları /:username'den önce tanımlanmalı
usersRouter.get('/search', validate(userSearchSchema, 'query'), searchUsersHandler);
usersRouter.get('/:username/favorites', getFavoritesHandler);
usersRouter.get('/:username/reviews', optionalAuth, getReviewsHandler);

// Takip et / takibi bırak
usersRouter.post('/:username/follow', requireAuth, followUserHandler);
usersRouter.delete('/:username/follow', requireAuth, unfollowUserHandler);

// Engelle / engeli kaldır
usersRouter.post('/:username/block', requireAuth, blockUserHandler);
usersRouter.delete('/:username/block', requireAuth, unblockUserHandler);

// Takipçi / takip edilen listeleri
usersRouter.get('/:username/followers', optionalAuth, listFollowersHandler);
usersRouter.get('/:username/following', optionalAuth, listFollowingHandler);

usersRouter.get('/:username', optionalAuth, getByUsernameHandler);
