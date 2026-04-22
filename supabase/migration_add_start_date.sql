-- Adiciona coluna start_date (nullable) na tabela units
ALTER TABLE units ADD COLUMN IF NOT EXISTS start_date DATE;
