import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { poster } from '@/lib/tmdb';
import type { ListDetailResponse } from '@/api/lists.api';

interface Props {
  item: ListDetailResponse['items'][0];
  index: number;
  isDragging: boolean;
  canDrag: boolean;
}

export function SortableListItem({ item, index, isDragging, canDrag }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isItemDragging,
  } = useSortable({
    id: item.id,
    disabled: !canDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isItemDragging ? 0.5 : 1,
  };

  const posterUrl = item.content.posterPath
    ? poster(item.content.posterPath, 'w154')
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 rounded-lg bg-surface-raised p-4 ring-1 ring-white/10 transition-all ${
        isItemDragging ? 'ring-accent' : ''
      } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
    >
      {/* Sıra Numarası & Drag Handle */}
      <div className="flex flex-shrink-0 flex-col items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
          {index + 1}
        </div>
        {canDrag && (
          <div
            className="flex flex-col gap-0.5"
            {...attributes}
            {...listeners}
            title="Sürükle"
          >
            <div className="h-0.5 w-3 rounded-full bg-white/40" />
            <div className="h-0.5 w-3 rounded-full bg-white/40" />
            <div className="h-0.5 w-3 rounded-full bg-white/40" />
          </div>
        )}
      </div>

      {/* Poster */}
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

      {/* İçerik Bilgileri */}
      <div className="flex-1 min-w-0">
        <h3 className="truncate font-semibold text-ink">{item.content.title}</h3>
        {item.content.releaseDate && (
          <p className="text-xs text-ink-muted">
            {new Date(item.content.releaseDate).getFullYear()}
          </p>
        )}
        {item.note && (
          <p className="mt-1 truncate text-xs text-ink-muted italic">
            "{item.note}"
          </p>
        )}
      </div>

      {/* İçerik Türü Badge */}
      <div className="flex-shrink-0">
        <span className="inline-block rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          {item.content.type === 'MOVIE' ? '🎬 Film' : '📺 Dizi'}
        </span>
      </div>
    </div>
  );
}
