import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import '../pages/Home.css'   // .btn, .btn-primary
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { user, loading, signIn } = useAuthContext()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Já autenticado → vai direto para o dashboard
  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) { setError('Informe o e-mail.'); return }
    if (!password) { setError('Informe a senha.'); return }

    setSubmitting(true)
    const { error: authError } = await signIn(email.trim(), password)
    setSubmitting(false)

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : authError.message,
      )
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <span className="login-brand">FABRICA DE MONSTROS</span>
          <h1 className="login-title">Entrar</h1>
          <p className="login-subtitle">Acesse sua conta para continuar.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className={`field-input${error && !email.trim() ? ' field-input--error' : ''}`}
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className={`field-input${error && !password ? ' field-input--error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <button onClick={() => navigate('/')}>← Voltar para o início</button>
        </div>

      </div>
    </div>
  )
}
