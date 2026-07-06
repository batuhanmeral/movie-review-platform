import { Prisma, type Role, type ReportStatus } from '@prisma/client';
import { prisma } from '../../config/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { toCsv } from '../../utils/csv.js';
import { broadcastAnnouncement } from '../notifications/notifications.service.js';
import type {
  AnnouncementInput,
  ContentQuery,
  ReportsQuery,
  UsersQuery,
  AuditQuery,
} from './admin.validator.js';

// --- Denetim kaydı yardımcısı --------------------------------------------
// Her admin aksiyonu (rol değişimi, askı, silme, rapor çözme, duyuru) burada
// AuditLog'a yazılır. Hata durumunda ana işlemi bozmamak için yutulur.
async function writeAudit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { adminId, action, targetType, targetId, metadata },
    });
  } catch {
    // denetim kaydı başarısızsa sessizce geç
  }
}

// Hedef kullanıcının sistemdeki son AKTİF (askıda olmayan) ADMIN olup
// olmadığını döndürür. Askıdaki adminler sayılmaz; aksi halde "2 admin var
// ama biri askıda" durumunda kalan admin silinip panel kilitlenebilirdi.
async function isLastAdmin(userId: string): Promise<boolean> {
  const adminCount = await prisma.user.count({
    where: { role: 'ADMIN', isSuspended: false },
  });
  if (adminCount > 1) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isSuspended: true },
  });
  return user?.role === 'ADMIN' && !user.isSuspended;
}

// --- Dashboard & İstatistikler -------------------------------------------

export async function getDashboard() {
  const [users, content, reviews, lists, comments, pendingReports] = await Promise.all([
    prisma.user.count(),
    prisma.content.count(),
    prisma.review.count(),
    prisma.list.count(),
    prisma.reviewComment.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
  ]);
  return { users, content, reviews, lists, comments, pendingReports };
}

export async function getStats() {
  const [totals, signups, reviewsSeries, topContent, topUsers] = await Promise.all([
    getDashboard(),
    // Son 30 günün günlük kayıt sayısı
    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::int AS count
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day ASC;`,
    // Son 30 günün günlük inceleme sayısı
    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', "createdAt")::date AS day, COUNT(*)::int AS count
      FROM "Review"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day ASC;`,
    // En çok incelenen içerikler
    prisma.content.findMany({
      take: 8,
      orderBy: { reviews: { _count: 'desc' } },
      select: {
        id: true,
        title: true,
        type: true,
        posterPath: true,
        _count: { select: { reviews: true } },
      },
    }),
    // En çok inceleme yazan kullanıcılar
    prisma.user.findMany({
      take: 8,
      orderBy: { reviews: { _count: 'desc' } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        _count: { select: { reviews: true, followers: true } },
      },
    }),
  ]);

  const toSeries = (rows: { day: Date; count: number }[]) =>
    rows.map((r) => ({ date: new Date(r.day).toISOString().slice(0, 10), count: Number(r.count) }));

  return {
    totals,
    signupsSeries: toSeries(signups),
    reviewsSeries: toSeries(reviewsSeries),
    topContent: topContent.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      posterPath: c.posterPath,
      reviewCount: c._count.reviews,
    })),
    topUsers: topUsers.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      reviewCount: u._count.reviews,
      followerCount: u._count.followers,
    })),
  };
}

// --- Kullanıcı yönetimi ---------------------------------------------------

export async function listUsers(query: UsersQuery) {
  const { page, pageSize, search, role, suspended } = query;
  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (suspended) where.isSuspended = suspended === 'true';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        _count: { select: { reviews: true, followers: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, pageSize };
}

export async function updateUserRole(adminId: string, id: string, role: Role) {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  // Son admini USER'a düşürmeyi engelle (kilitlenme önlemi)
  if (user.role === 'ADMIN' && role === 'USER' && (await isLastAdmin(id))) {
    throw new BadRequestError('Son admin kullanıcının rolü düşürülemez');
  }
  await prisma.user.update({ where: { id }, data: { role } });
  await writeAudit(adminId, 'USER_ROLE_CHANGED', 'user', id, { role });
  return { ok: true };
}

export async function setUserSuspended(adminId: string, id: string, suspended: boolean) {
  if (id === adminId) throw new BadRequestError('Kendi hesabınızı askıya alamazsınız');
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  // Son aktif admini askıya almayı engelle (panel kilitlenme önlemi)
  if (suspended && user.role === 'ADMIN' && (await isLastAdmin(id))) {
    throw new BadRequestError('Son aktif admin askıya alınamaz');
  }
  await prisma.user.update({ where: { id }, data: { isSuspended: suspended } });
  await writeAudit(adminId, suspended ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED', 'user', id);
  return { ok: true };
}

export async function deleteUser(adminId: string, id: string) {
  if (id === adminId) throw new BadRequestError('Kendi hesabınızı silemezsiniz');
  const user = await prisma.user.findUnique({ where: { id }, select: { username: true } });
  if (!user) throw new NotFoundError('Kullanıcı bulunamadı');
  if (await isLastAdmin(id)) throw new BadRequestError('Son admin kullanıcı silinemez');
  await prisma.user.delete({ where: { id } });
  await writeAudit(adminId, 'USER_DELETED', 'user', id, { username: user.username });
  return { ok: true };
}

// --- İçerik yönetimi ------------------------------------------------------

export async function listContent(query: ContentQuery) {
  const { page, pageSize, search } = query;
  const where: Prisma.ContentWhereInput = search
    ? { title: { contains: search, mode: 'insensitive' } }
    : {};

  const [content, total] = await Promise.all([
    prisma.content.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { reviews: { _count: 'desc' } },
      select: {
        id: true,
        title: true,
        type: true,
        posterPath: true,
        releaseDate: true,
        _count: { select: { reviews: true } },
      },
    }),
    prisma.content.count({ where }),
  ]);

  return { content, total, page, pageSize };
}

export async function deleteContent(adminId: string, id: string) {
  const content = await prisma.content.findUnique({ where: { id }, select: { title: true } });
  if (!content) throw new NotFoundError('İçerik bulunamadı');
  await prisma.content.delete({ where: { id } });
  await writeAudit(adminId, 'CONTENT_DELETED', 'content', id, { title: content.title });
  return { ok: true };
}

// --- Toplu işlemler & dışa aktarma ---------------------------------------

// Birden çok kullanıcıyı topluca askıya alır/kaldırır (kendini hariç tutar).
// Askıya alma yönünde ADMIN hesaplar da hariç tutulur: adminler yalnızca
// tekil uçtan (son-aktif-admin korumasıyla) askıya alınabilir.
export async function bulkSetUsersSuspended(adminId: string, ids: string[], suspended: boolean) {
  const targetIds = ids.filter((id) => id !== adminId);
  if (targetIds.length === 0) return { updated: 0 };
  const { count } = await prisma.user.updateMany({
    where: { id: { in: targetIds }, ...(suspended ? { role: 'USER' as Role } : {}) },
    data: { isSuspended: suspended },
  });
  await writeAudit(
    adminId,
    suspended ? 'USERS_BULK_SUSPENDED' : 'USERS_BULK_UNSUSPENDED',
    'user',
    'bulk',
    { ids: targetIds, count },
  );
  return { updated: count };
}

// Birden çok içeriği topluca siler.
export async function bulkDeleteContent(adminId: string, ids: string[]) {
  const { count } = await prisma.content.deleteMany({ where: { id: { in: ids } } });
  await writeAudit(adminId, 'CONTENT_BULK_DELETED', 'content', 'bulk', { ids, count });
  return { deleted: count };
}

// Tüm kullanıcıları CSV olarak dışa aktarır. E-posta (PII) içerdiğinden
// diğer admin aksiyonları gibi denetim kaydına yazılır.
export async function exportUsersCsv(adminId: string): Promise<string> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      email: true,
      displayName: true,
      role: true,
      isSuspended: true,
      createdAt: true,
    },
  });
  await writeAudit(adminId, 'USERS_EXPORTED', 'user', 'all', { count: users.length });
  return toCsv(
    ['id', 'username', 'email', 'displayName', 'role', 'isSuspended', 'createdAt'],
    users.map((u) => [
      u.id,
      u.username,
      u.email,
      u.displayName,
      u.role,
      String(u.isSuspended),
      u.createdAt.toISOString(),
    ]),
  );
}

// Tüm içerikleri CSV olarak dışa aktarır.
export async function exportContentCsv(adminId: string): Promise<string> {
  const content = await prisma.content.findMany({
    orderBy: { popularity: 'desc' },
    select: { id: true, tmdbId: true, type: true, title: true, releaseDate: true },
  });
  await writeAudit(adminId, 'CONTENT_EXPORTED', 'content', 'all', { count: content.length });
  return toCsv(
    ['id', 'tmdbId', 'type', 'title', 'releaseDate'],
    content.map((c) => [
      c.id,
      c.tmdbId,
      c.type,
      c.title,
      c.releaseDate ? c.releaseDate.toISOString().slice(0, 10) : '',
    ]),
  );
}

// --- Moderasyon (Raporlar) ------------------------------------------------

export async function listReports(query: ReportsQuery) {
  const { page, pageSize, status } = query;
  const where: Prisma.ReportWhereInput = status ? { status } : {};

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, username: true, displayName: true } },
        review: {
          select: {
            id: true,
            body: true,
            isFlagged: true,
            user: { select: { id: true, username: true } },
            content: { select: { id: true, title: true } },
          },
        },
        comment: {
          select: {
            id: true,
            body: true,
            isFlagged: true,
            user: { select: { id: true, username: true } },
            review: { select: { id: true, content: { select: { id: true, title: true } } } },
          },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return { reports, total, page, pageSize };
}

export async function updateReport(adminId: string, id: string, status: ReportStatus) {
  const report = await prisma.report.findUnique({ where: { id }, select: { id: true } });
  if (!report) throw new NotFoundError('Rapor bulunamadı');
  const resolved = status === 'RESOLVED' || status === 'DISMISSED';
  await prisma.report.update({
    where: { id },
    data: { status, resolvedAt: resolved ? new Date() : null },
  });
  await writeAudit(adminId, 'REPORT_UPDATED', 'report', id, { status });
  return { ok: true };
}

// Raporlanan incelemeyi siler ve ilgili raporları çözüldü olarak işaretler.
export async function deleteReportedReview(adminId: string, reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) throw new NotFoundError('İnceleme bulunamadı');
  await prisma.report.updateMany({
    where: { reviewId, status: { in: ['PENDING', 'REVIEWED'] } },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  await prisma.review.delete({ where: { id: reviewId } });
  await writeAudit(adminId, 'REVIEW_DELETED', 'review', reviewId);
  return { ok: true };
}

// Raporlanan yorumu siler ve ilgili raporları çözüldü olarak işaretler.
export async function deleteReportedComment(adminId: string, commentId: string) {
  const comment = await prisma.reviewComment.findUnique({
    where: { id: commentId },
    select: { id: true },
  });
  if (!comment) throw new NotFoundError('Yorum bulunamadı');
  await prisma.report.updateMany({
    where: { commentId, status: { in: ['PENDING', 'REVIEWED'] } },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  await prisma.reviewComment.delete({ where: { id: commentId } });
  await writeAudit(adminId, 'COMMENT_DELETED', 'comment', commentId);
  return { ok: true };
}

// --- Duyurular ------------------------------------------------------------

export async function createAnnouncement(adminId: string, input: AnnouncementInput) {
  const result = await broadcastAnnouncement({
    actorId: adminId,
    title: input.title,
    body: input.body,
  });
  await writeAudit(adminId, 'ANNOUNCEMENT_SENT', 'broadcast', adminId, {
    title: input.title,
    recipients: result.count,
  });
  return result;
}

// --- Denetim kaydı --------------------------------------------------------

export async function listAuditLogs(query: AuditQuery) {
  const { page, pageSize } = query;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count(),
  ]);

  // Admin kullanıcı adlarını tek sorguda zenginleştir
  const adminIds = [...new Set(logs.map((l) => l.adminId))];
  const admins = await prisma.user.findMany({
    where: { id: { in: adminIds } },
    select: { id: true, username: true },
  });
  const adminMap = new Map(admins.map((a) => [a.id, a.username]));

  return {
    logs: logs.map((l) => ({ ...l, adminUsername: adminMap.get(l.adminId) ?? null })),
    total,
    page,
    pageSize,
  };
}
