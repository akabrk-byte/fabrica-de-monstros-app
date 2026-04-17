import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from './AuthContext'

// ─── Types ────────────────────────────────────────────────────────────
// Definidos aqui para evitar import circular (useProfile importa deste arquivo)

export type UserRole = 'admin' | 'manager' | 'usuario'

export interface Profile {
  id:         string
  email:      string
  full_name:  string
  username:   string | null
  cargo:      string | null
  avatar_url: string | null
  role:       UserRole
  active:     boolean | null
  created_at: string
  updated_at: string
}

export interface ProfileContextValue {
  profile: Profile | null
  loading: boolean
  error:   Error | null
  refresh: () => void
}

// ─── Context ──────────────────────────────────────────────────────────

const ProfileContext = createContext<ProfileContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuthContext()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<Error | null>(null)

  async function fetchProfile(userId: string) {
    console.log('[Profile] buscando perfil para userId:', userId)
    setLoading(true)
    // NÃO limpa profile aqui — mantém o valor anterior enquanto re-busca,
    // evitando que isAdmin pisque para false durante USER_UPDATED re-fetch.
    setError(null)

    const { data, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, username, cargo, avatar_url, role, active, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (fetchErr) {
      console.error('[Profile] erro ao buscar perfil:', fetchErr.message, '| code:', fetchErr.code)

      // 500 = erro de função RLS (ex: current_user_role() com tipo errado). Requer migration no BD.
      if (fetchErr.code === 'PGRST_SERVER_ERROR' || fetchErr.message.includes('cannot cast')) {
        console.error('[Profile] ERRO 500 — provavelmente current_user_role() com tipo incompatível. Rode migration_fix_current_user_role.sql no Supabase SQL Editor.')
        setProfile(null)
        setError(new Error('Erro interno do banco. Contate o administrador.'))
        setLoading(false)
        return
      }

      // Fallback: tenta sem colunas novas (active) caso migration não tenha rodado
      if (fetchErr.message.includes('active') || fetchErr.code === '42703') {
        console.warn('[Profile] fallback sem coluna "active"...')
        const { data: d2, error: e2 } = await supabase
          .from('profiles')
          .select('id, full_name, username, cargo, avatar_url, role, created_at')
          .eq('id', userId)
          .single()

        if (e2) {
          console.error('[Profile] fallback também falhou:', e2.message)
          setProfile(null)
          setError(new Error(e2.message))
        } else {
          const p = { ...(d2 as Omit<Profile, 'active' | 'updated_at'>), active: null, updated_at: '' } as Profile
          console.log('[Profile] perfil carregado (fallback):', { id: p.id, role: p.role, active: p.active })
          setProfile(p)
          setError(null)
        }
      } else {
        setProfile(null)
        setError(new Error(fetchErr.message))
      }
    } else {
      const p = data as Profile
      console.log('[Profile] perfil carregado:', { id: p.id, role: p.role, active: p.active })
      setProfile(p)
      setError(null)
    }

    setLoading(false)
  }

  // Reage a mudanças de userId (login, logout, troca de conta)
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      console.log('[Profile] sem usuário autenticado — limpando perfil')
      setProfile(null)
      setLoading(false)
      setError(null)
      return
    }

    fetchProfile(user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading])

  // Re-busca quando dados do usuário são atualizados (ex: ProfileModal salva)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' && session?.user) {
        console.log('[Profile] USER_UPDATED — re-buscando perfil')
        fetchProfile(session.user.id)
      }
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = useCallback(() => {
    if (user) fetchProfile(user.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <ProfileContext.Provider value={{ profile, loading, error, refresh }}>
      {children}
    </ProfileContext.Provider>
  )
}

// ─── Consumer hook ────────────────────────────────────────────────────

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfileContext deve ser usado dentro de <ProfileProvider>')
  return ctx
}
