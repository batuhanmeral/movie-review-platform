import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma, type User, ListType, Visibility } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../utils/errors.js';
import { sendPasswordResetEmail } from '../../services/email.service.js';
import type { LoginInput, RegisterInput } from './auth.validator.js';

const REFRESH_TTL_MS = parseDurationMs(env.JWT_REFRESH_TTL);

// Süreleri (örn: '15m', '7d') milisaniye cinsinden sayıya çevirir.
function parseDurationMs(s: string): number {
  const match = /^(\d+)([smhdw])$/.exec(s);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const map: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return n * (map[unit ?? 'd'] ?? 86_400_000);
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  language: 'TR' | 'EN';
  role: 'USER' | 'ADMIN';
  favoriteContent: unknown;
  favoriteActorId: number | null;
  favoriteDirectorId: number | null;
  createdAt: Date;
}

// Veritabanı User modelini güvenli PublicUser modeline dönüştürür.
function toPublic(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    location: user.location,
    language: user.language,
    role: user.role,
    favoriteContent: user.favoriteContent,
    favoriteActorId: user.favoriteActorId,
    favoriteDirectorId: user.favoriteDirectorId,
    createdAt: user.createdAt,
  };
}

// Kullanıcı için yeni Access ve Refresh token'ları oluşturur, veritabanına kaydeder.
async function issueTokens(user: User): Promise<AuthResult> {
  const jti = randomUUID();
  const accessToken = signAccessToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  await prisma.refreshToken.create({
    data: {
      id: jti,
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  return { user: toPublic(user), accessToken, refreshToken };
}

// Yeni bir kullanıcı kaydı oluşturur, şifreyi hashler ve varsayılan listeleri ekler
export async function register(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          username: input.username.toLowerCase(),
          passwordHash,
          displayName: input.displayName,
        },
      });
      // Sistem listelerini otomatik oluştur. Üçü de profilden erişilebilsin diye
      // herkese açık (profil üst kısmındaki ikonlardan ulaşılır).
      await tx.list.createMany({
        data: [
          {
            userId: created.id,
            type: ListType.WATCHED,
            title: 'Watched',
            visibility: Visibility.PUBLIC,
          },
          {
            userId: created.id,
            type: ListType.WATCHLIST,
            title: 'Watchlist',
            visibility: Visibility.PUBLIC,
          },
          {
            userId: created.id,
            type: ListType.FAVORITES,
            title: 'Favorites',
            visibility: Visibility.PUBLIC,
          },
        ],
      });
      return created;
    });
    return issueTokens(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.[0] ?? 'alan';
      throw new ConflictError(`Bu ${target} zaten kullanımda`);
    }
    throw err;
  }
}

// Kullanıcı girişi yapar ve yeni token'ları döner.
export async function login(input: LoginInput): Promise<AuthResult> {
  const identifier = input.identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
  });
  if (!user) throw new UnauthorizedError('Geçersiz kullanıcı adı veya şifre');
  if (user.isSuspended) throw new UnauthorizedError('Hesap askıya alınmış');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Geçersiz kullanıcı adı veya şifre');

  return issueTokens(user);
}

// Mevcut bir Refresh token'ı kullanarak yeni token seti üretir (Token Rotation).
export async function refresh(token: string): Promise<AuthResult> {
  const payload = verifyRefreshToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.revoked || stored.token !== token || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token geçersiz');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.isSuspended) throw new UnauthorizedError('Kullanıcı bulunamadı');

  // rotation: eski jti'yi iptal et, yenisini ver
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  return issueTokens(user);
}

// Kullanıcı çıkışı yapar, verilen Refresh token'ı veritabanında geçersiz (revoked) işaretler.
export async function logout(token: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(token);
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti, revoked: false },
      data: { revoked: true },
    });
  } catch {
    // Geçersiz token üzerinden gelen logout sessizce başarılı sayılır
  }
}

// ŞİFRE SIFIRLAMA

// Sıfırlama token'ı veritabanında düz metin tutulmaz; yalnızca SHA-256 özeti saklanır.
function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Şifre sıfırlama talebi oluşturur ve kullanıcıya e-posta gönderir.
 *
 * E-postanın kayıtlı olup olmadığı dışarıya sızdırılmaz: adres bulunamasa da
 * fonksiyon sessizce başarılı döner (kullanıcı sayımı / enumeration önlemi).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Askıya alınmış hesaplar için de sıfırlama akışı başlatılmaz
  if (!user || user.isSuspended) return;

  // Aynı kullanıcının bekleyen eski talepleri geçersiz kılınır: her an tek geçerli link
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString('hex');
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashResetToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000),
    },
  });

  const resetUrl = `${env.WEB_APP_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl, user.language);
}

/**
 * Sıfırlama token'ı ile yeni şifreyi belirler.
 *
 * Başarılı sıfırlamada kullanıcının tüm refresh token'ları iptal edilir:
 * hesabı ele geçiren taraf varsa açık oturumu da kapanır.
 */
export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new BadRequestError('Sıfırlama bağlantısı geçersiz veya süresi dolmuş');
  }
  if (record.user.isSuspended) throw new UnauthorizedError('Hesap askıya alınmış');

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Şifre değişti: mevcut tüm oturumlar düşürülür
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revoked: false },
      data: { revoked: true },
    }),
  ]);
}
