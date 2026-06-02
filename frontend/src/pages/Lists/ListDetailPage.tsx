import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { listsApi } from '@/api/lists.api';
import { ListHeader } from '@/components/lists/ListHeader';
import { ListOwnerCard } from '@/components/lists/ListOwnerCard';
import { SortableListItem } from '@/components/lists/SortableListItem';

// Tek bir listenin detay sayfası (/lists/:listId).
// Liste sahibi öğeleri sürükle-bırak ile yeniden sıralayabilir; herkes beğenebilir/paylaşabilir.
export default function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const queryClient = useQueryClient();

  const {
    data: list,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['list', listId],
    queryFn: () => listsApi.getListDetail(listId!),
    enabled: !!listId,
  });

  // Sıralama güncelleme — başarıda liste cache'i tazelenir
  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; position: number }[]) =>
      listsApi.reorderListItems(listId!, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
    },
  });

  // Beğen/beğeniyi kaldır
  const toggleLikeMutation = useMutation({
    mutationFn: () => listsApi.toggleListLike(listId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list', listId] });
    },
  });

  // dnd-kit sensörleri (fare + klavye erişilebilirliği)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !list) return;

    const oldIndex = list.items.findIndex((item) => item.id === active.id);
    const newIndex = list.items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Yeni sıralamayı hesapla ve pozisyonları 0'dan başlat
    const reordered = arrayMove(list.items, oldIndex, newIndex).map((item, index) => ({
      id: item.id,
      position: index,
    }));
    reorderMutation.mutate(reordered);
  };

  if (isLoading) {
    return <div className="p-8 text-ink-muted">Yükleniyor…</div>;
  }

  if (error || !list) {
    return <div className="p-8 text-ink-muted">Liste yüklenemedi.</div>;
  }

  const canEdit = list.isOwner;
  const canShare = list.visibility === 'PUBLIC';

  return (
    <div className="min-h-screen bg-surface">
      <ListHeader
        list={list}
        onToggleLike={() => toggleLikeMutation.mutate()}
        isLiking={toggleLikeMutation.isPending}
        canShare={canShare}
      />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <ListOwnerCard user={list.user} />
        </div>

        {list.description && (
          <div className="mb-8">
            <p className="leading-relaxed text-ink-muted">{list.description}</p>
          </div>
        )}

        <div>
          <h2 className="mb-4 text-lg font-semibold text-ink">
            İçerikler ({list.items.length})
          </h2>

          {list.items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-surface-raised p-8 text-center">
              <p className="text-ink-muted">Bu liste henüz boş</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={list.items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
                disabled={!canEdit || reorderMutation.isPending}
              >
                <div className="space-y-3">
                  {list.items.map((item, index) => (
                    <SortableListItem
                      key={item.id}
                      item={item}
                      index={index}
                      canDrag={canEdit && !reorderMutation.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {reorderMutation.isPending && (
          <div className="mt-4 text-center text-sm text-ink-muted">Sıralama güncelleniyor…</div>
        )}
      </div>
    </div>
  );
}
