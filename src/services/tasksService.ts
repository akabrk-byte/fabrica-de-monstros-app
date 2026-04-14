import { supabase } from '../lib/supabase'

// ─── Tipos ───────────────────────────────────────────────────────────

export type TaskStatus   = 'não_iniciado' | 'em_andamento' | 'concluído' | 'bloqueado'
export type TaskCategory = 'jurídico' | 'engenharia' | 'compras' | 'marketing' | 'operação' | 'sistemas' | 'rh'

export interface Milestone {
  id:          string
  name:        string
  description: string | null
  order_index: number
  color:       string
}

export interface Task {
  id:                       string
  unit_id:                  string
  milestone_id:             string
  title:                    string
  description:              string | null
  category:                 TaskCategory
  status:                   TaskStatus
  due_date:                 string | null
  original_due_date:        string | null
  days_before_inauguration: number | null
  responsible_id:           string | null
  notes:                    string | null
  completed_at:             string | null
  created_at:               string
  updated_at:               string
  // joined
  milestone?:               Milestone | null
  responsible?:             { full_name: string; email: string } | null
}

export interface CreateTaskData {
  unit_id:                  string
  milestone_id:             string
  title:                    string
  description?:             string
  category:                 TaskCategory
  due_date?:                string
  days_before_inauguration?: number
}

// ─── Queries ─────────────────────────────────────────────────────────

export async function listMilestones(): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .order('order_index', { ascending: true })
  if (error) throw error
  return (data ?? []) as Milestone[]
}

export async function listTasksByUnit(unitId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      milestone:milestones(*),
      responsible:profiles(full_name, email)
    `)
    .eq('unit_id', unitId)
    .order('due_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const patch: Record<string, unknown> = { status }
  patch.completed_at = status === 'concluído' ? new Date().toISOString() : null

  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', taskId)
    .select('*, milestone:milestones(*), responsible:profiles(full_name, email)')
    .single()
  if (error) throw error
  return data as Task
}

export async function createTask(data: CreateTaskData): Promise<Task> {
  const { data: created, error } = await supabase
    .from('tasks')
    .insert({
      unit_id:                  data.unit_id,
      milestone_id:             data.milestone_id,
      title:                    data.title.trim(),
      description:              data.description?.trim() || null,
      category:                 data.category,
      due_date:                 data.due_date || null,
      original_due_date:        data.due_date || null,
      days_before_inauguration: data.days_before_inauguration ?? null,
    })
    .select('*, milestone:milestones(*), responsible:profiles(full_name, email)')
    .single()
  if (error) throw error
  return created as Task
}
