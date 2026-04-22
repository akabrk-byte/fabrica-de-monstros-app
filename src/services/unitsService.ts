import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'

// ─── Tipos ───────────────────────────────────────────────────────────

export type UnitStatus = 'planejamento' | 'em_andamento' | 'inaugurada' | 'cancelada'

export interface Unit {
  id: string
  name: string
  slug: string
  city: string | null
  state: string | null
  start_date: string | null           // 'YYYY-MM-DD'
  inauguration_date: string | null   // 'YYYY-MM-DD'
  status: UnitStatus
  template_applied: boolean
  responsible_id: string | null
  franqueado_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateUnitData {
  name: string
  city?: string
  state?: string
  start_date?: string
  inauguration_date?: string
  notes?: string
}

export type UpdateUnitData = Partial<CreateUnitData & { status: UnitStatus }>

export interface TaskStats {
  unit_id: string
  total: number
  completed: number
}

// ─── Helpers internos ────────────────────────────────────────────────

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return (base || 'unidade') + '-' + Date.now().toString(36)
}

// ─── Queries ─────────────────────────────────────────────────────────

export async function listUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Unit[]
}

/** Retorna contagem de tarefas (total e concluídas) para cada unit_id. */
export async function listTaskStats(unitIds: string[]): Promise<TaskStats[]> {
  if (unitIds.length === 0) return []

  const { data, error } = await supabase
    .from('unit_tasks')
    .select('unit_id, status')
    .in('unit_id', unitIds)

  if (error) throw error

  const map = new Map<string, { total: number; completed: number }>()

  for (const row of (data ?? []) as { unit_id: string; status: string }[]) {
    const entry = map.get(row.unit_id) ?? { total: 0, completed: 0 }
    entry.total++
    if (row.status === 'concluido') entry.completed++
    map.set(row.unit_id, entry)
  }

  return unitIds.map((id) => ({
    unit_id: id,
    total: map.get(id)?.total ?? 0,
    completed: map.get(id)?.completed ?? 0,
  }))
}

export async function createUnit(data: CreateUnitData): Promise<Unit> {
  const { data: created, error } = await supabaseAdmin
    .from('units')
    .insert({
      name: data.name.trim(),
      slug: generateSlug(data.name),
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      start_date: data.start_date || null,
      inauguration_date: data.inauguration_date || null,
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error
  return created as Unit
}

export async function updateUnit(id: string, data: UpdateUnitData): Promise<Unit> {
  const patch: Record<string, unknown> = {}
  if (data.name !== undefined)               patch.name = data.name.trim()
  if (data.city !== undefined)               patch.city = data.city?.trim() || null
  if (data.state !== undefined)              patch.state = data.state?.trim() || null
  if (data.start_date !== undefined)         patch.start_date = data.start_date || null
  if (data.inauguration_date !== undefined)  patch.inauguration_date = data.inauguration_date || null
  if (data.status !== undefined)             patch.status = data.status
  if (data.notes !== undefined)              patch.notes = data.notes?.trim() || null

  const { data: updated, error } = await supabase
    .from('units')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Unit
}

export async function getUnit(id: string): Promise<Unit> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Unit
}

export async function deleteUnit(id: string): Promise<void> {
  const { error } = await supabase.from('units').delete().eq('id', id)
  if (error) throw error
}
