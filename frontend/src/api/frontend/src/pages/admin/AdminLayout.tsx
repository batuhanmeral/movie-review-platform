import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  if (user?.role !== 'ADMIN') return <div className="p-8">Admin only</div>;

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-48 bg-surface-raised border-r border-white/10 p-4 space-y-2">
        <button onClick={() => nav('/admin')} className="block w-full text-left p-2 rounded hover:bg-white/10">📊 Dashboard</button>
        <button onClick={() => nav('/admin/users')} className="block w-full text-left p-2 rounded hover:bg-white/10">👥 Kullanıcılar</button>
        <button onClick={() => nav('/admin/content')} className="block w-full text-left p-2 rounded hover:bg-white/10">📽️ İçerik</button>
        <button onClick={() => { logout(); nav('/'); }} className="block w-full text-left p-2 rounded hover:bg-red-500/20 text-red-400 mt-4">🚪 Çıkış</button>
      </div>
      <div className="flex-1 overflow-auto p-8">
        <Outlet />
      </div>
    </div>
  );
}
