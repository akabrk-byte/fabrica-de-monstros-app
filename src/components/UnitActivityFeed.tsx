import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { listUnitActivity, type HistoryEntry, type HistoryAction } from '../services/historyService'
import './UnitActivityFeed.css'

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// ─── Ícones ───────────────────────────────────────────────────────────

function IconRefresh() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  )
}
function IconPerson() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconChat() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

// ─── Tipos internos ───────────────────────────────────────────────────

interface FeedEntry extends HistoryEntry {
  task_nome: string | null
}

// ─── Componente ───────────────────────────────────────────────────────

interface Props {
  unitId: string
}

export function UnitActivityFeed({ unitId }: Props) {
  const [entries, setEntries] = useState<FeedEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      // Passo 1 — busca o histórico da unidade
      const history = await listUnitActivity(unitId, 20)
      if (cancelled) return

      if (history.length === 0) {
        setEntries([])
        setLoading(false)
        return
      }

      // Passo 2 — busca nomes das tarefas (IDs únicos)
      const taskIds = [...new Set(history.map((h) => h.task_id).filter(Boolean))]
      const nameMap = new Map<string, string>()

      if (taskIds.length > 0) {
        const { data: taskRows } = await supabase
          .from('unit_tasks')
          .select('id, nome')
          .in('id', taskIds)

        if (!cancelled && taskRows) {
          for (const t of taskRows as { id: string; nome: string }[]) {
            nameMap.set(t.id, t.nome)
          }
        }
      }

      if (cancelled) return

      setEntries(
        history.map((h) => ({
          ...h,
          task_nome: h.task_id ? (nameMap.get(h.task_id) ?? null) : null,
        })),
      )
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [unitId])

  if (loading) {
    return (
      <div className="uaf-wrap">
        <p className="uaf-empty">Carregando atividades...</p>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="uaf-wrap">
        <p className="uaf-empty">Nenhuma atividade registrada para esta unidade.</p>
      </div>
    )
  }

  return (
    <div className="uaf-wrap">
      <ul className="uaf-list">
        {entries.map((e, i) => {
          const color = ACTION_COLOR[e.action]
          const isLast = i === entries.length - 1

          return (
            <li key={e.id} className={`uaf-item${isLast ? ' uaf-item--last' : ''}`}>

              {/* Trilha vertical */}
              <div className="uaf-track">
                <span className="uaf-dot" style={{ color, background: `${color}1a`, borderColor: `${color}55` }}>
                  {ACTION_ICON[e.action]}
                </span>
                {!isLast && <span className="uaf-line" />}
              </div>

              {/* Conteúdo */}
              <div className="uaf-content">
                {e.task_nome && (
                  <p className="uaf-task-name">{e.task_nome}</p>
                )}
                <p className="uaf-desc">{e.description}</p>
                {e.old_value && e.new_value && (
                  <p className="uaf-values">
                    <span className="uaf-old">{e.old_value}</span>
                    <span className="uaf-arrow"> → </span>
                    <span className="uaf-new">{e.new_value}</span>
                  </p>
                )}
                <div className="uaf-footer">
                  {e.user_name && <span className="uaf-user">{e.user_name}</span>}
                  <time className="uaf-time">{formatDate(e.created_at)}</time>
                </div>
              </div>

            </li>
          )
        })}
      </ul>
    </div>
  )
}
