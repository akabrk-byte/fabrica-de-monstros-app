import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { ProfileModal } from './ProfileModal'
import './UserAvatar.css'

// ─── Helpers (mesmas do AppHeader para consistência) ──────────────────

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

const ROLE_LABELS: Record<string, string> = {
  admin:   'Admin',
  manager: 'Gerente',
  user:    'Usuário',
}

// ─── Component ────────────────────────────────────────────────────────

export function UserAvatar() {
  const navigate            = useNavigate()
  const { user, signOut }   = useAuthContext()
  const { profile }         = useProfile()
  const [open, setOpen]     = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const wrapRef             = useRef<HTMLDivElement>(null)

  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    'Usuário'

  const initials = getInitials(displayName)
  const bgColor  = user?.id ? avatarColor(user.id) : '#888'
  const isAdmin  = profile?.role === 'admin'

  // Fecha ao clicar fora
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  // Fecha com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <>
      <div className="ua-wrap" ref={wrapRef}>

        {/* Trigger */}
        <button
          className="ua-trigger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Menu do usuário"
        >
          <span className="ua-avatar" style={{ background: bgColor }}>{initials}</span>
          <span className="ua-trigger-name">{displayName}</span>
          <span className={`ua-chevron${open ? ' ua-chevron--open' : ''}`} aria-hidden>▾</span>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="ua-dropdown" role="menu" aria-label="Menu do usuário">

            {/* Cabeçalho: avatar + nome + username */}
            <div className="ua-header">
              <span className="ua-avatar ua-avatar--lg" style={{ background: bgColor }}>{initials}</span>
              <div className="ua-header-text">
                <span className="ua-header-name">{profile?.full_name || displayName}</span>
                {profile?.username && (
                  <span className="ua-header-username">@{profile.username}</span>
                )}
              </div>
            </div>

            {/* Cargo + role */}
            {(profile?.cargo || profile?.role) && (
              <div className="ua-meta">
                {profile?.cargo && (
                  <span className="ua-meta-cargo">{profile.cargo}</span>
                )}
                {profile?.role && (
                  <span className={`ua-role ua-role--${profile.role}`}>
                    {ROLE_LABELS[profile.role] ?? profile.role}
                  </span>
                )}
              </div>
            )}

            <div className="ua-sep" />

            {/* Editar perfil */}
            <button
              className="ua-item"
              role="menuitem"
              onClick={() => { setOpen(false); setShowEdit(true) }}
            >
              <span className="ua-item-icon">✏</span>
              Editar perfil
            </button>

            {/* Gerenciar Usuários — só para admins */}
            {isAdmin && (
              <Link
                className="ua-item"
                role="menuitem"
                to="/admin/usuarios"
                onClick={() => setOpen(false)}
              >
                <span className="ua-item-icon">⚙</span>
                Gerenciar Usuários
              </Link>
            )}

            <div className="ua-sep" />

            {/* Sair */}
            <button
              className="ua-item ua-item--danger"
              role="menuitem"
              onClick={handleSignOut}
            >
              <span className="ua-item-icon">→</span>
              Sair
            </button>

          </div>
        )}
      </div>

      {showEdit && <ProfileModal onClose={() => setShowEdit(false)} />}
    </>
  )
}
