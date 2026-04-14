-- ═══════════════════════════════════════════════════════════════════
-- IMPLANTAÇÃO TIMELINE — Schema completo (ordem correta)
-- ───────────────────────────────────────────────────────────────────
-- Supabase → SQL Editor → New query → colar tudo → Run (F5)
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────
-- FASE 1 — TIPOS (ENUM)
-- ───────────────────────────────────────────────────────────────────

CREATE TYPE user_role     AS ENUM ('admin', 'implantador', 'franqueado');
CREATE TYPE unit_status   AS ENUM ('planejamento', 'em_andamento', 'inaugurada', 'cancelada');
CREATE TYPE task_status   AS ENUM ('não_iniciado', 'em_andamento', 'concluído', 'bloqueado');
CREATE TYPE task_category AS ENUM (
  'jurídico', 'engenharia', 'compras',
  'marketing', 'operação', 'sistemas', 'rh'
);


-- ───────────────────────────────────────────────────────────────────
-- FASE 2 — FUNÇÃO SEM REFERÊNCIA A TABELAS
-- (precisa existir antes dos triggers das tabelas)
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ───────────────────────────────────────────────────────────────────
-- FASE 3 — TODAS AS TABELAS
-- (nenhuma política aqui ainda)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  role        user_role   NOT NULL DEFAULT 'implantador',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──

CREATE TABLE templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──

CREATE TABLE milestones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  order_index INTEGER     NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#6366f1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──
-- days_before_inauguration:
--   -120 = 120 dias antes da inauguração
--      0 = dia da inauguração
--     +7 = 7 dias depois da inauguração
--
-- depends_on UUID[]: FK de array não existe no PG — validado na aplicação.

CREATE TABLE task_templates (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id              UUID          NOT NULL REFERENCES templates(id)  ON DELETE CASCADE,
  milestone_id             UUID          NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  title                    TEXT          NOT NULL,
  description              TEXT,
  category                 task_category NOT NULL,
  days_before_inauguration INTEGER       NOT NULL,
  default_responsible_role user_role,
  depends_on               UUID[],
  order_index              INTEGER       NOT NULL DEFAULT 0,
  is_active                BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ──

CREATE TABLE units (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  slug              TEXT        UNIQUE NOT NULL,
  city              TEXT,
  state             TEXT,
  inauguration_date DATE,
  status            unit_status NOT NULL DEFAULT 'planejamento',
  template_applied  BOOLEAN     NOT NULL DEFAULT FALSE,
  responsible_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  franqueado_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──
-- Ao mudar inauguration_date: recalcular due_date apenas de tarefas
-- com status <> 'concluído'. Tarefas concluídas são imutáveis.

CREATE TABLE tasks (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id                  UUID          NOT NULL REFERENCES units(id)         ON DELETE CASCADE,
  template_task_id         UUID                   REFERENCES task_templates(id) ON DELETE SET NULL,
  milestone_id             UUID          NOT NULL REFERENCES milestones(id)    ON DELETE RESTRICT,
  title                    TEXT          NOT NULL,
  description              TEXT,
  category                 task_category NOT NULL,
  status                   task_status   NOT NULL DEFAULT 'não_iniciado',
  due_date                 DATE,
  original_due_date        DATE,
  days_before_inauguration INTEGER,
  responsible_id           UUID                   REFERENCES profiles(id) ON DELETE SET NULL,
  depends_on               UUID[],
  notes                    TEXT,
  completed_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ──
-- Auditoria append-only: nunca UPDATE, apenas INSERT.

CREATE TABLE task_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  unit_id      UUID        NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  changed_by   UUID                 REFERENCES profiles(id) ON DELETE SET NULL,
  old_status   task_status,
  new_status   task_status,
  old_due_date DATE,
  new_due_date DATE,
  note         TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ───────────────────────────────────────────────────────────────────
-- FASE 4 — ÍNDICES
-- ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_task_templates_template  ON task_templates(template_id);
CREATE INDEX idx_task_templates_milestone ON task_templates(milestone_id);

CREATE INDEX idx_units_responsible ON units(responsible_id);
CREATE INDEX idx_units_franqueado  ON units(franqueado_id);
CREATE INDEX idx_units_status      ON units(status);

CREATE INDEX idx_tasks_unit        ON tasks(unit_id);
CREATE INDEX idx_tasks_milestone   ON tasks(milestone_id);
CREATE INDEX idx_tasks_responsible ON tasks(responsible_id);
CREATE INDEX idx_tasks_status      ON tasks(status);
CREATE INDEX idx_tasks_due_date    ON tasks(due_date);

CREATE INDEX idx_task_history_task ON task_history(task_id);
CREATE INDEX idx_task_history_unit ON task_history(unit_id);


-- ───────────────────────────────────────────────────────────────────
-- FASE 5 — TRIGGERS DE updated_at
-- ───────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ───────────────────────────────────────────────────────────────────
-- FASE 6 — FUNÇÕES QUE REFERENCIAM TABELAS
-- (profiles já existe aqui)
-- ───────────────────────────────────────────────────────────────────

-- Retorna a role do usuário autenticado.
-- SECURITY DEFINER: executa como dono da função, evitando recursão
-- quando chamada dentro de políticas RLS da própria tabela profiles.
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Cria perfil automaticamente quando um usuário se cadastra no Auth.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ───────────────────────────────────────────────────────────────────
-- FASE 7 — TRIGGER NO AUTH.USERS
-- ───────────────────────────────────────────────────────────────────

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ───────────────────────────────────────────────────────────────────
-- FASE 8 — HABILITAR RLS EM TODAS AS TABELAS
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE units          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history   ENABLE ROW LEVEL SECURITY;


-- ───────────────────────────────────────────────────────────────────
-- FASE 9 — POLÍTICAS RLS
-- (todas as tabelas já existem aqui)
-- ───────────────────────────────────────────────────────────────────

-- ── profiles ────────────────────────────────────────────────────────

CREATE POLICY "profiles: leitura por autenticados"
  ON profiles FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "profiles: atualização própria"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: atualização por admin"
  ON profiles FOR UPDATE TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── templates ───────────────────────────────────────────────────────

CREATE POLICY "templates: leitura por autenticados"
  ON templates FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "templates: escrita por admin"
  ON templates FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── milestones ──────────────────────────────────────────────────────

CREATE POLICY "milestones: leitura por autenticados"
  ON milestones FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "milestones: escrita por admin"
  ON milestones FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── task_templates ──────────────────────────────────────────────────

CREATE POLICY "task_templates: leitura por autenticados"
  ON task_templates FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "task_templates: escrita por admin"
  ON task_templates FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- ── units ───────────────────────────────────────────────────────────

CREATE POLICY "units: acesso total para admin"
  ON units FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "units: implantador lê suas unidades"
  ON units FOR SELECT TO authenticated
  USING (responsible_id = auth.uid());

CREATE POLICY "units: implantador atualiza suas unidades"
  ON units FOR UPDATE TO authenticated
  USING (responsible_id = auth.uid())
  WITH CHECK (responsible_id = auth.uid());

CREATE POLICY "units: franqueado lê sua unidade"
  ON units FOR SELECT TO authenticated
  USING (franqueado_id = auth.uid());

-- ── tasks ───────────────────────────────────────────────────────────

CREATE POLICY "tasks: acesso total para admin"
  ON tasks FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "tasks: implantador acessa suas unidades"
  ON tasks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units
      WHERE units.id = tasks.unit_id
        AND units.responsible_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units
      WHERE units.id = tasks.unit_id
        AND units.responsible_id = auth.uid()
    )
  );

CREATE POLICY "tasks: franqueado lê sua unidade"
  ON tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units
      WHERE units.id = tasks.unit_id
        AND units.franqueado_id = auth.uid()
    )
  );

-- ── task_history ────────────────────────────────────────────────────

CREATE POLICY "task_history: acesso total para admin"
  ON task_history FOR ALL TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

CREATE POLICY "task_history: implantador acessa suas unidades"
  ON task_history FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units
      WHERE units.id = task_history.unit_id
        AND units.responsible_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM units
      WHERE units.id = task_history.unit_id
        AND units.responsible_id = auth.uid()
    )
  );

CREATE POLICY "task_history: franqueado lê sua unidade"
  ON task_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM units
      WHERE units.id = task_history.unit_id
        AND units.franqueado_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════
-- FASE 10 — SEED (dados de exemplo)
-- ═══════════════════════════════════════════════════════════════════


-- ── Template padrão ─────────────────────────────────────────────────

INSERT INTO templates (id, name, description) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001',
   'Template Padrão',
   'Processo completo de implantação — do contrato à inauguração.');


-- ── Milestones (Fases) ──────────────────────────────────────────────

INSERT INTO milestones (id, name, description, order_index, color) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'Fase 1 — Início',
   'Contrato, análise de viabilidade e aprovação do ponto.',
   1, '#8b5cf6'),

  ('bbbbbbbb-0000-0000-0000-000000000002',
   'Fase 2 — Estrutura',
   'Projeto de obras, contratação e compra de equipamentos.',
   2, '#3b82f6'),

  ('bbbbbbbb-0000-0000-0000-000000000003',
   'Fase 3 — Filiações',
   'Abertura de empresa, registros legais e contratação de equipe.',
   3, '#f59e0b'),

  ('bbbbbbbb-0000-0000-0000-000000000004',
   'Fase 4 — Final',
   'Instalações, sistemas, treinamento e preparação para abertura.',
   4, '#10b981'),

  ('bbbbbbbb-0000-0000-0000-000000000005',
   'Fase 5 — Pós-obra',
   'Acompanhamento operacional e avaliação pós-inauguração.',
   5, '#6b7280');


-- ── Task Templates (24 tarefas-modelo) ──────────────────────────────

INSERT INTO task_templates
  (id, template_id, milestone_id, title, description,
   category, days_before_inauguration, default_responsible_role, order_index)
VALUES

  -- Fase 1 — Início (D-120 a D-90)
  ('cccccccc-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Contrato de franquia assinado',
   'Assinatura formal do contrato entre franqueadora e franqueado.',
   'jurídico', -120, 'admin', 1),

  ('cccccccc-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Identificação e avaliação do ponto comercial',
   'Levantamento de opções. Verificar fluxo, metragem mínima e localização conforme manual da franquia.',
   'engenharia', -110, 'implantador', 2),

  ('cccccccc-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Aprovação formal do ponto pela franqueadora',
   'Envio de fotos, planta baixa e formulário de análise para aprovação.',
   'jurídico', -95, 'implantador', 3),

  ('cccccccc-0000-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001',
   'Assinatura do contrato de locação',
   'Negociação e assinatura do aluguel. Verificar cláusula de rescisão e prazo mínimo.',
   'jurídico', -90, 'franqueado', 4),

  -- Fase 2 — Estrutura (D-90 a D-55)
  ('cccccccc-0000-0000-0000-000000000005',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Projeto arquitetônico elaborado e aprovado',
   'Arquiteto credenciado. Projeto deve seguir o manual de identidade visual da franquia.',
   'engenharia', -85, 'implantador', 1),

  ('cccccccc-0000-0000-0000-000000000006',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Alvará de obras solicitado na prefeitura',
   'Protocolo do pedido de alvará de construção/reforma. Guardar número do protocolo.',
   'jurídico', -80, 'implantador', 2),

  ('cccccccc-0000-0000-0000-000000000007',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Início das obras de reforma',
   'Contratação da empreiteira e início efetivo das obras conforme projeto aprovado.',
   'engenharia', -75, 'implantador', 3),

  ('cccccccc-0000-0000-0000-000000000008',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Pedido de equipamentos principais',
   'Emissão do pedido de compra dos equipamentos obrigatórios. Atenção ao prazo de entrega.',
   'compras', -65, 'implantador', 4),

  ('cccccccc-0000-0000-0000-000000000009',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002',
   'Pedido de mobiliário e comunicação visual',
   'Mobiliário padrão e materiais de comunicação visual (fachada, adesivos, displays).',
   'compras', -60, 'implantador', 5),

  -- Fase 3 — Filiações (D-60 a D-30)
  ('cccccccc-0000-0000-0000-000000000010',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
   'Abertura do CNPJ',
   'Registro na Receita Federal. Definir regime tributário com contador.',
   'jurídico', -60, 'franqueado', 1),

  ('cccccccc-0000-0000-0000-000000000011',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
   'Alvará de funcionamento solicitado',
   'Protocolo do pedido de alvará de funcionamento com CNPJ já obtido.',
   'jurídico', -55, 'implantador', 2),

  ('cccccccc-0000-0000-0000-000000000012',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
   'Abertura de conta bancária PJ',
   'Conta corrente PJ para operação e recebimento de clientes.',
   'operação', -50, 'franqueado', 3),

  ('cccccccc-0000-0000-0000-000000000013',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
   'Contratação da equipe inicial',
   'Recrutamento, seleção e contratação de vendedores, caixa e gerente de loja.',
   'rh', -45, 'franqueado', 4),

  ('cccccccc-0000-0000-0000-000000000014',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003',
   'Treinamento inicial da equipe na franqueadora',
   'Treinamento presencial ou online no padrão da rede.',
   'rh', -35, 'implantador', 5),

  -- Fase 4 — Final (D-30 a D-1)
  ('cccccccc-0000-0000-0000-000000000015',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004',
   'Conclusão e vistoria das obras',
   'Checklist final: elétrica, hidráulica, acabamento e pintura.',
   'engenharia', -25, 'implantador', 1),

  ('cccccccc-0000-0000-0000-000000000016',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004',
   'Instalação e configuração dos sistemas de gestão',
   'Setup do PDV, estoque, integração com a franqueadora e impressoras fiscais.',
   'sistemas', -20, 'implantador', 2),

  ('cccccccc-0000-0000-0000-000000000017',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004',
   'Recebimento e montagem de mobiliário',
   'Conferência de NF, montagem e disposição conforme layout aprovado.',
   'compras', -18, 'implantador', 3),

  ('cccccccc-0000-0000-0000-000000000018',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004',
   'Vistoria da vigilância sanitária',
   'Agendamento e recebimento da vistoria. Providenciar documentos exigidos.',
   'jurídico', -12, 'implantador', 4),

  ('cccccccc-0000-0000-0000-000000000019',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004',
   'Campanha de divulgação da inauguração',
   'Peças em redes sociais, panfletagem e assessoria de imprensa local.',
   'marketing', -10, 'implantador', 5),

  ('cccccccc-0000-0000-0000-000000000020',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000004',
   'Simulação de operação (dry run)',
   'Funcionamento completo por 1 dia antes da abertura. Identificar gaps de processo.',
   'rh', -5, 'implantador', 6),

  -- Fase 5 — Pós-obra (D0 a D+30)
  ('cccccccc-0000-0000-0000-000000000021',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005',
   'Inauguração da unidade',
   'Abertura oficial ao público.',
   'operação', 0, 'implantador', 1),

  ('cccccccc-0000-0000-0000-000000000022',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005',
   'Acompanhamento semana 1 pós-abertura',
   'Suporte presencial ou remoto. Relatório de ocorrências diárias.',
   'operação', 7, 'implantador', 2),

  ('cccccccc-0000-0000-0000-000000000023',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005',
   'Relatório final de implantação',
   'Elaboração e entrega do relatório completo para a franqueadora.',
   'operação', 15, 'implantador', 3),

  ('cccccccc-0000-0000-0000-000000000024',
   'aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000005',
   'Pesquisa de satisfação com o franqueado',
   'Formulário de avaliação do processo de implantação pelo franqueado.',
   'operação', 30, 'admin', 4);


-- ── Units de exemplo ─────────────────────────────────────────────────
-- responsible_id e franqueado_id ficam NULL até associar usuários reais.

INSERT INTO units (id, name, slug, city, state, inauguration_date, status) VALUES
  ('dddddddd-0000-0000-0000-000000000001',
   'Unidade São Paulo — Pinheiros', 'sp-pinheiros',
   'São Paulo', 'SP',
   CURRENT_DATE + INTERVAL '90 days', 'em_andamento'),

  ('dddddddd-0000-0000-0000-000000000002',
   'Unidade Belo Horizonte — Savassi', 'bh-savassi',
   'Belo Horizonte', 'MG',
   CURRENT_DATE + INTERVAL '55 days', 'em_andamento');


-- ── Tasks de exemplo — SP Pinheiros ──────────────────────────────────
-- Fase 1 concluída, Fase 2 em andamento.
-- due_date = inauguration_date + days_before_inauguration

INSERT INTO tasks
  (id, unit_id, template_task_id, milestone_id,
   title, category, status,
   due_date, original_due_date, days_before_inauguration, completed_at)
VALUES

  ('eeeeeeee-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Contrato de franquia assinado', 'jurídico', 'concluído',
   CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '30 days', -120,
   CURRENT_DATE - INTERVAL '30 days'),

  ('eeeeeeee-0000-0000-0000-000000000002',
   'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Identificação e avaliação do ponto comercial', 'engenharia', 'concluído',
   CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '20 days', -110,
   CURRENT_DATE - INTERVAL '20 days'),

  ('eeeeeeee-0000-0000-0000-000000000003',
   'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Aprovação formal do ponto pela franqueadora', 'jurídico', 'concluído',
   CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE - INTERVAL '5 days', -95,
   CURRENT_DATE - INTERVAL '5 days'),

  ('eeeeeeee-0000-0000-0000-000000000004',
   'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000004',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Assinatura do contrato de locação', 'jurídico', 'concluído',
   CURRENT_DATE, CURRENT_DATE, -90,
   CURRENT_DATE),

  ('eeeeeeee-0000-0000-0000-000000000005',
   'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000005',
   'bbbbbbbb-0000-0000-0000-000000000002',
   'Projeto arquitetônico elaborado e aprovado', 'engenharia', 'em_andamento',
   CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '5 days', -85,
   NULL),

  ('eeeeeeee-0000-0000-0000-000000000006',
   'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000006',
   'bbbbbbbb-0000-0000-0000-000000000002',
   'Alvará de obras solicitado na prefeitura', 'jurídico', 'não_iniciado',
   CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '10 days', -80,
   NULL),

  ('eeeeeeee-0000-0000-0000-000000000007',
   'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000007',
   'bbbbbbbb-0000-0000-0000-000000000002',
   'Início das obras de reforma', 'engenharia', 'não_iniciado',
   CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', -75,
   NULL),

  ('eeeeeeee-0000-0000-0000-000000000008',
   'dddddddd-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000008',
   'bbbbbbbb-0000-0000-0000-000000000002',
   'Pedido de equipamentos principais', 'compras', 'bloqueado',
   CURRENT_DATE + INTERVAL '25 days', CURRENT_DATE + INTERVAL '25 days', -65,
   NULL);
