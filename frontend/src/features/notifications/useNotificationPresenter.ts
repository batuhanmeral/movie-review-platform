import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/authStore';
import type { NotificationItem } from '@/types/notification';

// Bildirim mesaj metni ve hedef bağlantısını üreten ortak yardımcı.
// NotificationBell (navbar) ve NotificationsPage (tam sayfa) tarafından paylaşılır.
export function useNotificationPresenter() {
  const { t } = useTranslation();
  const username = useAuthStore((s) => s.user?.username);

  const messageFor = (n: NotificationItem): string => {
    const name = n.actor?.displayName || n.actor?.username || t('notifications.someone');
    switch (n.type) {
      case 'NEW_FOLLOWER':
        return t('notifications.msg.newFollower', { name });
      case 'REVIEW_LIKE':
        return t('notifications.msg.reviewLike', { name });
      case 'REVIEW_COMMENT':
        return t('notifications.msg.reviewComment', { name });
      case 'LIST_LIKE':
        return t('notifications.msg.listLike', { name });
      case 'MENTION':
        return t('notifications.msg.mention', { name });
      case 'ADMIN_ANNOUNCEMENT':
        return n.title || t('notifications.msg.announcement');
      default:
        return '';
    }
  };

  const linkFor = (n: NotificationItem): string | null => {
    // İnceleme kaynaklı bildirimler ilgili incelemenin içerik sayfasına gider
    // (/review/:id, ReviewRedirectPage üzerinden içerik detayına çevrilir).
    const reviewLink =
      n.entityType === 'review' && n.entityId ? `/review/${n.entityId}` : null;
    switch (n.type) {
      case 'NEW_FOLLOWER':
        return n.actor ? `/u/${n.actor.username}` : null;
      case 'MENTION':
        return reviewLink ?? (n.actor ? `/u/${n.actor.username}` : null);
      case 'REVIEW_LIKE':
      case 'REVIEW_COMMENT':
        return reviewLink ?? (username ? `/u/${username}/reviews` : null);
      case 'LIST_LIKE':
        return n.entityId ? `/lists/${n.entityId}` : null;
      default:
        return null;
    }
  };

  return { messageFor, linkFor };
}
