import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchUsers, updateMe } from '../api/users';
import type { User, UserSearchResult, UpdateMeInput } from '../api/types';

/**
 * Buscador de usuarios (destinatarios). `term` debe venir ya con debounce
 * desde el componente. Solo dispara con ≥2 chars; el ApiError no rompe la UI.
 */
export function useUserSearch(term: string) {
  const q = term.trim();
  return useQuery<UserSearchResult[]>({
    queryKey: ['users', 'search', q],
    queryFn: ({ signal }) => searchUsers(q, signal),
    enabled: q.length >= 2,
    retry: false,
    staleTime: 30_000,
    placeholderData: (prev) => prev, // mantiene resultados previos mientras teclea
  });
}

/** Actualiza el propio perfil (nombre/teléfono) y refresca /auth/me. */
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation<User, Error, UpdateMeInput>({
    mutationFn: updateMe,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
