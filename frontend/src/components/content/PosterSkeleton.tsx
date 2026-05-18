interface Props {
  count?: number; // Oluşturulacak iskelet sayısı
}

// Poster yükleme iskeleti (skeleton) bileşeni
// İçerikler yüklenirken gösterilen animasyonlu yer tutucu
// Poster kartıyla aynı boyut oranına (2:3) sahiptir
export function PosterSkeleton({ count = 1 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] animate-pulse rounded-lg bg-gradient-to-br from-surface-raised to-surface-muted ring-1 ring-white/5"
        />
      ))}
    </>
  );
}
