import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/app/store';
import { authTokensUpdated, loggedOut, type AuthTokens } from '@/features/auth/authSlice';
import { getActiveCityId, isCityFilteredPath } from '@/features/locations/activeCity';
import type { ApiOk } from './types';

/**
 * Acepta VITE_API_URL con o sin el sufijo /api/v1 (algunas plataformas de hosting solo
 * permiten configurar el origen pelado del backend) y siempre termina apuntando a /api/v1,
 * sin duplicarlo si ya viene incluido.
 */
function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

const API_URL = resolveApiUrl();

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

// Con una ciudad activa, los listados del dashboard se piden filtrados (?cityId=). "Todas las
// ciudades" no manda nada. El backend solo estrecha el scope del usuario, nunca lo ensancha.
// Un `cityId` ya presente en los params (p. ej. el de un pedido que se está editando) manda sobre
// la ciudad activa y se respeta incluso con "Todas las ciudades".
function withCityFilter(args: string | FetchArgs): string | FetchArgs {
  const cityId = getActiveCityId();
  if (!cityId) return args;
  const request: FetchArgs = typeof args === 'string' ? { url: args } : args;
  const method = (request.method ?? 'GET').toUpperCase();
  if (method !== 'GET' || !isCityFilteredPath(request.url)) return args;
  const params = (request.params ?? {}) as Record<string, unknown>;
  if (params.cityId) return args;
  return { ...request, params: { ...params, cityId } };
}

// Evita disparar varios refresh en paralelo cuando varias queries fallan con 401 a la vez.
let refreshPromise: Promise<boolean> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const scopedArgs = withCityFilter(args);
  let result = await rawBaseQuery(scopedArgs, api, extraOptions);

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
        result = await rawBaseQuery(scopedArgs, api, extraOptions);
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
    'Raffle',
    'User',
    'Business',
    'BusinessHours',
    'BusinessClosure',
    'Product',
    'ProductOffer',
    'Category',
    'Subscription',
    'Deliverer',
    'Order',
    'Settlement',
    'Config',
    'Notification',
    'StaffInbox',
    'ProductProposal',
    'City',
    'FamiliaOrder',
  ],
  endpoints: () => ({}),
});
