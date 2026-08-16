import { KeyRound, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useLogoutMutation } from '@/features/auth/authApi';
import { loggedOut } from '@/features/auth/authSlice';
import { ROLE_LABEL } from '@/lib/labels';

export function Topbar() {
  const user = useAppSelector((state) => state.auth.user);
  const refreshToken = useAppSelector((state) => state.auth.refreshToken);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  async function handleLogout() {
    if (refreshToken) {
      try {
        await logout({ refreshToken }).unwrap();
      } catch {
        // El logout local procede aunque falle la revocación remota.
      }
    }
    dispatch(loggedOut());
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
        )}
        <Link
          to="/change-password"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <KeyRound className="h-4 w-4" />
          Contraseña
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </div>
    </header>
  );
}
