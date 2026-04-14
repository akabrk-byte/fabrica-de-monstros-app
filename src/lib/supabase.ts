import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] Variáveis de ambiente não encontradas.\n' +
      'Crie o arquivo .env.local na raiz do projeto com:\n\n' +
      '  VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co\n' +
      '  VITE_SUPABASE_ANON_KEY=<sua-anon-key>\n',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
