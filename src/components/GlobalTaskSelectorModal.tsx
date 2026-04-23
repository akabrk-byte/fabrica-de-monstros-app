import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { createTask, deleteTask, type Task, type TaskCategory, type TaskStatus } from '../services/tasksService'
import { logAction } from '../services/historyService'
import { TASK_TEMPLATES } from '../data/taskTemplates'
import './GlobalTaskSelectorModal.css'

// ─── Constantes ───────────────────────────────────────────────────────

const ALL_CATEGORIES: TaskCategory[] = [
  'jurídico', 'engenharia', 'compras', 'marketing', 'operação', 'sistemas', 'rh',
]

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  jurídico: 'Jurídico', engenharia: 'Engenharia', compras: 'Compras',
  marketing: 'Marketing', operação: 'Operação', sistemas: 'Sistemas', rh: 'RH',
}

const PHASE_COLORS: Record<number, string> = {
  0: '#6366f1', 1: '#8b5cf6', 2: '#3b82f6',
  3: '#f59e0b', 4: '#10b981', 5: '#6b7280',
}

const PHASE_GROUPS: [number, { fase_nome: string; tasks: typeof TASK_TEMPLATES }][] = (() => {
  const map = new Map<number, { fase_nome: string; tasks: typeof TASK_TEMPLATES }>()
  for (const t of TASK_TEMPLATES) {
    if (!map.has(t.fase_order)) map.set(t.fase_order, { fase_nome: t.fase_nome, tasks: [] })
    map.get(t.fase_order)!.tasks.push(t)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a - b)
})()

// ─── Props ────────────────────────────────────────────────────────────

interface Props {
  isOpen:          boolean
  onClose:         () => void
  unitId:          string
  inaugurationDate: string
  existingTasks:   Task[]
  onTasksAdded:    () => void
}

type Tab = 'template' | 'nova'

// ─── Componente ───────────────────────────────────────────────────────

export function GlobalTaskSelectorModal({
  isOpen, onClose, unitId, inaugurationDate, existingTasks, onTasksAdded,
}: Props) {
  const [tab,           setTab]           = useState<Tab>('template')
  const [checkedNames,  setCheckedNames]  = useState<Set<string>>(new Set())
  const [originalNames, setOriginalNames] = useState<Set<string>>(new Set())
  const [collapsed,     setCollapsed]     = useState<Set<number>>(new Set())
  const [submitting,    setSubmitting]    = useState(false)
  const [error,         setError]         = useState('')

  const [form, setForm] = useState({
    nome: '', categoria: 'operação' as TaskCategory,
    fase_order: PHASE_GROUPS[0]?.[0] ?? 0, data_planejada: '',
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const names = new Set(existingTasks.map((t) => t.nome))
    setCheckedNames(new Set(names))
    setOriginalNames(new Set(names))
    setCollapsed(new Set())
    setError('')
    setTab('template')
    setForm({ nome: '', categoria: 'operação', fase_order: PHASE_GROUPS[0]?.[0] ?? 0, data_planejada: '' })
    setFormError('')
  }, [isOpen, existingTasks])

  const toAdd = useMemo(() => {
    const out: string[] = []
    for (const n of checkedNames) if (!originalNames.has(n)) out.push(n)
    return out
  }, [checkedNames, originalNames])

  const toRemove = useMemo(() => {
    const out: string[] = []
    for (const n of originalNames) if (!checkedNames.has(n)) out.push(n)
    return out
  }, [checkedNames, originalNames])

  const hasPendingChanges = toAdd.length > 0 || toRemove.length > 0

  if (!isOpen) return null

  // ── Helpers ──────────────────────────────────────────────────────────

  function seqDate(index: number): string | null {
    if (!inaugurationDate) return null
    const d = new Date(inaugurationDate + 'T00:00:00')
    d.setDate(d.getDate() + (index + 1) * 3)
    return d.toISOString().split('T')[0]
  }

  function toggleTask(nome: string) {
    setCheckedNames((prev) => {
      const next = new Set(prev)
      if (next.has(nome)) next.delete(nome); else next.add(nome)
      return next
    })
  }

  function togglePhase(tasks: typeof TASK_TEMPLATES) {
    const allChecked = tasks.every((t) => checkedNames.has(t.nome))
    setCheckedNames((prev) => {
      const next = new Set(prev)
      if (allChecked) tasks.forEach((t) => next.delete(t.nome))
      else tasks.forEach((t) => next.add(t.nome))
      return next
    })
  }

  function toggleCollapse(order: number) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(order)) next.delete(order); else next.add(order)
      return next
    })
  }

  // ── Salvar seleção ────────────────────────────────────────────────────

  async function handleSave() {
    if (!hasPendingChanges) { onClose(); return }
    setSubmitting(true)
    setError('')
    try {
      if (toAdd.length > 0) {
        const templateIndexMap = new Map(TASK_TEMPLATES.map((t, i) => [t.nome, i]))
        const sorted = toAdd
          .map((nome) => TASK_TEMPLATES.find((t) => t.nome === nome)!)
          .filter(Boolean)
          .sort((a, b) => {
            if (a.fase_order !== b.fase_order) return a.fase_order - b.fase_order
            return (templateIndexMap.get(a.nome) ?? 0) - (templateIndexMap.get(b.nome) ?? 0)
          })

        const rows = sorted.map((t, idx) => ({
          unit_id:        unitId,
          nome:           t.nome,
          categoria:      t.categoria,
          fase_order:     t.fase_order,
          fase_nome:      t.fase_nome,
          offset_dias:    (idx + 1) * 3,
          data_planejada: seqDate(idx),
          status:         'nao_iniciado' as TaskStatus,
        }))
        const { error: err } = await supabaseAdmin.from('unit_tasks').insert(rows)
        if (err) throw err
        for (const nome of toAdd) {
          void logAction({ task_id: null, unit_id: unitId, action: 'created', description: 'Tarefa adicionada do template', task_title: nome })
        }
      }

      if (toRemove.length > 0) {
        const tasksToDelete = toRemove
          .map((nome) => existingTasks.find((t) => t.nome === nome))
          .filter((t): t is Task => !!t)
        for (const t of tasksToDelete) {
          void logAction({ task_id: t.id, unit_id: unitId, action: 'deleted', description: 'Tarefa removida', task_title: t.nome })
        }
        await Promise.all(tasksToDelete.map((t) => deleteTask(t.id)))
      }

      onTasksAdded()
      onClose()
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Criar tarefa personalizada ────────────────────────────────────────

  async function handleCreateTask(e: FormEvent) {
    e.preventDefault()
    if (!form.nome.trim())    { setFormError('Informe o nome da tarefa.'); return }
    if (!form.data_planejada) { setFormError('Informe a data prevista.'); return }
    setSubmitting(true)
    setFormError('')
    try {
      const phaseInfo = PHASE_GROUPS.find(([o]) => o === form.fase_order)
      const fase_nome = phaseInfo?.[1].fase_nome ?? `Fase ${form.fase_order}`

      let offset_dias: number | undefined
      if (inaugurationDate && form.data_planejada) {
        const [y, m, d] = form.data_planejada.split('-').map(Number)
        const due   = new Date(y, m - 1, d)
        const inaug = new Date(inaugurationDate + 'T00:00:00')
        inaug.setHours(0, 0, 0, 0)
        offset_dias = Math.round((due.getTime() - inaug.getTime()) / 86_400_000)
      }

      const created = await createTask({
        unit_id:        unitId,
        nome:           form.nome.trim(),
        categoria:      form.categoria,
        fase_order:     form.fase_order,
        fase_nome,
        data_planejada: form.data_planejada,
        offset_dias,
      })
      void logAction({
        task_id:     created.id,
        unit_id:     unitId,
        action:      'created',
        description: 'Tarefa criada manualmente',
        task_title:  created.nome,
      })
      onTasksAdded()
      onClose()
    } catch {
      setFormError('Erro ao criar tarefa. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  const totalSelected = checkedNames.size

  return (
    <div
      className="gtm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose() }}
    >
      <div className="gtm-modal" role="dialog" aria-modal="true" aria-labelledby="gtm-title">

        {/* Header */}
        <div className="gtm-header">
          <div>
            <h2 className="gtm-title" id="gtm-title">Tarefas do template</h2>
            <p className="gtm-subtitle">
              {totalSelected} de {TASK_TEMPLATES.length} selecionadas
            </p>
          </div>
          <button className="gtm-close" onClick={onClose} disabled={submitting} aria-label="Fechar">✕</button>
        </div>

        {/* Tabs */}
        <div className="gtm-tabs">
          <button
            className={`gtm-tab${tab === 'template' ? ' gtm-tab--active' : ''}`}
            onClick={() => { setTab('template'); setError('') }}
            type="button"
          >
            Template ({TASK_TEMPLATES.length})
          </button>
          <button
            className={`gtm-tab${tab === 'nova' ? ' gtm-tab--active' : ''}`}
            onClick={() => { setTab('nova'); setFormError('') }}
            type="button"
          >
            + Nova tarefa
          </button>
        </div>

        {/* ── Aba 1: Seleção do template ──────────────────────────────── */}
        {tab === 'template' && (
          <div className="gtm-content">

            <div className="gtm-toolbar">
              <div className="gtm-toolbar-badges">
                {toAdd.length > 0 && (
                  <span className="gtm-badge gtm-badge--add">+{toAdd.length} para adicionar</span>
                )}
                {toRemove.length > 0 && (
                  <span className="gtm-badge gtm-badge--remove">−{toRemove.length} para remover</span>
                )}
                {!hasPendingChanges && (
                  <span className="gtm-toolbar-idle">Selecione as tarefas desejadas</span>
                )}
              </div>
              <div className="gtm-toolbar-actions">
                <button
                  type="button" className="gtm-toolbar-btn" disabled={submitting}
                  onClick={() => setCheckedNames(new Set(TASK_TEMPLATES.map((t) => t.nome)))}
                >
                  Selecionar tudo
                </button>
                <button
                  type="button" className="gtm-toolbar-btn" disabled={submitting}
                  onClick={() => setCheckedNames(new Set())}
                >
                  Desmarcar tudo
                </button>
              </div>
            </div>

            <div className="gtm-phases">
              {PHASE_GROUPS.map(([faseOrder, { fase_nome, tasks }]) => {
                const phaseChecked = tasks.filter((t) => checkedNames.has(t.nome)).length
                const allChecked   = phaseChecked === tasks.length
                const isCollapsed  = collapsed.has(faseOrder)
                const color        = PHASE_COLORS[faseOrder] ?? '#6b7280'

                return (
                  <div key={faseOrder} className="gtm-phase-group">
                    <div className="gtm-phase-header">
                      <button
                        type="button" className="gtm-phase-collapse"
                        onClick={() => toggleCollapse(faseOrder)}
                        aria-label={isCollapsed ? 'Expandir fase' : 'Recolher fase'}
                      >
                        {isCollapsed ? '▶' : '▼'}
                      </button>
                      <IndeterminateCheckbox
                        checked={allChecked}
                        indeterminate={phaseChecked > 0 && !allChecked}
                        disabled={submitting}
                        onChange={() => togglePhase(tasks)}
                      />
                      <span className="gtm-phase-dot" style={{ background: color }} />
                      <span className="gtm-phase-name">{fase_nome}</span>
                      <span className="gtm-phase-count">{phaseChecked}/{tasks.length}</span>
                    </div>

                    {!isCollapsed && (
                      <div className="gtm-task-list">
                        {tasks.map((t) => {
                          const isChecked  = checkedNames.has(t.nome)
                          const isExisting = originalNames.has(t.nome)
                          return (
                            <label
                              key={t.nome}
                              className={`gtm-task-item${isChecked ? '' : ' gtm-task-item--unchecked'}`}
                            >
                              <input
                                type="checkbox"
                                className="gtm-checkbox"
                                checked={isChecked}
                                onChange={() => toggleTask(t.nome)}
                                disabled={submitting}
                              />
                              <div className="gtm-item-body">
                                <span className="gtm-item-name">{t.nome}</span>
                                <div className="gtm-item-meta">
                                  <span className="gtm-item-cat">{CATEGORY_LABEL[t.categoria]}</span>
                                  <span className="gtm-item-offset">
                                    {t.offset_dias === 0 ? 'D0' : t.offset_dias > 0 ? `D+${t.offset_dias}` : `D${t.offset_dias}`}
                                  </span>
                                  {isExisting && (
                                    <span className="gtm-badge-existing">na unidade</span>
                                  )}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {error && <p className="gtm-error">{error}</p>}

            <div className="gtm-actions">
              <button type="button" className="gtm-btn gtm-btn--secondary" onClick={onClose} disabled={submitting}>
                Cancelar
              </button>
              <button type="button" className="gtm-btn gtm-btn--primary" onClick={handleSave} disabled={submitting}>
                {submitting ? 'Salvando...' : hasPendingChanges ? 'Salvar seleção' : 'Fechar'}
              </button>
            </div>
          </div>
        )}

        {/* ── Aba 2: Nova tarefa personalizada ────────────────────────── */}
        {tab === 'nova' && (
          <div className="gtm-content">
            <form className="gtm-form" onSubmit={handleCreateTask} noValidate>

              <div className="gtm-field">
                <label className="gtm-label" htmlFor="gtm-nome">Nome *</label>
                <input
                  id="gtm-nome" type="text" autoFocus disabled={submitting}
                  className={`gtm-input${formError && !form.nome.trim() ? ' gtm-input--error' : ''}`}
                  placeholder="Ex: Vistoria final da obra"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>

              <div className="gtm-field-row">
                <div className="gtm-field">
                  <label className="gtm-label" htmlFor="gtm-cat">Categoria *</label>
                  <select
                    id="gtm-cat" className="gtm-input" disabled={submitting}
                    value={form.categoria}
                    onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as TaskCategory }))}
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                    ))}
                  </select>
                </div>
                <div className="gtm-field">
                  <label className="gtm-label" htmlFor="gtm-fase">Fase *</label>
                  <select
                    id="gtm-fase" className="gtm-input" disabled={submitting}
                    value={form.fase_order}
                    onChange={(e) => setForm((f) => ({ ...f, fase_order: Number(e.target.value) }))}
                  >
                    {PHASE_GROUPS.map(([order, { fase_nome }]) => (
                      <option key={order} value={order}>{fase_nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="gtm-field">
                <label className="gtm-label" htmlFor="gtm-date">Data prevista *</label>
                <input
                  id="gtm-date" type="date" disabled={submitting}
                  className={`gtm-input${formError && !form.data_planejada ? ' gtm-input--error' : ''}`}
                  value={form.data_planejada}
                  onChange={(e) => setForm((f) => ({ ...f, data_planejada: e.target.value }))}
                />
              </div>

              {formError && <p className="gtm-error">{formError}</p>}

              <div className="gtm-actions">
                <button type="button" className="gtm-btn gtm-btn--secondary" onClick={onClose} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="gtm-btn gtm-btn--primary" disabled={submitting}>
                  {submitting ? 'Criando...' : 'Criar tarefa'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Checkbox com estado indeterminado ────────────────────────────────

function IndeterminateCheckbox({
  checked, indeterminate, disabled, onChange,
}: { checked: boolean; indeterminate: boolean; disabled: boolean; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref} type="checkbox"
      className="gtm-phase-checkbox"
      checked={checked} disabled={disabled} onChange={onChange}
    />
  )
}
