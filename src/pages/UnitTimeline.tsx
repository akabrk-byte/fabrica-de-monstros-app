import {
  useState, useEffect, useCallback, useMemo,
  type FormEvent, type CSSProperties,
} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { getUnit, type Unit } from '../services/unitsService'
import {
  listMilestones, listTasksByUnit, updateTaskStatus, createTask,
  type Task, type Milestone, type TaskStatus, type TaskCategory,
} from '../services/tasksService'
import '../pages/Home.css'
import './pages.css'
import './UnitTimeline.css'

// ─── Constantes ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<TaskStatus, string> = {
  não_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  concluído:    'Concluído',
  bloqueado:    'Bloqueado',
}

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  jurídico:   'Jurídico',
  engenharia: 'Engenharia',
  compras:    'Compras',
  marketing:  'Marketing',
  operação:   'Operação',
  sistemas:   'Sistemas',
  rh:         'RH',
}

const CATEGORY_COLOR: Record<TaskCategory, { bg: string; color: string }> = {
  jurídico:   { bg: 'rgba(124,58,237,.12)',  color: '#7c3aed' },
  engenharia: { bg: 'rgba(234,88,12,.12)',   color: '#ea580c' },
  compras:    { bg: 'rgba(8,145,178,.12)',   color: '#0891b2' },
  marketing:  { bg: 'rgba(219,39,119,.12)',  color: '#db2777' },
  operação:   { bg: 'rgba(22,163,74,.12)',   color: '#16a34a' },
  sistemas:   { bg: 'rgba(37,99,235,.12)',   color: '#2563eb' },
  rh:         { bg: 'rgba(217,119,6,.12)',   color: '#d97706' },
}

const STATUS_STYLE: Record<TaskStatus, CSSProperties> = {
  não_iniciado: { background: 'var(--code-bg)', color: 'var(--text)' },
  em_andamento: { background: 'rgba(59,130,246,.14)', color: '#3b82f6' },
  concluído:    { background: 'rgba(16,185,129,.14)', color: '#10b981' },
  bloqueado:    { background: 'rgba(239,68,68,.12)',  color: '#ef4444' },
}

const UNIT_STATUS_LABEL: Record<Unit['status'], string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  inaugurada:   'Inaugurada',
  cancelada:    'Cancelada',
}

const ALL_STATUSES: TaskStatus[]   = ['não_iniciado', 'em_andamento', 'concluído', 'bloqueado']
const ALL_CATEGORIES: TaskCategory[] = ['jurídico', 'engenharia', 'compras', 'marketing', 'operação', 'sistemas', 'rh']

const EMPTY_ADD = { title: '', category: 'operação' as TaskCategory, due_date: '' }

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

function countdown(dateStr: string | null): string | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today  = new Date(); today.setHours(0, 0, 0, 0)
  const diff   = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diff > 0)  return `${diff} dias para inauguração`
  if (diff === 0) return 'Inauguração hoje!'
  return `Inaugurada há ${Math.abs(diff)} dias`
}

function dueDayLabel(days: number | null): string | null {
  if (days === null) return null
  if (days === 0) return 'D0'
  return days > 0 ? `D+${days}` : `D${days}`
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'concluído') return false
  const [y, m, d] = task.due_date.split('-').map(Number)
  const due   = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return due < today
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function CategoryBadge({ category }: { category: TaskCategory }) {
  const { bg, color } = CATEGORY_COLOR[category]
  return (
    <span className="cat-badge" style={{ background: bg, color }}>
      {CATEGORY_LABEL[category]}
    </span>
  )
}

interface TaskCardProps {
  task:           Task
  onStatusChange: (id: string, s: TaskStatus) => void
  updating:       boolean
}

function TaskCard({ task, onStatusChange, updating }: TaskCardProps) {
  const overdue   = isOverdue(task)
  const dayLabel  = dueDayLabel(task.days_before_inauguration)
  const done      = task.status === 'concluído'
  const respName  = Array.isArray(task.responsible)
    ? (task.responsible as { full_name: string }[])[0]?.full_name
    : task.responsible?.full_name

  return (
    <div className={`task-card ${done ? 'task-card--done' : ''} ${updating ? 'task-card--updating' : ''} ${overdue ? 'task-card--overdue' : ''}`}
      style={{ borderLeftColor: done ? '#10b981' : overdue ? '#ef4444' : 'var(--border)' }}>

      <div className="task-card-top">
        <CategoryBadge category={task.category} />
        <div className="task-card-controls">
          {!done && (
            <button
              className="btn-complete"
              onClick={() => onStatusChange(task.id, 'concluído')}
              disabled={updating}
              title="Marcar como concluído"
            >
              ✓ Concluir
            </button>
          )}
          <select
            className="status-select"
            style={STATUS_STYLE[task.status]}
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
            disabled={updating}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <p className={`task-title ${done ? 'task-title--done' : ''}`}>{task.title}</p>

      <div className="task-meta">
        {dayLabel && <span className="task-day-label">{dayLabel}</span>}
        {task.due_date && (
          <span className={`task-due-date ${overdue ? 'task-due-date--overdue' : ''}`}>
            {overdue ? '⚠ Atrasado · ' : ''}{formatDate(task.due_date)}
          </span>
        )}
        {respName && <span className="task-responsible">{respName}</span>}
      </div>
    </div>
  )
}

interface PhaseSectionProps {
  milestone:      Milestone
  tasks:          Task[]
  allTasks:       Task[]   // tasks pré-filtro, para progresso real
  onStatusChange: (id: string, s: TaskStatus) => void
  updatingIds:    Set<string>
  onAddTask:      (milestoneId: string) => void
  hasFilter:      boolean
}

function PhaseSection({ milestone, tasks, allTasks, onStatusChange, updatingIds, onAddTask, hasFilter }: PhaseSectionProps) {
  const completed = allTasks.filter((t) => t.status === 'concluído').length
  const total     = allTasks.length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : null

  // Com filtro ativo, oculta fases sem tarefas
  if (hasFilter && tasks.length === 0) return null

  return (
    <section className="phase-section">
      <div className="phase-header">
        <div className="phase-header-left">
          <span className="phase-dot" style={{ background: milestone.color }} />
          <h3 className="phase-name">{milestone.name}</h3>
          {pct === 100 && <span className="phase-done-badge">Concluída</span>}
        </div>
        <div className="phase-header-right">
          {pct !== null && (
            <>
              <span className="phase-stats">{completed}/{total}</span>
              <div className="phase-progress-bar">
                <div className="phase-progress-fill"
                  style={{ width: `${pct}%`, background: milestone.color }} />
              </div>
            </>
          )}
          <button
            className="phase-add-btn"
            onClick={() => onAddTask(milestone.id)}
            title={`Adicionar tarefa em ${milestone.name}`}
          >
            +
          </button>
        </div>
      </div>

      {tasks.length > 0 ? (
        <div className="phase-tasks">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              updating={updatingIds.has(task.id)}
            />
          ))}
        </div>
      ) : (
        <p className="phase-empty">Nenhuma tarefa nesta fase ainda.</p>
      )}
    </section>
  )
}

// ─── Página principal ─────────────────────────────────────────────────

export default function UnitTimeline() {
  const { id: unitId } = useParams<{ id: string }>()
  const navigate       = useNavigate()

  // ── Dados ────────────────────────────────────────────────────────────
  const [unit,       setUnit]       = useState<Unit | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState<string | null>(null)

  // ── Filtros ──────────────────────────────────────────────────────────
  const [filterStatus,   setFilterStatus]   = useState<TaskStatus | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all')

  // ── Atualizações otimistas ───────────────────────────────────────────
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  // ── Modal: nova tarefa ───────────────────────────────────────────────
  const [showAdd,        setShowAdd]        = useState(false)
  const [addMilestoneId, setAddMilestoneId] = useState('')
  const [addForm,        setAddForm]        = useState(EMPTY_ADD)
  const [addError,       setAddError]       = useState('')
  const [addSubmitting,  setAddSubmitting]  = useState(false)

  // ── Carga ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!unitId) return
    setLoading(true)
    setLoadError(null)
    try {
      const [u, ms, ts] = await Promise.all([
        getUnit(unitId),
        listMilestones(),
        listTasksByUnit(unitId),
      ])
      setUnit(u)
      setMilestones(ms)
      setTasks(ts)
    } catch {
      setLoadError('Não foi possível carregar os dados da unidade.')
    } finally {
      setLoading(false)
    }
  }, [unitId])

  useEffect(() => { loadData() }, [loadData])

  // Escape fecha modal
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAdd(false) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [])

  // ── Atualização de status (otimista) ──────────────────────────────────
  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const prev = tasks.find((t) => t.id === taskId)
    if (!prev) return

    setTasks((ts) => ts.map((t) =>
      t.id === taskId
        ? { ...t, status: newStatus, completed_at: newStatus === 'concluído' ? new Date().toISOString() : null }
        : t
    ))
    setUpdatingIds((s) => new Set(s).add(taskId))

    try {
      const updated = await updateTaskStatus(taskId, newStatus)
      setTasks((ts) => ts.map((t) => t.id === taskId ? updated : t))
    } catch {
      setTasks((ts) => ts.map((t) => t.id === taskId ? prev : t))
    } finally {
      setUpdatingIds((s) => { const n = new Set(s); n.delete(taskId); return n })
    }
  }, [tasks])

  // ── Criar tarefa ──────────────────────────────────────────────────────
  const openAddModal = (milestoneId: string) => {
    setAddMilestoneId(milestoneId)
    setAddForm(EMPTY_ADD)
    setAddError('')
    setShowAdd(true)
  }

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault()
    if (!addForm.title.trim()) { setAddError('Informe o título da tarefa.'); return }
    if (!unit) return

    setAddSubmitting(true)
    setAddError('')
    try {
      const created = await createTask({
        unit_id:      unit.id,
        milestone_id: addMilestoneId,
        title:        addForm.title,
        category:     addForm.category,
        due_date:     addForm.due_date || undefined,
      })
      setTasks((prev) => [...prev, created])
      setShowAdd(false)
    } catch {
      setAddError('Erro ao criar tarefa. Tente novamente.')
    } finally {
      setAddSubmitting(false)
    }
  }

  // ── Derivados ─────────────────────────────────────────────────────────
  const hasFilter = filterStatus !== 'all' || filterCategory !== 'all'

  const filteredTasks = useMemo(() =>
    tasks.filter((t) => {
      if (filterStatus   !== 'all' && t.status   !== filterStatus)   return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      return true
    }),
  [tasks, filterStatus, filterCategory])

  const tasksByMilestone = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of filteredTasks) {
      const arr = map.get(t.milestone_id) ?? []
      arr.push(t)
      map.set(t.milestone_id, arr)
    }
    return map
  }, [filteredTasks])

  const allTasksByMilestone = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const arr = map.get(t.milestone_id) ?? []
      arr.push(t)
      map.set(t.milestone_id, arr)
    }
    return map
  }, [tasks])

  const totalDone  = tasks.filter((t) => t.status === 'concluído').length
  const totalTasks = tasks.length
  const totalPct   = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <AppHeader title="Timeline" />

      {/* ── Loading / erro ───────────────────────────────────────────── */}
      {loading && (
        <div className="units-feedback">
          <p className="units-feedback-desc">Carregando timeline...</p>
        </div>
      )}

      {!loading && loadError && (
        <div className="units-feedback units-feedback--error">
          <h3 className="units-feedback-title">Erro ao carregar</h3>
          <p className="units-feedback-desc">{loadError}</p>
          <button className="btn btn-secondary"
            onClick={loadData}
            style={{ marginTop: '8px', fontSize: '14px', padding: '8px 18px' }}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !loadError && unit && (
        <div className="timeline-content">

          {/* ── Cabeçalho da unidade ───────────────────────────────── */}
          <div className="tl-unit-header">
            <div className="tl-unit-header-top">
              <button className="page-back" onClick={() => navigate('/units')}>
                ← Unidades
              </button>
              <span className={`unit-status unit-status--${unit.status}`}>
                {UNIT_STATUS_LABEL[unit.status]}
              </span>
            </div>
            <h2 className="tl-unit-name">{unit.name}</h2>
            <div className="tl-unit-meta">
              {(unit.city || unit.state) && (
                <span>{[unit.city, unit.state].filter(Boolean).join(', ')}</span>
              )}
              {unit.inauguration_date && (
                <span>Inauguração: <strong>{formatDate(unit.inauguration_date)}</strong></span>
              )}
              {countdown(unit.inauguration_date) && (
                <span className="tl-countdown">{countdown(unit.inauguration_date)}</span>
              )}
            </div>
          </div>

          {/* ── Progresso geral ────────────────────────────────────── */}
          {totalTasks > 0 && (
            <div className="tl-progress-card">
              <div className="tl-progress-row">
                <span className="tl-progress-label">
                  {totalDone} de {totalTasks} tarefas concluídas
                </span>
                <span className="tl-progress-pct">{totalPct}%</span>
              </div>
              <div className="tl-progress-bar">
                <div className="tl-progress-fill" style={{ width: `${totalPct}%` }} />
              </div>
            </div>
          )}

          {/* ── Filtros ────────────────────────────────────────────── */}
          <div className="tl-filters">
            <select
              className="tl-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            >
              <option value="all">Todos os status</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <select
              className="tl-filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}
            >
              <option value="all">Todas as categorias</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
            {hasFilter && (
              <button
                className="tl-clear-filters"
                onClick={() => { setFilterStatus('all'); setFilterCategory('all') }}
              >
                Limpar filtros
              </button>
            )}
            <span className="tl-filter-count">
              {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
              {hasFilter ? ' encontradas' : ''}
            </span>
          </div>

          {/* ── Fases ──────────────────────────────────────────────── */}
          <div className="tl-phases">
            {milestones.map((m) => (
              <PhaseSection
                key={m.id}
                milestone={m}
                tasks={tasksByMilestone.get(m.id) ?? []}
                allTasks={allTasksByMilestone.get(m.id) ?? []}
                onStatusChange={handleStatusChange}
                updatingIds={updatingIds}
                onAddTask={openAddModal}
                hasFilter={hasFilter}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Modal: Nova tarefa ──────────────────────────────────────── */}
      {showAdd && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-task-title">
            <div className="modal-header">
              <h2 className="modal-title" id="add-task-title">Nova tarefa</h2>
              <button className="modal-close" onClick={() => setShowAdd(false)} aria-label="Fechar">✕</button>
            </div>
            <form className="modal-form" onSubmit={handleAddTask} noValidate>
              <div className="field">
                <label className="field-label" htmlFor="t-title">Título *</label>
                <input
                  id="t-title"
                  type="text"
                  className={`field-input${!addForm.title.trim() && addError ? ' field-input--error' : ''}`}
                  placeholder="Ex: Aprovação do projeto arquitetônico"
                  value={addForm.title}
                  onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                  autoFocus
                  disabled={addSubmitting}
                />
              </div>

              <div className="modal-row">
                <div className="field">
                  <label className="field-label" htmlFor="t-category">Categoria *</label>
                  <select
                    id="t-category"
                    className="field-input"
                    value={addForm.category}
                    onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value as TaskCategory }))}
                    disabled={addSubmitting}
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="t-date">Prazo</label>
                  <input
                    id="t-date"
                    type="date"
                    className="field-input"
                    value={addForm.due_date}
                    onChange={(e) => setAddForm((f) => ({ ...f, due_date: e.target.value }))}
                    disabled={addSubmitting}
                  />
                </div>
              </div>

              {addError && <p className="modal-error">{addError}</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowAdd(false)} disabled={addSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={addSubmitting}>
                  {addSubmitting ? 'Criando...' : 'Criar tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
