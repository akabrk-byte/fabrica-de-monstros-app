import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import {
  listUnits, listTaskStats, createUnit,
  type Unit, type TaskStats, type CreateUnitData,
} from '../services/unitsService'
import '../pages/Home.css'
import './pages.css'
import './Units.css'

// ─── Helpers ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<Unit['status'], string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  inaugurada:   'Inaugurada',
  cancelada:    'Cancelada',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

function daysUntil(dateStr: string | null): string | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today  = new Date(); today.setHours(0, 0, 0, 0)
  const diff   = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff > 0)  return `${diff} dias para inauguração`
  if (diff === 0) return 'Inauguração hoje'
  return `Inaugurada há ${Math.abs(diff)} dias`
}

// ─── Componente UnitCard ─────────────────────────────────────────────

function UnitCard({ unit, stats, onClick }: { unit: Unit; stats: TaskStats; onClick: () => void }) {
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : null
  const countdown = daysUntil(unit.inauguration_date)

  return (
    <div className="unit-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <h3 className="unit-card-name">{unit.name}</h3>

      <div className="unit-card-meta">
        {(unit.city || unit.state) && (
          <span className="unit-card-location">
            {[unit.city, unit.state].filter(Boolean).join(', ')}
          </span>
        )}
        <span className="unit-card-date">
          Inauguração: <strong>{formatDate(unit.inauguration_date)}</strong>
        </span>
        {countdown && (
          <span className="unit-card-countdown">{countdown}</span>
        )}
      </div>

      <span className={`unit-status unit-status--${unit.status}`}>
        {STATUS_LABEL[unit.status]}
      </span>

      <div className="unit-progress">
        {pct === null ? (
          <span className="unit-progress-label">Sem tarefas</span>
        ) : (
          <>
            <span className="unit-progress-label">
              {stats.completed}/{stats.total} tarefas concluídas ({pct}%)
            </span>
            <div className="unit-progress-bar">
              <div className="unit-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Dados iniciais do formulário ─────────────────────────────────────

const BR_STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO',
  'MA','MG','MS','MT','PA','PB','PE','PI','PR',
  'RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const EMPTY_FORM: CreateUnitData = { name: '', city: '', state: '', start_date: '', inauguration_date: '' }

// Data mínima de inauguração: 30 dias a partir de hoje
function minInaugDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

// ─── Página principal ────────────────────────────────────────────────

export default function Units() {
  const navigate = useNavigate()
  const [units,     setUnits]     = useState<Unit[]>([])
  const [statsMap,  setStatsMap]  = useState<Map<string, TaskStats>>(new Map())
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── Wizard ────────────────────────────────────────────────────────────
  const [showModal,    setShowModal]    = useState(false)
  const [wizardStep,   setWizardStep]   = useState<1 | 2>(1)
  const [form,         setForm]         = useState<CreateUnitData>(EMPTY_FORM)
  const [formError,    setFormError]    = useState('')
  const [creating,     setCreating]     = useState(false)
  const [createError,  setCreateError]  = useState('')
  const [createdUnit,  setCreatedUnit]  = useState<Unit | null>(null)

  // ── Carga de dados ─────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data  = await listUnits()
      const stats = await listTaskStats(data.map((u) => u.id))
      setUnits(data)
      setStatsMap(new Map(stats.map((s) => [s.unit_id, s])))
    } catch {
      setLoadError('Não foi possível carregar as unidades. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Fecha modal com Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // ── Modal helpers ──────────────────────────────────────────────────

  function openModal() {
    setForm(EMPTY_FORM)
    setFormError('')
    setCreateError('')
    setWizardStep(1)
    setCreatedUnit(null)
    setCreating(false)
    setShowModal(true)
  }

  function closeModal() {
    if (creating) return
    setShowModal(false)
  }

  // ── Step 1: Avançar ────────────────────────────────────────────────

  function handleStep1Next() {
    if (!form.name.trim()) {
      setFormError('Informe o nome da unidade.')
      return
    }
    if (!form.inauguration_date) {
      setFormError('Informe a data de inauguração.')
      return
    }
    const date    = new Date(form.inauguration_date + 'T00:00:00')
    const today   = new Date(); today.setHours(0, 0, 0, 0)
    const minDate = new Date(today.getTime() + 30 * 86_400_000)
    if (date < minDate) {
      setFormError('A data de inauguração deve ser pelo menos 30 dias no futuro.')
      return
    }
    setFormError('')
    setWizardStep(2)
  }

  // ── Step 2: Criar unidade + seed ──────────────────────────────────

  const handleCreate = async () => {
    setCreating(true)
    setCreateError('')
    try {
      let unit: Unit

      if (createdUnit) {
        // Retry: unidade já criada, apenas regenerar tarefas
        unit = createdUnit
      } else {
        unit = await createUnit(form)
        setCreatedUnit(unit)
      }

      navigate(`/units/${unit.id}`)
    } catch (err) {
      console.error('[createUnit] erro:', err)
      if (createdUnit) {
        setCreateError(
          'Erro ao gerar as tarefas. Tente novamente ou acesse a unidade e use o botão ⚙ para regenerar.'
        )
      } else {
        setCreateError('Erro ao criar a unidade. Tente novamente.')
        setCreatedUnit(null)
      }
    } finally {
      setCreating(false)
    }
  }

  const set = (field: keyof CreateUnitData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="page">
      <AppHeader title="Unidades" />

      <div className="units-content">

        {/* Topo: título + botão */}
        <div className="units-top">
          <h2 className="units-heading">
            Unidades
            {!loading && !loadError && (
              <span className="units-count">({units.length})</span>
            )}
          </h2>
          <button className="btn btn-primary" onClick={openModal}
            style={{ fontSize: '14px', padding: '8px 18px' }}>
            + Nova unidade
          </button>
        </div>

        {/* Estados de loading / erro / lista / vazio */}
        {loading && (
          <div className="units-feedback">
            <p className="units-feedback-desc">Carregando unidades...</p>
          </div>
        )}

        {!loading && loadError && (
          <div className="units-feedback units-feedback--error">
            <h3 className="units-feedback-title">Erro ao carregar</h3>
            <p className="units-feedback-desc">{loadError}</p>
            <button className="btn btn-secondary" onClick={loadData}
              style={{ marginTop: '8px', fontSize: '14px', padding: '8px 18px' }}>
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !loadError && units.length === 0 && (
          <div className="units-feedback">
            <h3 className="units-feedback-title">Nenhuma unidade ainda</h3>
            <p className="units-feedback-desc">
              Clique em "Nova unidade" para cadastrar a primeira unidade em implantação.
            </p>
          </div>
        )}

        {!loading && !loadError && units.length > 0 && (
          <div className="units-grid">
            {units.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                stats={statsMap.get(unit.id) ?? { unit_id: unit.id, total: 0, completed: 0 }}
                onClick={() => navigate(`/units/${unit.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Nova unidade (wizard 2 etapas) ───────────────────── */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !creating) closeModal() }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

            <div className="modal-header">
              <div>
                <h2 className="modal-title" id="modal-title">Nova unidade</h2>
                <p className="wizard-step-label">Passo {wizardStep} de 2</p>
              </div>
              <button className="modal-close" onClick={closeModal}
                disabled={creating} aria-label="Fechar">✕</button>
            </div>

            {/* ── Passo 1: Formulário ──────────────────────────────── */}
            {wizardStep === 1 && (
              <div className="modal-form">

                <div className="field">
                  <label className="field-label" htmlFor="u-name">Nome *</label>
                  <input
                    id="u-name"
                    type="text"
                    className={`field-input${formError && !form.name.trim() ? ' field-input--error' : ''}`}
                    placeholder="Ex: Unidade Campinas — Taquaral"
                    value={form.name}
                    onChange={set('name')}
                    autoFocus
                  />
                </div>

                <div className="modal-row">
                  <div className="field">
                    <label className="field-label" htmlFor="u-city">Cidade</label>
                    <input
                      id="u-city"
                      type="text"
                      className="field-input"
                      placeholder="Ex: Campinas"
                      value={form.city}
                      onChange={set('city')}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="u-state">Estado</label>
                    <select
                      id="u-state"
                      className="field-input"
                      value={form.state}
                      onChange={set('state')}
                    >
                      <option value="">—</option>
                      {BR_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="u-start-date">
                    Data de início da operação
                  </label>
                  <input
                    id="u-start-date"
                    type="date"
                    className="field-input"
                    placeholder="dd/mm/aaaa"
                    value={form.start_date}
                    onChange={set('start_date')}
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="u-date">
                    Data prevista de inauguração *
                  </label>
                  <input
                    id="u-date"
                    type="date"
                    className={`field-input${formError && !form.inauguration_date ? ' field-input--error' : ''}`}
                    value={form.inauguration_date}
                    onChange={set('inauguration_date')}
                    min={minInaugDate()}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.7 }}>
                    Mínimo 30 dias a partir de hoje
                  </span>
                </div>

                {formError && <p className="modal-error">{formError}</p>}

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleStep1Next}>
                    Próximo →
                  </button>
                </div>
              </div>
            )}

            {/* ── Passo 2: Resumo + criação ────────────────────────── */}
            {wizardStep === 2 && (
              <div className="modal-form">

                {/* Resumo da unidade */}
                <div className="wizard-summary">
                  <h4 className="wizard-summary-title">Resumo</h4>
                  <div className="wizard-summary-row">
                    <span className="wizard-summary-label">Nome</span>
                    <span className="wizard-summary-value">{form.name}</span>
                  </div>
                  {(form.city || form.state) && (
                    <div className="wizard-summary-row">
                      <span className="wizard-summary-label">Localização</span>
                      <span className="wizard-summary-value">
                        {[form.city, form.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {form.start_date && (
                    <div className="wizard-summary-row">
                      <span className="wizard-summary-label">Início da operação</span>
                      <span className="wizard-summary-value">
                        {formatDate(form.start_date)}
                      </span>
                    </div>
                  )}
                  <div className="wizard-summary-row">
                    <span className="wizard-summary-label">Inauguração</span>
                    <span className="wizard-summary-value">
                      {formatDate(form.inauguration_date ?? null)}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  A unidade será criada sem tarefas. Use o botão <strong>⚙</strong> na timeline para adicionar tarefas do template ou criar tarefas personalizadas.
                </p>

                {createError && <p className="modal-error">{createError}</p>}

                <div className="modal-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
                  {!createdUnit && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setWizardStep(1); setCreateError('') }}
                      disabled={creating}
                    >
                      ← Voltar
                    </button>
                  )}
                  {createdUnit && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => navigate(`/units/${createdUnit.id}`)}
                      disabled={creating}
                    >
                      Ir para a unidade →
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCreate}
                    disabled={creating}
                    style={{ marginLeft: 'auto' }}
                  >
                    {creating ? 'Criando...' : '✓ Criar unidade'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
