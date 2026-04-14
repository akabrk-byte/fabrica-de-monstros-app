import { useNavigate, NavLink } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import '../pages/Home.css'   // .btn .btn-secondary
import '../pages/pages.css'  // .page-header .page-header-end .page-header-user

interface AppHeaderProps {
  title: string
}

export function AppHeader({ title: _title }: AppHeaderProps) {
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
      {/* Logo */}
      <NavLink to="/dashboard" className="page-header-logo" aria-label="Fábrica de Monstros — Dashboard">
        <img
          src="https://academiasfabricademonstros.com.br/wp-content/uploads/2025/09/logo.png"
          alt="Fábrica de Monstros"
          className="page-header-logo-img"
          onError={(e) => {
            const img = e.currentTarget
            img.style.display = 'none'
            const fallback = img.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = 'block'
          }}
        />
        <span className="page-name" style={{ display: 'none' }}>FDM</span>
      </NavLink>

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
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          Sair
        </button>
      </div>
    </header>
  )
}
