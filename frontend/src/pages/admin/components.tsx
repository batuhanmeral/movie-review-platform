import type { ReactNode } from 'react';

// Sayfa başlığı + opsiyonel açıklama ve sağ aksiyon alanı
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// İstatistik kartı
export function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        highlight
          ? 'border-accent/40 bg-accent/5'
          : 'border-white/5 bg-surface-raised hover:border-white/10'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-dim">{hint}</p>}
    </div>
  );
}

type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'accent';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-white/10 text-ink-muted',
  success: 'bg-emerald-500/15 text-emerald-300',
  danger: 'bg-rose-500/15 text-rose-300',
  warning: 'bg-amber-500/15 text-amber-300',
  accent: 'bg-accent/15 text-accent',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

// Tablo sarmalayıcı — tutarlı kenarlık/kaydırma; içine <thead>/<tbody> verilir
export function AdminTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-surface-raised">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 bg-white/5 text-left text-xs uppercase tracking-wide text-ink-muted">
            {head}
          </thead>
          <tbody className="divide-y divide-white/5">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

// Tablo boş-durum satırı
export function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-ink-muted">
        {label}
      </td>
    </tr>
  );
}

// Sayfalama kontrolleri
export function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
      <span>
        {total} kayıt · sayfa {page}/{lastPage}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md border border-white/10 px-3 py-1.5 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Önceki
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= lastPage}
          className="rounded-md border border-white/10 px-3 py-1.5 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sonraki →
        </button>
      </div>
    </div>
  );
}

// Basit arama girişi
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-xs rounded-md border border-white/10 bg-surface px-3 py-2 text-sm text-ink
                 placeholder:text-ink-dim focus:border-accent focus:outline-none"
    />
  );
}

// CSS tabanlı basit çubuk grafik (son N günlük seri)
export function BarSeries({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-xl border border-white/5 bg-surface-raised p-4">
      <p className="mb-3 text-sm font-semibold text-ink">{label}</p>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">Veri yok</p>
      ) : (
        <div className="flex h-32 items-end gap-1">
          {data.map((d) => (
            <div key={d.date} className="group flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t bg-accent/60 transition-colors group-hover:bg-accent"
                style={{ height: `${(d.count / max) * 100}%` }}
                title={`${d.date}: ${d.count}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
