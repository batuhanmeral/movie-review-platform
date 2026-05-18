import { RatingStars } from '@/components/content/RatingStars';

// İnceleme kartı verisi için arayüz tanımı (statik/mock veriler için)
export interface ReviewCardData {
  id: string;
  user: { username: string; displayName: string; avatarColor?: string };
  movie: { title: string; year: number; posterGradient?: string };
  rating: number;
  body: string;
  likes: number;
  createdAt: string;
}

// Ana sayfadaki inceleme kartı bileşeni
// Kullanıcı avatarı, film posteri, puan, inceleme metni ve beğeni sayısını gösterir
export function ReviewCard({ review }: { review: ReviewCardData }) {
  // Kullanıcı adının ilk harfini avatar olarak kullan
  const avatarInitial = review.user.displayName.charAt(0).toUpperCase();

  return (
    <article className="card-hover flex gap-4">
      {/* Film poster yer tutucusu (gradient ile) */}
      <div
        className={`hidden h-24 w-16 shrink-0 rounded-md ring-1 ring-white/10 sm:block ${
          review.movie.posterGradient ?? 'bg-gradient-to-br from-surface-muted to-surface-raised'
        }`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        {/* Kullanıcı bilgileri ve puan */}
        <header className="flex items-center gap-3">
          {/* Avatar - gradient renkli daire */}
          <div
            className={`grid h-9 w-9 place-items-center rounded-full font-semibold text-surface ${
              review.user.avatarColor ?? 'bg-gradient-to-br from-accent to-accent-cyan'
            }`}
          >
            {avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{review.user.displayName}</p>
            <p className="truncate text-xs text-ink-muted">@{review.user.username}</p>
          </div>
          <RatingStars value={review.rating} size="sm" showValue />
        </header>

        {/* İnceleme metni (en fazla 3 satır) */}
        <p className="mt-3 text-sm text-ink/90 line-clamp-3">{review.body}</p>

        {/* Alt bilgi: film adı, yıl, beğeni sayısı ve tarih */}
        <footer className="mt-3 flex items-center justify-between text-xs text-ink-muted">
          <span>
            <span className="font-semibold text-ink">{review.movie.title}</span> ·{' '}
            {review.movie.year}
          </span>
          <span className="flex items-center gap-3">
            {/* Beğeni sayısı */}
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
              </svg>
              {review.likes}
            </span>
            <span>{review.createdAt}</span>
          </span>
        </footer>
      </div>
    </article>
  );
}
