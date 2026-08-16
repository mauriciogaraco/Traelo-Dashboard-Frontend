import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/app/store';
import { authTokensUpdated, loggedOut, type AuthTokens } from '@/features/auth/authSlice';
import type { ApiOk } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Evita disparar varios refresh en paralelo cuando varias queries fallan con 401 a la vez.
let refreshPromise: Promise<boolean> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const url = typeof args === 'string' ? args : args.url;
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');
    const refreshToken = (api.getState() as RootState).auth.refreshToken;

    if (refreshToken && !isAuthEndpoint) {
      refreshPromise ??= (async () => {
        const refreshResult = await rawBaseQuery(
          { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
          api,
          extraOptions,
        );

        if (refreshResult.data) {
          const tokens = (refreshResult.data as ApiOk<AuthTokens>).data;
          api.dispatch(authTokensUpdated(tokens));
          return true;
        }

        api.dispatch(loggedOut());
        return false;
      })().finally(() => {
        refreshPromise = null;
      });

      const refreshed = await refreshPromise;
      if (refreshed) {
        result = await rawBaseQuery(args, api, extraOptions);
      }
    } else {
      api.dispatch(loggedOut());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Business',
    'Product',
    'Subscription',
    'Deliverer',
    'Order',
    'Settlement',
    'Config',
  ],
  endpoints: () => ({}),
});
