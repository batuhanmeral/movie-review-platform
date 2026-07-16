import { useTranslation } from 'react-i18next';
import { providerLogo } from '@/lib/tmdb';
import type { WatchProvider, WatchProviders as WatchProvidersData } from '@/types/content';

interface WatchProvidersProps {
  data: WatchProvidersData;
}

// Tek bir platform rozeti: logo + isim. Tıklanabilir olduğunda TMDB'nin
// ülkeye özel "nerede izlenir" sayfasına gider.
function ProviderBadge({ provider, link }: { provider: WatchProvider; link: string | null }) {
  const logo = providerLogo(provider.logoPath, 'w92');

  const inner = (
    <>
      {logo ? (
        <img
          src={logo}
          alt=""
          className="h-8 w-8 rounded-md object-cover ring-1 ring-white/10"
          loading="lazy"
        />
      ) : (
        <span className="grid h-8 w-8 place-items-center rounded-md bg-surface-raised text-xs font-semibold text-ink-muted ring-1 ring-white/10">
          {provider.name.slice(0, 2)}
        </span>
      )}
      <span className="text-sm text-ink">{provider.name}</span>
    </>
  );

  const className =
    'flex items-center gap-2 rounded-full bg-surface-raised py-1 pl-1 pr-3 ring-1 ring-white/5 transition hover:ring-white/20';

  if (!link) {
    return <span className={className}>{inner}</span>;
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={provider.name}
    >
      {inner}
    </a>
  );
}

// Tek bir kategori satırı (abonelik / kiralama / satın alma)
function ProviderGroup({
  label,
  providers,
  link,
}: {
  label: string;
  providers: WatchProvider[];
  link: string | null;
}) {
  if (providers.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs uppercase tracking-wide text-ink-muted">{label}</span>
      {providers.map((p) => (
        <ProviderBadge key={p.providerId} provider={p} link={link} />
      ))}
    </div>
  );
}

/**
 * "Nerede İzlenir" bölümü — içeriğin kullanıcının ülkesindeki yasal izleme
 * seçeneklerini gösterir. Veri JustWatch üzerinden TMDB'ye gelir; TMDB'nin
 * kullanım koşulları kaynak belirtmeyi gerektirir.
 */
export function WatchProviders({ data }: WatchProvidersProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-6">
      <h2 className="font-display text-lg font-bold text-ink">{t('content.whereToWatch')}</h2>
      <div className="mt-3 space-y-2">
        <ProviderGroup
          label={t('content.providers.flatrate')}
          providers={data.flatrate}
          link={data.link}
        />
        <ProviderGroup label={t('content.providers.rent')} providers={data.rent} link={data.link} />
        <ProviderGroup label={t('content.providers.buy')} providers={data.buy} link={data.link} />
      </div>
      <p className="mt-2 text-xs text-ink-muted">{t('content.providers.source')}</p>
    </div>
  );
}
