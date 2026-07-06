import { beforeEach, describe, expect, it, vi } from 'vitest';

// prisma tamamen sahtelenir: testler veritabanına bağlanmaz.
vi.mock('../../config/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

import { prisma } from '../../config/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { bulkSetUsersSuspended, setUserSuspended } from './admin.service.js';

const mocked = {
  findUnique: vi.mocked(prisma.user.findUnique),
  count: vi.mocked(prisma.user.count),
  update: vi.mocked(prisma.user.update),
  updateMany: vi.mocked(prisma.user.updateMany),
  auditCreate: vi.mocked(prisma.auditLog.create),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.update.mockResolvedValue({} as never);
  mocked.updateMany.mockResolvedValue({ count: 0 } as never);
  mocked.auditCreate.mockResolvedValue({} as never);
});

describe('setUserSuspended', () => {
  it('adminin kendini askıya almasını engeller', async () => {
    await expect(setUserSuspended('a1', 'a1', true)).rejects.toThrow(BadRequestError);
  });

  it('kullanıcı yoksa 404 fırlatır', async () => {
    mocked.findUnique.mockResolvedValue(null as never);
    await expect(setUserSuspended('a1', 'u1', true)).rejects.toThrow(NotFoundError);
  });

  it('son aktif adminin askıya alınmasını engeller', async () => {
    mocked.findUnique
      .mockResolvedValueOnce({ role: 'ADMIN' } as never) // hedef kullanıcı
      .mockResolvedValueOnce({ role: 'ADMIN', isSuspended: false } as never); // isLastAdmin
    mocked.count.mockResolvedValue(1 as never); // tek aktif admin
    await expect(setUserSuspended('a1', 'a2', true)).rejects.toThrow(BadRequestError);
    expect(mocked.update).not.toHaveBeenCalled();
  });

  it('başka aktif admin varsa admini askıya alabilir', async () => {
    mocked.findUnique.mockResolvedValueOnce({ role: 'ADMIN' } as never);
    mocked.count.mockResolvedValue(2 as never);
    const result = await setUserSuspended('a1', 'a2', true);
    expect(result).toEqual({ ok: true });
    expect(mocked.update).toHaveBeenCalledWith({
      where: { id: 'a2' },
      data: { isSuspended: true },
    });
  });

  it('normal kullanıcıyı askıya alır ve denetim kaydı yazar', async () => {
    mocked.findUnique.mockResolvedValueOnce({ role: 'USER' } as never);
    await setUserSuspended('a1', 'u1', true);
    expect(mocked.update).toHaveBeenCalled();
    expect(mocked.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'USER_SUSPENDED', targetId: 'u1' }),
      }),
    );
  });
});

describe('bulkSetUsersSuspended', () => {
  it('adminin kendi id\'sini hedeflerden çıkarır', async () => {
    mocked.updateMany.mockResolvedValue({ count: 1 } as never);
    await bulkSetUsersSuspended('a1', ['a1', 'u1'], true);
    const arg = mocked.updateMany.mock.calls[0]?.[0];
    expect(arg?.where?.id).toEqual({ in: ['u1'] });
  });

  it('askıya alma yönünde yalnızca USER rolündekileri günceller', async () => {
    mocked.updateMany.mockResolvedValue({ count: 2 } as never);
    await bulkSetUsersSuspended('a1', ['u1', 'u2'], true);
    const arg = mocked.updateMany.mock.calls[0]?.[0];
    expect(arg?.where?.role).toBe('USER');
    expect(arg?.data).toEqual({ isSuspended: true });
  });

  it('askıyı kaldırma yönünde rol filtresi uygulamaz', async () => {
    mocked.updateMany.mockResolvedValue({ count: 2 } as never);
    await bulkSetUsersSuspended('a1', ['u1', 'u2'], false);
    const arg = mocked.updateMany.mock.calls[0]?.[0];
    expect(arg?.where?.role).toBeUndefined();
    expect(arg?.data).toEqual({ isSuspended: false });
  });

  it('hedef kalmazsa hiç sorgu atmaz', async () => {
    const result = await bulkSetUsersSuspended('a1', ['a1'], true);
    expect(result).toEqual({ updated: 0 });
    expect(mocked.updateMany).not.toHaveBeenCalled();
  });
});
