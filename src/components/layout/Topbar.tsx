import { KeyRound, LogOut, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useLogoutMutation } from '@/features/auth/authApi';
import { loggedOut } from '@/features/auth/authSlice';
import { ROLE_LABEL } from '@/lib/labels';

interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps) {
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
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6">
      <div className="flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Abrir menú"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-display text-xs font-bold text-white">
          T
        </span>
      </div>
      <div className="hidden sm:block" />
      <div className="flex items-center gap-2 sm:gap-4">
        {user && (
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
        )}
        <Link
          to="/change-password"
          title="Contraseña"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 sm:px-3"
        >
          <KeyRound className="h-4 w-4" />
          <span className="hidden sm:inline">Contraseña</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          title="Salir"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 sm:px-3"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
