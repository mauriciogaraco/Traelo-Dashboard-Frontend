import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, Role, UserDTO } from '@/lib/types';

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  role?: Role;
  // "active" solo admite el valor true: el backend interpreta cualquier string
  // no vacío (incluido "false") como verdadero por Boolean(), así que ese filtro
  // se resuelve del lado del cliente en UsersPage.
  active?: true;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  active?: boolean;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<ApiPaginated<UserDTO>, ListUsersParams | void>({
      query: (params) => ({ url: '/users', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((user) => ({ type: 'User' as const, id: user.id })),
              { type: 'User' as const, id: 'LIST' },
            ]
          : [{ type: 'User' as const, id: 'LIST' }],
    }),
    updateUser: builder.mutation<ApiOk<UserDTO>, { id: string; body: UpdateUserInput }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
    deactivateUser: builder.mutation<ApiOk<UserDTO>, string>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),
    resetUserPassword: builder.mutation<ApiOk<UserDTO>, { id: string; password: string }>({
      query: ({ id, password }) => ({
        url: `/users/${id}/password`,
        method: 'PATCH',
        body: { password },
      }),
    }),
  }),
});

export const {
  useListUsersQuery,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useResetUserPasswordMutation,
} = usersApi;
