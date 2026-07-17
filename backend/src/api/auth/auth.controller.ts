import type { RequestHandler } from 'express';
import * as service from './auth.service.js';

// Yeni bir kullanıcı kaydı oluşturur.
export const registerHandler: RequestHandler = async (req, res, next) => {
  try {
    const result = await service.register(req.body);
    res.status(201).json(result); // 201 Created döndür
  } catch (err) {
    next(err); // Hataları genel hata yakalayıcıya (errorHandler) yönlendir
  }
};

// Mevcut kullanıcının giriş yapmasını sağlar ve token'ları döner.
export const loginHandler: RequestHandler = async (req, res, next) => {
  try {
    const result = await service.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Süresi dolmuş Access token'ı yeni bir Refresh token ile yeniler.
export const refreshHandler: RequestHandler = async (req, res, next) => {
  try {
    const result = await service.refresh(req.body.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Kullanıcı oturumunu kapatır ve Refresh token'ı geçersiz kılar.
export const logoutHandler: RequestHandler = async (req, res, next) => {
  try {
    const token: string | undefined = req.body?.refreshToken;
    if (token) await service.logout(token);
    res.status(204).send(); // 204 No Content döndür (İçerik yok, başarılı)
  } catch (err) {
    next(err);
  }
};

// Şifre sıfırlama bağlantısı gönderir.
// E-posta kayıtlı olmasa bile aynı yanıt döner (kullanıcı varlığı sızdırılmaz).
export const forgotPasswordHandler: RequestHandler = async (req, res, next) => {
  try {
    await service.requestPasswordReset(req.body.email);
    res.status(202).json({ message: 'Bağlantı gönderildi' }); // 202 Accepted
  } catch (err) {
    next(err);
  }
};

// E-postayla gelen token ile yeni şifreyi belirler.
export const resetPasswordHandler: RequestHandler = async (req, res, next) => {
  try {
    await service.resetPassword(req.body.token, req.body.password);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
