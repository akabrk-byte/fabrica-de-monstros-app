import { useState, useEffect, useCallback } from 'react'
import { AppHeader } from '../components/AppHeader'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import type { UserRole } from '../hooks/useProfile'
import '../pages/Home.css'
import '../pages/pages.css'
import '../pages/Units.css'
import './AdminUsers.css'

// ─── Types ────────────────────────────────────────────────────────────

interface AdminUser {
  id:         string
  full_name:  string
  username:   string | null
  email:      string | null
  cargo:      string | null
  role:       UserRole
  active:     boolean | null
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  admin:   'Admin',
  manager: 'Gerente',
  user:    'Usuário',
}

function generateUsername(fullName: string): string {
  return fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .join('.')
    .replace(/[^a-z0-9.]/g, '')
    .substring(0, 30)
}

// ─── Forms ────────────────────────────────────────────────────────────

interface NewUserForm {
  full_name: string
  username:  string
  email:     string
  password:  string
  cargo:     string
  role:      UserRole
}

interface EditUserForm {
  full_name: string
  username:  string
  cargo:     string
  role:      UserRole
}

const EMPTY_NEW: NewUserForm = {
  full_name: '', username: '', email: '', password: '', cargo: '', role: 'user',
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [users,     setUsers]     = useState<AdminUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // New user modal
  const [showNew,  setShowNew]  = useState(false)
  const [newForm,  setNewForm]  = useState<NewUserForm>(EMPTY_NEW)
  const [newError, setNewError] = useState('')
  const [saving,   setSaving]   = useState(false)

  // Edit modal
  const [editUser,   setEditUser]   = useState<AdminUser | null>(null)
  const [editForm,   setEditForm]   = useState<EditUserForm>({ full_name: '', username: '', cargo: '', role: 'user' })
  const [editError,  setEditError]  = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [resetSent,  setResetSent]  = useState(false)

  // ── Load ───────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      // NOTE: table `profiles` must have columns: email (text), active (bool default true)
      // Migration: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
      //            ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, email, cargo, role, active, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(data as AdminUser[])
    } catch (err) {
      setLoadError('Não foi possível carregar os usuários.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || saving || editSaving) return
      setShowNew(false)
      setEditUser(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [saving, editSaving])

  // ── New user ────────────────────────────────────────────────────────
  function openNew() {
    setNewForm(EMPTY_NEW)
    setNewError('')
    setSaving(false)
    setShowNew(true)
  }

  function setNewField<K extends keyof NewUserForm>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value as NewUserForm[K]
      setNewForm((prev) => {
        const next = { ...prev, [field]: value }
        if (field === 'full_name') next.username = generateUsername(String(value))
        return next
      })
    }
  }

  async function handleCreateUser() {
    if (!newForm.full_name.trim()) { setNewError('Nome completo é obrigatório.'); return }
    if (!newForm.username.trim())  { setNewError('Username é obrigatório.'); return }
    if (!newForm.email.trim())     { setNewError('Email é obrigatório.'); return }
    if (newForm.password.length < 6) { setNewError('A senha deve ter pelo menos 6 caracteres.'); return }
    setNewError('')
    setSaving(true)
    try {
      // 1. Criar usuário via Admin API (não afeta a sessão do admin logado)
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email:          newForm.email,
        password:       newForm.password,
        email_confirm:  true,
        user_metadata:  { full_name: newForm.full_name },
      })
      if (createError) throw createError
      const newUserId = createData.user?.id
      if (!newUserId) throw new Error('Usuário não foi criado. Verifique se o email já está em uso.')

      // 2. Aguardar trigger criar o perfil
      await new Promise((resolve) => setTimeout(resolve, 500))

      // 3. Atualizar perfil com dados extras
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username:  newForm.username,
          cargo:     newForm.cargo || null,
          role:      newForm.role,
          email:     newForm.email,
        })
        .eq('id', newUserId)
      if (updateError) throw updateError

      setShowNew(false)
      await loadUsers()
    } catch (err: unknown) {
      setNewError(err instanceof Error ? err.message : 'Erro ao criar usuário.')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit user ───────────────────────────────────────────────────────
  function openEdit(user: AdminUser) {
    setEditUser(user)
    setEditForm({
      full_name: user.full_name,
      username:  user.username ?? '',
      cargo:     user.cargo ?? '',
      role:      user.role,
    })
    setEditError('')
    setEditSaving(false)
    setResetSent(false)
  }

  function setEditField<K extends keyof EditUserForm>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setEditForm((prev) => ({ ...prev, [field]: e.target.value }))
    }
  }

  async function handleSaveEdit() {
    if (!editUser) return
    if (!editForm.full_name.trim()) { setEditError('Nome é obrigatório.'); return }
    if (!editForm.username.trim())  { setEditError('Username é obrigatório.'); return }
    setEditError('')
    setEditSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          username:  editForm.username,
          cargo:     editForm.cargo || null,
          role:      editForm.role,
        })
        .eq('id', editUser.id)
      if (error) throw error
      setEditUser(null)
      await loadUsers()
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleResetPassword() {
    if (!editUser?.email) return
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(editUser.email)
      if (error) throw error
      setResetSent(true)
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Erro ao enviar email.')
    }
  }

  // ── Toggle active ───────────────────────────────────────────────────
  async function handleToggleActive(user: AdminUser) {
    const newActive = user.active === false ? true : false
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active: newActive })
        .eq('id', user.id)
      if (error) throw error
      await loadUsers()
    } catch {
      // silently ignored — user still visible in list
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="page">
      <AppHeader title="Usuários" />

      <div className="units-content">

        {/* Top bar */}
        <div className="units-top">
          <h2 className="units-heading">
            Usuários
            {!loading && !loadError && (
              <span className="units-count">({users.length})</span>
            )}
          </h2>
          <button
            className="btn btn-primary"
            onClick={openNew}
            style={{ fontSize: '14px', padding: '8px 18px' }}
          >
            + Novo Usuário
          </button>
        </div>

        {loading && (
          <div className="units-feedback">
            <p className="units-feedback-desc">Carregando usuários...</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="units-feedback units-feedback--error">
            <h3 className="units-feedback-title">Erro ao carregar</h3>
            <p className="units-feedback-desc">{loadError}</p>
            <button className="btn btn-secondary" onClick={loadUsers}
              style={{ marginTop: '8px', fontSize: '14px', padding: '8px 18px' }}>
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !loadError && users.length === 0 && (
          <div className="units-feedback">
            <h3 className="units-feedback-title">Nenhum usuário</h3>
            <p className="units-feedback-desc">
              Clique em "Novo Usuário" para adicionar o primeiro usuário.
            </p>
          </div>
        )}

        {!loading && !loadError && users.length > 0 && (
          <div className="au-table-wrap">
            <table className="au-table">
              <thead>
                <tr>
                  {['Nome', 'Username', 'Email', 'Cargo', 'Perfil', 'Ações'].map((h) => (
                    <th key={h} className="au-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={`au-tr${u.active === false ? ' au-tr--disabled' : ''}`}>
                    <td className="au-td au-td--name">{u.full_name}</td>
                    <td className="au-td au-td--mono">{u.username ?? '—'}</td>
                    <td className="au-td">{u.email ?? '—'}</td>
                    <td className="au-td">{u.cargo ?? '—'}</td>
                    <td className="au-td">
                      <span className={`au-role au-role--${u.role}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="au-td">
                      <div className="au-actions">
                        <button
                          className="au-btn"
                          title="Editar usuário"
                          onClick={() => openEdit(u)}
                          aria-label="Editar"
                        >
                          ✏
                        </button>
                        <button
                          className={`au-btn au-btn--${u.active === false ? 'activate' : 'deactivate'}`}
                          title={u.active === false ? 'Reativar usuário' : 'Desativar usuário'}
                          onClick={() => handleToggleActive(u)}
                          aria-label={u.active === false ? 'Reativar' : 'Desativar'}
                        >
                          {u.active === false ? '✓' : '⊘'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Novo Usuário ─────────────────────────────────────────── */}
      {showNew && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !saving) setShowNew(false) }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="nu-title">
            <div className="modal-header">
              <h2 className="modal-title" id="nu-title">Novo Usuário</h2>
              <button className="modal-close" onClick={() => setShowNew(false)}
                disabled={saving} aria-label="Fechar">✕</button>
            </div>

            <div className="modal-form">
              <div className="field">
                <label className="field-label" htmlFor="nu-name">Nome completo *</label>
                <input id="nu-name" type="text" className="field-input"
                  placeholder="Ex: João Silva"
                  value={newForm.full_name} onChange={setNewField('full_name')} autoFocus />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-username">Username *</label>
                <input id="nu-username" type="text" className="field-input"
                  placeholder="Ex: joao.silva"
                  value={newForm.username} onChange={setNewField('username')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-email">Email *</label>
                <input id="nu-email" type="email" className="field-input"
                  placeholder="Ex: joao@empresa.com"
                  value={newForm.email} onChange={setNewField('email')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-password">Senha temporária *</label>
                <input id="nu-password" type="password" className="field-input"
                  placeholder="Mínimo 6 caracteres"
                  value={newForm.password} onChange={setNewField('password')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-cargo">Cargo / Função</label>
                <input id="nu-cargo" type="text" className="field-input"
                  placeholder="Ex: Gerente de Obras"
                  value={newForm.cargo} onChange={setNewField('cargo')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-role">Perfil de acesso</label>
                <select id="nu-role" className="field-input"
                  value={newForm.role} onChange={setNewField('role')}>
                  <option value="user">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {newError && <p className="modal-error">{newError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowNew(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary"
                  onClick={handleCreateUser} disabled={saving}>
                  {saving ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Usuário ───────────────────────────────────────── */}
      {editUser && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !editSaving) setEditUser(null) }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="eu-title">
            <div className="modal-header">
              <h2 className="modal-title" id="eu-title">Editar Usuário</h2>
              <button className="modal-close" onClick={() => setEditUser(null)}
                disabled={editSaving} aria-label="Fechar">✕</button>
            </div>

            <div className="modal-form">
              <div className="field">
                <label className="field-label" htmlFor="eu-name">Nome completo *</label>
                <input id="eu-name" type="text" className="field-input"
                  value={editForm.full_name} onChange={setEditField('full_name')} autoFocus />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="eu-username">Username *</label>
                <input id="eu-username" type="text" className="field-input"
                  value={editForm.username} onChange={setEditField('username')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="eu-cargo">Cargo / Função</label>
                <input id="eu-cargo" type="text" className="field-input"
                  placeholder="Ex: Gerente de Obras"
                  value={editForm.cargo} onChange={setEditField('cargo')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="eu-role">Perfil de acesso</label>
                <select id="eu-role" className="field-input"
                  value={editForm.role} onChange={setEditField('role')}>
                  <option value="user">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="au-reset-section">
                <p className="au-reset-email">
                  Email: <strong>{editUser.email ?? '—'}</strong>
                </p>
                {resetSent ? (
                  <p className="au-reset-sent">✓ Email de redefinição enviado.</p>
                ) : (
                  <button type="button" className="btn btn-secondary au-reset-btn"
                    onClick={handleResetPassword}
                    disabled={!editUser.email || editSaving}>
                    Redefinir senha
                  </button>
                )}
              </div>

              {editError && <p className="modal-error">{editError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setEditUser(null)} disabled={editSaving}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary"
                  onClick={handleSaveEdit} disabled={editSaving}>
                  {editSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
