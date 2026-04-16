// Re-exporta tipos do ProfileContext para manter compatibilidade com imports existentes
export type { UserRole, Profile } from '../contexts/ProfileContext'

import { useProfileContext } from '../contexts/ProfileContext'

// ─── useProfile ───────────────────────────────────────────────────────
// Lê o perfil do ProfileContext compartilhado — um único fetch para toda a árvore.
export function useProfile() {
  return useProfileContext()
}

// ─── useIsAdmin ───────────────────────────────────────────────────────
// Retorna true apenas quando: role === 'admin' E active não é false.
// NÃO depende de `loading` — profile nulo já garante false durante o fetch.
// Isso evita flicker quando USER_UPDATED dispara re-fetch (loading vira true momentaneamente).
export function useIsAdmin(): boolean {
  const { profile } = useProfileContext()

  const isAdmin = profile?.role === 'admin' && profile?.active !== false
  console.log('[useIsAdmin] userId:', profile?.id ?? 'null',
    '| role:', profile?.role ?? 'null',
    '| active:', profile?.active ?? 'null',
    '| isAdmin:', isAdmin)

  return isAdmin
}
