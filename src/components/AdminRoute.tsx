import { Navigate } from 'react-router-dom'
import { type ReactNode } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import '../pages/pages.css'

interface AdminRouteProps {
  children:  ReactNode
  // 'admin'   → somente administradores
  // 'manager' → administradores e gerentes
  minRole?:  'admin' | 'manager'
}

export function AdminRoute({ children, minRole = 'admin' }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuthContext()
  const { profile, loading: profileLoading, error: profileError } = useProfile()

  const role = profile?.role
  const isActive = profile?.active !== false

  const hasAccess = isActive && (
    minRole === 'manager'
      ? role === 'admin' || role === 'manager'
      : role === 'admin'
  )

  console.log('[AdminRoute] role:', role ?? 'null', '| minRole:', minRole, '| hasAccess:', hasAccess)

  if (authLoading || profileLoading) {
    return (
      <div className="page">
        <main className="page-main">
          <p className="page-stub">Verificando permissões...</p>
        </main>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profileError && !profile) {
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

  if (!hasAccess) {
    console.warn('[AdminRoute] acesso negado — role:', role ?? 'null', '→ /dashboard')
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{ accessDenied: 'Você não tem permissão para acessar esta página.' }}
      />
    )
  }

  return <>{children}</>
}
