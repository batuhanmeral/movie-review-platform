import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

// Token'ları imzalarken yazılan ve doğrulanırken zorunlu tutulan issuer.
// Başka bir servisin aynı secret ile ürettiği token'lar kabul edilmez.
export const JWT_ISSUER = 'cinephiles-api';

// Access token içerisine gömülecek veri tipi (Payload)
export interface AccessTokenPayload {
  sub: string;      // Kullanıcı ID'si
  username: string; // Kullanıcı adı
  role: 'USER' | 'ADMIN'; // Kullanıcı rolü
}

// Refresh token içerisine gömülecek veri tipi (Payload)
export interface RefreshTokenPayload {
  sub: string; // Kullanıcı ID'si
  jti: string; // Token için benzersiz kimlik (JWT ID)
}

// Kullanıcı bilgilerini içeren yeni bir Access Token oluşturur.
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    issuer: JWT_ISSUER,
  } as jwt.SignOptions);
}

// Oturum yenilemek için kullanılacak yeni bir Refresh Token oluşturur.
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
    issuer: JWT_ISSUER,
  } as jwt.SignOptions);
}

// Verilen Access Token'ı doğrular (imza + issuer) ve içindeki verileri döner.
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: JWT_ISSUER,
    }) as AccessTokenPayload;
  } catch {
    throw new UnauthorizedError('Geçersiz veya süresi dolmuş token');
  }
}

// Verilen Refresh Token'ı doğrular (imza + issuer) ve içindeki verileri döner
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: JWT_ISSUER,
    }) as RefreshTokenPayload;
  } catch {
    throw new UnauthorizedError('Refresh token geçersiz veya süresi dolmuş');
  }
}
