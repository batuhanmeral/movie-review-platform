import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import * as tmdb from '../../services/tmdb.service.js';
import { getDetail } from '../content/content.service.js';
import type {
  AddItemInput,
  CreateListInput,
  ReorderItemsInput,
  UpdateListInput,
} from './lists.validator.js';

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
    // Yalnızca kullanıcı tarafından oluşturulan (CUSTOM) herkese açık listeler;
    // zorunlu sistem listeleri (İzlenenler/İzleme Listesi/Favoriler) burada gösterilmez.
    where: { visibility: 'PUBLIC', type: 'CUSTOM' },
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

// Liste özetini (kart/sayfa için) döndürmede kullanılan ortak şekil
function shapeListSummary(l: {
  id: string;
  title: string;
  description: string | null;
  type: 'WATCHED' | 'WATCHLIST' | 'FAVORITES' | 'CUSTOM';
  visibility: 'PUBLIC' | 'PRIVATE';
  coverImage: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { items: number; likes: number };
}) {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    type: l.type,
    visibility: l.visibility,
    coverImage: l.coverImage,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    itemCount: l._count.items,
    likeCount: l._count.likes,
  };
}

// Yeni CUSTOM liste oluşturur (tür her zaman CUSTOM)
export async function createList(userId: string, input: CreateListInput) {
  const list = await prisma.list.create({
    data: {
      userId,
      type: 'CUSTOM',
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility,
    },
    include: { _count: { select: { items: true, likes: true } } },
  });
  return shapeListSummary(list);
}

// Listeyi günceller (yalnızca sahibi). Gönderilen alanlar uygulanır.
export async function updateList(userId: string, listId: string, input: UpdateListInput) {
  const existing = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!existing) throw new NotFoundError('Liste bulunamadı');
  if (existing.userId !== userId) throw new ForbiddenError('Bu listeyi düzenleme izniniz yok');

  const list = await prisma.list.update({
    where: { id: listId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
    },
    include: { _count: { select: { items: true, likes: true } } },
  });
  return shapeListSummary(list);
}

// Listeyi siler (yalnızca sahibi). Sistem listeleri (WATCHED/WATCHLIST/FAVORITES) silinemez.
export async function deleteList(userId: string, listId: string) {
  const existing = await prisma.list.findUnique({
    where: { id: listId },
    select: { userId: true, type: true },
  });
  if (!existing) throw new NotFoundError('Liste bulunamadı');
  if (existing.userId !== userId) throw new ForbiddenError('Bu listeyi silme izniniz yok');
  if (existing.type !== 'CUSTOM') throw new ForbiddenError('Sistem listeleri silinemez');
  await prisma.list.delete({ where: { id: listId } });
}

// Giriş yapan kullanıcının kendi listelerini döndürür (sistem listeleri önce).
// tmdbId+type verilirse, o içeriğin her listedeki ListItem id'si (varsa) eklenir —
// böylece "Listeye Ekle" menüsü hangi listede olduğunu ve toggle için itemId'yi bilir.
export async function getMyLists(
  userId: string,
  ref?: { tmdbId: number; type: 'movie' | 'tv' },
) {
  const lists = await prisma.list.findMany({
    where: { userId },
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { items: true, likes: true } } },
  });

  // İçerik referansı verildiyse, DB'de zaten varsa contentId'sini bul (TMDB çağrısı yok)
  let itemIdByList = new Map<string, string>();
  if (ref) {
    const content = await prisma.content.findUnique({
      where: { tmdbId_type: { tmdbId: ref.tmdbId, type: ref.type === 'movie' ? 'MOVIE' : 'TV' } },
      select: { id: true },
    });
    if (content) {
      const items = await prisma.listItem.findMany({
        where: { contentId: content.id, listId: { in: lists.map((l) => l.id) } },
        select: { id: true, listId: true },
      });
      itemIdByList = new Map(items.map((it) => [it.listId, it.id]));
    }
  }

  return lists.map((l) => ({
    ...shapeListSummary(l),
    ...(ref ? { itemId: itemIdByList.get(l.id) ?? null } : {}),
  }));
}

// Bir kullanıcının herkese açık listelerini döndürür (sahibi ise özeller de dahil).
// Profil sayfasındaki "Listeler" bölümünde kullanılır.
export async function getUserLists(username: string, viewerId?: string) {
  const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!owner) throw new NotFoundError('Kullanıcı bulunamadı');

  const isOwner = owner.id === viewerId;
  const lists = await prisma.list.findMany({
    where: { userId: owner.id, ...(isOwner ? {} : { visibility: 'PUBLIC' }) },
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: { select: { items: true, likes: true } },
      items: {
        orderBy: { position: 'asc' },
        take: 4,
        select: { content: { select: { posterPath: true } } },
      },
    },
  });

  return lists.map((l) => ({
    ...shapeListSummary(l),
    previewPosters: l.items
      .map((it) => it.content.posterPath)
      .filter((p): p is string => Boolean(p)),
  }));
}

// Listeye içerik ekler (yalnızca sahibi). İçerik DB'de yoksa TMDB'den çekilip
// Content tablosuna eklenir. Aynı içerik listede zaten varsa 409 döner.
export async function addItem(userId: string, listId: string, input: AddItemInput) {
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list) throw new NotFoundError('Liste bulunamadı');
  if (list.userId !== userId) throw new ForbiddenError('Bu listeyi düzenleme izniniz yok');

  // İçeriği TMDB'den çöz/upsert et ve iç Content id'sini al
  const detail = await getDetail(input.type, input.tmdbId, input.language as tmdb.Lang);
  const contentId = detail.contentId;

  // Yeni öğe listenin sonuna eklenir
  const count = await prisma.listItem.count({ where: { listId } });

  try {
    const item = await prisma.listItem.create({
      data: { listId, contentId, position: count, note: input.note ?? null },
      select: listItemSelect,
    });
    return item;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('Bu içerik listede zaten var');
    }
    throw err;
  }
}

// Listeden bir öğeyi kaldırır (yalnızca sahibi)
export async function removeItem(userId: string, listId: string, itemId: string) {
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list) throw new NotFoundError('Liste bulunamadı');
  if (list.userId !== userId) throw new ForbiddenError('Bu listeyi düzenleme izniniz yok');

  const item = await prisma.listItem.findUnique({ where: { id: itemId }, select: { listId: true } });
  if (!item || item.listId !== listId) throw new NotFoundError('Öğe bulunamadı');

  await prisma.listItem.delete({ where: { id: itemId } });
}
