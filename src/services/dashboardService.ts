import { supabase } from '../lib/supabase'
import { listUnits, listTaskStats, type Unit, type TaskStats } from './unitsService'
import { type TaskStatus } from './tasksService'

// ─── Tipos públicos ───────────────────────────────────────────────────

export interface DashboardKPIs {
  totalActive:          number   // planejamento + em_andamento
  inauguratingIn30Days: number   // inauguration_date entre hoje e hoje+30
  totalOverdue:         number   // data_planejada < hoje AND status != 'concluido'
  completionRate:       number   // % concluido geral (0-100)
}

export interface UnitDashboardRow {
  unit:         Unit
  stats:        TaskStats
  overdueCount: number
  daysUntil:    number | null   // null se sem data; negativo se já passou
}

export interface CriticalTask {
  id:            string
  nome:          string
  status:        TaskStatus
  data_planejada: string
  offset_dias:   number | null
  unit_id:       string
  unit_name:     string
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

    // Tarefas atrasadas: data_planejada < hoje E não concluídas
    supabase
      .from('unit_tasks')
      .select('unit_id')
      .lt('data_planejada', todayStr)
      .neq('status', 'concluido')
      .then(({ data, error }) => {
        if (error) {
          console.error('[dashboardService] overdueRows query error:', error)
          throw error
        }
        return (data ?? []) as { unit_id: string }[]
      }),

    // Top 5 urgentes: não concluídas, mais próximas do prazo (sem join FK)
    supabase
      .from('unit_tasks')
      .select('id, nome, status, data_planejada, offset_dias, unit_id')
      .neq('status', 'concluido')
      .not('data_planejada', 'is', null)
      .order('data_planejada', { ascending: true })
      .limit(5)
      .then(({ data, error }) => {
        if (error) {
          console.error('[dashboardService] critRows query error:', error)
          throw error
        }
        return (data ?? []) as {
          id:             string
          nome:           string
          status:         string
          data_planejada: string
          offset_dias:    number | null
          unit_id:        string
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
    const unitMatch = units.find((u) => u.id === row.unit_id)
    return {
      id:             row.id,
      nome:           row.nome,
      status:         row.status as TaskStatus,
      data_planejada: row.data_planejada,
      offset_dias:    row.offset_dias,
      unit_id:        row.unit_id,
      unit_name:      unitMatch?.name ?? '—',
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
