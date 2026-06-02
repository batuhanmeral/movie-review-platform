import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { poster } from '@/lib/tmdb';
import type { ListItemDetail } from '@/api/lists.api';

interface Props {
  item: ListItemDetail;
  index: number;
  canDrag: boolean;
}

// Liste detayındaki tek bir içerik satırı. dnd-kit ile sürükle-bırak destekler;
// canDrag false ise (sahibi değilsen) sürükleme devre dışıdır.
export function SortableListItem({ item, index, canDrag }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const posterUrl = item.content.posterPath ? poster(item.content.posterPath, 'w154') : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 rounded-lg bg-surface-raised p-4 ring-1 ring-white/10 transition-all ${
        isDragging ? 'ring-accent' : ''
      } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
    >
      <div className="flex flex-shrink-0 flex-col items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
          {index + 1}
        </div>
        {canDrag && (
          <div className="flex flex-col gap-0.5" title="Sürükle">
            <div className="h-0.5 w-3 rounded-full bg-white/40" />
            <div className="h-0.5 w-3 rounded-full bg-white/40" />
            <div className="h-0.5 w-3 rounded-full bg-white/40" />
          </div>
        )}
      </div>

      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.content.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-surface-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-ink">{item.content.title}</h3>
        {item.content.releaseDate && (
          <p className="text-xs text-ink-muted">
            {new Date(item.content.releaseDate).getFullYear()}
          </p>
        )}
        {item.note && (
          <p className="mt-1 truncate text-xs italic text-ink-muted">"{item.note}"</p>
        )}
      </div>

      <div className="flex-shrink-0">
        <span className="inline-block rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          {item.content.type === 'MOVIE' ? '🎬 Film' : '📺 Dizi'}
        </span>
      </div>
    </div>
  );
}
