import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import {
  listUnits,
  listTaskStats,
  createUnit,
  type Unit,
  type TaskStats,
  type CreateUnitData,
} from '../services/unitsService'
import '../pages/Home.css'   // .btn .btn-primary .btn-secondary
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

// ─── Formulário inicial ──────────────────────────────────────────────

const EMPTY_FORM: CreateUnitData = {
  name: '',
  city: '',
  state: '',
  inauguration_date: '',
}

const BR_STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO',
  'MA','MG','MS','MT','PA','PB','PE','PI','PR',
  'RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

// ─── Página principal ────────────────────────────────────────────────

export default function Units() {
  const navigate = useNavigate()
  const [units,      setUnits]      = useState<Unit[]>([])
  const [statsMap,   setStatsMap]   = useState<Map<string, TaskStats>>(new Map())
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState<string | null>(null)

  const [showModal,  setShowModal]  = useState(false)
  const [form,       setForm]       = useState<CreateUnitData>(EMPTY_FORM)
  const [formError,  setFormError]  = useState('')
  const [creating,   setCreating]   = useState(false)

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

  // ── Modal ──────────────────────────────────────────────────────────

  function openModal()  { setForm(EMPTY_FORM); setFormError(''); setShowModal(true) }
  function closeModal() { setShowModal(false) }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Informe o nome da unidade.'); return }

    setCreating(true)
    setFormError('')
    try {
      const created = await createUnit(form)
      setUnits((prev) => [created, ...prev])
      setStatsMap((prev) => new Map(prev).set(created.id, { unit_id: created.id, total: 0, completed: 0 }))
      closeModal()
    } catch {
      setFormError('Erro ao criar unidade. Tente novamente.')
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

      {/* ── Modal: Nova unidade ────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

            <div className="modal-header">
              <h2 className="modal-title" id="modal-title">Nova unidade</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Fechar">✕</button>
            </div>

            <form className="modal-form" onSubmit={handleCreate} noValidate>

              <div className="field">
                <label className="field-label" htmlFor="u-name">Nome *</label>
                <input
                  id="u-name"
                  type="text"
                  className={`field-input${!form.name.trim() && formError ? ' field-input--error' : ''}`}
                  placeholder="Ex: Unidade Campinas — Taquaral"
                  value={form.name}
                  onChange={set('name')}
                  autoFocus
                  disabled={creating}
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
                    disabled={creating}
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="u-state">Estado</label>
                  <select
                    id="u-state"
                    className="field-input"
                    value={form.state}
                    onChange={set('state')}
                    disabled={creating}
                  >
                    <option value="">—</option>
                    {BR_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="u-date">Data prevista de inauguração</label>
                <input
                  id="u-date"
                  type="date"
                  className="field-input"
                  value={form.inauguration_date}
                  onChange={set('inauguration_date')}
                  disabled={creating}
                />
              </div>

              {formError && <p className="modal-error">{formError}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Criando...' : 'Criar unidade'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
