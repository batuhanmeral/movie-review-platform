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

// İnceleme/yorum kartlarında gösterilecek yazar alanları (hassas alanlar hariç)
const reviewUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

// Her inceleme sorgusuna eklenen ortak ilişkiler: yazar bilgisi + beğeni/yorum sayıları
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

// Prisma satırını API yanıtına dönüştürür; _count alanlarını düz sayaçlara çevirir
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

// Verilen incelemelerden viewer'ın beğendiklerinin id kümesini tek sorguda döndürür.
// Böylece her satır için ayrı sorgu (N+1) atılması önlenir.
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

// Bir içerik için yeni inceleme oluşturur. İçerik yoksa 404, aynı içeriğe ikinci
// inceleme denenirse (unique kısıt P2002) 409 döner.
export async function createReview(userId: string, input: CreateReviewInput) {
  const content = await prisma.content.findUnique({ where: { id: input.contentId } });
  if (!content) throw new NotFoundError('İçerik bulunamadı');

  // Küfür filtresinden geçirip moderasyon için işaretle
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

// İncelemeyi günceller; yalnızca sahibi değiştirebilir. Gönderilen alanlar uygulanır.
export async function updateReview(userId: string, id: string, input: UpdateReviewInput) {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('İnceleme bulunamadı');
  if (existing.userId !== userId) throw new ForbiddenError();

  // Yalnızca tanımlı alanları güncelle; body değişirse küfür işaretini yeniden hesapla
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

// İncelemeyi siler; sahibi değilse yalnızca ADMIN silebilir
export async function deleteReview(userId: string, role: 'USER' | 'ADMIN', id: string) {
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('İnceleme bulunamadı');
  if (existing.userId !== userId && role !== 'ADMIN') throw new ForbiddenError();
  await prisma.review.delete({ where: { id } });
}

// Bir içeriğe ait incelemeleri sayfalı döndürür. sort='popular' ise beğeni sayısına,
// aksi halde tarihe göre sıralanır; viewer varsa beğeni durumu işaretlenir.
export async function listReviewsForContent(
  contentId: string,
  query: ListReviewsQuery,
  viewerId?: string,
) {
  const skip = (query.page - 1) * query.limit;

  // Popülerlikte eşitlik olursa en yeni öne gelsin
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

// Son windowDays gün içindeki, metin içeren incelemeleri beğeniye göre sıralayıp döndürür.
// İçerik kartı için ek içerik alanları da include edilir.
export async function listPopularReviews(
  windowDays: number,
  limit: number,
  viewerId?: string,
) {
  // windowDays gün öncesini referans alan zaman sınırı
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

// Kullanıcının belirli bir içerik için yazdığı incelemeyi döndürür; yoksa null
export async function getMyReviewForContent(userId: string, contentId: string) {
  const r = await prisma.review.findUnique({
    where: { userId_contentId: { userId, contentId } },
    include: reviewInclude,
  });
  if (!r) return null;
  return shape(r, false);
}

// İncelemeye beğeniyi açıp kapatır: beğeni varsa kaldırır, yoksa ekler.
// Güncel beğeni durumu ve toplam beğeni sayısını döndürür.
export async function toggleLike(userId: string, reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError('İnceleme bulunamadı');

  // Mevcut beğeniye göre ekle/kaldır kararı verilir
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

// Yorum sorgularına eklenen ortak ilişki: yorumu yazan kullanıcı bilgisi
const commentInclude = {
  user: { select: reviewUserSelect },
} as const;

// İncelemeye ait yorumları eskiden yeniye listeler; inceleme yoksa 404
export async function listComments(reviewId: string) {
  const exists = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!exists) throw new NotFoundError('İnceleme bulunamadı');
  return prisma.reviewComment.findMany({
    where: { reviewId },
    orderBy: { createdAt: 'asc' },
    include: commentInclude,
  });
}

// İncelemeye yeni yorum ekler; gövde küfür filtresinden geçirilip işaretlenir
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

// Yorumu günceller; yalnızca yazarı değiştirebilir
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

// Yorumu siler; sahibi değilse yalnızca ADMIN silebilir
export async function deleteComment(userId: string, role: 'USER' | 'ADMIN', commentId: string) {
  const existing = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!existing) throw new NotFoundError('Yorum bulunamadı');
  if (existing.userId !== userId && role !== 'ADMIN') throw new ForbiddenError();
  await prisma.reviewComment.delete({ where: { id: commentId } });
}
