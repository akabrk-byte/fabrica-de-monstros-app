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
  const { profile, loading: profileLoading } = useProfile()

  // Aguarda sessão e perfil carregarem
  if (authLoading || profileLoading) {
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
    return <Navigate to="/login" replace />
  }

  // Autenticado mas sem permissão de admin → dashboard com mensagem
  if (profile?.role !== 'admin') {
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
