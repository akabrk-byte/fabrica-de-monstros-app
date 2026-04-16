import { Navigate } from 'react-router-dom'
import { type ReactNode } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import '../pages/pages.css'

interface AdminRouteProps {
  children: ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuthContext()
  const { profile, loading: profileLoading, error: profileError } = useProfile()

  // ── Debug logs ─────────────────────────────────────────────────────
  console.log('[AdminRoute] estado:', {
    authLoading,
    profileLoading,
    userId:      user?.id ?? null,
    role:        profile?.role ?? null,
    profileError: profileError?.message ?? null,
  })

  // Aguarda sessão e perfil carregarem
  if (authLoading || profileLoading) {
    console.log('[AdminRoute] aguardando carregamento...')
    return (
      <div className="page">
        <main className="page-main">
          <p className="page-stub">Verificando permissões...</p>
        </main>
      </div>
    )
  }

  // Não autenticado → login
  if (!user) {
    console.log('[AdminRoute] sem usuário autenticado → /login')
    return <Navigate to="/login" replace />
  }

  // Erro ao carregar perfil — não redireciona, mostra mensagem
  if (profileError && !profile) {
    console.error('[AdminRoute] erro ao carregar perfil:', profileError.message)
    return (
      <div className="page">
        <main className="page-main">
          <p className="page-stub" style={{ color: '#f87171' }}>
            Erro ao verificar permissões. Tente recarregar a página.
          </p>
          <p className="page-stub" style={{ fontSize: '12px', marginTop: '6px', color: 'var(--text-muted)' }}>
            {profileError.message}
          </p>
        </main>
      </div>
    )
  }

  // Autenticado mas sem permissão de admin → dashboard com mensagem
  if (profile?.role !== 'admin') {
    console.warn('[AdminRoute] role detectada:', profile?.role ?? 'null', '→ acesso negado, redirecionando')
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ accessDenied: 'Você não tem permissão para acessar esta página.' }}
      />
    )
  }

  console.log('[AdminRoute] admin confirmado, renderizando página')
  return <>{children}</>
}
