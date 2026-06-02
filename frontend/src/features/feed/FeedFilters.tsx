import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

// — Filtre tipleri ve sabitleri (FeedPage ile paylaşılır) —
export type FeedSource = 'popular' | 'following';
export type FeedSortKey = 'relevant' | 'newest' | 'mostLiked' | 'mostCommented';
export type FeedWindowKey = 'week' | 'month' | 'all';

export const FEED_WINDOWS: { key: FeedWindowKey; days: number }[] = [
  { key: 'week', days: 7 },
  { key: 'month', days: 30 },
  { key: 'all', days: 3650 },
];

const FEED_SORTS: FeedSortKey[] = ['relevant', 'newest', 'mostLiked', 'mostCommented'];

export interface FeedFilterState {
  source: FeedSource;
  setSource: (s: FeedSource) => void;
  sort: FeedSortKey;
  setSort: (s: FeedSortKey) => void;
  windowKey: FeedWindowKey;
  setWindowKey: (w: FeedWindowKey) => void;
  // Viewer giriş yaptıysa "Takip Ettiklerin" kaynağı seçilebilir
  canFollow: boolean;
}

// Sol kenar rayı: kaynak + sıralama + zaman filtreleri (lg+ ekranlarda).
export function FeedFilters(props: FeedFilterState) {
  const { t } = useTranslation();
  const { source, setSource, sort, setSort, windowKey, setWindowKey, canFollow } = props;

  return (
    <div className="card space-y-5">
      <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
        <FilterIcon className="h-4 w-4 text-accent" />
        {t('feed.filters.title')}
      </h2>

      {/* Kaynak */}
      <Section label={t('feed.filters.source')}>
        <div className="space-y-1">
          <OptionRow active={source === 'popular'} onClick={() => setSource('popular')}>
            {t('feed.source.popular')}
          </OptionRow>
          {/* Takip akışı yalnızca giriş yapan kullanıcılar için */}
          <OptionRow
            active={source === 'following'}
            disabled={!canFollow}
            onClick={() => setSource('following')}
          >
            {t('feed.source.following')}
          </OptionRow>
          {!canFollow && (
            <p className="px-3 pt-0.5 text-[11px] text-ink-dim">{t('feed.loginForFollowing')}</p>
          )}
        </div>
      </Section>

      {/* Sıralama */}
      <Section label={t('feed.filters.sort')}>
        <div className="space-y-1">
          {FEED_SORTS.map((s) => (
            <OptionRow key={s} active={sort === s} onClick={() => setSort(s)}>
              {t(`feed.sort.${s}`)}
            </OptionRow>
          ))}
        </div>
      </Section>

      {/* Zaman */}
      <Section label={t('feed.filters.time')}>
        <WindowSegmented value={windowKey} onChange={setWindowKey} />
      </Section>
    </div>
  );
}

// Mobil/tablet (<lg) için kompakt yatay filtre çubuğu.
export function MobileFeedBar({
  sort,
  setSort,
  windowKey,
  setWindowKey,
}: Pick<FeedFilterState, 'sort' | 'setSort' | 'windowKey' | 'setWindowKey'>) {
  const { t } = useTranslation();
  return (
    <div className="card flex flex-wrap items-center gap-3">
      <WindowSegmented value={windowKey} onChange={setWindowKey} />
      <label className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
        {t('feed.filters.sort')}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as FeedSortKey)}
          className="rounded-lg border border-white/10 bg-surface-raised px-2.5 py-1.5 text-sm font-medium text-ink focus:border-accent focus:outline-none"
        >
          {FEED_SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`feed.sort.${s}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

// — Yardımcı sunum bileşenleri —

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      {children}
    </div>
  );
}

function OptionRow({
  active = false,
  disabled = false,
  onClick,
  badge,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'bg-accent/15 font-semibold text-accent'
          : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
      }`}
      aria-pressed={active}
    >
      <span className="truncate">{children}</span>
      {badge}
    </button>
  );
}

function WindowSegmented({
  value,
  onChange,
}: {
  value: FeedWindowKey;
  onChange: (w: FeedWindowKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex gap-1 rounded-lg bg-surface-raised p-1 ring-1 ring-white/5"
      role="tablist"
    >
      {FEED_WINDOWS.map((w) => (
        <button
          key={w.key}
          type="button"
          role="tab"
          aria-selected={value === w.key}
          onClick={() => onChange(w.key)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === w.key
              ? 'bg-accent text-surface shadow-glow'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          {t(`feed.window.${w.key}`)}
        </button>
      ))}
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}
