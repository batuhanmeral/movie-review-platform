import { apiClient } from './client';
import type { ContentDetail, ContentPage, Genre, Lang, TmdbScope, TmdbType } from '@/types/content';

// i18n dil kodunu TMDB API'nin beklediği dil formatına dönüştürür
function langFromI18n(i18nLang: string | undefined): Lang {
  return i18nLang?.startsWith('en') ? 'en-US' : 'tr-TR';
}

// Keşfet sayfasındaki filtreleme seçenekleri için arayüz
export interface DiscoverFilters {
  type?: TmdbType;
  page?: number;
  language?: Lang;
  year?: number;
  genre?: number;
  minRating?: number;
  sortBy?:
    | 'popularity.desc'
    | 'vote_average.desc'
    | 'vote_count.desc'
    | 'release_date.desc'
    | 'primary_release_date.desc';
}

// İçerik (film/dizi) ile ilgili tüm API çağrılarını içeren nesne
export const contentApi = {
  // Film/dizi arama - metin sorgusuyla TMDB'de arama yapar
  search: async (q: string, type: TmdbScope, language: Lang, page = 1) => {
    const { data } = await apiClient.get<ContentPage>('/content/search', {
      params: { q, type, language, page },
    });
    return data;
  },

  // Trend içerikleri getirir (günlük veya haftalık)
  trending: async (type: 'movie' | 'tv' | 'all', window: 'day' | 'week', language: Lang) => {
    const { data } = await apiClient.get<ContentPage>('/content/trending', {
      params: { type, window, language },
    });
    return data;
  },

  // Popüler içerikleri getirir (sayfalı)
  popular: async (type: TmdbType, language: Lang, page = 1) => {
    const { data } = await apiClient.get<ContentPage>('/content/popular', {
      params: { type, language, page },
    });
    return data;
  },

  // Yakında vizyona girecek filmleri getirir
  upcoming: async (language: Lang, page = 1) => {
    const { data } = await apiClient.get<ContentPage>('/content/upcoming', {
      params: { language, page },
    });
    return data;
  },

  // Çeşitli filtrelere göre (yıl, tür, puan, sıralama) içerik keşfetme
  discover: async (filters: DiscoverFilters) => {
    const { data } = await apiClient.get<ContentPage>('/content/discover', {
      params: { type: 'movie', page: 1, language: 'tr-TR', sortBy: 'popularity.desc', ...filters },
    });
    return data;
  },

  // Belirli bir içeriğin detay bilgilerini getirir (oyuncular, fragmanlar vb.)
  detail: async (type: TmdbType, tmdbId: number, language: Lang) => {
    const { data } = await apiClient.get<ContentDetail>(`/content/${type}/${tmdbId}`, {
      params: { language },
    });
    return data;
  },

  // Film veya dizi türlerinin (genre) listesini getirir
  genres: async (type: TmdbType, language: Lang) => {
    const { data } = await apiClient.get<Genre[]>('/content/genres', {
      params: { type, language },
    });
    return data;
  },
};

export { langFromI18n };
