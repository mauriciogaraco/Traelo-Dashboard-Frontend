import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { ApiErrorBody } from './types';

export function getErrorMessage(
  error: FetchBaseQueryError | SerializedError | undefined,
): string {
  if (!error) {
    return 'Ocurrió un error inesperado';
  }

  if ('status' in error) {
    const data = error.data as ApiErrorBody | undefined;
    if (data?.error) {
      return data.error;
    }
    if (typeof error.status === 'number') {
      return `Error del servidor (${error.status})`;
    }
    return 'No se pudo conectar con el servidor';
  }

  return error.message ?? 'Ocurrió un error inesperado';
}
