import { Navigate } from 'react-router-dom'
import { type ReactNode } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import '../pages/pages.css'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="page">
        <main className="page-main">
          <p className="page-stub">Verificando sessão...</p>
        </main>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
