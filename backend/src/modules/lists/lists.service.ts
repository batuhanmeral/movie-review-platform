import { prisma } from '../../config/db.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { ReorderItemsInput, ListDetailResponse } from './lists.validator.js';

const listUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  location: true,
  createdAt: true,
} as const;

const listItemSelect = {
  id: true,
  contentId: true,
  position: true,
  note: true,
  addedAt: true,
  content: {
    select: {
      id: true,
      title: true,
      posterPath: true,
      tmdbId: true,
      type: true,
      releaseDate: true,
      overview: true,
    },
  },
} as const;

/**
 * Liste sırasını güncelle
 */
export async function reorderListItems(
  userId: string,
  listId: string,
  input: ReorderItemsInput,
) {
  // Liste sahibi mi kontrol et
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { userId: true },
  });

  if (!list) {
    throw new NotFoundError('Liste bulunamadı');
  }

  if (list.userId !== userId) {
    throw new ForbiddenError('Bu listeyi düzenleme izniniz yok');
  }

  // Tüm item'ları transaction'da güncelle
  const updatedItems = await prisma.$transaction(
    input.items.map((item) =>
      prisma.listItem.update({
        where: { id: item.id },
        data: { position: item.position },
        select: listItemSelect,
      })
    )
  );

  return {
    items: updatedItems.map((item) => ({
      id: item.id,
      contentId: item.contentId,
      position: item.position,
      note: item.note,
      content: {
        id: item.content.id,
        title: item.content.title,
        posterPath: item.content.posterPath,
        tmdbId: item.content.tmdbId,
        type: item.content.type,
        releaseDate: item.content.releaseDate,
        overview: item.content.overview,
      },
    })),
  };
}

/**
 * Tek liste detayını getir
 */
export async function getListDetail(
  listId: string,
  userId: string | undefined,
): Promise<ListDetailResponse> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      user: { select: listUserSelect },
      items: {
        orderBy: { position: 'asc' },
        select: listItemSelect,
      },
      _count: { select: { likes: true } },
    },
  });

  if (!list) {
    throw new NotFoundError('Liste bulunamadı');
  }

  // Private liste kontrolü - sahibi değilse göremez
  if (list.visibility === 'PRIVATE' && list.userId !== userId) {
    throw new ForbiddenError('Bu liste özeldir');
  }

  // Geçerli kullanıcı tarafından beğeni yapılmış mı kontrol et
  let likedByMe = false;
  if (userId) {
    const like = await prisma.listLike.findUnique({
      where: {
        listId_userId: { listId, userId },
      },
    });
    likedByMe = !!like;
  }

  return {
    id: list.id,
    title: list.title,
    description: list.description,
    type: list.type,
    visibility: list.visibility,
    coverImage: list.coverImage,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    user: list.user,
    items: list.items,
    likeCount: list._count.likes,
    likedByMe,
    isOwner: list.userId === userId,
  };
}

/**
 * Listeyi beğen veya beğeniyi kaldır (toggle)
 */
export async function toggleListLike(userId: string, listId: string) {
  // Liste var mı kontrol et
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { id: true, userId: true, visibility: true },
  });

  if (!list) {
    throw new NotFoundError('Liste bulunamadı');
  }

  // Public değilse ve sahibi değilse beğenemez
  if (list.visibility === 'PRIVATE' && list.userId !== userId) {
    throw new ForbiddenError('Bu liste özeldir');
  }

  // Zaten beğendi mi kontrol et
  const existingLike = await prisma.listLike.findUnique({
    where: {
      listId_userId: { listId, userId },
    },
  });

  if (existingLike) {
    // Beğeni kaldır
    await prisma.listLike.delete({
      where: { id: existingLike.id },
    });
  } else {
    // Beğeni ekle
    await prisma.listLike.create({
      data: {
        listId,
        userId,
      },
    });
  }

  // Güncellenmiş beğeni sayısını getir
  const likeCount = await prisma.listLike.count({
    where: { listId },
  });

  return {
    liked: !existingLike,
    likeCount,
  };
}

/**
 * Popüler listeleri getir (zaten mevcut - düzeltilmiş)
 */
export async function listPopularLists(limit = 10, userId: string | undefined) {
  const lists = await prisma.list.findMany({
    where: { visibility: 'PUBLIC' },
    orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
    take: Math.min(limit, 50),
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { likes: true, items: true } },
      items: {
        orderBy: { position: 'asc' },
        take: 4,
        select: {
          content: { select: { id: true, posterPath: true, title: true } },
        },
      },
    },
  });

  return lists.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    type: l.type,
    coverImage: l.coverImage,
    createdAt: l.createdAt,
    user: l.user,
    likeCount: l._count.likes,
    itemCount: l._count.items,
    previewPosters: l.items
      .map((it) => it.content.posterPath)
      .filter((p): p is string => Boolean(p)),
  }));
}
