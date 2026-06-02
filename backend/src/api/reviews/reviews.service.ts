import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { containsProfanity } from '../../services/profanity.service.js';
import type {
  CreateCommentInput,
  CreateReviewInput,
  ListReviewsQuery,
  UpdateCommentInput,
  UpdateReviewInput,
} from './reviews.validator.js';

const reviewUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

const reviewInclude = {
  user: { select: reviewUserSelect },
  _count: { select: { likes: true, comments: true } },
} as const;

// Akış/profil listelerinde inceleme kartının ihtiyaç duyduğu içerik alanları
const reviewContentSelect = {
  id: true,
  tmdbId: true,
  type: true,
  title: true,
  posterPath: true,
  releaseDate: true,
} as const;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

function shape(r: ReviewRow, likedByMe: boolean) {
  return {
    id: r.id,
    rating: r.rating,
    body: r.body,
    containsSpoiler: r.containsSpoiler,
    isFlagged: r.isFlagged,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    user: r.user,
    likeCount: r._count.likes,
    commentCount: r._count.comments,
    likedByMe,
  };
}

async function annotateLiked<T extends { id: string }>(
  rows: T[],
  userId: string | undefined,
): Promise<Set<string>> {
  if (!userId || rows.length === 0) return new Set();
  const liked = await prisma.reviewLike.findMany({
    where: { userId, reviewId: { in: rows.map((r) => r.id) } },
    select: { reviewId: true },
  });
  return new Set(liked.map((l) => l.reviewId));
}

export async function createReview(userId: string, input: CreateReviewInput) {
  const content = await prisma.content.findUnique({ where: { id: input.contentId } });
  if (!content) throw new NotFoundError('İçerik bulunamadı');

  const flagged = containsProfanity(input.body);

  try {
    const review = await prisma.review.create({
      data: {
        userId,
        contentId: input.contentId,
        rating: input.rating,
        body: input.body ?? null,
        containsSpoiler: input.containsSpoiler ?? false,
        isFlagged: flagged,
      },
      include: reviewInclude,
    });
    return shape(review, false);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('Bu içerik için zaten bir incelemeniz var');
    }
    throw err;
  }
}

export async function updateReview(userId: string, id: string, input: UpdateReviewInput) {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('İnceleme bulunamadı');
  if (existing.userId !== userId) throw new ForbiddenError();

  const data: Prisma.ReviewUpdateInput = {};
  if (input.rating !== undefined) data.rating = input.rating;
  if (input.body !== undefined) {
    data.body = input.body;
    data.isFlagged = containsProfanity(input.body);
  }
  if (input.containsSpoiler !== undefined) data.containsSpoiler = input.containsSpoiler;

  const updated = await prisma.review.update({
    where: { id },
    data,
    include: reviewInclude,
  });
  const liked = await prisma.reviewLike.findUnique({
    where: { reviewId_userId: { reviewId: id, userId } },
  });
  return shape(updated, Boolean(liked));
}

export async function deleteReview(userId: string, role: 'USER' | 'ADMIN', id: string) {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('İnceleme bulunamadı');
  if (existing.userId !== userId && role !== 'ADMIN') throw new ForbiddenError();
  await prisma.review.delete({ where: { id } });
}

export async function listReviewsForContent(
  contentId: string,
  query: ListReviewsQuery,
  viewerId?: string,
) {
  const skip = (query.page - 1) * query.limit;

  const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
    query.sort === 'popular'
      ? [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where: { contentId },
      orderBy,
      skip,
      take: query.limit,
      include: reviewInclude,
    }),
    prisma.review.count({ where: { contentId } }),
  ]);

  const likedSet = await annotateLiked(rows, viewerId);

  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
    items: rows.map((r) => shape(r, likedSet.has(r.id))),
  };
}

export async function listPopularReviews(
  windowDays: number,
  limit: number,
  viewerId?: string,
) {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.review.findMany({
    where: { createdAt: { gte: since }, body: { not: null } },
    orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
    take: limit,
    include: { ...reviewInclude, content: { select: reviewContentSelect } },
  });

  const likedSet = await annotateLiked(rows, viewerId);

  return rows.map((r) => ({
    ...shape(r, likedSet.has(r.id)),
    content: r.content,
  }));
}

// Akış "Takip Ettiklerin" kaynağı: viewer'ın takip ettiği kullanıcıların belirli zaman
// aralığındaki incelemelerini, Popüler ile aynı şekil ve etkileşim temelli sıralamayla
// (en çok beğenilen, eşitlikte en yeni) listeler. Takip edilen yoksa boş döner.
export async function listFollowingReviews(
  viewerId: string,
  windowDays: number,
  limit: number,
) {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  if (followingIds.length === 0) return [];

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.review.findMany({
    where: { userId: { in: followingIds }, createdAt: { gte: since }, body: { not: null } },
    orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
    take: limit,
    include: { ...reviewInclude, content: { select: reviewContentSelect } },
  });

  const likedSet = await annotateLiked(rows, viewerId);

  return rows.map((r) => ({
    ...shape(r, likedSet.has(r.id)),
    content: r.content,
  }));
}

// Belirli bir kullanıcının yazdığı incelemeleri içerik bilgisiyle birlikte listeler.
// Profil sayfasındaki "İncelemeler" bölümünde kullanılır.
export async function listReviewsByUser(userId: string, limit: number, viewerId?: string) {
  const rows = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      ...reviewInclude,
      content: {
        select: {
          id: true,
          tmdbId: true,
          type: true,
          title: true,
          posterPath: true,
          releaseDate: true,
        },
      },
    },
  });

  const likedSet = await annotateLiked(rows, viewerId);

  return rows.map((r) => ({
    ...shape(r, likedSet.has(r.id)),
    content: r.content,
  }));
}

export async function getMyReviewForContent(userId: string, contentId: string) {
  const r = await prisma.review.findUnique({
    where: { userId_contentId: { userId, contentId } },
    include: reviewInclude,
  });
  if (!r) return null;
  return shape(r, false);
}

export async function toggleLike(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError('İnceleme bulunamadı');

  const existing = await prisma.reviewLike.findUnique({
    where: { reviewId_userId: { reviewId, userId } },
  });

  if (existing) {
    await prisma.reviewLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.reviewLike.create({ data: { reviewId, userId } });
  }

  const likeCount = await prisma.reviewLike.count({ where: { reviewId } });
  return { liked: !existing, likeCount };
}

const commentInclude = {
  user: { select: reviewUserSelect },
} as const;

export async function listComments(reviewId: string) {
  const exists = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!exists) throw new NotFoundError('İnceleme bulunamadı');
  return prisma.reviewComment.findMany({
    where: { reviewId },
    orderBy: { createdAt: 'asc' },
    include: commentInclude,
  });
}

export async function createComment(userId: string, reviewId: string, input: CreateCommentInput) {
  const exists = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!exists) throw new NotFoundError('İnceleme bulunamadı');
  return prisma.reviewComment.create({
    data: {
      reviewId,
      userId,
      body: input.body,
      isFlagged: containsProfanity(input.body),
    },
    include: commentInclude,
  });
}

export async function updateComment(
  userId: string,
  commentId: string,
  input: UpdateCommentInput,
) {
  const existing = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!existing) throw new NotFoundError('Yorum bulunamadı');
  if (existing.userId !== userId) throw new ForbiddenError();
  return prisma.reviewComment.update({
    where: { id: commentId },
    data: { body: input.body, isFlagged: containsProfanity(input.body) },
    include: commentInclude,
  });
}

export async function deleteComment(userId: string, role: 'USER' | 'ADMIN', commentId: string) {
  const existing = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!existing) throw new NotFoundError('Yorum bulunamadı');
  if (existing.userId !== userId && role !== 'ADMIN') throw new ForbiddenError();
  await prisma.reviewComment.delete({ where: { id: commentId } });
}
