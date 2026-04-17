-- Diagnóstico: verificar estado da tabela task_history

-- 1. Quantas linhas existem?
SELECT COUNT(*) AS total_rows FROM public.task_history;

-- 2. Colunas existentes na tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'task_history'
ORDER BY ordinal_position;

-- 3. RLS ativo?
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'task_history';

-- 4. Políticas existentes
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'task_history';

-- 5. Últimas 5 linhas (se houver)
SELECT * FROM public.task_history ORDER BY created_at DESC LIMIT 5;
