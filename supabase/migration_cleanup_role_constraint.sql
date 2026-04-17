-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: alinhar profiles.role com o TypeScript UserRole
-- ───────────────────────────────────────────────────────────────────
-- Estado do BD antes desta migration:
--   user_role enum: admin, manager, usuario, franqueado
--   profiles.role: aceita os mesmos 4 valores
--   Nenhum usuário tem role='franqueado'
--
-- Objetivo: garantir que profiles.role aceite apenas os valores
-- que o TypeScript conhece: admin | manager | usuario
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Segurança: confirma que não há usuários com role='franqueado'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'franqueado') THEN
    RAISE EXCEPTION 'Existem usuários com role=franqueado. Migre-os primeiro.';
  END IF;
END $$;

-- Se profiles.role usar o enum diretamente, alterar para TEXT + CHECK
-- (isola profiles da evolução futura do enum user_role)
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE TEXT;

-- Remove constraint antiga (se existir)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Adiciona constraint precisa com os 3 valores do TypeScript
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'usuario'));

-- Garante DEFAULT correto
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'usuario';

COMMIT;
