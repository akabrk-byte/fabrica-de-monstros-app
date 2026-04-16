// Re-exporta tipos do ProfileContext para manter compatibilidade com imports existentes
export type { UserRole, Profile } from '../contexts/ProfileContext'

import { useProfileContext } from '../contexts/ProfileContext'

// ─── useProfile ───────────────────────────────────────────────────────
// Lê o perfil do ProfileContext compartilhado — um único fetch para toda a árvore.
export function useProfile() {
  return useProfileContext()
}

// ─── useIsAdmin ───────────────────────────────────────────────────────
// Retorna true apenas quando: role === 'admin' E active não é false
// Retorna false durante loading (profile ainda nulo) — nunca nega erroneamente
// após o load completar.
export function useIsAdmin(): boolean {
  const { profile, loading } = useProfileContext()

  if (loading) return false          // aguarda — não decide antes da hora

  const isAdmin = profile?.role === 'admin' && profile?.active !== false
  console.log('[useIsAdmin] userId:', profile?.id ?? 'null',
    '| role:', profile?.role ?? 'null',
    '| active:', profile?.active ?? 'null',
    '| isAdmin:', isAdmin)

  return isAdmin
}
