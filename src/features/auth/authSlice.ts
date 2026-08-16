import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserDTO } from '@/lib/types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
}

const STORAGE_KEY = 'traelo.auth';

function loadInitialState(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { user: null, accessToken: null, refreshToken: null };
    }
    return JSON.parse(raw) as AuthState;
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function persist(state: AuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadInitialState(),
  reducers: {
    credentialsSet(state, action: PayloadAction<AuthTokens & { user: UserDTO }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persist(state);
    },
    authTokensUpdated(state, action: PayloadAction<AuthTokens>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persist(state);
    },
    loggedOut(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { credentialsSet, authTokensUpdated, loggedOut } = authSlice.actions;
export default authSlice.reducer;
