import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

// prisma tamamen sahtelenir: testler veritabanına bağlanmaz.
vi.mock('../../config/db.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    user: { create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    list: { createMany: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
// bcrypt yavaş olduğu için şifre yardımcıları sahtelenir.
vi.mock('../../utils/password.js', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));
vi.mock('../../services/email.service.js', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

import { prisma } from '../../config/db.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { sendPasswordResetEmail } from '../../services/email.service.js';
import { signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../utils/jwt.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../utils/errors.js';
import {
  login,
  logout,
  refresh,
  register,
  requestPasswordReset,
  resetPassword,
} from './auth.service.js';

const HOUR_MS = 3_600_000;

const user = {
  id: 'u1',
  email: 'demo@example.com',
  username: 'demo',
  passwordHash: 'hashed',
  displayName: 'Demo',
  avatarUrl: null,
  bio: null,
  location: null,
  language: 'TR',
  role: 'USER',
  isSuspended: false,
  favoriteContent: null,
  favoriteActorId: null,
  favoriteDirectorId: null,
  createdAt: new Date('2025-01-01'),
};

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

beforeEach(() => {
  vi.clearAllMocks();
  // Hem callback (interaktif) hem dizi biçimindeki transaction'ı destekler.
  vi.mocked(prisma.$transaction).mockImplementation((async (arg: unknown) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg as unknown[])) as never);
  vi.mocked(prisma.refreshToken.create).mockResolvedValue({} as never);
  vi.mocked(hashPassword).mockResolvedValue('new-hash');
});

describe('register', () => {
  it('e-posta ve kullanıcı adını küçültür ve üç sistem listesini oluşturur', async () => {
    vi.mocked(prisma.user.create).mockResolvedValue(user as never);
    await register({
      email: 'Demo@Example.com',
      username: 'Demo',
      password: 'secret123',
      displayName: 'Demo',
    });
    expect(vi.mocked(prisma.user.create).mock.calls[0]?.[0].data).toMatchObject({
      email: 'demo@example.com',
      username: 'demo',
      passwordHash: 'new-hash',
    });
    const lists = vi.mocked(prisma.list.createMany).mock.calls[0]?.[0]?.data as Array<{
      type: string;
    }>;
    expect(lists.map((l) => l.type)).toEqual(['WATCHED', 'WATCHLIST', 'FAVORITES']);
  });

  it('benzersizlik ihlalinde ConflictError fırlatır', async () => {
    vi.mocked(prisma.user.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['email'] },
      }),
    );
    await expect(
      register({ email: 'a@b.com', username: 'demo', password: 'secret123' } as never),
    ).rejects.toThrow(ConflictError);
  });

  it('diğer veritabanı hatalarını olduğu gibi iletir', async () => {
    const dbError = new Error('bağlantı koptu');
    vi.mocked(prisma.user.create).mockRejectedValue(dbError);
    await expect(
      register({ email: 'a@b.com', username: 'demo', password: 'secret123' } as never),
    ).rejects.toBe(dbError);
  });
});

describe('login', () => {
  it('kullanıcı bulunamazsa UnauthorizedError fırlatır', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    await expect(login({ identifier: 'yok', password: 'x' })).rejects.toThrow(UnauthorizedError);
  });

  it('askıya alınmış hesabın girişini şifre kontrolünden önce reddeder', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ ...user, isSuspended: true } as never);
    await expect(login({ identifier: 'demo', password: 'x' })).rejects.toThrow(
      'Hesap askıya alınmış',
    );
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('şifre yanlışsa UnauthorizedError fırlatır ve token üretmez', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(user as never);
    vi.mocked(verifyPassword).mockResolvedValue(false);
    await expect(login({ identifier: 'demo', password: 'yanlis' })).rejects.toThrow(
      UnauthorizedError,
    );
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('başarılı girişte geçerli token çifti ve şifre özeti içermeyen kullanıcı döner', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(user as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);

    const result = await login({ identifier: 'DEMO', password: 'dogru' });

    expect(vi.mocked(prisma.user.findFirst).mock.calls[0]?.[0]?.where).toEqual({
      OR: [{ email: 'demo' }, { username: 'demo' }],
    });
    expect(verifyAccessToken(result.accessToken)).toMatchObject({ sub: 'u1', role: 'USER' });
    expect(result.user).not.toHaveProperty('passwordHash');
    // Kaydedilen refresh token kaydının kimliği token'daki jti ile aynıdır.
    const { jti } = verifyRefreshToken(result.refreshToken);
    expect(vi.mocked(prisma.refreshToken.create).mock.calls[0]?.[0].data).toMatchObject({
      id: jti,
      token: result.refreshToken,
      userId: 'u1',
    });
  });
});

describe('refresh', () => {
  const token = signRefreshToken({ sub: 'u1', jti: 'jti-1' });
  const stored = {
    id: 'jti-1',
    token,
    revoked: false,
    expiresAt: new Date(Date.now() + HOUR_MS),
  };

  it('imzası geçersiz token veritabanına bakılmadan reddedilir', async () => {
    await expect(refresh('bozuk-token')).rejects.toThrow(UnauthorizedError);
    expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['kayıt yoksa', null],
    ['iptal edilmişse', { ...stored, revoked: true }],
    ['kayıtlı token farklıysa', { ...stored, token: 'baska' }],
    ['süresi dolmuşsa', { ...stored, expiresAt: new Date(Date.now() - HOUR_MS) }],
  ])('%s yeni token vermez', async (_label, record) => {
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(record as never);
    await expect(refresh(token)).rejects.toThrow('Refresh token geçersiz');
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('askıya alınmış kullanıcıya yeni token vermez', async () => {
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(stored as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...user, isSuspended: true } as never);
    await expect(refresh(token)).rejects.toThrow(UnauthorizedError);
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('eski token iptal edilir ve farklı jti ile yeni token verilir (rotation)', async () => {
    vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(stored as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);

    const result = await refresh(token);

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'jti-1' },
      data: { revoked: true },
    });
    expect(verifyRefreshToken(result.refreshToken).jti).not.toBe('jti-1');
  });
});

describe('logout', () => {
  it('geçersiz token ile hata fırlatmadan döner', async () => {
    await expect(logout('bozuk-token')).resolves.toBeUndefined();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('geçerli token kaydını iptal eder', async () => {
    await logout(signRefreshToken({ sub: 'u1', jti: 'jti-9' }));
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'jti-9', revoked: false },
      data: { revoked: true },
    });
  });
});

describe('requestPasswordReset', () => {
  it.each([
    ['kayıtlı olmayan e-posta', null],
    ['askıya alınmış hesap', { ...user, isSuspended: true }],
  ])('%s için sessizce döner ve e-posta göndermez', async (_label, found) => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(found as never);
    await expect(requestPasswordReset('demo@example.com')).resolves.toBeUndefined();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('eski talepleri geçersiz kılar, token özetini saklar ve düz token e-postayla gider', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);

    await requestPasswordReset('Demo@Example.com');

    expect(vi.mocked(prisma.user.findUnique).mock.calls[0]?.[0].where).toEqual({
      email: 'demo@example.com',
    });
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', usedAt: null } }),
    );
    const [to, resetUrl] = vi.mocked(sendPasswordResetEmail).mock.calls[0] ?? [];
    expect(to).toBe('demo@example.com');
    const rawToken = new URL(resetUrl ?? '').searchParams.get('token') ?? '';
    const saved = vi.mocked(prisma.passwordResetToken.create).mock.calls[0]?.[0].data;
    expect(saved?.tokenHash).toBe(sha256(rawToken));
    expect(saved?.tokenHash).not.toBe(rawToken);
  });
});

describe('resetPassword', () => {
  const record = {
    id: 'prt-1',
    userId: 'u1',
    usedAt: null,
    expiresAt: new Date(Date.now() + HOUR_MS),
    user,
  };

  it.each([
    ['token bulunamazsa', null],
    ['token kullanılmışsa', { ...record, usedAt: new Date() }],
    ['token süresi dolmuşsa', { ...record, expiresAt: new Date(Date.now() - HOUR_MS) }],
  ])('%s BadRequestError fırlatır', async (_label, found) => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(found as never);
    await expect(resetPassword('raw', 'yeniSifre123')).rejects.toThrow(BadRequestError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('askıya alınmış hesabın şifresini değiştirmez', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue({
      ...record,
      user: { ...user, isSuspended: true },
    } as never);
    await expect(resetPassword('raw', 'yeniSifre123')).rejects.toThrow(UnauthorizedError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('şifreyi günceller, token’ı kullanılmış sayar ve tüm oturumları düşürür', async () => {
    vi.mocked(prisma.passwordResetToken.findUnique).mockResolvedValue(record as never);

    await resetPassword('raw', 'yeniSifre123');

    expect(vi.mocked(prisma.passwordResetToken.findUnique).mock.calls[0]?.[0].where).toEqual({
      tokenHash: sha256('raw'),
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: 'new-hash' },
    });
    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prt-1' } }),
    );
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revoked: false },
      data: { revoked: true },
    });
  });
});
