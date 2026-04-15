import { useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { ProfileModal } from './ProfileModal'
import '../pages/Home.css'   // .btn .btn-secondary
import '../pages/pages.css'  // .page-header .page-header-end .page-header-user
import './AppHeader.css'

interface AppHeaderProps {
  title: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function avatarColor(id: string): string {
  const palette = ['#e63535', '#e67c35', '#d4c435', '#35c46e', '#35bde6', '#8e35e6', '#e635a8']
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}

export function AppHeader({ title: _title }: AppHeaderProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuthContext()
  const { profile } = useProfile()

  const [showProfile, setShowProfile] = useState(false)

  // Prefer profile.full_name (always up to date), fallback to auth meta or email
  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    'Usuário'

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const initials = getInitials(displayName)
  const bgColor  = user?.id ? avatarColor(user.id) : '#888'

  return (
    <>
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
          {/* Avatar button — opens ProfileModal */}
          <button
            className="ah-profile-btn"
            onClick={() => setShowProfile(true)}
            aria-label="Editar perfil"
            title="Editar perfil"
          >
            <span className="ah-avatar" style={{ background: bgColor }}>{initials}</span>
            <span className="ah-display-name">{displayName}</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSignOut}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Sair
          </button>
        </div>
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  )
}
