import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useProfileContext } from '../contexts/ProfileContext'
import './ProfileModal.css'

interface Props {
  onClose: () => void
}

export function ProfileModal({ onClose }: Props) {
  const { profile } = useProfile()
  const { refresh } = useProfileContext()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  // Pré-preenche com dados atuais ao abrir
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setUsername(profile.username ?? '')
    }
  }, [profile])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Nome completo é obrigatório.')
      return
    }

    const uname = username.trim().toLowerCase()
    if (uname && !/^[a-z0-9._]+$/.test(uname)) {
      setError('Username aceita apenas letras minúsculas, números, pontos e underscores.')
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado.')

      // Atualiza tabela profiles
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({
          full_name:  fullName.trim(),
          username:   uname || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (dbErr) {
        throw new Error(
          dbErr.code === '23505'
            ? 'Este username já está em uso. Escolha outro.'
            : dbErr.message,
        )
      }

      // Atualiza metadados do auth (dispara USER_UPDATED → ProfileContext re-busca)
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
      refresh()   // garante atualização imediata no contexto compartilhado

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="pm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="pm-modal" role="dialog" aria-modal="true" aria-labelledby="pm-title">

        {/* Header */}
        <div className="pm-header">
          <h2 className="pm-title" id="pm-title">Meu Perfil</h2>
          <button className="pm-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <form className="pm-form" onSubmit={handleSubmit} noValidate>

          <div className="pm-field">
            <label className="pm-label" htmlFor="pm-fullname">Nome completo *</label>
            <input
              id="pm-fullname"
              type="text"
              className="pm-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="pm-field">
            <label className="pm-label" htmlFor="pm-username">Username</label>
            <div className="pm-username-wrap">
              <span className="pm-at">@</span>
              <input
                id="pm-username"
                type="text"
                className="pm-input pm-input--username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))
                }
                placeholder="seu.usuario"
                disabled={saving}
                autoComplete="off"
              />
            </div>
            <span className="pm-hint">Letras minúsculas, números, pontos e _</span>
          </div>

          {error   && <p className="pm-error">{error}</p>}
          {success && <p className="pm-success">Perfil salvo!</p>}

          <div className="pm-actions">
            <button
              type="button"
              className="pm-btn pm-btn--secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="pm-btn pm-btn--primary"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
