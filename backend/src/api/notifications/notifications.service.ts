import type { NotificationType } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { extractMentions } from '../../utils/mentions.js';

const PAGE_SIZE = 20;

// Bildirim kartında gösterilecek aktör (eylemi yapan kullanıcı) alanları
const actorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

interface CreateNotificationParams {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  title?: string | null;
  body?: string | null;
}

// Tek bir bildirim üretir.
// - Alıcı ile aktör aynıysa (kullanıcının kendi eylemi) bildirim üretilmez.
// - Hata sessizce yutulur: bildirim üretimi, tetikleyen ana işlemi
//   (beğeni/takip/yorum) asla bozmamalıdır.
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  if (params.actorId && params.actorId === params.recipientId) return;
  // İki taraftan biri diğerini engellemişse bildirim üretme
  if (params.actorId) {
    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: params.recipientId, blockedId: params.actorId },
          { blockerId: params.actorId, blockedId: params.recipientId },
        ],
      },
      select: { id: true },
    });
    if (blocked) return;
  }
  try {
    await prisma.notification.create({
      data: {
        recipientId: params.recipientId,
        actorId: params.actorId ?? null,
        type: params.type,
        entityType: params.entityType ?? null,
        entityId: params.entityId ?? null,
        title: params.title ?? null,
        body: params.body ?? null,
      },
    });
  } catch {
    // Bildirim üretimi başarısız olsa bile ana akış etkilenmemeli.
  }
}

// Metindeki @kullanıcı bahsetmeleri için MENTION bildirimi üretir.
// Kendine ve engellenen kullanıcılara bildirim createNotification içinde elenir.
// excludeUserIds: aynı olay için zaten başka bildirim alan kullanıcılar
// (ör. yorumda REVIEW_COMMENT alan inceleme sahibi) çift bildirimden korunur.
export async function notifyMentions(params: {
  actorId: string;
  text: string | null | undefined;
  entityType: string;
  entityId: string;
  excludeUserIds?: string[];
}): Promise<void> {
  const usernames = extractMentions(params.text);
  if (usernames.length === 0) return;
  const users = await prisma.user.findMany({
    where: {
      username: { in: usernames },
      ...(params.excludeUserIds?.length ? { id: { notIn: params.excludeUserIds } } : {}),
    },
    select: { id: true },
  });
  await Promise.all(
    users.map((u) =>
      createNotification({
        recipientId: u.id,
        actorId: params.actorId,
        type: 'MENTION',
        entityType: params.entityType,
        entityId: params.entityId,
      }),
    ),
  );
}

// Kullanıcının bildirimlerini sayfalı, yeniden eskiye listeler.
export async function listNotifications(userId: string, page = 1) {
  const take = PAGE_SIZE;
  const skip = (Math.max(1, page) - 1) * take;
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { actor: { select: actorSelect } },
    }),
    prisma.notification.count({ where: { recipientId: userId } }),
    prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
  ]);
  return { items, total, unread, page: Math.max(1, page), pageSize: take };
}

// Okunmamış bildirim sayısı (navbar rozeti için, polling ile sorgulanır).
export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: { recipientId: userId, isRead: false },
  });
  return { count };
}

// Tek bir bildirimi okundu olarak işaretler (yalnızca sahibi).
export async function markRead(userId: string, id: string) {
  const notif = await prisma.notification.findUnique({
    where: { id },
    select: { recipientId: true },
  });
  if (!notif) throw new NotFoundError('Bildirim bulunamadı');
  if (notif.recipientId !== userId) throw new ForbiddenError();
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
}

// Kullanıcının tüm okunmamış bildirimlerini okundu yapar.
export async function markAllRead(userId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { recipientId: userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: count };
}

// Tüm kullanıcılara ADMIN_ANNOUNCEMENT tipli duyuru bildirimi gönderir.
// Gönderen admin ve askıdaki hesaplar (giriş yapamadıkları için) hariç tutulur.
// Admin paneli "Duyurular" özelliği tarafından kullanılır.
export async function broadcastAnnouncement(params: {
  actorId: string;
  title: string;
  body: string;
}) {
  const recipients = await prisma.user.findMany({
    where: { isSuspended: false, id: { not: params.actorId } },
    select: { id: true },
  });
  if (recipients.length === 0) return { count: 0 };
  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      recipientId: r.id,
      actorId: params.actorId,
      type: 'ADMIN_ANNOUNCEMENT' as NotificationType,
      title: params.title,
      body: params.body,
    })),
  });
  return { count: recipients.length };
}
