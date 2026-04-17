import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { createTask, deleteTask, type Task, type TaskCategory, type TaskStatus } from '../services/tasksService'
import { logAction } from '../services/historyService'
import { TASK_TEMPLATES } from '../data/taskTemplates'
import './TaskManagerModal.css'

// ─── Constantes locais ────────────────────────────────────────────────

const ALL_CATEGORIES: TaskCategory[] = [
  'jurídico', 'engenharia', 'compras', 'marketing', 'operação', 'sistemas', 'rh',
]

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  jurídico:   'Jurídico',
  engenharia: 'Engenharia',
  compras:    'Compras',
  marketing:  'Marketing',
  operação:   'Operação',
  sistemas:   'Sistemas',
  rh:         'RH',
}

type Tab = 'template' | 'nova'

// ─── Props ────────────────────────────────────────────────────────────

interface TaskManagerModalProps {
  isOpen:          boolean
  onClose:         () => void
  unitId:          string
  faseOrder:       number
  faseNome:        string
  dataInauguracao: string   // ISO date string ('YYYY-MM-DD') or ''
  existingTasks:   Task[]
  onTasksAdded:    () => void
}

// ─── Componente ───────────────────────────────────────────────────────

export function TaskManagerModal({
  isOpen,
  onClose,
  unitId,
  faseOrder,
  faseNome,
  dataInauguracao,
  existingTasks,
  onTasksAdded,
}: TaskManagerModalProps) {
  const [tab, setTab] = useState<Tab>('template')

  // ── Aba 1: estado do gerenciador de seleção ───────────────────────────
  // checkedNames  → tarefas com checkbox marcado (ativas na unidade)
  // hiddenNames   → tarefas removidas da lista via "✕ Remover"
  // originalNames → estado no banco ao abrir o modal (imutável na sessão)
  const [checkedNames,      setCheckedNames]      = useState<Set<string>>(new Set())
  const [hiddenNames,       setHiddenNames]       = useState<Set<string>>(new Set())
  const [originalNames,     setOriginalNames]     = useState<Set<string>>(new Set())
  const [confirmRemoveName, setConfirmRemoveName] = useState<string | null>(null)
  const [tmplError,         setTmplError]         = useState('')
  const [submitting,        setSubmitting]        = useState(false)

  // ── Aba 2: formulário de nova tarefa ──────────────────────────────────
  const [form, setForm] = useState({
    nome:           '',
    categoria:      'operação' as TaskCategory,
    data_planejada: '',
    observacao:     '',
  })
  const [formError, setFormError] = useState('')

  // ── Reset ao abrir o modal ─────────────────────────────────────────────
  // Quando isOpen passa de false → true, o estado é reconstruído do banco.
  // Quando existingTasks muda enquanto isOpen=false (após salvar+reload),
  // o guard "if (!isOpen) return" evita reset indesejado.
  useEffect(() => {
    if (!isOpen) return
    const names = new Set(
      existingTasks
        .filter((t) => t.fase_order === faseOrder)
        .map((t) => t.nome),
    )
    setCheckedNames(new Set(names))
    setOriginalNames(new Set(names))
    setHiddenNames(new Set())
    setConfirmRemoveName(null)
    setTmplError('')
    setTab('template')
    setForm({ nome: '', categoria: 'operação', data_planejada: '', observacao: '' })
    setFormError('')
  }, [isOpen, existingTasks, faseOrder])

  // ── Derivados ──────────────────────────────────────────────────────────

  const phaseTemplates = useMemo(
    () => TASK_TEMPLATES.filter((t) => t.fase_order === faseOrder),
    [faseOrder],
  )

  // Tarefas visíveis na lista (excluindo as removidas via "✕ Remover")
  const visibleTemplates = useMemo(
    () => phaseTemplates.filter((t) => !hiddenNames.has(t.nome)),
    [phaseTemplates, hiddenNames],
  )

  // Tarefas a inserir: marcadas agora e que não estavam no banco
  const toAdd = useMemo(() => {
    const result: string[] = []
    for (const name of checkedNames) {
      if (!originalNames.has(name) && !hiddenNames.has(name)) result.push(name)
    }
    return result
  }, [checkedNames, originalNames, hiddenNames])

  // Tarefas a deletar: estavam no banco e foram desmarcadas ou removidas
  const toRemove = useMemo(() => {
    const result: string[] = []
    for (const name of originalNames) {
      if (!checkedNames.has(name) || hiddenNames.has(name)) result.push(name)
    }
    return result
  }, [checkedNames, originalNames, hiddenNames])

  const hasPendingChanges = toAdd.length > 0 || toRemove.length > 0

  if (!isOpen) return null

  // ── Helpers ───────────────────────────────────────────────────────────

  function calcDataPlanejada(offsetDias: number): string | null {
    if (!dataInauguracao) return null
    const inaug = new Date(dataInauguracao)
    inaug.setDate(inaug.getDate() + offsetDias)
    return inaug.toISOString().split('T')[0]
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setTmplError('')
    setFormError('')
    setConfirmRemoveName(null)
  }

  // ── Aba 1: lógica de seleção ──────────────────────────────────────────

  const toggleTask = (nome: string) => {
    setCheckedNames((prev) => {
      const next = new Set(prev)
      if (next.has(nome)) next.delete(nome)
      else next.add(nome)
      return next
    })
  }

  const handleSelectAll = () => {
    setCheckedNames((prev) => {
      const next = new Set(prev)
      visibleTemplates.forEach((t) => next.add(t.nome))
      return next
    })
  }

  const handleClearAll = () => {
    setCheckedNames((prev) => {
      const next = new Set(prev)
      visibleTemplates.forEach((t) => next.delete(t.nome))
      return next
    })
  }

  // Remove da lista visível e desmarca; a exclusão no banco acontece ao Salvar
  const handleRemoveFromView = (nome: string) => {
    setHiddenNames((prev) => new Set(prev).add(nome))
    setCheckedNames((prev) => { const next = new Set(prev); next.delete(nome); return next })
    setConfirmRemoveName(null)
  }

  const handleSave = async () => {
    if (!hasPendingChanges) { onClose(); return }
    setSubmitting(true)
    setTmplError('')
    try {
      if (toAdd.length > 0) {
        const rows = toAdd.map((nome) => {
          const t = phaseTemplates.find((pt) => pt.nome === nome)!
          return {
            unit_id:        unitId,
            nome:           t.nome,
            categoria:      t.categoria,
            fase_order:     t.fase_order,
            fase_nome:      t.fase_nome,
            offset_dias:    t.offset_dias,
            data_planejada: calcDataPlanejada(t.offset_dias),
            status:         'nao_iniciado' as TaskStatus,
          }
        })
        const { error } = await supabase.from('unit_tasks').insert(rows)
        if (error) throw error

        for (const nome of toAdd) {
          void logAction({ task_id: null, unit_id: unitId, action: 'created', description: 'Tarefa adicionada', task_title: nome })
        }
      }

      if (toRemove.length > 0) {
        const tasksToDelete = toRemove
          .map((nome) => existingTasks.find((t) => t.nome === nome && t.fase_order === faseOrder))
          .filter((t): t is Task => !!t)

        // Loga ANTES de deletar para preservar referência
        for (const t of tasksToDelete) {
          void logAction({ task_id: t.id, unit_id: unitId, action: 'deleted', description: 'Tarefa removida', task_title: t.nome })
        }
        await Promise.all(tasksToDelete.map((t) => deleteTask(t.id)))
      }

      onTasksAdded()
      onClose()
    } catch {
      setTmplError('Erro ao salvar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Aba 2: criar nova tarefa ──────────────────────────────────────────

  const handleCreateNew = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim())    { setFormError('Informe o nome da tarefa.'); return }
    if (!form.data_planejada) { setFormError('Informe a data prevista.'); return }
    setSubmitting(true)
    setFormError('')
    try {
      let offset_dias: number | undefined
      if (dataInauguracao && form.data_planejada) {
        const [y, m, d] = form.data_planejada.split('-').map(Number)
        const due   = new Date(y, m - 1, d)
        const inaug = new Date(dataInauguracao)
        inaug.setHours(0, 0, 0, 0)
        offset_dias = Math.round((due.getTime() - inaug.getTime()) / 86_400_000)
      }
      const created = await createTask({
        unit_id:        unitId,
        nome:           form.nome.trim(),
        categoria:      form.categoria,
        fase_order:     faseOrder,
        fase_nome:      faseNome,
        data_planejada: form.data_planejada,
        offset_dias,
      })
      void logAction({
        task_id:    created.id,
        unit_id:    unitId,
        action:     'created',
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

  return (
    <div
      className="tmm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="tmm-modal" role="dialog" aria-modal="true" aria-labelledby="tmm-title">

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="tmm-title">Gerenciar tarefas</h2>
            <p className="tmm-subtitle">{faseNome}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {/* Tabs */}
        <div className="tmm-tabs">
          <button
            className={`tmm-tab ${tab === 'template' ? 'tmm-tab--active' : ''}`}
            onClick={() => switchTab('template')}
            type="button"
          >
            Tarefas do template
          </button>
          <button
            className={`tmm-tab ${tab === 'nova' ? 'tmm-tab--active' : ''}`}
            onClick={() => switchTab('nova')}
            type="button"
          >
            Criar nova tarefa
          </button>
        </div>

        {/* ── Aba 1: Gerenciador de seleção ─────────────────────────── */}
        {tab === 'template' && (
          <div className="tmm-content">
            <div className="tmm-template-toolbar">
              <span className="tmm-template-count">
                {visibleTemplates.length} tarefa{visibleTemplates.length !== 1 ? 's' : ''} no template
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="tmm-toolbar-btn" onClick={handleSelectAll}>
                  Marcar todas
                </button>
                <button type="button" className="tmm-toolbar-btn" onClick={handleClearAll}>
                  Desmarcar todas
                </button>
              </div>
            </div>

            <div className="tmm-list">
              {visibleTemplates.length === 0 ? (
                <p className="tmm-empty">Nenhuma tarefa no template para esta fase.</p>
              ) : (
                visibleTemplates.map((t) => {
                  const isChecked    = checkedNames.has(t.nome)
                  const isConfirming = confirmRemoveName === t.nome
                  const isConcluded  = originalNames.has(t.nome) &&
                    existingTasks.find((et) => et.nome === t.nome && et.fase_order === faseOrder)?.status === 'concluido'

                  return (
                    <label
                      key={t.nome}
                      className={[
                        'tmm-item',
                        !isChecked && !isConfirming ? 'tmm-item--unchecked' : '',
                        isConfirming ? 'tmm-item--confirming' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <input
                        type="checkbox"
                        className="tmm-checkbox"
                        checked={isChecked}
                        disabled={submitting || isConfirming}
                        onChange={() => toggleTask(t.nome)}
                      />
                      <div className="tmm-item-body">
                        <span className="tmm-item-name">{t.nome}</span>
                        <div className="tmm-item-meta">
                          <span className="tmm-item-cat">{CATEGORY_LABEL[t.categoria]}</span>
                          <span className="tmm-item-offset">
                            {t.offset_dias === 0 ? 'D0'
                              : t.offset_dias > 0 ? `D+${t.offset_dias}`
                              : `D${t.offset_dias}`}
                          </span>
                        </div>
                      </div>

                      {!isConfirming && (
                        <button
                          type="button"
                          className="tmm-remove-btn"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmRemoveName(t.nome) }}
                          disabled={submitting}
                          title="Remover da lista desta fase"
                        >
                          ✕ Remover
                        </button>
                      )}

                      {isConfirming && (
                        <div className="tmm-confirm-remove" onClick={(e) => e.preventDefault()}>
                          <span className="tmm-confirm-msg">
                            {isConcluded
                              ? 'Tarefa concluída. Confirma remoção?'
                              : 'Remover da lista desta fase?'}
                          </span>
                          <button
                            type="button"
                            className="tmm-confirm-yes"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveFromView(t.nome) }}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            className="tmm-confirm-no"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmRemoveName(null) }}
                          >
                            Não
                          </button>
                        </div>
                      )}
                    </label>
                  )
                })
              )}
            </div>

            {tmplError && <p className="modal-error">{tmplError}</p>}

            {hasPendingChanges && (
              <p className="tmm-pending">
                {toAdd.length > 0 && `${toAdd.length} para adicionar`}
                {toAdd.length > 0 && toRemove.length > 0 && ' · '}
                {toRemove.length > 0 && `${toRemove.length} para remover`}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button" className="btn btn-secondary"
                onClick={onClose} disabled={submitting}
              >
                Cancelar
              </button>
              <button
                type="button" className="btn btn-primary"
                onClick={handleSave}
                disabled={submitting}
              >
                {submitting
                  ? 'Salvando...'
                  : hasPendingChanges ? 'Salvar seleção →' : 'Fechar'}
              </button>
            </div>
          </div>
        )}

        {/* ── Aba 2: Nova tarefa ───────────────────────────────────────── */}
        {tab === 'nova' && (
          <form className="modal-form tmm-content" onSubmit={handleCreateNew} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="tmm-nome">Nome *</label>
              <input
                id="tmm-nome"
                type="text"
                className={`field-input${formError && !form.nome.trim() ? ' field-input--error' : ''}`}
                placeholder="Ex: Aprovação do projeto arquitetônico"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                autoFocus
                disabled={submitting}
              />
            </div>

            <div className="modal-row">
              <div className="field">
                <label className="field-label" htmlFor="tmm-cat">Categoria *</label>
                <select
                  id="tmm-cat"
                  className="field-input"
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value as TaskCategory }))}
                  disabled={submitting}
                >
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="tmm-date">Prazo *</label>
                <input
                  id="tmm-date"
                  type="date"
                  className={`field-input${formError && !form.data_planejada ? ' field-input--error' : ''}`}
                  value={form.data_planejada}
                  onChange={(e) => setForm((f) => ({ ...f, data_planejada: e.target.value }))}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="tmm-obs">Observação</label>
              <textarea
                id="tmm-obs"
                className="field-input tmm-textarea"
                placeholder="Opcional — detalhes, responsável, etc."
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                rows={3}
                disabled={submitting}
              />
            </div>

            {formError && <p className="modal-error">{formError}</p>}

            <div className="modal-actions">
              <button
                type="button" className="btn btn-secondary"
                onClick={onClose} disabled={submitting}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar tarefa'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
