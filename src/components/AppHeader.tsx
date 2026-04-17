import { NavLink } from 'react-router-dom'
import { useProfile, useIsAdmin, useIsManager } from '../hooks/useProfile'
import { UserAvatar } from './UserAvatar'
import '../pages/Home.css'
import '../pages/pages.css'
import './AppHeader.css'

interface AppHeaderProps {
  title: string
}

export function AppHeader({ title: _title }: AppHeaderProps) {
  const { profile } = useProfile()
  const isAdmin   = useIsAdmin()
  const isManager = useIsManager()

  console.log('[Nav] role:', profile?.role ?? 'null', '| isAdmin:', isAdmin, '| isManager:', isManager)

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

      {/* Nav */}
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
        {isAdmin && (
          <NavLink
            to="/admin/usuarios"
            className={({ isActive }) => `page-header-nav-link${isActive ? ' active' : ''}`}
          >
            Usuários
          </NavLink>
        )}
      </nav>

      {/* Avatar com dropdown */}
      <div className="page-header-end">
        <UserAvatar />
      </div>
    </header>
  )
}
