import { useState, useEffect, useCallback } from 'react'
import { AppHeader } from '../components/AppHeader'
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
  admin:    'Admin',
  manager:  'Gerente',
  usuario:  'Usuário',
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
  full_name: '', username: '', email: '', password: '', cargo: '', role: 'usuario',
}

// ─── Page ──────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [users,     setUsers]     = useState<AdminUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // New user modal
  const [showNew,     setShowNew]     = useState(false)
  const [newForm,     setNewForm]     = useState<NewUserForm>(EMPTY_NEW)
  const [newError,    setNewError]    = useState('')
  const [newSuccess,  setNewSuccess]  = useState('')
  const [saving,      setSaving]      = useState(false)

  // Edit modal
  const [editUser,   setEditUser]   = useState<AdminUser | null>(null)
  const [editForm,   setEditForm]   = useState<EditUserForm>({ full_name: '', username: '', cargo: '', role: 'user' })
  const [editError,  setEditError]  = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Reset de senha direto
  const [resetPwd,     setResetPwd]     = useState('')
  const [showResetPwd, setShowResetPwd] = useState(false)
  const [resetSaving,  setResetSaving]  = useState(false)
  const [resetError,   setResetError]   = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  // ── Load ───────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    console.log('[AdminUsers] loadUsers: iniciando...')
    setLoading(true)
    setLoadError(null)
    try {
      // Usa supabaseAdmin (service role) para ver todos os perfis,
      // contornando RLS que limita usuários a ver só o próprio perfil.
      // Tenta com email+active primeiro; cai no fallback se colunas não existirem.
      let data: AdminUser[] | null = null
      let queryError = null

      const fullResult = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, username, email, cargo, role, active, created_at')
        .order('created_at', { ascending: false })

      if (fullResult.error) {
        console.warn('[AdminUsers] loadUsers: query completa falhou, tentando fallback sem email/active:', fullResult.error.message)
        // Fallback: colunas email/active podem não existir ainda — instrua a rodar a migration
        const fallback = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, username, cargo, role, created_at')
          .order('created_at', { ascending: false })
        queryError = fallback.error
        data = (fallback.data ?? []).map((p) => ({ ...p, email: null, active: null })) as AdminUser[]
        if (!queryError) {
          console.warn('[AdminUsers] Atenção: colunas email/active ausentes em profiles. Rode a migration SQL.')
        }
      } else {
        data = fullResult.data as AdminUser[]
      }

      if (queryError) throw queryError

      console.log(`[AdminUsers] loadUsers: ${data?.length ?? 0} usuário(s) carregados`)
      setUsers(data ?? [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[AdminUsers] loadUsers: erro:', msg)
      setLoadError(`Não foi possível carregar os usuários. Erro: ${msg}`)
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
    console.log('[AdminUsers] openNew: abrindo modal de novo usuário')
    setNewForm(EMPTY_NEW)
    setNewError('')
    setNewSuccess('')
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
    console.log('[AdminUsers] handleCreateUser: submit disparado', { email: newForm.email, role: newForm.role })

    if (!newForm.full_name.trim()) { setNewError('Nome completo é obrigatório.'); return }
    if (!newForm.username.trim())  { setNewError('Username é obrigatório.'); return }
    if (!newForm.email.trim())     { setNewError('Email é obrigatório.'); return }
    if (newForm.password.length < 6) { setNewError('A senha deve ter pelo menos 6 caracteres.'); return }

    setNewError('')
    setNewSuccess('')
    setSaving(true)

    try {
      // ── PASSO 1: criar auth user via Admin API ───────────────────────
      // Usa supabaseAdmin para não afetar a sessão do admin logado.
      console.log('[AdminUsers] passo 1: criando auth user...')
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email:         newForm.email,
        password:      newForm.password,
        email_confirm: true,
        user_metadata: { full_name: newForm.full_name },
      })
      console.log('[AdminUsers] passo 1 resposta:', { userId: createData?.user?.id, error: createError?.message })
      if (createError) throw createError

      const newUserId = createData.user?.id
      if (!newUserId) throw new Error('ID do novo usuário não retornado pelo Supabase.')

      // ── PASSO 2: upsert do perfil via Admin ──────────────────────────
      // Usa upsert (não update) para funcionar mesmo se o trigger ainda
      // não criou a linha. Usa supabaseAdmin para bypassar RLS.
      console.log('[AdminUsers] passo 2: fazendo upsert do perfil...', newUserId)
      const { error: upsertError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id:        newUserId,
          full_name: newForm.full_name,
          username:  newForm.username.trim(),
          cargo:     newForm.cargo.trim() || null,
          role:      newForm.role,
          email:     newForm.email.trim(),
          active:    true,
        })
      console.log('[AdminUsers] passo 2 resposta:', { error: upsertError?.message ?? 'ok' })
      if (upsertError) {
        // Se upsert falha (ex: coluna email/active não existe ainda), tenta
        // update só dos campos garantidos na tabela.
        console.warn('[AdminUsers] upsert completo falhou, tentando upsert sem email/active:', upsertError.message)
        const { error: fallbackError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id:        newUserId,
            full_name: newForm.full_name,
            username:  newForm.username.trim(),
            cargo:     newForm.cargo.trim() || null,
            role:      newForm.role,
          })
        if (fallbackError) {
          console.error('[AdminUsers] upsert fallback também falhou:', fallbackError.message)
          throw fallbackError
        }
      }

      console.log('[AdminUsers] usuário criado com sucesso:', newUserId)
      setNewSuccess(`Usuário ${newForm.full_name} criado com sucesso!`)

      // Fecha modal após 1.2s para o usuário ver o feedback
      setTimeout(() => {
        setShowNew(false)
        setNewSuccess('')
        loadUsers()
      }, 1200)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[AdminUsers] handleCreateUser: erro:', msg)
      setNewError(msg)
    } finally {
      setSaving(false)
    }
  }

  // ── Edit user ───────────────────────────────────────────────────────
  function openEdit(user: AdminUser) {
    console.log('[AdminUsers] openEdit:', user.id, user.full_name)
    setEditUser(user)
    setEditForm({
      full_name: user.full_name,
      username:  user.username ?? '',
      cargo:     user.cargo ?? '',
      role:      user.role,
    })
    setEditError('')
    setEditSaving(false)
    setResetPwd('')
    setShowResetPwd(false)
    setResetSaving(false)
    setResetError('')
    setResetSuccess(false)
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
    console.log('[AdminUsers] handleSaveEdit:', editUser.id)
    try {
      // Usa supabaseAdmin para bypassar RLS
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          username:  editForm.username,
          cargo:     editForm.cargo || null,
          role:      editForm.role,
        })
        .eq('id', editUser.id)
      console.log('[AdminUsers] handleSaveEdit resposta:', { error: error?.message ?? 'ok' })
      if (error) throw error
      setEditUser(null)
      await loadUsers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[AdminUsers] handleSaveEdit erro:', msg)
      setEditError(msg)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDirectResetPassword() {
    if (!editUser) return
    if (resetPwd.length < 6) { setResetError('A senha deve ter pelo menos 6 caracteres.'); return }
    setResetError('')
    setResetSaving(true)
    console.log('[AdminUsers] handleDirectResetPassword: redefinindo senha para', editUser.id)
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(editUser.id, {
        password: resetPwd,
      })
      if (error) throw error
      console.log('[AdminUsers] senha redefinida com sucesso')
      setResetSuccess(true)
      setResetPwd('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao redefinir senha.'
      console.error('[AdminUsers] handleDirectResetPassword erro:', msg)
      setResetError(msg)
    } finally {
      setResetSaving(false)
    }
  }

  // ── Toggle active ───────────────────────────────────────────────────
  async function handleToggleActive(user: AdminUser) {
    const newActive = user.active === false ? true : false
    console.log('[AdminUsers] handleToggleActive:', user.id, '→', newActive)
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ active: newActive })
        .eq('id', user.id)
      if (error) throw error
      await loadUsers()
    } catch (err) {
      console.error('[AdminUsers] handleToggleActive erro:', err)
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
                  value={newForm.full_name} onChange={setNewField('full_name')} autoFocus
                  disabled={saving} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-username">Username *</label>
                <input id="nu-username" type="text" className="field-input"
                  placeholder="Ex: joao.silva"
                  value={newForm.username} onChange={setNewField('username')}
                  disabled={saving} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-email">Email *</label>
                <input id="nu-email" type="email" className="field-input"
                  placeholder="Ex: joao@empresa.com"
                  value={newForm.email} onChange={setNewField('email')}
                  disabled={saving} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-password">Senha temporária *</label>
                <input id="nu-password" type="password" className="field-input"
                  placeholder="Mínimo 6 caracteres"
                  value={newForm.password} onChange={setNewField('password')}
                  disabled={saving} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-cargo">Cargo / Função</label>
                <input id="nu-cargo" type="text" className="field-input"
                  placeholder="Ex: Gerente de Obras"
                  value={newForm.cargo} onChange={setNewField('cargo')}
                  disabled={saving} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="nu-role">Perfil de acesso</label>
                <select id="nu-role" className="field-input"
                  value={newForm.role} onChange={setNewField('role')}
                  disabled={saving}>
                  <option value="usuario">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {newError   && <p className="modal-error">{newError}</p>}
              {newSuccess && <p className="au-modal-success">{newSuccess}</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowNew(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary"
                  onClick={handleCreateUser} disabled={saving || !!newSuccess}>
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
                  value={editForm.full_name} onChange={setEditField('full_name')}
                  autoFocus disabled={editSaving} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="eu-username">Username *</label>
                <input id="eu-username" type="text" className="field-input"
                  value={editForm.username} onChange={setEditField('username')}
                  disabled={editSaving} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="eu-cargo">Cargo / Função</label>
                <input id="eu-cargo" type="text" className="field-input"
                  placeholder="Ex: Gerente de Obras"
                  value={editForm.cargo} onChange={setEditField('cargo')}
                  disabled={editSaving} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="eu-role">Perfil de acesso</label>
                <select id="eu-role" className="field-input"
                  value={editForm.role} onChange={setEditField('role')}
                  disabled={editSaving}>
                  <option value="usuario">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="au-reset-section">
                <p className="au-reset-label">Redefinir senha</p>
                {resetSuccess ? (
                  <p className="au-reset-sent">✓ Senha redefinida com sucesso.</p>
                ) : (
                  <>
                    <div className="au-reset-field">
                      <input
                        type={showResetPwd ? 'text' : 'password'}
                        className="field-input"
                        placeholder="Nova senha (mín. 6 caracteres)"
                        value={resetPwd}
                        onChange={(e) => { setResetPwd(e.target.value); setResetError('') }}
                        disabled={resetSaving || editSaving}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="au-pwd-toggle"
                        onClick={() => setShowResetPwd((v) => !v)}
                        aria-label={showResetPwd ? 'Ocultar senha' : 'Mostrar senha'}
                        tabIndex={-1}
                      >
                        {showResetPwd ? '🙈' : '👁'}
                      </button>
                    </div>
                    {resetError && <p className="au-reset-error">{resetError}</p>}
                    <button
                      type="button"
                      className="btn btn-secondary au-reset-btn"
                      onClick={handleDirectResetPassword}
                      disabled={!resetPwd || resetSaving || editSaving}
                    >
                      {resetSaving ? 'Aplicando...' : 'Aplicar nova senha'}
                    </button>
                  </>
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
