import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logAction } from '../services/historyService'
import './ResponsibleSelector.css'

interface Profile {
  id:        string
  full_name: string
  username:  string | null
}

interface ResponsibleSelectorProps {
  taskId:               string
  unitId:               string
  currentResponsibleId: string | null
  onUpdate?:            () => void
}

export function ResponsibleSelector({
  taskId,
  unitId,
  currentResponsibleId,
  onUpdate,
}: ResponsibleSelectorProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [value,    setValue]    = useState(currentResponsibleId ?? '')
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, username')
      .order('full_name')
      .then(({ data, error }) => {
        if (error) console.error('[ResponsibleSelector] fetch profiles:', error)
        else setProfiles((data ?? []) as Profile[])
      })
  }, [])

  useEffect(() => {
    setValue(currentResponsibleId ?? '')
  }, [currentResponsibleId])

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId  = e.target.value || null
    const prevId = value || null

    setValue(e.target.value)
    setSaving(true)

    try {
      const { error } = await supabase
        .from('unit_tasks')
        .update({
          responsible_id: newId,
          assigned_at:    newId ? new Date().toISOString() : null,
        })
        .eq('id', taskId)

      if (error) throw error

      const prevProfile = prevId ? profiles.find((p) => p.id === prevId) : undefined
      const newProfile  = newId  ? profiles.find((p) => p.id === newId)  : undefined

      const prevLabel = prevProfile?.username
        ? `@${prevProfile.username}`
        : prevProfile?.full_name
      const newLabel = newProfile?.username
        ? `@${newProfile.username}`
        : newProfile?.full_name

      await logAction({
        task_id:     taskId,
        unit_id:     unitId,
        action:      newId ? 'assigned' : 'unassigned',
        description: newId
          ? `Responsável atribuído: ${newLabel ?? newId}`
          : `Responsável removido${prevLabel ? `: ${prevLabel}` : ''}`,
        old_value: prevLabel,
        new_value: newLabel,
      })

      onUpdate?.()
    } catch (err) {
      console.error('[ResponsibleSelector] update error:', err)
      setValue(currentResponsibleId ?? '')
    } finally {
      setSaving(false)
    }
  }

  function optionLabel(p: Profile): string {
    return p.username ? `${p.full_name} (@${p.username})` : p.full_name
  }

  return (
    <select
      className={`responsible-select${saving ? ' responsible-select--saving' : ''}`}
      value={value}
      onChange={handleChange}
      disabled={saving}
      aria-label="Responsável pela tarefa"
    >
      <option value="">Não atribuído</option>
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>{optionLabel(p)}</option>
      ))}
    </select>
  )
}
