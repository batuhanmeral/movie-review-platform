import { beforeEach, describe, expect, it, vi } from 'vitest';

// prisma tamamen sahtelenir: testler veritabanına bağlanmaz.
vi.mock('../../config/db.js', () => ({
  prisma: {
    block: { findFirst: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../config/db.js';
import {
  broadcastAnnouncement,
  createNotification,
  notifyMentions,
} from './notifications.service.js';

const mocked = {
  blockFindFirst: vi.mocked(prisma.block.findFirst),
  notifCreate: vi.mocked(prisma.notification.create),
  notifCreateMany: vi.mocked(prisma.notification.createMany),
  userFindMany: vi.mocked(prisma.user.findMany),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.blockFindFirst.mockResolvedValue(null as never);
  mocked.notifCreate.mockResolvedValue({} as never);
  mocked.notifCreateMany.mockResolvedValue({ count: 0 } as never);
});

describe('createNotification', () => {
  it('kullanıcının kendi eylemi için bildirim üretmez', async () => {
    await createNotification({ recipientId: 'u1', actorId: 'u1', type: 'REVIEW_LIKE' });
    expect(mocked.notifCreate).not.toHaveBeenCalled();
  });

  it('taraflardan biri diğerini engellemişse bildirim üretmez', async () => {
    mocked.blockFindFirst.mockResolvedValue({ id: 'b1' } as never);
    await createNotification({ recipientId: 'u1', actorId: 'u2', type: 'REVIEW_LIKE' });
    expect(mocked.notifCreate).not.toHaveBeenCalled();
  });

  it('normal durumda bildirimi doğru alanlarla üretir', async () => {
    await createNotification({
      recipientId: 'u1',
      actorId: 'u2',
      type: 'REVIEW_COMMENT',
      entityType: 'review',
      entityId: 'r1',
    });
    expect(mocked.notifCreate).toHaveBeenCalledWith({
      data: {
        recipientId: 'u1',
        actorId: 'u2',
        type: 'REVIEW_COMMENT',
        entityType: 'review',
        entityId: 'r1',
        title: null,
        body: null,
      },
    });
  });

  it('bildirim üretimi hata verirse sessizce yutar (ana akışı bozmaz)', async () => {
    mocked.notifCreate.mockRejectedValue(new Error('db down') as never);
    await expect(
      createNotification({ recipientId: 'u1', actorId: 'u2', type: 'NEW_FOLLOWER' }),
    ).resolves.toBeUndefined();
  });
});

describe('notifyMentions', () => {
  it('bahsetme yoksa hiç sorgu atmaz', async () => {
    await notifyMentions({ actorId: 'u1', text: 'mention yok', entityType: 'review', entityId: 'r1' });
    expect(mocked.userFindMany).not.toHaveBeenCalled();
  });

  it('excludeUserIds verilen kullanıcıları sorgudan hariç tutar (çift bildirim önlemi)', async () => {
    mocked.userFindMany.mockResolvedValue([{ id: 'u3' }] as never);
    await notifyMentions({
      actorId: 'u1',
      text: 'selam @mert ve @zeynep',
      entityType: 'review',
      entityId: 'r1',
      excludeUserIds: ['owner-1'],
    });
    expect(mocked.userFindMany).toHaveBeenCalledWith({
      where: {
        username: { in: ['mert', 'zeynep'] },
        id: { notIn: ['owner-1'] },
      },
      select: { id: true },
    });
    expect(mocked.notifCreate).toHaveBeenCalledTimes(1);
  });

  it('bulunan her kullanıcıya MENTION bildirimi üretir', async () => {
    mocked.userFindMany.mockResolvedValue([{ id: 'u3' }, { id: 'u4' }] as never);
    await notifyMentions({ actorId: 'u1', text: '@a @b', entityType: 'review', entityId: 'r1' });
    expect(mocked.notifCreate).toHaveBeenCalledTimes(2);
  });
});

describe('broadcastAnnouncement', () => {
  it('gönderen admini ve askıdaki hesapları hariç tutar', async () => {
    mocked.userFindMany.mockResolvedValue([{ id: 'u2' }, { id: 'u3' }] as never);
    const result = await broadcastAnnouncement({ actorId: 'admin-1', title: 'T', body: 'B' });
    expect(mocked.userFindMany).toHaveBeenCalledWith({
      where: { isSuspended: false, id: { not: 'admin-1' } },
      select: { id: true },
    });
    expect(mocked.notifCreateMany).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(2);
  });

  it('alıcı yoksa createMany çağırmaz', async () => {
    mocked.userFindMany.mockResolvedValue([] as never);
    const result = await broadcastAnnouncement({ actorId: 'admin-1', title: 'T', body: 'B' });
    expect(mocked.notifCreateMany).not.toHaveBeenCalled();
    expect(result.count).toBe(0);
  });
});
