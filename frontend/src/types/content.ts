// TMDB içerik tipi: film veya dizi
export type TmdbType = 'movie' | 'tv';
// TMDB arama kapsamı: film, dizi veya çoklu arama
export type TmdbScope = TmdbType | 'multi';
// Desteklenen dil kodları
export type Lang = 'tr-TR' | 'en-US';

// Bir film veya dizinin temel bilgilerini temsil eden arayüz
export interface ContentItem {
  id: number;
  type: TmdbType;
  title: string;                // Yerelleştirilmiş başlık
  originalTitle: string;        // Orijinal dildeki başlık
  overview: string;             // İçerik özeti
  posterPath: string | null;    // Poster görseli yolu
  backdropPath: string | null;  // Arka plan görseli yolu
  releaseDate: string | null;   // Yayın tarihi
  voteAverage: number;          // TMDB ortalama puanı (0-10)
  voteCount: number;            // TMDB oy sayısı
  popularity: number;           // TMDB popülerlik puanı
  genreIds: number[];           // Tür (genre) ID listesi
}

// Sayfalı içerik listesi yanıtı
export interface ContentPage {
  page: number;
  totalPages: number;
  totalResults: number;
  results: ContentItem[];
}

// Oyuncu kadrosu üyesi
export interface CastMember {
  id: number;
  name: string;                 // Oyuncunun gerçek adı
  character: string;            // Canlandırdığı karakter
  profilePath: string | null;   // Profil fotoğrafı yolu
}

// Video/fragman bilgisi
export interface VideoMeta {
  key: string;    // YouTube video anahtarı
  site: string;   // Video platformu (ör: YouTube)
  type: string;   // Video türü (ör: Trailer, Teaser)
  name: string;   // Video başlığı
}

// Film/dizi tür bilgisi
export interface Genre {
  id: number;
  name: string;
}

// İçeriğin detaylı bilgilerini içeren genişletilmiş arayüz
// Temel ContentItem'a ek olarak oyuncular, fragmanlar ve topluluk puanları içerir
export interface ContentDetail extends ContentItem {
  runtime: number | null;           // Süre (dakika cinsinden)
  tagline: string | null;           // Slogan/tagline
  genres: Genre[];                  // Tür listesi
  cast: CastMember[];               // Oyuncu kadrosu
  videos: VideoMeta[];               // Fragmanlar ve videolar
  contentId: string;                 // Sistemdeki içerik ID'si
  communityRating: number | null;    // SineFiles topluluk puanı
  communityReviewCount: number;      // Topluluk inceleme sayısı
  lastAirDate?: string | null;       // Diziler için son yayın tarihi
  status?: string;                   // Yayın durumu (ör: Returning Series)
  inProduction?: boolean;            // Yapım devam ediyor mu
}
