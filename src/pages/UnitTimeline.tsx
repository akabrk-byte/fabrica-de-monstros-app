import {
  useState, useEffect, useCallback, useMemo,
  type CSSProperties,
} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { getUnit, type Unit } from '../services/unitsService'
import {
  listTasksByUnit, updateTaskStatus, deleteTask,
  type Task, type TaskStatus, type TaskCategory,
} from '../services/tasksService'
import { seedUnitWithTasks, deleteUnitTasks } from '../services/seedUnit'
import { TaskManagerModal } from '../components/TaskManagerModal'
import { TaskDetailModal } from '../components/TaskDetailModal'
import { ResponsibleSelector } from '../components/ResponsibleSelector'
import { logAction } from '../services/historyService'
import { supabase } from '../lib/supabase'
import '../pages/Home.css'
import './pages.css'
import './UnitTimeline.css'

// ─── Constantes ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<TaskStatus, string> = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  concluido:    'Concluído',
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
  jurídico:   { bg: 'rgba(59,130,246,.14)',  color: '#60a5fa'  },
  engenharia: { bg: 'rgba(249,115,22,.14)',  color: '#fb923c'  },
  compras:    { bg: 'rgba(34,197,94,.14)',   color: '#4ade80'  },
  marketing:  { bg: 'rgba(168,85,247,.14)',  color: '#c084fc'  },
  operação:   { bg: 'rgba(234,179,8,.14)',   color: '#facc15'  },
  sistemas:   { bg: 'rgba(6,182,212,.14)',   color: '#22d3ee'  },
  rh:         { bg: 'rgba(236,72,153,.14)',  color: '#f472b6'  },
}

const STATUS_STYLE: Record<TaskStatus, CSSProperties> = {
  nao_iniciado: { background: 'var(--code-bg)', color: 'var(--text)' },
  em_andamento: { background: 'rgba(59,130,246,.14)', color: '#3b82f6' },
  concluido:    { background: 'rgba(16,185,129,.14)', color: '#10b981' },
  bloqueado:    { background: 'rgba(239,68,68,.12)',  color: '#ef4444' },
}

const UNIT_STATUS_LABEL: Record<Unit['status'], string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  inaugurada:   'Inaugurada',
  cancelada:    'Cancelada',
}

const PHASE_COLORS: Record<number, string> = {
  0: '#6366f1',
  1: '#8b5cf6',
  2: '#3b82f6',
  3: '#f59e0b',
  4: '#10b981',
  5: '#6b7280',
}

const ALL_STATUSES:    TaskStatus[]   = ['nao_iniciado', 'em_andamento', 'concluido', 'bloqueado']
const ALL_CATEGORIES:  TaskCategory[] = ['jurídico', 'engenharia', 'compras', 'marketing', 'operação', 'sistemas', 'rh']

// ─── Perfis ───────────────────────────────────────────────────────────

export interface ProfileSummary {
  id:        string
  full_name: string
  username:  string | null
}

const AVATAR_PALETTE = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#e53900', '#ec4899']

function avatarColor(name: string): string {
  const n = [...name].reduce((s, c) => s + c.charCodeAt(0), 0)
  return AVATAR_PALETTE[n % AVATAR_PALETTE.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

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
  if (!task.data_planejada || task.status === 'concluido') return false
  const [y, m, d] = task.data_planejada.split('-').map(Number)
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
  task:               Task
  responsibleProfile: ProfileSummary | null
  onStatusChange:     (id: string, s: TaskStatus) => void
  onDeleteTask:       (id: string) => void
  onCardClick:        (task: Task) => void
  onAssignUpdate:     () => void
  updating:           boolean
  deleting:           boolean
}

function TaskCard({
  task, responsibleProfile, onStatusChange, onDeleteTask,
  onCardClick, onAssignUpdate, updating, deleting,
}: TaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [assigning,     setAssigning]     = useState(false)

  const overdue  = isOverdue(task)
  const dayLabel = dueDayLabel(task.offset_dias)
  const done     = task.status === 'concluido'

  const handleDeleteClick = () => setConfirmDelete(true)
  const handleDeleteConfirm = () => { onDeleteTask(task.id); setConfirmDelete(false) }
  const handleDeleteCancel  = () => setConfirmDelete(false)

  return (
    <div
      className={[
        'task-card',
        done     ? 'task-card--done'     : '',
        updating ? 'task-card--updating' : '',
        deleting ? 'task-card--deleting' : '',
        overdue  ? 'task-card--overdue'  : '',
      ].filter(Boolean).join(' ')}
      style={{ borderLeftColor: done ? '#10b981' : overdue ? '#ef4444' : 'var(--border)' }}
    >
      <div className="task-card-top">
        <CategoryBadge category={task.categoria} />
        <div className="task-card-controls">
          {!done && (
            <button
              className="btn-complete"
              onClick={() => onStatusChange(task.id, 'concluido')}
              disabled={updating || deleting}
              title="Marcar como concluído"
            >
              <span className="btn-complete-icon">✓</span>
              <span className="btn-complete-text"> Concluir</span>
            </button>
          )}
          <select
            className="status-select"
            style={STATUS_STYLE[task.status]}
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
            disabled={updating || deleting}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <button
            className="btn-delete-task"
            onClick={handleDeleteClick}
            disabled={updating || deleting}
            title="Remover tarefa"
          >
            ×
          </button>
        </div>
      </div>

      <button
        className={`task-title task-title--btn ${done ? 'task-title--done' : ''}`}
        onClick={() => onCardClick(task)}
        title="Ver detalhes"
      >
        {task.nome}
      </button>

      <div className="task-meta">
        {dayLabel && <span className="task-day-label">{dayLabel}</span>}
        {task.data_planejada && (
          <span className={`task-due-date ${overdue ? 'task-due-date--overdue' : ''}`}>
            {overdue ? '⚠ Atrasado · ' : ''}{formatDate(task.data_planejada)}
          </span>
        )}

        {/* ── Responsável ────────────────────────────────────────── */}
        {task.responsible_id && responsibleProfile ? (
          <button
            className="task-responsible"
            onClick={() => onCardClick(task)}
            title={`Responsável: ${responsibleProfile.full_name}`}
          >
            <span
              className="task-avatar"
              style={{ background: avatarColor(responsibleProfile.full_name) }}
            >
              {getInitials(responsibleProfile.full_name)}
            </span>
            <span className="task-responsible-name">
              @{responsibleProfile.username ?? responsibleProfile.full_name}
            </span>
          </button>
        ) : assigning ? (
          <ResponsibleSelector
            taskId={task.id}
            unitId={task.unit_id}
            currentResponsibleId={null}
            onUpdate={() => { onAssignUpdate(); setAssigning(false) }}
          />
        ) : (
          <button
            className="task-assign-btn"
            onClick={() => setAssigning(true)}
            disabled={updating || deleting}
          >
            — Atribuir
          </button>
        )}
      </div>

      {confirmDelete && (
        <div className="task-delete-confirm">
          <span className="task-delete-confirm-msg">
            {done
              ? 'Esta tarefa já foi concluída. Confirma a remoção?'
              : 'Tem certeza que deseja remover esta tarefa?'}
          </span>
          <div className="task-delete-confirm-actions">
            <button
              className="btn-delete-confirm"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Removendo...' : 'Remover'}
            </button>
            <button
              className="btn-delete-cancel"
              onClick={handleDeleteCancel}
              disabled={deleting}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface PhaseGroup {
  fase_order: number
  fase_nome:  string
}

interface PhaseSectionProps {
  phase:          PhaseGroup
  color:          string
  tasks:          Task[]
  allTasks:       Task[]
  profilesMap:    Map<string, ProfileSummary>
  onStatusChange: (id: string, s: TaskStatus) => void
  onDeleteTask:   (id: string) => void
  onCardClick:    (task: Task) => void
  onAssignUpdate: () => void
  updatingIds:    Set<string>
  deletingIds:    Set<string>
  onAddTask:      (faseOrder: number, faseNome: string) => void
  hasFilter:      boolean
}

function PhaseSection({ phase, color, tasks, allTasks, profilesMap, onStatusChange, onDeleteTask, onCardClick, onAssignUpdate, updatingIds, deletingIds, onAddTask, hasFilter }: PhaseSectionProps) {
  const completed = allTasks.filter((t) => t.status === 'concluido').length
  const total     = allTasks.length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : null

  if (hasFilter && tasks.length === 0) return null

  return (
    <section className="phase-section">
      <div className="phase-header">
        <div className="phase-header-left">
          <span className="phase-dot" style={{ background: color }} />
          <h3 className="phase-name">{phase.fase_nome}</h3>
          {pct === 100 && <span className="phase-done-badge">Concluída</span>}
        </div>
        <div className="phase-header-right">
          {pct !== null && (
            <>
              <span className="phase-stats">{completed}/{total}</span>
              <div className="phase-progress-bar">
                <div className="phase-progress-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </>
          )}
          <button
            className="phase-add-btn"
            onClick={() => onAddTask(phase.fase_order, phase.fase_nome)}
            title={`Adicionar tarefa em ${phase.fase_nome}`}
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
              responsibleProfile={task.responsible_id ? (profilesMap.get(task.responsible_id) ?? null) : null}
              onStatusChange={onStatusChange}
              onDeleteTask={onDeleteTask}
              onCardClick={onCardClick}
              onAssignUpdate={onAssignUpdate}
              updating={updatingIds.has(task.id)}
              deleting={deletingIds.has(task.id)}
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
  const [unit,        setUnit]        = useState<Unit | null>(null)
  const [tasks,       setTasks]       = useState<Task[]>([])
  const [profilesMap, setProfilesMap] = useState<Map<string, ProfileSummary>>(new Map())
  const [loading,     setLoading]     = useState(true)
  const [loadError,   setLoadError]   = useState<string | null>(null)

  // ── Filtros ──────────────────────────────────────────────────────────
  const [filterStatus,   setFilterStatus]   = useState<TaskStatus | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all')

  // ── Atualizações otimistas ───────────────────────────────────────────
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // ── Modal: detalhe da tarefa ─────────────────────────────────────────
  const [detailTask, setDetailTask] = useState<Task | null>(null)

  // ── Modal: gerenciar tarefas ─────────────────────────────────────────
  const [showTaskManager, setShowTaskManager] = useState(false)
  const [tmFaseOrder,     setTmFaseOrder]     = useState(0)
  const [tmFaseNome,      setTmFaseNome]      = useState('')

  // ── Regenerar tarefas ────────────────────────────────────────────────
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [regenerating,     setRegenerating]     = useState(false)
  const [regenError,       setRegenError]       = useState('')

  // ── Carga ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!unitId) return
    setLoading(true)
    setLoadError(null)
    try {
      const [u, ts, { data: profileRows }] = await Promise.all([
        getUnit(unitId),
        listTasksByUnit(unitId),
        supabase.from('profiles').select('id, full_name, username'),
      ])
      setUnit(u)
      setTasks(ts)
      setProfilesMap(
        new Map((profileRows ?? []).map((p) => [p.id, p as ProfileSummary]))
      )
    } catch {
      setLoadError('Não foi possível carregar os dados da unidade.')
    } finally {
      setLoading(false)
    }
  }, [unitId])

  useEffect(() => { loadData() }, [loadData])

  // Escape fecha modais
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailTask(null)
        setShowTaskManager(false)
        setShowRegenConfirm(false)
      }
    }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [])

  // ── Atualização de status (otimista) ──────────────────────────────────
  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const prev = tasks.find((t) => t.id === taskId)
    if (!prev) return

    setTasks((ts) => ts.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    setUpdatingIds((s) => new Set(s).add(taskId))

    try {
      const updated = await updateTaskStatus(taskId, newStatus)
      setTasks((ts) => ts.map((t) => t.id === taskId ? updated : t))

      // fire-and-forget — logAction nunca lança
      void logAction({
        task_id:     taskId,
        unit_id:     prev.unit_id,
        action:      'status_changed',
        description: `Status alterado: ${STATUS_LABEL[prev.status]} → ${STATUS_LABEL[newStatus]}`,
        old_value:   STATUS_LABEL[prev.status],
        new_value:   STATUS_LABEL[newStatus],
      })
    } catch {
      setTasks((ts) => ts.map((t) => t.id === taskId ? prev : t))
    } finally {
      setUpdatingIds((s) => { const n = new Set(s); n.delete(taskId); return n })
    }
  }, [tasks])

  // ── Remover tarefa ────────────────────────────────────────────────────
  const handleDeleteTask = useCallback(async (taskId: string) => {
    setDeletingIds((s) => new Set(s).add(taskId))
    try {
      await deleteTask(taskId)
      setTasks((ts) => ts.filter((t) => t.id !== taskId))
    } catch {
      // silently restore — task stays in list
    } finally {
      setDeletingIds((s) => { const n = new Set(s); n.delete(taskId); return n })
    }
  }, [])

  // ── Abrir modal de tarefas ────────────────────────────────────────────
  const openAddModal = (faseOrder: number, faseNome: string) => {
    setTmFaseOrder(faseOrder)
    setTmFaseNome(faseNome)
    setShowTaskManager(true)
  }

  // ── Regenerar tarefas ─────────────────────────────────────────────────
  const handleRegenerate = async () => {
    if (!unitId || !unit?.inauguration_date) {
      setRegenError('Defina uma data de inauguração antes de regenerar.')
      return
    }
    setRegenerating(true)
    setRegenError('')
    try {
      await deleteUnitTasks(unitId)
      await seedUnitWithTasks(unitId, new Date(unit.inauguration_date))
      await loadData()
      setShowRegenConfirm(false)
    } catch {
      setRegenError('Erro ao regenerar tarefas. Tente novamente.')
    } finally {
      setRegenerating(false)
    }
  }

  // ── Derivados ─────────────────────────────────────────────────────────
  const hasFilter = filterStatus !== 'all' || filterCategory !== 'all'

  const filteredTasks = useMemo(() =>
    tasks.filter((t) => {
      if (filterStatus   !== 'all' && t.status   !== filterStatus)   return false
      if (filterCategory !== 'all' && t.categoria !== filterCategory) return false
      return true
    }),
  [tasks, filterStatus, filterCategory])

  const phases = useMemo(() => {
    const map = new Map<number, PhaseGroup>()
    for (const t of tasks) {
      if (!map.has(t.fase_order)) {
        map.set(t.fase_order, { fase_order: t.fase_order, fase_nome: t.fase_nome })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.fase_order - b.fase_order)
  }, [tasks])

  const tasksByPhase = useMemo(() => {
    const map = new Map<number, Task[]>()
    for (const t of filteredTasks) {
      const arr = map.get(t.fase_order) ?? []
      arr.push(t)
      map.set(t.fase_order, arr)
    }
    return map
  }, [filteredTasks])

  const allTasksByPhase = useMemo(() => {
    const map = new Map<number, Task[]>()
    for (const t of tasks) {
      const arr = map.get(t.fase_order) ?? []
      arr.push(t)
      map.set(t.fase_order, arr)
    }
    return map
  }, [tasks])

  const totalDone  = tasks.filter((t) => t.status === 'concluido').length
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
              <button
                className="tl-regen-btn"
                onClick={() => { setRegenError(''); setShowRegenConfirm(true) }}
                title="Regenerar tarefas"
              >
                ⚙
              </button>
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

          {/* ── Vazio: sem tarefas ──────────────────────────────────── */}
          {totalTasks === 0 && (
            <div className="units-feedback" style={{ flex: 'none', padding: '40px 0' }}>
              <h3 className="units-feedback-title">Nenhuma tarefa cadastrada</h3>
              <p className="units-feedback-desc">
                Clique no ⚙ para gerar o template completo de implantação.
              </p>
            </div>
          )}

          {/* ── Filtros ────────────────────────────────────────────── */}
          {totalTasks > 0 && (
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
          )}

          {/* ── Fases ──────────────────────────────────────────────── */}
          {phases.length > 0 && (
            <div className="tl-phases">
              {phases.map((phase) => (
                <PhaseSection
                  key={phase.fase_order}
                  phase={phase}
                  color={PHASE_COLORS[phase.fase_order] ?? '#6b7280'}
                  tasks={tasksByPhase.get(phase.fase_order) ?? []}
                  allTasks={allTasksByPhase.get(phase.fase_order) ?? []}
                  profilesMap={profilesMap}
                  onStatusChange={handleStatusChange}
                  onDeleteTask={handleDeleteTask}
                  onCardClick={setDetailTask}
                  onAssignUpdate={loadData}
                  updatingIds={updatingIds}
                  deletingIds={deletingIds}
                  onAddTask={openAddModal}
                  hasFilter={hasFilter}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Confirmar regeneração ───────────────────────────────── */}
      {showRegenConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowRegenConfirm(false) } }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="regen-title">
            <div className="modal-header">
              <h2 className="modal-title" id="regen-title">Regenerar tarefas?</h2>
              <button className="modal-close" onClick={() => setShowRegenConfirm(false)} aria-label="Fechar">✕</button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
              Isso irá <strong>apagar todas as tarefas atuais</strong> e recriar o template
              completo de implantação com base na data de inauguração.
              <br /><br />
              Tarefas criadas manualmente e alterações de status serão perdidas.
            </p>
            {regenError && <p className="modal-error">{regenError}</p>}
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRegenConfirm(false)}
                disabled={regenerating}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRegenerate}
                disabled={regenerating || !unit?.inauguration_date}
                style={!unit?.inauguration_date ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              >
                {regenerating ? 'Regenerando...' : 'Confirmar regeneração'}
              </button>
            </div>
            {!unit?.inauguration_date && (
              <p style={{ fontSize: '13px', color: '#f59e0b', margin: 0 }}>
                ⚠ Defina uma data de inauguração na unidade para habilitar a regeneração.
              </p>
            )}
          </div>
        </div>
      )}

      <TaskManagerModal
        isOpen={showTaskManager}
        onClose={() => setShowTaskManager(false)}
        unitId={unit?.id ?? ''}
        faseOrder={tmFaseOrder}
        faseNome={tmFaseNome}
        dataInauguracao={unit?.inauguration_date ?? ''}
        existingTasks={tasks}
        onTasksAdded={loadData}
      />

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  )
}
