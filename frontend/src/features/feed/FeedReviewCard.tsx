import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reviewsApi, type PopularReview } from '@/api/reviews.api';
import { useAuthStore } from '@/features/auth/authStore';
import { RatingStars } from '@/components/content/RatingStars';
import { CommentThread } from '@/features/reviews/CommentThread';
import { Dropdown, DropdownItem, dropdownItemClass } from '@/components/common/Dropdown';
import { poster } from '@/lib/tmdb';
import { timeAgo } from '@/lib/timeAgo';

// Bu uzunluğun üzerindeki incelemeler "Devamını Gör" ile kısaltılır
const READ_MORE_THRESHOLD = 280;

interface Props {
  review: PopularReview;
}

// Sosyal akıştaki tek bir gönderi kartı.
// Mevcut primitifleri (RatingStars, CommentThread, poster, toggleLike) birleştirir;
// üstüne film başlığı, göreceli zaman, spoiler/devamını gör ve paylaş/"..." menülerini ekler.
export function FeedReviewCard({ review }: Props) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);

  const [showSpoiler, setShowSpoiler] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  // Buton-içi geçici geri bildirim (toast altyapısı yok)
  const [toast, setToast] = useState<'copied' | 'reposted' | 'reported' | null>(null);

  const like = useMutation({
    mutationFn: () => reviewsApi.toggleLike(review.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const { user, content } = review;
  const initial = (user.displayName || user.username).charAt(0).toUpperCase();
  const detailHref = `/${content.type === 'MOVIE' ? 'movie' : 'tv'}/${content.tmdbId}`;
  const profileHref = `/u/${user.username}`;
  const posterUrl = poster(content.posterPath, 'w185');
  const year = content.releaseDate ? new Date(content.releaseDate).getFullYear() : null;
  const lang = i18n.resolvedLanguage ?? 'en';

  const body = review.body ?? '';
  const isLong = body.length > READ_MORE_THRESHOLD;
  const spoilerHidden = review.containsSpoiler && !showSpoiler;

  const flash = (kind: 'copied' | 'reposted' | 'reported') => {
    setToast(kind);
    setTimeout(() => setToast((cur) => (cur === kind ? null : cur)), 1800);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${detailHref}`;
    try {
      await navigator.clipboard.writeText(url);
      flash('copied');
    } catch {
      // Pano erişimi yoksa sessizce geç
    }
  };

  return (
    <article className="card animate-lift-in space-y-3 transition-all duration-300 hover:shadow-glow hover:ring-accent/20">
      {/* HEADER — kullanıcı bilgisi + aksiyon menüsü */}
      <header className="flex items-center gap-3">
        <Link to={profileHref} className="shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-cyan font-semibold text-surface">
              {initial}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={profileHref}
            className="block truncate text-sm font-semibold text-ink hover:text-accent"
          >
            {user.displayName || user.username}
          </Link>
          <p className="truncate text-xs text-ink-muted">
            @{user.username} · <time dateTime={review.createdAt}>{timeAgo(review.createdAt, lang)}</time>
          </p>
        </div>

        <Dropdown
          align="right"
          triggerLabel={t('feed.menu')}
          triggerClassName="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          trigger={<DotsIcon className="h-5 w-5" />}
        >
          {(close) => (
            <>
              <Link to={profileHref} className={dropdownItemClass} onClick={close} role="menuitem">
                <UserIcon className="h-4 w-4" /> {t('feed.viewProfile')}
              </Link>
              <Link to={detailHref} className={dropdownItemClass} onClick={close} role="menuitem">
                <FilmIcon className="h-4 w-4" /> {t('feed.goToFilm')}
              </Link>
              <DropdownItem
                onClick={() => {
                  void copyLink();
                  close();
                }}
              >
                <LinkIcon className="h-4 w-4" /> {t('feed.copyLink')}
              </DropdownItem>
              <DropdownItem
                danger
                onClick={() => {
                  flash('reported');
                  close();
                }}
              >
                <FlagIcon className="h-4 w-4" /> {t('feed.report')}
              </DropdownItem>
            </>
          )}
        </Dropdown>
      </header>

      {/* BODY — film bilgisi + inceleme */}
      <div className="flex gap-4">
        <Link to={detailHref} className="shrink-0">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={content.title}
              className="h-28 w-[4.5rem] rounded-lg object-cover ring-1 ring-white/10 transition-transform hover:scale-[1.03] sm:h-32 sm:w-20"
              loading="lazy"
            />
          ) : (
            <div className="grid h-28 w-[4.5rem] place-items-end rounded-lg bg-gradient-to-br from-surface-muted to-surface-raised p-2 ring-1 ring-white/10 sm:h-32 sm:w-20">
              <span className="line-clamp-3 text-xs font-semibold text-ink">{content.title}</span>
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Link
              to={detailHref}
              className="font-display text-lg font-bold leading-tight text-ink hover:text-accent"
            >
              {content.title}
            </Link>
            {year && <span className="text-sm text-ink-muted">{year}</span>}
          </div>
          <div className="mt-1.5">
            <RatingStars value={review.rating} showValue />
          </div>

          {body && (
            <div className="mt-2.5 text-sm leading-relaxed text-ink/90">
              {spoilerHidden ? (
                <SpoilerBlock
                  body={body}
                  label={t('feed.spoilerReveal')}
                  onReveal={() => setShowSpoiler(true)}
                />
              ) : (
                <>
                  <p
                    className={`whitespace-pre-wrap break-words ${
                      !expanded && isLong ? 'line-clamp-4' : ''
                    }`}
                  >
                    {body}
                  </p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => !s)}
                      className="mt-1 text-xs font-semibold text-accent hover:underline"
                    >
                      {expanded ? t('feed.readLess') : t('feed.readMore')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER — etkileşim barı */}
      <footer className="flex items-center gap-1 border-t border-white/5 pt-3 text-sm text-ink-muted">
        {/* Beğen */}
        <button
          type="button"
          disabled={!me || like.isPending}
          onClick={() => like.mutate()}
          className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${
            review.likedByMe ? 'text-rating-low' : 'hover:bg-surface-muted hover:text-ink'
          }`}
          aria-label={t('feed.like')}
          aria-pressed={review.likedByMe}
        >
          <HeartIcon
            filled={review.likedByMe}
            className="h-5 w-5 transition-transform duration-150 group-active:scale-90"
          />
          <span className="tabular-nums">{review.likeCount}</span>
        </button>

        {/* Yorum */}
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-surface-muted hover:text-ink ${
            showComments ? 'text-accent' : ''
          }`}
          aria-label={t('feed.comment')}
          aria-expanded={showComments}
        >
          <CommentIcon className="h-5 w-5" />
          <span className="tabular-nums">{review.commentCount}</span>
        </button>

        {/* Paylaş */}
        <Dropdown
          align="right"
          triggerLabel={t('feed.share')}
          triggerClassName="flex items-center gap-2 rounded-lg px-3 py-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          trigger={<ShareIcon className="h-5 w-5" />}
        >
          {(close) => (
            <>
              <DropdownItem
                onClick={() => {
                  void copyLink();
                  close();
                }}
              >
                <LinkIcon className="h-4 w-4" /> {t('feed.copyLink')}
              </DropdownItem>
              <DropdownItem
                disabled={!me}
                onClick={() => {
                  flash('reposted');
                  close();
                }}
              >
                <RepostIcon className="h-4 w-4" /> {t('feed.repost')}
              </DropdownItem>
            </>
          )}
        </Dropdown>

        {/* Buton-içi geçici geri bildirim */}
        {toast && (
          <span
            className="ml-auto animate-fade-in pr-1 text-xs font-medium text-accent"
            role="status"
          >
            {t(`feed.${toast}`)}
          </span>
        )}
      </footer>

      {/* Açılır yorumlar sekmesi */}
      {showComments && <CommentThread reviewId={review.id} />}
    </article>
  );
}

// Spoiler içeren metni bulanık gösterir; tıklamayla açar.
function SpoilerBlock({
  body,
  label,
  onReveal,
}: {
  body: string;
  label: string;
  onReveal: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg">
      <p className="line-clamp-4 select-none whitespace-pre-wrap break-words blur-sm" aria-hidden="true">
        {body}
      </p>
      <button
        type="button"
        onClick={onReveal}
        className="absolute inset-0 grid place-items-center rounded-lg bg-surface/40 backdrop-blur-[2px] transition-colors hover:bg-surface/25"
      >
        <span className="flex items-center gap-1.5 rounded-full bg-surface/85 px-3 py-1.5 text-xs font-semibold text-rating-mid ring-1 ring-white/10">
          <EyeIcon className="h-3.5 w-3.5" /> {label}
        </span>
      </button>
    </div>
  );
}

/* — Inline ikonlar (projede ikon kütüphanesi yok) — */

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function HeartIcon({ filled, className }: { filled?: boolean; className?: string }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
      </svg>
    );
  }
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
      <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
    </svg>
  );
}

function CommentIcon({ className }: { className?: string }) {
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
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8 8.38 8.38 0 0 1 8.5-8.5A8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
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
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.7-1.7" />
    </svg>
  );
}

function RepostIcon({ className }: { className?: string }) {
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
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
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
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function FilmIcon({ className }: { className?: string }) {
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
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <path d="M7 3v18M17 3v18M2 9h5M2 15h5M17 9h5M17 15h5" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
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
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
