import type { ReviewCardData } from '@/components/review/ReviewCard';

// İleride gerçek inceleme akışıyla değiştirilecek; şimdilik
// ana sayfanın "Arkadaşlarından Son İncelemeler" bölümünü dolduruyor.
// Bu mock veriler geliştirme aşamasında UI'ı test etmek için kullanılır

export const recentReviews: ReviewCardData[] = [
  {
    id: 'r1',
    user: {
      username: 'mert',
      displayName: 'Mert Yıldız',
      avatarColor: 'bg-gradient-to-br from-fuchsia-500 to-purple-600',
    },
    movie: {
      title: 'Dune: Part Two',
      year: 2024,
      posterGradient: 'bg-gradient-to-br from-amber-700 to-orange-900',
    },
    rating: 4.5,
    body: 'Görsel olarak nefes kesici. Villeneuve, çölü bir karakter haline getiriyor; ses tasarımı sinemada deneyimlenmesi gereken cinsten.',
    likes: 124,
    createdAt: '2 saat önce',
  },
  {
    id: 'r2',
    user: {
      username: 'leyla',
      displayName: 'Leyla A.',
      avatarColor: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
    movie: {
      title: 'Past Lives',
      year: 2023,
      posterGradient: 'bg-gradient-to-br from-sky-700 to-indigo-950',
    },
    rating: 5,
    body: 'Yıllarca aklımda kalacak tarzda bir film. Sessizliklerin bu kadar konuştuğu az film vardır; final sahnesi adeta bir zaman makinesi.',
    likes: 89,
    createdAt: '5 saat önce',
  },
  {
    id: 'r3',
    user: {
      username: 'kerem',
      displayName: 'Kerem D.',
      avatarColor: 'bg-gradient-to-br from-orange-500 to-rose-600',
    },
    movie: {
      title: 'Poor Things',
      year: 2023,
      posterGradient: 'bg-gradient-to-br from-fuchsia-700 to-indigo-950',
    },
    rating: 3,
    body: 'Cesur, garip ve renkli. Lanthimos formülünden hoşlananlar için fazlasıyla tatmin edici, ama herkes için değil.',
    likes: 42,
    createdAt: 'Dün',
  },
];
