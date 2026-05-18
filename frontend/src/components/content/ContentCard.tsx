import { Link } from 'react-router-dom';
import { RatingStars } from './RatingStars';
import { poster } from '@/lib/tmdb';
import type { ContentItem } from '@/types/content';

// Bileşen prop tanımları
interface Props {
  item: ContentItem;
  showType?: boolean; // Film/Dizi etiketi gösterilsin mi
}

// Film veya dizi poster kartı bileşeni
// Poster görseli, başlık, yıl ve puan bilgilerini gösterir
// Tıklandığında içerik detay sayfasına yönlendirir
export function ContentCard({ item, showType = false }: Props) {
  const posterUrl = poster(item.posterPath, 'w342');
  // Yayın tarihinden yıl bilgisini çıkar
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
  // 10 üzerinden puanı 5 üzerinden puana dönüştür
  const fiveStar = item.voteAverage ? +(item.voteAverage / 2).toFixed(1) : 0;

  return (
    <Link to={`/${item.type}/${item.id}`} className="poster group block" aria-label={item.title}>
      {/* Poster görseli veya poster yoksa başlık gösterimi */}
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={item.title}
          className="poster-img group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-end bg-gradient-to-br from-surface-muted to-surface-raised p-4">
          <span className="font-display text-xl font-extrabold text-ink line-clamp-3">
            {item.title}
          </span>
        </div>
      )}

      {/* Poster üzerindeki gradient kaplama */}
      <div className="poster-overlay group-hover:opacity-100" />

      {/* Film/Dizi türü etiketi (opsiyonel) */}
      {showType && (
        <span className="absolute left-2 top-2 rounded-full bg-surface/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted backdrop-blur">
          {item.type === 'movie' ? 'Film' : 'Dizi'}
        </span>
      )}

      {/* Posterin alt kısmındaki başlık, yıl ve puan bilgileri */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink">{item.title}</h3>
            {year && <p className="text-xs text-ink-muted">{year}</p>}
          </div>
          {fiveStar > 0 && <RatingStars value={fiveStar} size="sm" />}
        </div>
      </div>
    </Link>
  );
}
