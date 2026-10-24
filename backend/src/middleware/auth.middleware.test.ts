import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

// prisma tamamen sahtelenir: testler veritabanına bağlanmaz.
vi.mock('../config/db.js', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { prisma } from '../config/db.js';
import { signAccessToken } from '../utils/jwt.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { optionalAuth, requireAuth, requireRole } from './auth.middleware.js';

const userToken = signAccessToken({ sub: 'u1', username: 'demo', role: 'USER' });

function makeReq(authorization?: string, auth?: Request['auth']): Request {
  return { headers: { authorization }, auth } as Request;
}

// Middleware'i çalıştırır; next'e verilen argümanı (hata ya da undefined) döner.
async function run(
  handler: (req: Request, res: Response, next: (err?: unknown) => void) => unknown,
  req: Request,
): Promise<unknown> {
  return new Promise((resolve) => {
    void handler(req, {} as Response, resolve);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireAuth', () => {
  it.each([
    ['header yoksa', undefined],
    ['Bearer şeması değilse', `Basic ${userToken}`],
    ['token geçersizse', 'Bearer bozuk-token'],
  ])('%s UnauthorizedError ile durdurur', async (_label, header) => {
    const err = await run(requireAuth, makeReq(header));
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it('token geçerli olsa da silinmiş kullanıcıyı reddeder', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const err = await run(requireAuth, makeReq(`Bearer ${userToken}`));
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it('token geçerli olsa da askıya alınmış hesabı ForbiddenError ile reddeder', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'USER',
      isSuspended: true,
    } as never);
    const err = await run(requireAuth, makeReq(`Bearer ${userToken}`));
    expect(err).toBeInstanceOf(ForbiddenError);
  });

  it('rolü token yerine veritabanından alır', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: 'ADMIN',
      isSuspended: false,
    } as never);
    const req = makeReq(`Bearer ${userToken}`);
    const err = await run(requireAuth, req);
    expect(err).toBeUndefined();
    expect(req.auth).toMatchObject({ sub: 'u1', username: 'demo', role: 'ADMIN' });
  });
});

describe('optionalAuth', () => {
  it('header yoksa kimliksiz devam eder', async () => {
    const req = makeReq();
    expect(await run(optionalAuth, req)).toBeUndefined();
    expect(req.auth).toBeUndefined();
  });

  it('geçersiz token’ı hata vermeden yok sayar', async () => {
    const req = makeReq('Bearer bozuk-token');
    expect(await run(optionalAuth, req)).toBeUndefined();
    expect(req.auth).toBeUndefined();
  });

  it('geçerli token ile req.auth doldurulur', async () => {
    const req = makeReq(`Bearer ${userToken}`);
    expect(await run(optionalAuth, req)).toBeUndefined();
    expect(req.auth).toMatchObject({ sub: 'u1', role: 'USER' });
  });
});

describe('requireRole', () => {
  const adminOnly = requireRole('ADMIN');

  it('kimlik yoksa UnauthorizedError döner', async () => {
    expect(await run(adminOnly, makeReq())).toBeInstanceOf(UnauthorizedError);
  });

  it('rol yetmiyorsa ForbiddenError döner', async () => {
    const req = makeReq(undefined, { sub: 'u1', username: 'demo', role: 'USER' });
    expect(await run(adminOnly, req)).toBeInstanceOf(ForbiddenError);
  });

  it('izin verilen rol geçer', async () => {
    const req = makeReq(undefined, { sub: 'u1', username: 'demo', role: 'ADMIN' });
    expect(await run(adminOnly, req)).toBeUndefined();
  });
});
