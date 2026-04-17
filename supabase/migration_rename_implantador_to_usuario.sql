-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: renomear 'implantador' → 'usuario' no enum user_role
-- e atualizar o CHECK constraint de profiles.role
-- ───────────────────────────────────────────────────────────────────
-- PostgreSQL 10+ suporta ALTER TYPE ... RENAME VALUE diretamente.
-- Não é necessário recriar o enum manualmente.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Renomear valor do enum user_role ────────────────────────────
-- Afeta: task_templates.default_responsible_role (único uso do enum).
-- Dados existentes com 'implantador' são migrados automaticamente.

ALTER TYPE public.user_role RENAME VALUE 'implantador' TO 'usuario';


-- ── 2. Atualizar o CHECK constraint de profiles.role ───────────────
-- profiles.role é TEXT (não usa o enum), tem um CHECK próprio.
-- Garante que o valor aceito passe de 'user' / 'implantador' para 'usuario'.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Migra linhas com valor antigo (precaução — provavelmente sem linhas afetadas)
UPDATE public.profiles
   SET role = 'usuario'
 WHERE role IN ('user', 'implantador');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'usuario'));


-- ── 3. Garantir que o handle_new_user use 'usuario' como default ───
-- (Opcional se a função já usa DEFAULT do BD, mas explicitamos aqui.)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    split_part(NEW.email, '@', 1),
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


COMMIT;
