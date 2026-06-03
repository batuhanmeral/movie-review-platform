import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ListDetailResponse } from '@/api/lists.api';
import { listDisplayName } from '@/features/list/listLabels';

interface Props {
  list: ListDetailResponse;
  onToggleLike: () => void;
  isLiking: boolean;
  canShare: boolean;
}

// Liste tipine göre rozet emojisi
const typeEmoji: Record<ListDetailResponse['type'], string> = {
  WATCHED: '✅',
  WATCHLIST: '📋',
  FAVORITES: '❤️',
  CUSTOM: '📌',
};

// Liste detay sayfasının üst başlığı: başlık, oluşturan kişi (profile link),
// tür/görünürlük rozetleri, beğeni ve paylaş butonları, opsiyonel kapak görseli
export function ListHeader({ list, onToggleLike, isLiking, canShare }: Props) {
  const { t } = useTranslation();
  const [showShareMenu, setShowShareMenu] = useState(false);

  const shareUrl = `${window.location.origin}/lists/${list.id}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Bağlantı kopyalandı!');
    } catch (err) {
      console.error('Kopyalama başarısız:', err);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-raised">
      <div className="px-6 py-8">
        <div className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-ink">{listDisplayName(list, t)}</h1>

              {/* Oluşturan kişi — adı + kullanıcı adı, tıklayınca profile gider */}
              <Link
                to={`/u/${list.user.username}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-accent"
              >
                <span className="font-medium text-ink">
                  {list.user.displayName ?? list.user.username}
                </span>
                <span>@{list.user.username}</span>
              </Link>

              <p className="mt-2 text-sm text-ink-muted">
                {typeEmoji[list.type]} {t(`list.types.${list.type}`)}
                {' • '}
                {list.visibility === 'PUBLIC'
                  ? `🌐 ${t('list.public')}`
                  : `🔒 ${t('list.private')}`}
                {' • '}
                {t('list.items', { count: list.items.length })}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Beğeni Butonu */}
              <button
                onClick={onToggleLike}
                disabled={isLiking}
                className="flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-all hover:bg-accent/20 disabled:opacity-50"
              >
                <span>{list.likedByMe ? '❤️' : '🤍'}</span>
                <span>{list.likeCount}</span>
              </button>

              {/* Paylaş Butonu */}
              {canShare && (
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-ink transition-all hover:bg-white/20"
                  >
                    📤 Paylaş
                  </button>

                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-2 rounded-lg border border-white/10 bg-surface-raised p-3 shadow-lg">
                      <p className="mb-2 text-xs font-semibold text-ink-muted">
                        Bu listeyi paylaş
                      </p>

                      <div className="mb-2 flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareUrl}
                          className="flex-1 rounded border border-white/10 bg-surface px-2 py-1 text-xs text-ink"
                        />
                        <button
                          onClick={copyToClipboard}
                          className="rounded bg-accent/20 px-2 py-1 text-xs text-accent hover:bg-accent/30"
                        >
                          Kopyala
                        </button>
                      </div>

                      <div className="flex gap-2 border-t border-white/10 pt-2">
                        <a
                          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${list.title} listesine göz at!`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 rounded bg-white/5 px-2 py-1 text-center text-xs text-ink-muted hover:bg-white/10"
                        >
                          Twitter
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {list.coverImage && (
          <div className="mt-6 h-40 overflow-hidden rounded-xl">
            <img src={list.coverImage} alt={list.title} className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
