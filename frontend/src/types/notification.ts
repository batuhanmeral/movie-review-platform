// Bildirim türleri — backend Prisma NotificationType enum'u ile birebir
export type NotificationType =
  | 'NEW_FOLLOWER'
  | 'REVIEW_LIKE'
  | 'REVIEW_COMMENT'
  | 'LIST_LIKE'
  | 'MENTION'
  | 'ADMIN_ANNOUNCEMENT';

// Bildirimi tetikleyen kullanıcı (sistem/duyuru bildirimlerinde null)
export interface NotificationActor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actor: NotificationActor | null;
  entityType: string | null; // "review" | "list" | "user"
  entityId: string | null;
  title: string | null; // ADMIN_ANNOUNCEMENT için
  body: string | null; // ADMIN_ANNOUNCEMENT için
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
}
