import { prisma } from '../../config/db.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { ReorderItemsInput } from './lists.validator.js';

// Liste detay/sahip kartında gösterilecek kullanıcı alanları
const listUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  location: true,
  createdAt: true,
} as const;

// Liste öğesi + bağlı içeriğin gösterim alanları
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

// Herkese açık popüler listeleri beğeni sayısına (eşitlikte en yeniye) göre döndürür.
// Her liste için kart önizlemesi: ilk 4 öğenin poster yolları ve beğeni/öğe sayıları.
export async function listPopularLists(limit: number) {
  const lists = await prisma.list.findMany({
    where: { visibility: 'PUBLIC' },
    orderBy: [{ likes: { _count: 'desc' } }, { createdAt: 'desc' }],
    take: limit,
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

// Tek bir listenin detayını öğeleriyle birlikte döndürür. Özel (PRIVATE) listeyi
// yalnızca sahibi görebilir. Viewer giriş yapmışsa beğeni durumu ve sahiplik eklenir.
export async function getListDetail(listId: string, viewerId?: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      user: { select: listUserSelect },
      items: { orderBy: { position: 'asc' }, select: listItemSelect },
      _count: { select: { likes: true } },
    },
  });

  if (!list) throw new NotFoundError('Liste bulunamadı');
  if (list.visibility === 'PRIVATE' && list.userId !== viewerId) {
    throw new ForbiddenError('Bu liste özeldir');
  }

  let likedByMe = false;
  if (viewerId) {
    const like = await prisma.listLike.findUnique({
      where: { listId_userId: { listId, userId: viewerId } },
      select: { id: true },
    });
    likedByMe = Boolean(like);
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
    isOwner: list.userId === viewerId,
  };
}

// Liste öğelerinin sırasını günceller (yalnızca liste sahibi). Tüm güncellemeler
// tek transaction içinde yapılır; güncel öğe listesi döner.
export async function reorderListItems(
  userId: string,
  listId: string,
  input: ReorderItemsInput,
) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { userId: true },
  });
  if (!list) throw new NotFoundError('Liste bulunamadı');
  if (list.userId !== userId) throw new ForbiddenError('Bu listeyi düzenleme izniniz yok');

  const updatedItems = await prisma.$transaction(
    input.items.map((item) =>
      prisma.listItem.update({
        where: { id: item.id },
        data: { position: item.position },
        select: listItemSelect,
      }),
    ),
  );

  return { items: updatedItems };
}

// Listeye beğeniyi açıp kapatır. Özel listeyi yalnızca sahibi beğenebilir.
// Güncel beğeni durumu ve toplam beğeni sayısını döndürür.
export async function toggleListLike(userId: string, listId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { userId: true, visibility: true },
  });
  if (!list) throw new NotFoundError('Liste bulunamadı');
  if (list.visibility === 'PRIVATE' && list.userId !== userId) {
    throw new ForbiddenError('Bu liste özeldir');
  }

  const existing = await prisma.listLike.findUnique({
    where: { listId_userId: { listId, userId } },
  });

  if (existing) {
    await prisma.listLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.listLike.create({ data: { listId, userId } });
  }

  const likeCount = await prisma.listLike.count({ where: { listId } });
  return { liked: !existing, likeCount };
}
