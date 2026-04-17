-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: fix current_user_role() return type
-- ───────────────────────────────────────────────────────────────────
-- Problema: current_user_role() declarada como RETURNS user_role (enum
-- com 'admin','implantador','franqueado'), mas profiles.role agora é
-- TEXT com CHECK IN ('admin','manager','user').
-- Quando um user com role='manager' ou 'user' acessa qualquer tabela
-- cujas políticas RLS chamam current_user_role(), o PostgreSQL tenta
-- fazer cast TEXT→user_role, falha e PostgREST retorna 500.
--
-- Fix: recriar a função retornando TEXT.
-- Passo obrigatório: dropar as policies que referenciam a função por OID,
-- recriar a função, recriar as policies.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Dropar policies que referenciam current_user_role() ──────────

DROP POLICY IF EXISTS "profiles: atualização por admin"    ON public.profiles;

DROP POLICY IF EXISTS "templates: escrita por admin"        ON public.templates;

DROP POLICY IF EXISTS "milestones: escrita por admin"       ON public.milestones;

DROP POLICY IF EXISTS "task_templates: escrita por admin"   ON public.task_templates;

DROP POLICY IF EXISTS "units: acesso total para admin"      ON public.units;

DROP POLICY IF EXISTS "tasks: acesso total para admin"      ON public.tasks;

DROP POLICY IF EXISTS "task_history: acesso total para admin" ON public.task_history;


-- ── 2. Dropar e recriar current_user_role() retornando TEXT ─────────

DROP FUNCTION IF EXISTS public.current_user_role();

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ── 3. Garantir que profiles tem a policy SELECT correta ────────────

DROP POLICY IF EXISTS "profiles: leitura por autenticados" ON public.profiles;

CREATE POLICY "profiles: leitura por autenticados"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);


-- ── 4. Recriar profiles UPDATE policies ─────────────────────────────

DROP POLICY IF EXISTS "profiles: atualização própria" ON public.profiles;

CREATE POLICY "profiles: atualização própria"
  ON public.profiles FOR UPDATE TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: atualização por admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING  (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


-- ── 5. Recriar templates policies ───────────────────────────────────

CREATE POLICY "templates: escrita por admin"
  ON public.templates FOR ALL TO authenticated
  USING  (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


-- ── 6. Recriar milestones policies ──────────────────────────────────

CREATE POLICY "milestones: escrita por admin"
  ON public.milestones FOR ALL TO authenticated
  USING  (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


-- ── 7. Recriar task_templates policies ──────────────────────────────

CREATE POLICY "task_templates: escrita por admin"
  ON public.task_templates FOR ALL TO authenticated
  USING  (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


-- ── 8. Recriar units policies ────────────────────────────────────────

CREATE POLICY "units: acesso total para admin"
  ON public.units FOR ALL TO authenticated
  USING  (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


-- ── 9. Recriar tasks policies ────────────────────────────────────────

CREATE POLICY "tasks: acesso total para admin"
  ON public.tasks FOR ALL TO authenticated
  USING  (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


-- ── 10. Recriar task_history policies ────────────────────────────────

CREATE POLICY "task_history: acesso total para admin"
  ON public.task_history FOR ALL TO authenticated
  USING  (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');


COMMIT;
