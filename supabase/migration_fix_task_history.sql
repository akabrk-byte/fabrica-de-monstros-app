-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: corrigir task_history para o historyService.ts
-- ───────────────────────────────────────────────────────────────────
-- Problema: tabela tem changed_by/old_status/changed_at mas o código
-- espera user_name/action/description/old_value/new_value/created_at.
-- Solução: adicionar colunas faltantes + tornar task_id nullable
-- (para que logs de exclusão sobrevivam quando a tarefa é deletada).
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Adicionar colunas que o historyService.ts precisa
ALTER TABLE public.task_history
  ADD COLUMN IF NOT EXISTS user_name   TEXT,
  ADD COLUMN IF NOT EXISTS action      TEXT NOT NULL DEFAULT 'status_changed',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS old_value   TEXT,
  ADD COLUMN IF NOT EXISTS new_value   TEXT,
  ADD COLUMN IF NOT EXISTS task_title  TEXT,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ;

-- 2. Preencher created_at para linhas existentes (usa NOW() como fallback)
UPDATE public.task_history
   SET created_at = NOW()
 WHERE created_at IS NULL;

-- 3. Tornar created_at NOT NULL com DEFAULT NOW()
ALTER TABLE public.task_history
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

-- 4. Tornar task_id nullable (log de exclusão sobrevive após ON DELETE)
ALTER TABLE public.task_history
  ALTER COLUMN task_id DROP NOT NULL;

-- 5. Remover FK com CASCADE e recriar sem FK (log é append-only, não precisa de integridade referencial)
ALTER TABLE public.task_history DROP CONSTRAINT IF EXISTS task_history_task_id_fkey;
ALTER TABLE public.task_history DROP CONSTRAINT IF EXISTS task_history_unit_id_fkey;

-- 6. RLS: permitir que qualquer usuário autenticado insira seu próprio log
--    (políticas de leitura já existem — só adicionamos INSERT se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'task_history' AND policyname = 'task_history_insert_authenticated'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY task_history_insert_authenticated
        ON public.task_history FOR INSERT
        TO authenticated
        WITH CHECK (true)
    $policy$;
  END IF;
END $$;

COMMIT;
