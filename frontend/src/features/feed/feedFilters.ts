// Akış (feed) filtrelerinin paylaşılan tip ve sabitleri.
// Bileşenlerden ayrı bir modülde tutulur ki Vite Fast Refresh sorunsuz çalışsın
// (bir dosya hem bileşen hem sabit/değer export ederse Fast Refresh bozulur).

export type FeedSource = 'popular' | 'following';
export type FeedSortKey = 'relevant' | 'newest' | 'mostLiked' | 'mostCommented';
export type FeedWindowKey = 'week' | 'month' | 'all';

// Zaman penceresi seçenekleri ve karşılık gelen gün sayıları
export const FEED_WINDOWS: { key: FeedWindowKey; days: number }[] = [
  { key: 'week', days: 7 },
  { key: 'month', days: 30 },
  { key: 'all', days: 3650 },
];

// Sıralama seçenekleri
export const FEED_SORTS: FeedSortKey[] = ['relevant', 'newest', 'mostLiked', 'mostCommented'];

export interface FeedFilterState {
  source: FeedSource;
  setSource: (s: FeedSource) => void;
  sort: FeedSortKey;
  setSort: (s: FeedSortKey) => void;
  windowKey: FeedWindowKey;
  setWindowKey: (w: FeedWindowKey) => void;
  // Viewer giriş yaptıysa "Takip Ettiklerin" kaynağı seçilebilir
  canFollow: boolean;
}
