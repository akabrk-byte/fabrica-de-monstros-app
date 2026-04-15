import { supabase } from '../lib/supabase'

export type HistoryAction =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'deleted'
  | 'comment'

export interface HistoryEntry {
  id:          string
  task_id:     string
  unit_id:     string
  user_id:     string | null
  user_name:   string | null
  action:      HistoryAction
  description: string
  old_value:   string | null
  new_value:   string | null
  created_at:  string
}

interface LogActionParams {
  task_id:     string
  unit_id:     string
  action:      HistoryAction
  description: string
  old_value?:  string
  new_value?:  string
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    let user_name: string | null = null

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      user_name = profile?.full_name ?? null
    }

    const { error } = await supabase.from('task_history').insert({
      task_id:     params.task_id,
      unit_id:     params.unit_id,
      user_id:     user?.id ?? null,
      user_name,
      action:      params.action,
      description: params.description,
      old_value:   params.old_value ?? null,
      new_value:   params.new_value ?? null,
    })

    if (error) {
      console.error('[historyService] logAction insert error:', error)
    }
  } catch (err) {
    console.error('[historyService] logAction unexpected error:', err)
  }
}

export async function listUnitActivity(unitId: string, limit = 20): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('task_history')
    .select('*')
    .eq('unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[historyService] listUnitActivity error:', error)
    return []
  }

  return (data ?? []) as HistoryEntry[]
}

export async function listTaskHistory(taskId: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('task_history')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[historyService] listTaskHistory error:', error)
    return []
  }

  return (data ?? []) as HistoryEntry[]
}
