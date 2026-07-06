import { beforeEach, describe, expect, it, vi } from 'vitest';

// prisma tamamen sahtelenir: testler veritabanına bağlanmaz.
vi.mock('../../config/db.js', () => ({
  prisma: {
    review: { findUnique: vi.fn(), delete: vi.fn() },
    reviewComment: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    block: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
    user: { findMany: vi.fn() },
    report: { updateMany: vi.fn() },
  },
}));

import { prisma } from '../../config/db.js';
import { ForbiddenError } from '../../utils/errors.js';
import { createComment, deleteComment, deleteReview } from './reviews.service.js';

const mocked = {
  reviewFindUnique: vi.mocked(prisma.review.findUnique),
  reviewDelete: vi.mocked(prisma.review.delete),
  commentCreate: vi.mocked(prisma.reviewComment.create),
  commentFindUnique: vi.mocked(prisma.reviewComment.findUnique),
  commentDelete: vi.mocked(prisma.reviewComment.delete),
  blockFindFirst: vi.mocked(prisma.block.findFirst),
  reportUpdateMany: vi.mocked(prisma.report.updateMany),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.blockFindFirst.mockResolvedValue(null as never);
  mocked.commentCreate.mockResolvedValue({ id: 'c1', body: 'yorum' } as never);
  mocked.reviewDelete.mockResolvedValue({} as never);
  mocked.commentDelete.mockResolvedValue({} as never);
  mocked.reportUpdateMany.mockResolvedValue({ count: 0 } as never);
  vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
});

describe('createComment', () => {
  it('inceleme sahibi ile yorumcu arasında engelleme varsa yorumu reddeder', async () => {
    mocked.reviewFindUnique.mockResolvedValue({ id: 'r1', userId: 'owner' } as never);
    mocked.blockFindFirst.mockResolvedValueOnce({ id: 'b1' } as never);
    await expect(createComment('commenter', 'r1', { body: 'selam' })).rejects.toThrow(
      ForbiddenError,
    );
    expect(mocked.commentCreate).not.toHaveBeenCalled();
  });

  it('kendi incelemesine yorum yaparken engel kontrolü yapmaz', async () => {
    mocked.reviewFindUnique.mockResolvedValue({ id: 'r1', userId: 'u1' } as never);
    await createComment('u1', 'r1', { body: 'not' });
    expect(mocked.blockFindFirst).not.toHaveBeenCalled();
    expect(mocked.commentCreate).toHaveBeenCalledTimes(1);
  });

  it('engel yoksa yorumu oluşturur ve inceleme sahibine bildirim üretir', async () => {
    mocked.reviewFindUnique.mockResolvedValue({ id: 'r1', userId: 'owner' } as never);
    await createComment('commenter', 'r1', { body: 'güzel inceleme' });
    expect(mocked.commentCreate).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ recipientId: 'owner', type: 'REVIEW_COMMENT' }),
      }),
    );
  });
});

describe('deleteReview', () => {
  it('silmeden önce açık raporları çözüldü olarak işaretler', async () => {
    mocked.reviewFindUnique.mockResolvedValue({ id: 'r1', userId: 'u1' } as never);
    await deleteReview('u1', 'USER', 'r1');
    expect(mocked.reportUpdateMany).toHaveBeenCalledWith({
      where: { reviewId: 'r1', status: { in: ['PENDING', 'REVIEWED'] } },
      data: { status: 'RESOLVED', resolvedAt: expect.any(Date) },
    });
    expect(mocked.reviewDelete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });
});

describe('deleteComment', () => {
  it('silmeden önce açık raporları çözüldü olarak işaretler', async () => {
    mocked.commentFindUnique.mockResolvedValue({ id: 'c1', userId: 'u1' } as never);
    await deleteComment('u1', 'USER', 'c1');
    expect(mocked.reportUpdateMany).toHaveBeenCalledWith({
      where: { commentId: 'c1', status: { in: ['PENDING', 'REVIEWED'] } },
      data: { status: 'RESOLVED', resolvedAt: expect.any(Date) },
    });
    expect(mocked.commentDelete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
