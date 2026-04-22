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
  id:             string
  nome:           string
  status:         TaskStatus
  data_planejada: string
  offset_dias:    number | null
  unit_id:        string
  unit_name:      string
  daysOverdue:    number
}

export interface DashboardData {
  kpis:          DashboardKPIs
  unitRows:      UnitDashboardRow[]
  criticalTasks: CriticalTask[]
}

// ─── Fetch principal ─────────────────────────────────────────────────

export async function fetchDashboardData(): Promise<DashboardData> {
  const today    = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const fifteenDaysAgo = new Date(today)
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
  const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split('T')[0]

  // ── Fase 1: paralelo ─────────────────────────────────────────────────
  const [units, overdueRows, critCandidates] = await Promise.all([

    listUnits(),

    // Tarefas atrasadas: data_planejada < hoje E não concluídas
    supabase
      .from('unit_tasks')
      .select('unit_id')
      .lt('data_planejada', todayStr)
      .neq('status', 'concluido')
      .then(({ data, error }) => {
        if (error) throw error
        return (data ?? []) as { unit_id: string }[]
      }),

    // Candidatas a críticas: 15+ dias de atraso, com fase_order para gate
    supabase
      .from('unit_tasks')
      .select('id, nome, status, data_planejada, offset_dias, unit_id, fase_order')
      .neq('status', 'concluido')
      .not('data_planejada', 'is', null)
      .lt('data_planejada', fifteenDaysAgoStr)
      .order('data_planejada', { ascending: true })
      .limit(50)
      .then(({ data, error }) => {
        if (error) throw error
        return (data ?? []) as {
          id:             string
          nome:           string
          status:         string
          data_planejada: string
          offset_dias:    number | null
          unit_id:        string
          fase_order:     number
        }[]
      }),
  ])

  // ── Fase 2: paralelo ─────────────────────────────────────────────────
  const critUnitIds = [...new Set(critCandidates.map((r) => r.unit_id))]

  const [statsArr, phaseTaskRows] = await Promise.all([
    units.length > 0 ? listTaskStats(units.map((u) => u.id)) : Promise.resolve([]),

    // Todas as tarefas (status + fase_order) das unidades com candidatas
    critUnitIds.length > 0
      ? supabase
          .from('unit_tasks')
          .select('unit_id, fase_order, status')
          .in('unit_id', critUnitIds)
          .then(({ data }) => (data ?? []) as { unit_id: string; fase_order: number; status: string }[])
      : Promise.resolve([] as { unit_id: string; fase_order: number; status: string }[]),
  ])

  // ── Derivações ────────────────────────────────────────────────────────
  const statsMap = new Map(statsArr.map((s) => [s.unit_id, s]))

  const overdueByUnit = new Map<string, number>()
  for (const row of overdueRows) {
    overdueByUnit.set(row.unit_id, (overdueByUnit.get(row.unit_id) ?? 0) + 1)
  }

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

  // ── Tarefas críticas: gate por fase ──────────────────────────────────

  // Monta mapa: unitId → Map<faseOrder, {total, done}>
  const unitPhaseStats = new Map<string, Map<number, { total: number; done: number }>>()
  for (const row of phaseTaskRows) {
    if (!unitPhaseStats.has(row.unit_id)) unitPhaseStats.set(row.unit_id, new Map())
    const phases = unitPhaseStats.get(row.unit_id)!
    const ph = phases.get(row.fase_order) ?? { total: 0, done: 0 }
    ph.total++
    if (row.status === 'concluido') ph.done++
    phases.set(row.fase_order, ph)
  }

  const criticalTasks: CriticalTask[] = critCandidates
    .filter((row) => {
      const unit   = units.find((u) => u.id === row.unit_id)
      const phases = unitPhaseStats.get(row.unit_id)
      if (!phases) return false

      const sortedOrders = [...phases.keys()].sort((a, b) => a - b)
      const phaseIdx     = sortedOrders.indexOf(row.fase_order)

      if (phaseIdx === 0) {
        // Primeira fase: liberada apenas após start_date
        if (unit?.start_date) {
          const [sy, sm, sd] = unit.start_date.split('-').map(Number)
          return new Date(sy, sm - 1, sd) <= today
        }
        return true
      }

      // Fases seguintes: liberadas apenas quando a fase anterior está 100% concluída
      const prevOrder = sortedOrders[phaseIdx - 1]
      const prev      = phases.get(prevOrder)!
      return prev.total > 0 && prev.done === prev.total
    })
    .slice(0, 5)
    .map((row) => {
      const [y, m, d] = row.data_planejada.split('-').map(Number)
      const due = new Date(y, m - 1, d)
      const daysOverdue = Math.round((today.getTime() - due.getTime()) / 86_400_000)
      return {
        id:             row.id,
        nome:           row.nome,
        status:         row.status as TaskStatus,
        data_planejada: row.data_planejada,
        offset_dias:    row.offset_dias,
        unit_id:        row.unit_id,
        unit_name:      units.find((u) => u.id === row.unit_id)?.name ?? '—',
        daysOverdue,
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
