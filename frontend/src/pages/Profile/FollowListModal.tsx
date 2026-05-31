import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usersApi, type FollowUser } from '@/api/users.api';
import { useAuthStore } from '@/features/auth/authStore';

// Takipçi / takip edilen listesini gösteren modal türü
export type FollowListKind = 'followers' | 'following';

interface FollowListModalProps {
  // Listesi gösterilecek profilin kullanıcı adı
  username: string;
  // 'followers' → takipçiler, 'following' → takip edilenler
  kind: FollowListKind;
  onClose: () => void;
}

// Profil sayfasındaki takipçi/takip sayaçlarına tıklanınca açılan modal.
// Arkası bulanıklaştırılmış (backdrop-blur) ortada küçük bir panel olarak görünür.
// Her satırda kullanıcı bilgisi ve (uygunsa) takip et/bırak butonu bulunur.
export function FollowListModal({ username, kind, onClose }: FollowListModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const viewer = useAuthStore((s) => s.user);

  // Escape tuşu ile kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const queryKey = ['follow-list', username, kind];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => (kind === 'followers' ? usersApi.followers(username) : usersApi.following(username)),
  });

  // Liste içinden takip et/bırak: dönen duruma göre ilgili satırı yerinde günceller
  const followMutation = useMutation({
    mutationFn: ({ targetUsername, isFollowing }: { targetUsername: string; isFollowing: boolean }) =>
      isFollowing ? usersApi.unfollow(targetUsername) : usersApi.follow(targetUsername),
    onSuccess: (result, variables) => {
      queryClient.setQueryData<FollowUser[]>(queryKey, (prev) =>
        prev?.map((u) =>
          u.username === variables.targetUsername ? { ...u, isFollowing: result.following } : u,
        ),
      );
      // Profil kartındaki sayaçlar değişmiş olabilir; profili tazele
      void queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
  });

  const title = kind === 'followers' ? t('profile.followers') : t('profile.following');

  // Portal ile doğrudan body'ye render edilir; böylece navbar'ın stacking
  // context'inden bağımsız olarak tüm sayfanın (navbar dahil) üzerini kaplar.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center bg-surface/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-xl bg-surface-raised shadow-card ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Başlık */}
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-display text-base font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('profile.close')}
            className="text-sm text-ink-muted hover:text-ink"
          >
            ✕
          </button>
        </header>

        {/* Liste içeriği */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">{t('profile.listLoading')}</p>
          ) : isError ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">{t('profile.listError')}</p>
          ) : !data || data.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              {kind === 'followers' ? t('profile.noFollowers') : t('profile.noFollowing')}
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {data.map((u) => {
                const initial = (u.displayName ?? u.username).charAt(0).toUpperCase();
                return (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar */}
                    <Link
                      to={`/u/${u.username}`}
                      onClick={onClose}
                      className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-cyan text-sm font-bold text-surface"
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initial
                      )}
                    </Link>
                    {/* İsim / kullanıcı adı */}
                    <Link to={`/u/${u.username}`} onClick={onClose} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{u.displayName ?? u.username}</p>
                      <p className="truncate text-xs text-ink-muted">@{u.username}</p>
                    </Link>
                    {/* Takip butonu: yalnızca giriş yapmış ve kendisi olmayan satırlarda */}
                    {viewer && !u.isSelf && (
                      <button
                        type="button"
                        onClick={() =>
                          followMutation.mutate({ targetUsername: u.username, isFollowing: u.isFollowing })
                        }
                        disabled={followMutation.isPending}
                        className={`${u.isFollowing ? 'btn-outline' : 'btn'} shrink-0 px-3 py-1 text-xs disabled:opacity-60`}
                      >
                        {u.isFollowing ? t('profile.unfollow') : t('profile.follow')}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
