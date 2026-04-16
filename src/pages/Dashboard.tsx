import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import {
  fetchDashboardData,
  type DashboardData,
  type UnitDashboardRow,
  type CriticalTask,
} from '../services/dashboardService'
import { type Unit } from '../services/unitsService'
import { ActivityFeed } from '../components/ActivityFeed'
import '../pages/Home.css'
import './pages.css'
import './Dashboard.css'

// ─── Constantes ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<Unit['status'], string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  inaugurada:   'Inaugurada',
  cancelada:    'Cancelada',
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

function daysTag(daysUntil: number | null): { label: string; cls: string } {
  if (daysUntil === null)  return { label: '—',           cls: '' }
  if (daysUntil === 0)     return { label: 'Hoje',        cls: 'days-tag--red' }
  if (daysUntil < 0)       return { label: `Há ${Math.abs(daysUntil)}d`, cls: 'days-tag--muted' }
  if (daysUntil <= 7)      return { label: `${daysUntil}d`, cls: 'days-tag--red' }
  if (daysUntil <= 30)     return { label: `${daysUntil}d`, cls: 'days-tag--yellow' }
  return { label: `${daysUntil}d`, cls: '' }
}

function alertLevel(row: UnitDashboardRow): 'red' | 'yellow' | null {
  const incompleted = row.stats.total - row.stats.completed
  if (row.daysUntil !== null && row.daysUntil >= 0 && row.daysUntil <= 30 && incompleted > 0)
    return 'red'
  if (row.overdueCount > 0) return 'yellow'
  return null
}

function isOverdueTask(dataPlanejada: string): boolean {
  const [y, m, d] = dataPlanejada.split('-').map(Number)
  const due   = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return due < today
}

// ─── KPI Card ─────────────────────────────────────────────────────────

interface KPICardProps {
  value:  number | string
  label:  string
  sub?:   string
  color:  string
  danger?: boolean
}

function KPICard({ value, label, sub, color, danger }: KPICardProps) {
  return (
    <div className={`kpi-card ${danger ? 'kpi-card--danger' : ''}`}>
      <span className="kpi-value" style={{ color }}>{value}</span>
      <span className="kpi-label">{label}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  )
}

// ─── Linha da tabela de unidades ──────────────────────────────────────

function UnitTableRow({ row, onClick }: { row: UnitDashboardRow; onClick: () => void }) {
  const alert = alertLevel(row)
  const pct   = row.stats.total > 0
    ? Math.round(row.stats.completed / row.stats.total * 100)
    : null
  const days  = daysTag(row.daysUntil)

  return (
    <tr
      className={`unit-row ${alert ? `unit-row--${alert}` : ''}`}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <td className="unit-row-name">
        {alert && (
          <span className={`alert-dot alert-dot--${alert}`} title={alert === 'red' ? 'Inauguração em menos de 30 dias com tarefas pendentes' : 'Tarefas atrasadas'} />
        )}
        {row.unit.name}
      </td>
      <td className="unit-row-city hide-mobile">
        {[row.unit.city, row.unit.state].filter(Boolean).join(', ') || '—'}
      </td>
      <td className="unit-row-date hide-mobile">{formatDate(row.unit.inauguration_date)}</td>
      <td className="unit-row-days">
        <span className={`days-tag ${days.cls}`}>{days.label}</span>
      </td>
      <td className="unit-row-progress">
        {pct === null ? (
          <span className="no-tasks">—</span>
        ) : (
          <div className="progress-cell">
            <span className="progress-cell-pct">{pct}%</span>
            <div className="progress-cell-bar">
              <div className="progress-cell-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </td>
      <td className="unit-row-status hide-mobile">
        <span className={`unit-status unit-status--${row.unit.status}`}>
          {STATUS_LABEL[row.unit.status]}
        </span>
      </td>
      {alert && (
        <td className="unit-row-alert">
          {alert === 'red' && (
            <span className="alert-badge alert-badge--red">
              {row.daysUntil !== null && row.daysUntil >= 0 && row.daysUntil <= 30
                ? `${row.stats.total - row.stats.completed} pendentes`
                : 'Urgente'}
            </span>
          )}
          {alert === 'yellow' && (
            <span className="alert-badge alert-badge--yellow">
              {row.overdueCount} atrasada{row.overdueCount !== 1 ? 's' : ''}
            </span>
          )}
        </td>
      )}
      {!alert && <td />}
    </tr>
  )
}

// ─── Item de tarefa crítica ───────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  nao_iniciado: 'var(--text)',
  em_andamento: '#3b82f6',
  bloqueado:    '#ef4444',
}

function CriticalTaskItem({ task, onClick }: { task: CriticalTask; onClick: () => void }) {
  const overdue = isOverdueTask(task.data_planejada)
  const dayLabel = task.offset_dias !== null
    ? (task.offset_dias === 0 ? 'D0'
      : task.offset_dias > 0 ? `D+${task.offset_dias}`
      : `D${task.offset_dias}`)
    : null

  const statusLabel =
    task.status === 'nao_iniciado' ? 'Não iniciado'
    : task.status === 'em_andamento' ? 'Em andamento'
    : task.status === 'concluido' ? 'Concluído'
    : 'Bloqueado'

  return (
    <div className="critical-item" onClick={onClick} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <span
        className="critical-dot"
        style={{ background: STATUS_COLOR[task.status] ?? 'var(--text)' }}
      />
      <div className="critical-info">
        <span className="critical-title">{task.nome}</span>
        <div className="critical-meta">
          {dayLabel && <span className="critical-day">{dayLabel}</span>}
          <span className="critical-unit">{task.unit_name}</span>
          <span className={overdue ? 'critical-date critical-date--overdue' : 'critical-date'}>
            {overdue ? '⚠ ' : ''}{formatDate(task.data_planejada)}
          </span>
        </div>
      </div>
      <span style={{ fontSize: '11px', padding: '2px 8px', flexShrink: 0,
        background: 'var(--code-bg)', color: 'var(--text)', borderRadius: '99px' }}>
        {statusLabel}
      </span>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────

export default function Dashboard() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const accessDeniedMsg = (location.state as { accessDenied?: string } | null)?.accessDenied ?? null

  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await fetchDashboardData()
      setData(d)
    } catch (err) {
      console.error('[Dashboard] fetchDashboardData error:', err)
      setError('Não foi possível carregar o dashboard. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const kpis = data?.kpis

  return (
    <div className="page">
      <AppHeader title="Dashboard" />

      {/* ── Acesso negado (vindo de AdminRoute) ─────────────────── */}
      {accessDeniedMsg && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '8px',
          margin: '16px 36px 0',
          padding: '10px 16px',
          fontSize: '13px',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontWeight: 600 }}>Acesso negado.</span>
          {accessDeniedMsg}
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────── */}
      {loading && (
        <div className="units-feedback">
          <p className="units-feedback-desc">Carregando dashboard...</p>
        </div>
      )}

      {/* ── Erro ────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="units-feedback units-feedback--error">
          <h3 className="units-feedback-title">Erro ao carregar</h3>
          <p className="units-feedback-desc">{error}</p>
          <button className="btn btn-secondary" onClick={load}
            style={{ marginTop: '8px', fontSize: '14px', padding: '8px 18px' }}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Conteúdo ────────────────────────────────────────────── */}
      {!loading && !error && data && kpis && (
        <div className="dash-content">

          {/* ── KPIs ──────────────────────────────────────────── */}
          <div className="kpi-grid">
            <KPICard
              value={kpis.totalActive}
              label="Unidades ativas"
              sub="Em implantação"
              color="var(--accent)"
            />
            <KPICard
              value={kpis.inauguratingIn30Days}
              label="Inauguram em 30 dias"
              sub={kpis.inauguratingIn30Days === 0 ? 'Nenhuma no momento' : 'Atenção redobrada'}
              color="#f59e0b"
            />
            <KPICard
              value={kpis.totalOverdue}
              label="Tarefas atrasadas"
              sub={kpis.totalOverdue === 0 ? 'Tudo em dia!' : 'Requerem atenção'}
              color={kpis.totalOverdue === 0 ? '#10b981' : '#ef4444'}
              danger={kpis.totalOverdue > 0}
            />
            <KPICard
              value={`${kpis.completionRate}%`}
              label="Taxa de conclusão"
              sub="Geral — todas as unidades"
              color="#10b981"
            />
          </div>

          {/* ── Tabela de unidades ──────────────────────────────── */}
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">
                Unidades
                <span className="dash-section-count">({data.unitRows.length})</span>
              </h2>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/units')}
                style={{ fontSize: '13px', padding: '6px 14px' }}
              >
                Ver todas
              </button>
            </div>

            {data.unitRows.length === 0 ? (
              <p className="dash-empty">Nenhuma unidade cadastrada ainda.</p>
            ) : (
              <div className="table-wrapper">
                <table className="units-table">
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th className="hide-mobile">Cidade</th>
                      <th className="hide-mobile">Inauguração</th>
                      <th>Dias</th>
                      <th>Progresso</th>
                      <th className="hide-mobile">Status</th>
                      <th>Alerta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.unitRows.map((row) => (
                      <UnitTableRow
                        key={row.unit.id}
                        row={row}
                        onClick={() => navigate(`/units/${row.unit.id}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Tarefas críticas ────────────────────────────────── */}
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Tarefas críticas</h2>
              <span className="dash-section-sub">5 mais urgentes</span>
            </div>

            {data.criticalTasks.length === 0 ? (
              <p className="dash-empty">Nenhuma tarefa urgente no momento.</p>
            ) : (
              <div className="critical-list">
                {data.criticalTasks.map((task) => (
                  <CriticalTaskItem
                    key={task.id}
                    task={task}
                    onClick={() => navigate(`/units/${task.unit_id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Atividade recente ────────────────────────────────── */}
          <div className="dash-section-divider" />
          <section className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Atividade Recente</h2>
              <span className="dash-section-sub">Atualiza a cada 30s</span>
            </div>
            <ActivityFeed />
          </section>

        </div>
      )}
    </div>
  )
}
