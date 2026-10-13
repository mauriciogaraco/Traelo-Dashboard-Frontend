import { useEffect } from 'react';
import { useLazyLookupCustomerByPhoneQuery } from './ordersApi';

// Igual que isValidPhone del backend (shared/phone.ts): no vale la pena buscar con menos dígitos.
export const MIN_PHONE_LENGTH_TO_SEARCH = 6;

// Busca con debounce (400ms) mientras `enabled` esté activo y el teléfono tenga largo mínimo.
// `resultMatchesCurrentPhone` evita mostrar o usar un match de un teléfono anterior mientras el
// debounce del último tipeo todavía no corrió — nunca hay un "match vigente" desfasado.
export function useCustomerLookup(phone: string, enabled: boolean) {
  const [lookupCustomer, lookupResult] = useLazyLookupCustomerByPhoneQuery();
  const trimmedPhone = phone.trim();

  useEffect(() => {
    if (!enabled || trimmedPhone.length < MIN_PHONE_LENGTH_TO_SEARCH) {
      return;
    }
    const timeout = setTimeout(() => {
      void lookupCustomer(trimmedPhone);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, trimmedPhone]);

  const searchEligible = enabled && trimmedPhone.length >= MIN_PHONE_LENGTH_TO_SEARCH;
  const resultMatchesCurrentPhone = lookupResult.originalArgs === trimmedPhone;
  const foundCustomer =
    searchEligible && resultMatchesCurrentPhone ? (lookupResult.data?.data ?? null) : null;
  const isSearching = searchEligible && (!resultMatchesCurrentPhone || lookupResult.isFetching);
  const notFound =
    searchEligible &&
    resultMatchesCurrentPhone &&
    !lookupResult.isFetching &&
    lookupResult.data !== undefined &&
    !foundCustomer;

  return { searchEligible, foundCustomer, isSearching, notFound };
}
