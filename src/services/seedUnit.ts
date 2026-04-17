import { supabaseAdmin } from '../lib/supabaseAdmin'
import { TASK_TEMPLATES } from '../data/taskTemplates'

const CHUNK_SIZE = 50

/**
 * Popula uma unidade com todas as tarefas do template de implantação.
 * Insere na tabela `unit_tasks` com datas calculadas a partir da inauguração.
 */
export async function seedUnitWithTasks(
  unitId: string,
  inauguracaoDate: Date,
): Promise<void> {
  const tasks = TASK_TEMPLATES.map((t) => {
    const dataPlanejada = new Date(inauguracaoDate)
    dataPlanejada.setDate(dataPlanejada.getDate() + t.offset_dias)
    return {
      unit_id:        unitId,
      nome:           t.nome,
      categoria:      t.categoria,
      fase_order:     t.fase_order,
      fase_nome:      t.fase_nome,
      offset_dias:    t.offset_dias,
      data_planejada: dataPlanejada.toISOString().split('T')[0],
      status:         'nao_iniciado' as const,
    }
  })

  for (let i = 0; i < tasks.length; i += CHUNK_SIZE) {
    const chunk = tasks.slice(i, i + CHUNK_SIZE)
    const { error } = await supabaseAdmin.from('unit_tasks').insert(chunk)
    if (error) {
      console.error('Erro ao inserir tarefas:', error)
      throw error
    }
  }

  console.info(`[seedUnit] ${tasks.length} tarefas criadas para unidade ${unitId}`)
}

/**
 * Remove todas as tarefas de uma unidade (usado antes de regenerar).
 */
export async function deleteUnitTasks(unitId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('unit_tasks')
    .delete()
    .eq('unit_id', unitId)
  if (error) throw error
}
