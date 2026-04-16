import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type UserRole = 'admin' | 'manager' | 'user'

export interface Profile {
  id:         string
  full_name:  string
  username:   string | null
  cargo:      string | null
  avatar_url: string | null
  role:       UserRole
  created_at: string
}

interface ProfileState {
  profile: Profile | null
  loading: boolean
  error:   Error | null
}

export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: true,
    error:   null,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchProfile(userId: string) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, cargo, avatar_url, role, created_at')
        .eq('id', userId)
        .single()

      if (cancelled) return

      if (error) {
        setState({ profile: null, loading: false, error: new Error(error.message) })
      } else {
        setState({ profile: data as Profile, loading: false, error: null })
      }
    }

    // Carrega perfil na montagem
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) {
        setState({ profile: null, loading: false, error: null })
        return
      }
      fetchProfile(user.id)
    })

    // Mantém sincronizado com mudanças de sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      if (!session?.user) {
        setState({ profile: null, loading: false, error: null })
        return
      }
      fetchProfile(session.user.id)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return state
}

export function useIsAdmin(): boolean {
  const { profile } = useProfile()
  return profile?.role === 'admin'
}
