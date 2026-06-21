import { apiFetch } from './client';
import type { User, UserSearchResult, UpdateMeInput } from './types';

// Usuarios — buscador de destinatarios y edición del propio perfil.
// Todos los endpoints requieren auth (cookies httpOnly + CSRF en mutaciones).

/**
 * Busca usuarios por correo / teléfono / id (excluye al propio, máx 10).
 * Requiere `q` de ≥2 chars; con menos, devolvemos lista vacía sin pegarle al backend.
 */
export async function searchUsers(
  q: string,
  signal?: AbortSignal,
): Promise<UserSearchResult[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  return apiFetch<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(query)}`, {
    signal,
  });
}

/** Actualiza el propio nombre/teléfono. Devuelve el usuario actualizado. */
export async function updateMe(input: UpdateMeInput): Promise<User> {
  const res = await apiFetch<User | { user: User }>('/users/me', {
    method: 'PATCH',
    body: input,
  });
  // El backend puede devolver el user pelado o envuelto en { user }.
  return (res as { user?: User }).user ?? (res as User);
}
