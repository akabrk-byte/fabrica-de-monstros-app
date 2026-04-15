import type { CSSProperties } from 'react'
import { type Task, type TaskStatus, type TaskCategory } from '../services/tasksService'
import { ResponsibleSelector } from './ResponsibleSelector'
import './TaskDetailModal.css'

// ─── Mapas locais ─────────────────────────────────────────────────────

const STATUS_LABEL: Record<TaskStatus, string> = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  concluido:    'Concluído',
  bloqueado:    'Bloqueado',
}

const STATUS_STYLE: Record<TaskStatus, CSSProperties> = {
  nao_iniciado: { background: 'rgba(255,255,255,0.06)', color: 'var(--text)'  },
  em_andamento: { background: 'rgba(59,130,246,.14)',   color: '#3b82f6'      },
  concluido:    { background: 'rgba(16,185,129,.14)',   color: '#10b981'      },
  bloqueado:    { background: 'rgba(239,68,68,.12)',    color: '#ef4444'      },
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

const CATEGORY_COLOR: Record<TaskCategory, string> = {
  jurídico:   '#60a5fa',
  engenharia: '#fb923c',
  compras:    '#4ade80',
  marketing:  '#c084fc',
  operação:   '#facc15',
  sistemas:   '#22d3ee',
  rh:         '#f472b6',
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

function dueDayLabel(days: number | null): string | null {
  if (days === null) return null
  if (days === 0) return 'D0'
  return days > 0 ? `D+${days}` : `D${days}`
}

// ─── Props ────────────────────────────────────────────────────────────

interface Props {
  task:     Task
  onClose:  () => void
  onUpdate: () => void
}

// ─── Componente ───────────────────────────────────────────────────────

export function TaskDetailModal({ task, onClose, onUpdate }: Props) {
  const dayLabel = dueDayLabel(task.offset_dias)
  const catColor = CATEGORY_COLOR[task.categoria]

  return (
    <div
      className="tdm-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="tdm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tdm-title"
      >

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="tdm-header">
          <h2 className="tdm-title" id="tdm-title">{task.nome}</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* ── Meta ───────────────────────────────────────────────────── */}
        <div className="tdm-meta">
          <span className="tdm-badge" style={STATUS_STYLE[task.status]}>
            {STATUS_LABEL[task.status]}
          </span>
          <span
            className="tdm-badge"
            style={{
              color:      catColor,
              background: `${catColor}22`,
            }}
          >
            {CATEGORY_LABEL[task.categoria]}
          </span>
          {task.data_planejada && (
            <span className="tdm-due">
              Prazo: <strong>{formatDate(task.data_planejada)}</strong>
            </span>
          )}
          {dayLabel && (
            <span className="tdm-day-label">{dayLabel}</span>
          )}
        </div>

        {/* ── Responsável ────────────────────────────────────────────── */}
        <div className="tdm-field-row">
          <span className="tdm-field-label">Responsável</span>
          <ResponsibleSelector
            taskId={task.id}
            unitId={task.unit_id}
            currentResponsibleId={task.responsible_id ?? null}
            onUpdate={onUpdate}
          />
        </div>

      </div>
    </div>
  )
}
