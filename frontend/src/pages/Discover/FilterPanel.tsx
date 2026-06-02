import { useTranslation } from 'react-i18next';
import type { Genre, TmdbType } from '@/types/content';

// Keşfet arama kapsamı: yapımlar, kişiler veya kullanıcılar
export type DiscoverScope = 'titles' | 'people' | 'users';
// Kişi meslek (departman) filtresi
export type PersonDept = 'all' | 'Acting' | 'Directing' | 'Production';

// Keşfet sayfası filtre değerleri arayüzü
export interface DiscoverFilterValues {
  // Hangi sonuç türü gösteriliyor (sol panelden seçilir)
  scope: DiscoverScope;
  type: TmdbType;
  year?: number;
  genre?: number;
  minRating?: number;
  sortBy:
    | 'popularity.desc'
    | 'vote_average.desc'
    | 'vote_count.desc'
    | 'release_date.desc'
    | 'primary_release_date.desc';
  // Kişiler kapsamı için meslek filtresi
  personDept: PersonDept;
}

interface Props {
  values: DiscoverFilterValues;
  onChange: (next: DiscoverFilterValues) => void;
  genres: Genre[];
}

// Şu anki yıldan başlayarak geriye doğru 60 yıllık bir liste oluştur
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => currentYear - i);

// Keşfet sayfasının sol panelindeki filtreleme bileşeni
// Kapsam (yapımlar/kişiler/kullanıcılar) seçimi + ilgili filtreler
export function FilterPanel({ values, onChange, genres }: Props) {
  const { t } = useTranslation();
  // Kısayol: tek bir filtre alanını güncelle
  const set = <K extends keyof DiscoverFilterValues>(k: K, v: DiscoverFilterValues[K]) =>
    onChange({ ...values, [k]: v });

  return (
    <aside className="card sticky top-20 space-y-5 self-start">
      {/* Panel başlığı */}
      <div>
        <h3 className="text-base font-semibold text-ink">{t('discover.filters.title')}</h3>
        <p className="mt-1 text-xs text-ink-muted">{t('discover.filters.subtitle')}</p>
      </div>

      {/* Kapsam seçimi: Yapımlar / Kişiler / Kullanıcılar */}
      <Field label={t('discover.filters.scope')}>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface p-1 ring-1 ring-white/5">
          {(['titles', 'people', 'users'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set('scope', s)}
              className={
                'rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ' +
                (values.scope === s ? 'bg-accent text-surface' : 'text-ink-muted hover:text-ink')
              }
            >
              {t(`discover.filters.scope_${s}`)}
            </button>
          ))}
        </div>
      </Field>

      {/* Kişiler kapsamı: meslek filtresi */}
      {values.scope === 'people' && (
        <Field label={t('discover.filters.department')}>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-1 ring-1 ring-white/5">
            {(['all', 'Acting', 'Directing', 'Production'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set('personDept', d)}
                className={
                  'rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ' +
                  (values.personDept === d ? 'bg-accent text-surface' : 'text-ink-muted hover:text-ink')
                }
              >
                {d === 'all' ? t('discover.filters.any') : t(`person.departments.${d}`)}
              </button>
            ))}
          </div>
        </Field>
      )}

      {/* İçerik (yapım) filtreleri — yalnızca "Yapımlar" kapsamında gösterilir.
          Kişiler/Kullanıcılar seçiliyse tamamen gizlenir. */}
      {values.scope === 'titles' && (
      <div className="space-y-5">
        {/* İçerik türü seçimi: Film / Dizi */}
        <Field label={t('discover.filters.type')}>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-1 ring-1 ring-white/5">
            {(['movie', 'tv'] as const).map((tt) => (
              <button
                key={tt}
                type="button"
                onClick={() => set('type', tt)}
                className={
                  'rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ' +
                  (values.type === tt ? 'bg-accent text-surface' : 'text-ink-muted hover:text-ink')
                }
              >
                {tt === 'movie' ? t('discover.filters.movies') : t('discover.filters.shows')}
              </button>
            ))}
          </div>
        </Field>

        {/* Sıralama seçimi */}
        <Field label={t('discover.filters.sortBy')}>
          <select
            className="input"
            value={values.sortBy}
            onChange={(e) => set('sortBy', e.target.value as DiscoverFilterValues['sortBy'])}
          >
            <option value="popularity.desc">{t('discover.filters.sortPopularity')}</option>
            <option value="vote_average.desc">{t('discover.filters.sortRating')}</option>
            <option value="vote_count.desc">{t('discover.filters.sortMostRated')}</option>
            <option value={values.type === 'movie' ? 'primary_release_date.desc' : 'release_date.desc'}>
              {t('discover.filters.sortRecent')}
            </option>
          </select>
        </Field>

        {/* Yıl filtresi */}
        <Field label={t('discover.filters.year')}>
          <select className="input" value={values.year ?? ''} onChange={(e) => set('year', e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">{t('discover.filters.any')}</option>
            {YEARS.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </Field>

        {/* Tür (genre) filtresi */}
        <Field label={t('discover.filters.genre')}>
          <select className="input" value={values.genre ?? ''} onChange={(e) => set('genre', e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">{t('discover.filters.any')}</option>
            {genres.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
          </select>
        </Field>

        {/* Minimum puan kaydırıcısı */}
        <Field label={`${t('discover.filters.minRating')} ${values.minRating ?? '–'}`}>
          <input
            type="range" min="0" max="9" step="1"
            value={values.minRating ?? 0}
            onChange={(e) => set('minRating', Number(e.target.value) === 0 ? undefined : Number(e.target.value))}
            className="w-full accent-accent"
          />
        </Field>
      </div>
      )}

      {/* Filtreleri sıfırla butonu */}
      <button
        type="button"
        onClick={() => onChange({ scope: values.scope, type: values.type, sortBy: 'popularity.desc', personDept: 'all' })}
        className="btn-ghost w-full"
      >
        {t('discover.filters.reset')}
      </button>
    </aside>
  );
}

// Form alanı sarmalayıcı bileşeni - etiket ve içeriği gruplar
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
