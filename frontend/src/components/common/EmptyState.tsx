import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  // Üstte gösterilecek ikon/emoji (opsiyonel)
  icon?: ReactNode;
  title: string;
  description?: string;
  // Opsiyonel çağrı-aksiyon: iç bağlantı (to) veya buton (onClick)
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

// Liste/feed/arama gibi boş alanlar için tutarlı boş-durum ekranı.
export function EmptyState({ icon, title, description, actionLabel, actionTo, onAction }: Props) {
  const action = actionLabel ? (
    actionTo ? (
      <Link
        to={actionTo}
        className="inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent/90"
      >
        {actionLabel}
      </Link>
    ) : (
      <button
        type="button"
        onClick={onAction}
        className="inline-block rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-accent/90"
      >
        {actionLabel}
      </button>
    )
  ) : null;

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-surface-raised px-6 py-14 text-center">
      {icon && <div className="mb-3 text-4xl opacity-80">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
