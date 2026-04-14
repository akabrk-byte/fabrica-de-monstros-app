import { supabase } from '../lib/supabase'
import { PHASE_TEMPLATES, TOTAL_TASKS } from '../data/taskTemplates'

// ─── Helpers ─────────────────────────────────────────────────────────

/** Soma N dias a uma string 'YYYY-MM-DD', funciona com valores negativos. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// ─── Seed ────────────────────────────────────────────────────────────

const CHUNK_SIZE = 50   // inserções por lote (seguro para PostgREST)

/**
 * Popula uma unidade recém-criada com todas as tarefas reais do processo
 * de implantação (definidas em src/data/taskTemplates.ts).
 *
 * @param unitId          UUID da unidade já salva no Supabase
 * @param inauguracaoDate Data de inauguração no formato 'YYYY-MM-DD', ou null.
 *                        Se null, as tarefas são criadas sem due_date.
 *
 * Pré-requisito: milestone 'bbbbbbbb-0000-0000-0000-000000000000' (Fase 0)
 * deve existir no Supabase — ver migration SQL em taskTemplates.ts.
 */
export async function seedUnitWithTasks(
  unitId: string,
  inauguracaoDate: string | null,
): Promise<void> {
  // Monta todos os registros de tarefa a partir dos templates
  const records = PHASE_TEMPLATES.flatMap((phase) =>
    phase.tasks.map((t) => ({
      unit_id:                  unitId,
      milestone_id:             phase.milestoneId,
      title:                    t.title,
      category:                 t.category,
      status:                   'não_iniciado' as const,
      days_before_inauguration: t.offsetDays,
      due_date:         inauguracaoDate ? addDays(inauguracaoDate, t.offsetDays) : null,
      original_due_date: inauguracaoDate ? addDays(inauguracaoDate, t.offsetDays) : null,
    })),
  )

  if (records.length === 0) return

  // Insere em lotes para garantir compatibilidade com qualquer configuração
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase.from('tasks').insert(chunk)
    if (error) throw error
  }

  console.info(`[seedUnit] ${records.length}/${TOTAL_TASKS} tarefas criadas para unidade ${unitId}`)
}
