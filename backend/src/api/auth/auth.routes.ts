import { Router } from 'express';
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
} from './auth.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimit.middleware.js';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.validator.js';

export const authRouter = Router();

// Kayıt olma endpoint'i. Doğrulama ve rate limit (hız sınırlandırması) içerir.
authRouter.post('/register', authRateLimiter, validate(registerSchema), registerHandler);

// Giriş yapma endpoint'i. Doğrulama ve rate limit içerir.
authRouter.post('/login', authRateLimiter, validate(loginSchema), loginHandler);

// Token yenileme endpoint'i. Sadece veri doğrulaması (refreshSchema) içerir.
authRouter.post('/refresh', validate(refreshSchema), refreshHandler);

// Çıkış yapma endpoint'i.
authRouter.post('/logout', logoutHandler);

// Şifre sıfırlama bağlantısı talebi. Kötüye kullanımı sınırlamak için rate limit içerir.
authRouter.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  forgotPasswordHandler,
);

// Token ile yeni şifre belirleme. Token deneme saldırılarına karşı rate limit içerir.
authRouter.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  resetPasswordHandler,
);
