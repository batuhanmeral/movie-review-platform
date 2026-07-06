import { Prisma } from '@prisma/client';

import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import * as tmdb from '../../services/tmdb.service.js';
import { listReviewsByUser } from '../reviews/reviews.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import type { UpdateMeInput } from './users.validator.js';

// "Kendi profilim" yanıtında dönen alanlar (passwordHash gibi hassas alanlar hariç)
const meSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  location: true,
  language: true,
  role: true,
  favoriteContent: true,
  favoriteActorId: true,
  favoriteDirectorId: true,
  createdAt: true,
} as const;

// Oturum açmış kullanıcının kendi profil bilgilerini getirir
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: meSelect });
  if (!user) throw new NotFoundError();
  return user;
}

// Kullanıcının takip ettiği son 20 kişiyi (akış "Arkadaşlarım" bölümü) döndürür
export async function getMyFollowing(userId: string) {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      following: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
    },
  });
  return rows.map((r) => r.following);
}

// Profil bilgilerini günceller (şifre hariç). E-posta/kullanıcı adı çakışırsa 409 (P2002).
export async function updateMe(userId: string, input: UpdateMeInput) {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: input as Prisma.UserUpdateInput,
      select: meSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictError('Bu e-posta veya kullanıcı adı zaten kullanımda.');
    }
    throw err;
  }
}

// Yüklenen avatar dosyasını statik adrese çevirip kullanıcının avatarUrl'ini günceller
export async function setAvatar(userId: string, filename: string) {
  const avatarUrl = `${env.APP_URL}/uploads/avatars/${filename}`;
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: meSelect,
  });
}

// Mevcut şifreyi doğrular, yenisini kaydeder ve diğer tüm oturumları (refresh token) iptal eder
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new BadRequestError('Mevcut şifre yanlış');
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  // Tüm refresh token'ları iptal et — başka oturumlar zorla kapanır
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revoked: false },
    data: { revoked: true },
  });
}

// Hesabı kalıcı olarak siler (cascade ile inceleme/liste/yorum/takip vb. silinir)
export async function deleteMe(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}

// Kullanıcı adına göre herkese açık profili getirir. İzleyici giriş yapmış ve başkasının
// profiline bakıyorsa, takip durumunu (isFollowing) yanıta ekler.
export async function getByUsername(username: string, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      location: true,
      createdAt: true,
      _count: { select: { reviews: true, followers: true, following: true } },
    },
  });
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');

  let isFollowing = false;
  let isBlocked = false;
  if (viewerId && viewerId !== user.id) {
    const [follow, block] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
        select: { id: true },
      }),
      prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId: viewerId, blockedId: user.id } },
        select: { id: true },
      }),
    ]);
    isFollowing = Boolean(follow);
    isBlocked = Boolean(block);
  }

  return { ...user, isFollowing, isBlocked };
}

// Bir kullanıcının takipçilerini ('followers') veya takip ettiklerini ('following') listeler.
// İzleyici giriş yapmışsa her satıra takip durumu (isFollowing) ve satırın izleyicinin
// kendisi olup olmadığı (isSelf) eklenir; böylece listede takip et/bırak butonu gösterilebilir.
export async function listFollows(
  username: string,
  direction: 'followers' | 'following',
  viewerId?: string,
) {
  const owner = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!owner) throw new NotFoundError('Kullanıcı bulunamadı');

  const userSelect = {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  } as const;

  // followers: followingId = owner → follower'ları getir
  // following: followerId  = owner → following'leri getir
  const users =
    direction === 'followers'
      ? (
          await prisma.follow.findMany({
            where: { followingId: owner.id },
            orderBy: { createdAt: 'desc' },
            select: { follower: userSelect },
          })
        ).map((r) => r.follower)
      : (
          await prisma.follow.findMany({
            where: { followerId: owner.id },
            orderBy: { createdAt: 'desc' },
            select: { following: userSelect },
          })
        ).map((r) => r.following);

  // İzleyicinin bu listedeki kişileri takip durumunu tek sorguda topla (N+1 önlenir)
  let followedSet = new Set<string>();
  if (viewerId && users.length > 0) {
    const followed = await prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: users.map((u) => u.id) } },
      select: { followingId: true },
    });
    followedSet = new Set(followed.map((f) => f.followingId));
  }

  return users.map((u) => ({
    ...u,
    isFollowing: followedSet.has(u.id),
    isSelf: u.id === viewerId,
  }));
}

// Bir kullanıcıyı takip eder. İdempotenttir: zaten takip ediliyorsa hata vermez.
export async function followUser(viewerId: string, username: string) {
  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!target) throw new NotFoundError('Kullanıcı bulunamadı');
  if (target.id === viewerId) throw new BadRequestError('Kendinizi takip edemezsiniz');

  // İki taraftan biri diğerini engellemişse takip engellenir
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: viewerId, blockedId: target.id },
        { blockerId: target.id, blockedId: viewerId },
      ],
    },
    select: { id: true },
  });
  if (block) throw new ForbiddenError('Engelleme nedeniyle takip edilemez');

  let created = true;
  try {
    await prisma.follow.create({
      data: { followerId: viewerId, followingId: target.id },
    });
  } catch (err) {
    // Zaten takip ediliyorsa (unique ihlali) sessizce geç — istek idempotenttir
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      created = false;
    } else {
      throw err;
    }
  }

  // Yalnızca yeni bir takip oluştuysa bildirim üret (tekrarlı isteklerde değil)
  if (created) {
    await createNotification({
      recipientId: target.id,
      actorId: viewerId,
      type: 'NEW_FOLLOWER',
      entityType: 'user',
      entityId: viewerId,
    });
  }

  const followerCount = await prisma.follow.count({ where: { followingId: target.id } });
  return { following: true, followerCount };
}

// Bir kullanıcının takibini bırakır. İdempotenttir: takip edilmiyorsa hata vermez.
export async function unfollowUser(viewerId: string, username: string) {
  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!target) throw new NotFoundError('Kullanıcı bulunamadı');

  await prisma.follow.deleteMany({
    where: { followerId: viewerId, followingId: target.id },
  });

  const followerCount = await prisma.follow.count({ where: { followingId: target.id } });
  return { following: false, followerCount };
}

// Bir kullanıcıyı engeller. İdempotenttir. Engelleme, iki yöndeki takip
// ilişkilerini de kaldırır (artık birbirlerini takip edemezler).
export async function blockUser(viewerId: string, username: string) {
  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) throw new NotFoundError('Kullanıcı bulunamadı');
  if (target.id === viewerId) throw new BadRequestError('Kendinizi engelleyemezsiniz');

  try {
    await prisma.block.create({ data: { blockerId: viewerId, blockedId: target.id } });
  } catch (err) {
    // Zaten engelliyse (unique ihlali) sessizce geç
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
  }

  // Karşılıklı takipleri kaldır
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: viewerId, followingId: target.id },
        { followerId: target.id, followingId: viewerId },
      ],
    },
  });

  return { blocked: true };
}

// Engellemeyi kaldırır. İdempotenttir.
export async function unblockUser(viewerId: string, username: string) {
  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) throw new NotFoundError('Kullanıcı bulunamadı');
  await prisma.block.deleteMany({ where: { blockerId: viewerId, blockedId: target.id } });
  return { blocked: false };
}

// İzleyicinin engellediği kullanıcıları listeler (Ayarlar sayfası için).
export async function listMyBlocks(viewerId: string) {
  const rows = await prisma.block.findMany({
    where: { blockerId: viewerId },
    orderBy: { createdAt: 'desc' },
    select: {
      blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  return rows.map((r) => r.blocked);
}

// Favori içerik referansının şekli (DB'de Json olarak saklanır)
interface FavoriteContentRef {
  tmdbId: number;
  type: tmdb.TmdbType;
}

// Saklanan favoriteContent JSON'unu güvenli şekilde ayrıştırır (en fazla 4 öğe)
function parseFavoriteContent(value: unknown): FavoriteContentRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is FavoriteContentRef =>
        !!v &&
        typeof v === 'object' &&
        typeof (v as FavoriteContentRef).tmdbId === 'number' &&
        ((v as FavoriteContentRef).type === 'movie' || (v as FavoriteContentRef).type === 'tv'),
    )
    .slice(0, 4);
}

// Bir kişinin (oyuncu/yönetmen) favori kart verisini TMDB'den getirir; bulunamazsa null
async function enrichPerson(id: number | null, language: tmdb.Lang) {
  if (!id) return null;
  try {
    const p = await tmdb.person(id, language);
    return { id: p.id, name: p.name, profilePath: p.profilePath };
  } catch {
    return null;
  }
}

// Kullanıcının favorilerini TMDB metaverisiyle zenginleştirip döner.
// Profil sayfasını hafif tutmak için ana profil sorgusundan ayrı tutulur.
export async function getFavorites(username: string, language: tmdb.Lang) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { favoriteContent: true, favoriteActorId: true, favoriteDirectorId: true },
  });
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');

  const refs = parseFavoriteContent(user.favoriteContent);

  // Tüm TMDB çağrılarını paralel yap (hepsi cache'li); silinmiş öğeleri ele
  const [contentResults, actor, director] = await Promise.all([
    Promise.all(
      refs.map(async (ref) => {
        try {
          const d = await tmdb.detail(ref.type, ref.tmdbId, language);
          return {
            tmdbId: d.id,
            type: d.type,
            title: d.title,
            posterPath: d.posterPath,
            releaseDate: d.releaseDate,
            voteAverage: d.voteAverage,
          };
        } catch {
          return null;
        }
      }),
    ),
    enrichPerson(user.favoriteActorId, language),
    enrichPerson(user.favoriteDirectorId, language),
  ]);

  return {
    content: contentResults.filter((c) => c !== null),
    actor,
    director,
  };
}

// Bir kullanıcının yazdığı incelemeleri (içerik bilgisiyle) listeler
export async function getReviews(username: string, limit: number, viewerId?: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');

  return listReviewsByUser(user.id, limit, viewerId);
}

// İsme/kullanıcı adına göre kullanıcı araması yapar (arama çubuğu önerileri için).
// En fazla 8 sonuç; prefix eşleşenler öne, ardından takipçi sayısına göre sıralanır.
export async function searchUsers(q: string) {
  const users = await prisma.user.findMany({
    where: {
      isSuspended: false,
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      _count: { select: { followers: true } },
    },
    take: 8,
  });
  // Sorguyla başlayan kullanıcı adlarını öne al, ardından takipçi sayısına göre sırala
  const lower = q.toLowerCase();
  users.sort((a, b) => {
    const ap = a.username.toLowerCase().startsWith(lower) ? 0 : 1;
    const bp = b.username.toLowerCase().startsWith(lower) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return b._count.followers - a._count.followers;
  });
  return users;
}
