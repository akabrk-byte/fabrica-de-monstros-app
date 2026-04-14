import { useNavigate, NavLink } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import '../pages/Home.css'   // .btn .btn-secondary
import '../pages/pages.css'  // .page-header .page-header-end .page-header-user

interface AppHeaderProps {
  title: string
}

export function AppHeader({ title }: AppHeaderProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuthContext()

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? 'Usuário'

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className="page-header">
      <span className="page-name">{title}</span>

      <nav className="page-header-nav" aria-label="Navegação principal">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `page-header-nav-link${isActive ? ' active' : ''}`}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/units"
          className={({ isActive }) => `page-header-nav-link${isActive ? ' active' : ''}`}
        >
          Unidades
        </NavLink>
      </nav>

      <div className="page-header-end">
        <span className="page-header-user">{displayName}</span>
        <button
          className="btn btn-secondary"
          onClick={handleSignOut}
          style={{ padding: '6px 16px', fontSize: '14px' }}
        >
          Sair
        </button>
      </div>
    </header>
  )
}
