import { supabase } from '../lib/supabase'

// ─── Tipos ───────────────────────────────────────────────────────────

export type TaskStatus   = 'nao_iniciado' | 'em_andamento' | 'concluido' | 'bloqueado'
export type TaskCategory = 'jurídico' | 'engenharia' | 'compras' | 'marketing' | 'operação' | 'sistemas' | 'rh'

export interface Task {
  id:             string
  unit_id:        string
  nome:           string
  categoria:      TaskCategory
  fase_order:     number
  fase_nome:      string
  offset_dias:    number | null
  data_planejada: string | null
  status:         TaskStatus
  responsible_id: string | null
  assigned_at:    string | null
  created_at:     string
  updated_at:     string
}

export interface CreateTaskData {
  unit_id:         string
  nome:            string
  categoria:       TaskCategory
  fase_order:      number
  fase_nome:       string
  data_planejada?: string
  offset_dias?:    number
}

// ─── Queries ─────────────────────────────────────────────────────────

export async function listTasksByUnit(unitId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('unit_tasks')
    .select('*')
    .eq('unit_id', unitId)
    .order('data_planejada', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const { data, error } = await supabase
    .from('unit_tasks')
    .update({ status })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function createTask(data: CreateTaskData): Promise<Task> {
  const { data: created, error } = await supabase
    .from('unit_tasks')
    .insert({
      unit_id:        data.unit_id,
      nome:           data.nome.trim(),
      categoria:      data.categoria,
      fase_order:     data.fase_order,
      fase_nome:      data.fase_nome,
      data_planejada: data.data_planejada || null,
      offset_dias:    data.offset_dias ?? null,
      status:         'nao_iniciado' as TaskStatus,
    })
    .select()
    .single()
  if (error) throw error
  return created as Task
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('unit_tasks')
    .delete()
    .eq('id', taskId)
  if (error) throw error
}
