import { apiClient } from './client';

export type Role = 'USER' | 'ADMIN';
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';

export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: Role;
  isSuspended: boolean;
  createdAt: string;
  _count: { reviews: number; followers: number };
}
export interface AdminUsersResponse {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminContentRow {
  id: string;
  title: string;
  type: 'MOVIE' | 'TV';
  posterPath: string | null;
  releaseDate: string | null;
  _count: { reviews: number };
}
export interface AdminContentResponse {
  content: AdminContentRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  users: number;
  content: number;
  reviews: number;
  lists: number;
  comments: number;
  pendingReports: number;
}

export interface SeriesPoint {
  date: string;
  count: number;
}
export interface TopContent {
  id: string;
  title: string;
  type: 'MOVIE' | 'TV';
  posterPath: string | null;
  reviewCount: number;
}
export interface TopUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  reviewCount: number;
  followerCount: number;
}
export interface StatsResponse {
  totals: DashboardStats;
  signupsSeries: SeriesPoint[];
  reviewsSeries: SeriesPoint[];
  topContent: TopContent[];
  topUsers: TopUser[];
}

export interface AdminReport {
  id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  reporter: { id: string; username: string; displayName: string | null } | null;
  review: {
    id: string;
    body: string | null;
    isFlagged: boolean;
    user: { id: string; username: string };
    content: { id: string; title: string };
  } | null;
  comment: {
    id: string;
    body: string;
    isFlagged: boolean;
    user: { id: string; username: string };
    review: { id: string; content: { id: string; title: string } };
  } | null;
}
export interface ReportsResponse {
  reports: AdminReport[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLogRow {
  id: string;
  adminId: string;
  adminUsername: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: unknown;
  createdAt: string;
}
export interface AuditResponse {
  logs: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface UsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: Role;
  suspended?: 'true' | 'false';
}

export const adminApi = {
  dashboard: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<DashboardStats>('/admin/dashboard');
    return data;
  },
  stats: async (): Promise<StatsResponse> => {
    const { data } = await apiClient.get<StatsResponse>('/admin/stats');
    return data;
  },
  users: async (params: UsersParams = {}): Promise<AdminUsersResponse> => {
    const { data } = await apiClient.get<AdminUsersResponse>('/admin/users', { params });
    return data;
  },
  updateRole: async (id: string, role: Role): Promise<void> => {
    await apiClient.patch(`/admin/users/${id}/role`, { role });
  },
  suspend: async (id: string, suspended: boolean): Promise<void> => {
    await apiClient.patch(`/admin/users/${id}/suspend`, { suspended });
  },
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/users/${id}`);
  },
  content: async (params: { page?: number; pageSize?: number; search?: string } = {}): Promise<
    AdminContentResponse
  > => {
    const { data } = await apiClient.get<AdminContentResponse>('/admin/content', { params });
    return data;
  },
  deleteContent: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/content/${id}`);
  },
  reports: async (
    params: { page?: number; pageSize?: number; status?: ReportStatus } = {},
  ): Promise<ReportsResponse> => {
    const { data } = await apiClient.get<ReportsResponse>('/admin/reports', { params });
    return data;
  },
  updateReport: async (id: string, status: Exclude<ReportStatus, 'PENDING'>): Promise<void> => {
    await apiClient.patch(`/admin/reports/${id}`, { status });
  },
  deleteReportedReview: async (reviewId: string): Promise<void> => {
    await apiClient.delete(`/admin/reports/reviews/${reviewId}`);
  },
  deleteReportedComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/admin/reports/comments/${commentId}`);
  },
  bulkUsers: async (ids: string[], action: 'suspend' | 'unsuspend'): Promise<{ updated: number }> => {
    const { data } = await apiClient.post<{ updated: number }>('/admin/users/bulk', { ids, action });
    return data;
  },
  bulkDeleteContent: async (ids: string[]): Promise<{ deleted: number }> => {
    const { data } = await apiClient.post<{ deleted: number }>('/admin/content/bulk', { ids });
    return data;
  },
  exportUsers: async (): Promise<string> => {
    const { data } = await apiClient.get('/admin/users/export', { responseType: 'text' });
    return data as string;
  },
  exportContent: async (): Promise<string> => {
    const { data } = await apiClient.get('/admin/content/export', { responseType: 'text' });
    return data as string;
  },
  announce: async (title: string, body: string): Promise<{ count: number }> => {
    const { data } = await apiClient.post<{ count: number }>('/admin/announcements', {
      title,
      body,
    });
    return data;
  },
  audit: async (params: { page?: number; pageSize?: number } = {}): Promise<AuditResponse> => {
    const { data } = await apiClient.get<AuditResponse>('/admin/audit', { params });
    return data;
  },
};
