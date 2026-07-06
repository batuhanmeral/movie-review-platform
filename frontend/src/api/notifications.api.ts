import { apiClient } from './client';
import type { NotificationListResponse } from '@/types/notification';

export const notificationsApi = {
  // Sayfalı bildirim listesi (yeniden eskiye)
  list: async (page = 1): Promise<NotificationListResponse> => {
    const { data } = await apiClient.get<NotificationListResponse>('/notifications', {
      params: { page },
    });
    return data;
  },

  // Okunmamış bildirim sayısı (navbar rozeti — polling)
  unreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },

  // Tek bildirimi okundu işaretle
  markRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`);
  },

  // Tüm bildirimleri okundu işaretle
  markAllRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};
