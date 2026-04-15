import { useState, useEffect } from 'react'
import { listTaskHistory, type HistoryEntry, type HistoryAction } from '../services/historyService'

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// ─── Ícones SVG inline ────────────────────────────────────────────────

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  )
}

function IconPerson() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  )
}

const ACTION_ICON: Record<HistoryAction, React.ReactNode> = {
  status_changed: <IconRefresh />,
  assigned:       <IconPerson />,
  unassigned:     <IconPerson />,
  created:        <IconPlus />,
  comment:        <IconChat />,
  deleted:        <IconTrash />,
}

const ACTION_COLOR: Record<HistoryAction, string> = {
  created:        '#4ade80',
  status_changed: '#60a5fa',
  assigned:       '#c084fc',
  unassigned:     '#888888',
  deleted:        '#f87171',
  comment:        '#facc15',
}

// ─── Componente ───────────────────────────────────────────────────────

interface Props {
  taskId: string
}

export function TaskHistory({ taskId }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listTaskHistory(taskId).then((data) => {
      setEntries(data)
      setLoading(false)
    })
  }, [taskId])

  if (loading) {
    return <p className="th-empty">Carregando histórico...</p>
  }

  if (entries.length === 0) {
    return <p className="th-empty">Nenhuma atividade registrada</p>
  }

  return (
    <ul className="th-list">
      {entries.map((e) => (
        <li key={e.id} className="th-item">
          <span className="th-icon" style={{ color: ACTION_COLOR[e.action] }}>
            {ACTION_ICON[e.action]}
          </span>
          <div className="th-body">
            <div className="th-top-row">
              <span className="th-desc">{e.description}</span>
              {e.user_name && (
                <span className="th-user">{e.user_name}</span>
              )}
            </div>
            {e.old_value && e.new_value && (
              <p className="th-values">
                <span className="th-old">{e.old_value}</span>
                <span className="th-arrow"> → </span>
                <span className="th-new">{e.new_value}</span>
              </p>
            )}
            <time className="th-time">{formatDate(e.created_at)}</time>
          </div>
        </li>
      ))}
    </ul>
  )
}
