import { supabase } from '../lib/supabase'
import { listUnits, listTaskStats, type Unit, type TaskStats } from './unitsService'
import { type TaskStatus } from './tasksService'

// ─── Tipos públicos ───────────────────────────────────────────────────

export interface DashboardKPIs {
  totalActive:          number   // planejamento + em_andamento
  inauguratingIn30Days: number   // inauguration_date entre hoje e hoje+30
  totalOverdue:         number   // due_date < hoje AND status != 'concluído'
  completionRate:       number   // % concluído geral (0-100)
}

export interface UnitDashboardRow {
  unit:         Unit
  stats:        TaskStats
  overdueCount: number
  daysUntil:    number | null   // null se sem data; negativo se já passou
}

export interface CriticalTask {
  id:                       string
  title:                    string
  status:                   TaskStatus
  due_date:                 string
  days_before_inauguration: number | null
  unit_id:                  string
  unit_name:                string
}

export interface DashboardData {
  kpis:          DashboardKPIs
  unitRows:      UnitDashboardRow[]
  criticalTasks: CriticalTask[]
}

// ─── Fetch principal ─────────────────────────────────────────────────

export async function fetchDashboardData(): Promise<DashboardData> {
  const todayStr = new Date().toISOString().split('T')[0]

  // ── Fase 1: paralelo ─────────────────────────────────────────────────
  const [units, overdueRows, critRows] = await Promise.all([

    listUnits(),

    // Tarefas atrasadas: due_date < hoje E não concluídas
    supabase
      .from('tasks')
      .select('unit_id')
      .lt('due_date', todayStr)
      .neq('status', 'concluído')
      .then(({ data, error }) => {
        if (error) throw error
        return (data ?? []) as { unit_id: string }[]
      }),

    // Top 5 urgentes: não concluídas, mais próximas do prazo, com nome da unidade
    supabase
      .from('tasks')
      .select('id, title, status, due_date, days_before_inauguration, unit_id, unit:units(id, name)')
      .neq('status', 'concluído')
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(5)
      .then(({ data, error }) => {
        if (error) throw error
        return (data ?? []) as {
          id: string
          title: string
          status: string
          due_date: string
          days_before_inauguration: number | null
          unit_id: string
          unit: { id: string; name: string } | Array<{ id: string; name: string }> | null
        }[]
      }),
  ])

  // ── Fase 2: stats por unidade (precisa dos IDs da fase 1) ────────────
  const statsArr = units.length > 0
    ? await listTaskStats(units.map((u) => u.id))
    : []

  // ── Derivações ────────────────────────────────────────────────────────
  const statsMap = new Map(statsArr.map((s) => [s.unit_id, s]))

  const overdueByUnit = new Map<string, number>()
  for (const row of overdueRows) {
    overdueByUnit.set(row.unit_id, (overdueByUnit.get(row.unit_id) ?? 0) + 1)
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const unitRows: UnitDashboardRow[] = units.map((unit) => {
    const stats = statsMap.get(unit.id) ?? { unit_id: unit.id, total: 0, completed: 0 }
    const overdueCount = overdueByUnit.get(unit.id) ?? 0
    let daysUntil: number | null = null
    if (unit.inauguration_date) {
      const [y, m, d] = unit.inauguration_date.split('-').map(Number)
      const inaug = new Date(y, m - 1, d)
      daysUntil = Math.round((inaug.getTime() - today.getTime()) / 86_400_000)
    }
    return { unit, stats, overdueCount, daysUntil }
  })

  // ── KPIs ─────────────────────────────────────────────────────────────
  const totalActive = units.filter(
    (u) => u.status === 'planejamento' || u.status === 'em_andamento',
  ).length

  const inauguratingIn30Days = unitRows.filter(
    (r) => r.daysUntil !== null && r.daysUntil >= 0 && r.daysUntil <= 30,
  ).length

  const totalOverdue = overdueRows.length

  const totalCompleted = statsArr.reduce((s, r) => s + r.completed, 0)
  const totalTasks     = statsArr.reduce((s, r) => s + r.total, 0)
  const completionRate = totalTasks > 0 ? Math.round(totalCompleted / totalTasks * 100) : 0

  // ── Tarefas críticas ──────────────────────────────────────────────────
  const criticalTasks: CriticalTask[] = critRows.map((row) => {
    const u = Array.isArray(row.unit) ? row.unit[0] : row.unit
    return {
      id:                       row.id,
      title:                    row.title,
      status:                   row.status as TaskStatus,
      due_date:                 row.due_date,
      days_before_inauguration: row.days_before_inauguration,
      unit_id:                  row.unit_id,
      unit_name:                u?.name ?? '—',
    }
  })

  // ── Ordenação da tabela de unidades (vermelho → amarelo → restantes) ──
  unitRows.sort((a, b) => {
    const level = (r: UnitDashboardRow) => {
      const incompleted = r.stats.total - r.stats.completed
      if (r.daysUntil !== null && r.daysUntil >= 0 && r.daysUntil <= 30 && incompleted > 0) return 0
      if (r.overdueCount > 0) return 1
      return 2
    }
    const la = level(a), lb = level(b)
    if (la !== lb) return la - lb
    // Desempate: mais próximos primeiro
    if (a.daysUntil === null && b.daysUntil === null) return 0
    if (a.daysUntil === null) return 1
    if (b.daysUntil === null) return -1
    return a.daysUntil - b.daysUntil
  })

  return {
    kpis: { totalActive, inauguratingIn30Days, totalOverdue, completionRate },
    unitRows,
    criticalTasks,
  }
}
