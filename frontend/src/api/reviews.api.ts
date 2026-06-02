import { apiClient } from './client';
import type { Review, ReviewComment, ReviewPage, ReviewSort } from '@/types/review';

export interface PopularReview extends Review {
  content: {
    id: string;
    tmdbId: number;
    type: 'MOVIE' | 'TV';
    title: string;
    posterPath: string | null;
    releaseDate: string | null;
  };
}

export interface CreateReviewInput {
  contentId: string;
  rating: number;
  body?: string;
  containsSpoiler?: boolean;
}

export interface UpdateReviewInput {
  rating?: number;
  body?: string | null;
  containsSpoiler?: boolean;
}

export const reviewsApi = {
  popular: async (windowDays = 7, limit = 10): Promise<PopularReview[]> => {
    const { data } = await apiClient.get<PopularReview[]>('/reviews/popular', {
      params: { windowDays, limit },
    });
    return data;
  },

  // Takip edilen kullanıcıların incelemeleri (akış "Takip Ettiklerin" kaynağı)
  following: async (windowDays = 7, limit = 10): Promise<PopularReview[]> => {
    const { data } = await apiClient.get<PopularReview[]>('/reviews/following', {
      params: { windowDays, limit },
    });
    return data;
  },

  listForContent: async (
    contentId: string,
    sort: ReviewSort = 'newest',
    page = 1,
    limit = 10,
  ): Promise<ReviewPage> => {
    const { data } = await apiClient.get<ReviewPage>(`/content/${contentId}/reviews`, {
      params: { sort, page, limit },
    });
    return data;
  },

  myForContent: async (contentId: string): Promise<Review | null> => {
    const { data } = await apiClient.get<Review | null>(`/content/${contentId}/reviews/me`);
    return data;
  },

  create: async (input: CreateReviewInput): Promise<Review> => {
    const { data } = await apiClient.post<Review>('/reviews', input);
    return data;
  },

  update: async (id: string, input: UpdateReviewInput): Promise<Review> => {
    const { data } = await apiClient.put<Review>(`/reviews/${id}`, input);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/reviews/${id}`);
  },

  toggleLike: async (id: string): Promise<{ liked: boolean; likeCount: number }> => {
    const { data } = await apiClient.post<{ liked: boolean; likeCount: number }>(
      `/reviews/${id}/likes`,
    );
    return data;
  },

  listComments: async (reviewId: string): Promise<ReviewComment[]> => {
    const { data } = await apiClient.get<ReviewComment[]>(`/reviews/${reviewId}/comments`);
    return data;
  },

  addComment: async (reviewId: string, body: string): Promise<ReviewComment> => {
    const { data } = await apiClient.post<ReviewComment>(`/reviews/${reviewId}/comments`, { body });
    return data;
  },

  updateComment: async (commentId: string, body: string): Promise<ReviewComment> => {
    const { data } = await apiClient.put<ReviewComment>(`/reviews/comments/${commentId}`, { body });
    return data;
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/reviews/comments/${commentId}`);
  },
};
