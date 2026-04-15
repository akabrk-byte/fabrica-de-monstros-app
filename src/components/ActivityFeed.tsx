import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { listUnitActivity, type HistoryEntry, type HistoryAction } from '../services/historyService'
import './ActivityFeed.css'

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// ─── Ícones (ArrowRight / User / Plus / MessageCircle / Trash2) ───────

function IconArrowRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}
function IconUser() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconMessageCircle() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function IconTrash2() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  )
}

const ACTION_ICON: Record<HistoryAction, React.ReactNode> = {
  status_changed: <IconArrowRight />,
  assigned:       <IconUser />,
  unassigned:     <IconUser />,
  created:        <IconPlus />,
  comment:        <IconMessageCircle />,
  deleted:        <IconTrash2 />,
}

const ACTION_COLOR: Record<HistoryAction, string> = {
  status_changed: '#60a5fa',
  assigned:       '#c084fc',
  unassigned:     '#888888',
  created:        '#4ade80',
  comment:        '#facc15',
  deleted:        '#f87171',
}

// ─── Tipos internos ───────────────────────────────────────────────────

interface FeedEntry extends HistoryEntry {
  task_nome: string | null
}

// ─── Componente ───────────────────────────────────────────────────────

interface Props {
  unitId?: string
}

export function ActivityFeed({ unitId }: Props) {
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    // Passo 1 — busca o histórico (por unidade ou global)
    let historyRows: HistoryEntry[]

    if (unitId) {
      historyRows = await listUnitActivity(unitId, 30)
    } else {
      const { data, error } = await supabase
        .from('task_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) {
        console.error('[ActivityFeed] fetch error:', error)
        historyRows = []
      } else {
        historyRows = (data ?? []) as HistoryEntry[]
      }
    }

    if (historyRows.length === 0) {
      setEntries([])
      setLoading(false)
      return
    }

    // Passo 2 — busca nomes das tarefas (IDs únicos)
    const taskIds = [...new Set(historyRows.map((h) => h.task_id).filter(Boolean))]
    const nameMap = new Map<string, string>()

    if (taskIds.length > 0) {
      const { data: taskRows } = await supabase
        .from('unit_tasks')
        .select('id, nome')
        .in('id', taskIds)

      if (taskRows) {
        for (const t of taskRows as { id: string; nome: string }[]) {
          nameMap.set(t.id, t.nome)
        }
      }
    }

    setEntries(
      historyRows.map((h) => ({
        ...h,
        task_nome: h.task_id ? (nameMap.get(h.task_id) ?? null) : null,
      })),
    )
    setLoading(false)
  }, [unitId])

  // Carga inicial
  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Auto-refresh a cada 30 s
  useEffect(() => {
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  if (loading) {
    return <p className="af-empty">Carregando atividades...</p>
  }

  if (entries.length === 0) {
    return <p className="af-empty">Nenhuma atividade ainda.</p>
  }

  return (
    <ul className="af-list">
      {entries.map((e) => {
        const color    = ACTION_COLOR[e.action]
        const taskText = e.task_nome ? ` em '${e.task_nome}'` : ''
        const actor    = e.user_name ?? 'Sistema'

        return (
          <li key={e.id} className="af-item">
            {/* Ícone */}
            <span
              className="af-icon"
              style={{ color, background: `${color}1a`, borderColor: `${color}44` }}
            >
              {ACTION_ICON[e.action]}
            </span>

            {/* Texto */}
            <div className="af-body">
              <p className="af-text">
                <span className="af-actor">{actor}</span>
                {' '}
                <span className="af-desc">{e.description}</span>
                {taskText && (
                  <span className="af-task">{taskText}</span>
                )}
              </p>
              {e.old_value && e.new_value && (
                <p className="af-values">
                  <span className="af-old">{e.old_value}</span>
                  <span className="af-arrow"> → </span>
                  <span className="af-new">{e.new_value}</span>
                </p>
              )}
            </div>

            {/* Timestamp */}
            <time className="af-time">{formatDate(e.created_at)}</time>
          </li>
        )
      })}
    </ul>
  )
}
