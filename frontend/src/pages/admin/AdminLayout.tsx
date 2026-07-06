import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

// Admin kenar çubuğu navigasyon öğeleri
const navItems = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/users', label: 'Kullanıcılar', icon: '👥' },
  { to: '/admin/content', label: 'İçerik', icon: '🎬' },
  { to: '/admin/moderation', label: 'Moderasyon', icon: '🛡️' },
  { to: '/admin/stats', label: 'İstatistikler', icon: '📈' },
  { to: '/admin/announcements', label: 'Duyurular', icon: '📣' },
  { to: '/admin/audit', label: 'Denetim Kaydı', icon: '🧾' },
] as const;

export function AdminLayout() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const nav = useNavigate();

  return (
    <div className="flex min-h-screen bg-surface text-ink">
      {/* Kenar çubuğu */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/5 bg-surface-raised">
        <div className="border-b border-white/5 px-5 py-4">
          <Link to="/" className="font-display text-lg font-black">
            <span className="bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent">
              CINE
            </span>
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-500 bg-clip-text text-transparent">
              REVIEWS
            </span>
          </Link>
          <p className="mt-0.5 text-xs text-ink-muted">Yönetim Paneli</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent/15 text-accent' : 'text-ink-muted hover:bg-white/5 hover:text-ink'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-3">
          <div className="mb-2 px-3 text-xs text-ink-dim">
            {user?.displayName ?? user?.username}
          </div>
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-white/5 hover:text-ink"
          >
            ↩︎ Siteye dön
          </Link>
          <button
            type="button"
            onClick={() => {
              void logout();
              nav('/');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10"
          >
            🚪 Çıkış
          </button>
        </div>
      </aside>

      {/* İçerik */}
      <main className="flex-1 overflow-auto p-6 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
