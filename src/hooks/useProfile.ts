// Re-exporta tipos do ProfileContext para manter compatibilidade com imports existentes
export type { UserRole, Profile } from '../contexts/ProfileContext'

import { useProfileContext } from '../contexts/ProfileContext'

// ─── useProfile ───────────────────────────────────────────────────────
export function useProfile() {
  return useProfileContext()
}

// ─── useIsAdmin ───────────────────────────────────────────────────────
// role === 'admin' E active !== false
export function useIsAdmin(): boolean {
  const { profile } = useProfileContext()
  const isAdmin = profile?.role === 'admin' && profile?.active !== false
  console.log('[useIsAdmin] role:', profile?.role ?? 'null', '| isAdmin:', isAdmin)
  return isAdmin
}

// ─── useIsManager ─────────────────────────────────────────────────────
// role === 'admin' OU role === 'manager', E active !== false
// Use para rotas/funcionalidades acessíveis a gestores e admins.
export function useIsManager(): boolean {
  const { profile } = useProfileContext()
  const isManager = (profile?.role === 'admin' || profile?.role === 'manager') && profile?.active !== false
  console.log('[useIsManager] role:', profile?.role ?? 'null', '| isManager:', isManager)
  return isManager
}
