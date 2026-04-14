/**
 * Templates de tarefas reais do processo de implantação.
 *
 * MIGRATION OBRIGATÓRIA — rodar UMA VEZ no Supabase SQL Editor:
 *
 *   INSERT INTO milestones (id, name, description, order_index, color)
 *   VALUES ('bbbbbbbb-0000-0000-0000-000000000000',
 *           'Fase 0 — Assinaturas',
 *           'Assinatura de contrato e envio do COF.',
 *           0, '#6366f1')
 *   ON CONFLICT (id) DO NOTHING;
 *
 *   -- Atualiza nomes das fases existentes (opcional)
 *   UPDATE milestones SET name = 'Fase 1 — Início'              WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
 *   UPDATE milestones SET name = 'Fase 2 — Estrutura & Compras' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002';
 *   UPDATE milestones SET name = 'Fase 3 — Filiações & Vendas'  WHERE id = 'bbbbbbbb-0000-0000-0000-000000000003';
 *   UPDATE milestones SET name = 'Fase 4 — Final & Inauguração' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000004';
 *   UPDATE milestones SET name = 'Fase 5 — Obra Finalizada'     WHERE id = 'bbbbbbbb-0000-0000-0000-000000000005';
 */

import type { TaskCategory } from '../services/tasksService'

// ─── Tipos ───────────────────────────────────────────────────────────

export interface TaskTemplate {
  title:      string
  category:   TaskCategory
  offsetDays: number   // negativo = N dias antes da inauguração
}

export interface PhaseTemplate {
  milestoneId: string
  order:       number
  name:        string
  color:       string
  tasks:       TaskTemplate[]
}

// ─── UUIDs dos milestones (devem existir no Supabase) ────────────────

export const MILESTONE_IDS = {
  FASE_0: 'bbbbbbbb-0000-0000-0000-000000000000', // novo — rodar migration
  FASE_1: 'bbbbbbbb-0000-0000-0000-000000000001',
  FASE_2: 'bbbbbbbb-0000-0000-0000-000000000002',
  FASE_3: 'bbbbbbbb-0000-0000-0000-000000000003',
  FASE_4: 'bbbbbbbb-0000-0000-0000-000000000004',
  FASE_5: 'bbbbbbbb-0000-0000-0000-000000000005',
} as const

// ─── Templates por fase ──────────────────────────────────────────────

export const PHASE_TEMPLATES: PhaseTemplate[] = [

  // ════════════════════════════════════════════════════════════════════
  // FASE 0 — Assinaturas
  // ════════════════════════════════════════════════════════════════════
  {
    milestoneId: MILESTONE_IDS.FASE_0,
    order: 0,
    name: 'Fase 0 — Assinaturas',
    color: '#6366f1',
    tasks: [
      { title: 'Assinatura do Contrato',  category: 'jurídico', offsetDays: -180 },
      { title: 'Envio do COF',            category: 'jurídico', offsetDays: -175 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // FASE 1 — Início da Implantação
  // ════════════════════════════════════════════════════════════════════
  {
    milestoneId: MILESTONE_IDS.FASE_1,
    order: 1,
    name: 'Fase 1 — Início',
    color: '#8b5cf6',
    tasks: [
      // Operacional / RH / Comercial
      { title: 'Reunião de boas-vindas',                                          category: 'operação',   offsetDays: -150 },
      { title: 'Envio do drive completo da franqueadora',                         category: 'operação',   offsetDays: -148 },
      { title: 'Contrato Social e CNPJ',                                          category: 'jurídico',   offsetDays: -145 },
      { title: 'Reunião para definição e contratação da equipe de marketing',     category: 'marketing',  offsetDays: -125 },
      { title: 'Contratação do Social Media',                                     category: 'marketing',  offsetDays: -120 },
      { title: 'Início das campanhas de tráfego pago institucional',              category: 'marketing',  offsetDays: -118 },
      { title: 'Contratação do Líder Comercial',                                  category: 'rh',         offsetDays: -115 },
      { title: 'Solicitação dos equipamentos principais',                         category: 'compras',    offsetDays: -110 },
      { title: 'Solicitação dos acessórios (anilhas, halteres, barras)',          category: 'compras',    offsetDays: -108 },
      { title: 'Contratação de Líder Administrativo',                             category: 'rh',         offsetDays: -105 },
      { title: 'Contratação dos meios de pagamento (Stone e Vindi)',              category: 'sistemas',   offsetDays: -100 },
      // Engenharia / Jurídico / Compras
      { title: 'Envio das plantas do local para equipe de engenharia',            category: 'engenharia', offsetDays: -140 },
      { title: 'Envio do Projeto Arquitetônico aprovado',                         category: 'engenharia', offsetDays: -135 },
      { title: 'Visita técnica ao local com responsável pela obra',               category: 'engenharia', offsetDays: -130 },
      { title: 'Reunião sobre compra dos maquinários da unidade',                 category: 'compras',    offsetDays: -128 },
      { title: 'Definição e contratação do responsável técnico da obra (ART/RRT)',category: 'jurídico',   offsetDays: -145 },
      { title: 'Verificação de alvará de reforma/obra junto à prefeitura',        category: 'jurídico',   offsetDays: -140 },
      { title: 'Análise de viabilidade legal do uso do imóvel como academia',     category: 'jurídico',   offsetDays: -138 },
      { title: 'Reunião com Jonathan sobre andamento da obra',                    category: 'engenharia', offsetDays: -130 },
      { title: 'Levantamento técnico do imóvel (elétrica, hidráulica, estrutura)',category: 'engenharia', offsetDays: -128 },
      { title: 'Compatibilização do projeto arquitetônico (elétrica, hidráulica, estrutura, incêndio)', category: 'engenharia', offsetDays: -125 },
      { title: 'Cronograma físico-financeiro da obra',                            category: 'engenharia', offsetDays: -120 },
      { title: 'Definição do escopo fechado da obra',                             category: 'engenharia', offsetDays: -118 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // FASE 2 — Estrutura & Compras
  // ════════════════════════════════════════════════════════════════════
  {
    milestoneId: MILESTONE_IDS.FASE_2,
    order: 2,
    name: 'Fase 2 — Estrutura & Compras',
    color: '#3b82f6',
    tasks: [
      // Obra civil
      { title: 'Início e andamento da obra estrutural',                       category: 'engenharia', offsetDays: -110 },
      { title: 'Demolições',                                                   category: 'engenharia', offsetDays: -108 },
      { title: 'Acompanhamento da obra — reuniões periódicas',                category: 'engenharia', offsetDays: -105 },
      { title: 'Regularização de piso',                                        category: 'engenharia', offsetDays:  -95 },
      { title: 'Elétrica (quadro, carga, aterramento)',                        category: 'engenharia', offsetDays:  -90 },
      { title: 'Hidráulica',                                                   category: 'engenharia', offsetDays:  -88 },
      { title: 'Climatização',                                                 category: 'engenharia', offsetDays:  -85 },
      { title: 'Iluminação técnica',                                           category: 'engenharia', offsetDays:  -83 },
      { title: 'Tratamento acústico',                                          category: 'engenharia', offsetDays:  -80 },
      // Compras e tecnologia
      { title: 'Compra dos móveis',                                            category: 'compras',    offsetDays:  -90 },
      { title: 'Compra do sistema de som',                                     category: 'compras',    offsetDays:  -88 },
      { title: 'Compra de CFTV / Câmeras',                                     category: 'compras',    offsetDays:  -85 },
      { title: 'Contratação de internet',                                      category: 'sistemas',   offsetDays:  -80 },
      { title: 'Compra dos computadores (recepção, professores, avaliação)',   category: 'compras',    offsetDays:  -78 },
      { title: 'Compra das impressoras',                                       category: 'compras',    offsetDays:  -75 },
      { title: 'Letreiro / Fachada',                                           category: 'compras',    offsetDays:  -75 },
      { title: 'Compra das webcams para recepção',                             category: 'compras',    offsetDays:  -73 },
      { title: 'Compra das impressoras para treino',                           category: 'compras',    offsetDays:  -72 },
      { title: 'Compra dos itens para sala de avaliação física',               category: 'compras',    offsetDays:  -70 },
      { title: 'Piso emborrachado',                                            category: 'compras',    offsetDays:  -68 },
      { title: 'Ar-condicionado',                                              category: 'compras',    offsetDays:  -65 },
      { title: 'Catracas',                                                     category: 'compras',    offsetDays:  -60 },
      { title: 'Uniformes',                                                    category: 'compras',    offsetDays:  -55 },
      // Jurídico / RH / Operação
      { title: 'Definição oficial do mês de abertura',                         category: 'operação',   offsetDays: -100 },
      { title: 'Alvará de funcionamento',                                      category: 'jurídico',   offsetDays:  -90 },
      { title: 'Licença do Corpo de Bombeiros',                                category: 'jurídico',   offsetDays:  -88 },
      { title: 'Vistoria da Vigilância Sanitária',                             category: 'jurídico',   offsetDays:  -85 },
      { title: 'Contratação do Coordenador da unidade',                        category: 'rh',         offsetDays:  -80 },
      { title: 'Regularização do CREF',                                        category: 'jurídico',   offsetDays:  -75 },
      { title: 'Planejamento estratégico com influenciadores digitais',        category: 'marketing',  offsetDays:  -70 },
      { title: 'Captação de currículos (consultoras, recepção, professores)',  category: 'rh',         offsetDays:  -68 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // FASE 3 — Filiações & Ativação de Vendas
  // ════════════════════════════════════════════════════════════════════
  {
    milestoneId: MILESTONE_IDS.FASE_3,
    order: 3,
    name: 'Fase 3 — Filiações & Vendas',
    color: '#f59e0b',
    tasks: [
      // Comercial / RH
      { title: 'Reunião de alinhamento com Líder Comercial',                             category: 'operação',  offsetDays: -60 },
      { title: 'Contratação e implantação do sistema EVO',                               category: 'sistemas',  offsetDays: -58 },
      { title: 'Contratação do time comercial',                                          category: 'rh',        offsetDays: -55 },
      { title: 'Contratação do coordenador da unidade',                                  category: 'rh',        offsetDays: -55 },
      { title: 'Treinamento do time comercial',                                          category: 'rh',        offsetDays: -50 },
      { title: 'Cadastro de colaboradores no sistema EVO',                               category: 'sistemas',  offsetDays: -48 },
      { title: 'Verificação dos planos e contratos no sistema',                          category: 'sistemas',  offsetDays: -45 },
      { title: 'Treinamento EVO para líderes e consultores',                             category: 'sistemas',  offsetDays: -43 },
      { title: 'Liberação do link de vendas online',                                     category: 'marketing', offsetDays: -40 },
      { title: 'Treinamento EVO para equipe técnica',                                    category: 'sistemas',  offsetDays: -40 },
      { title: 'Início oficial da pré-venda online e presencial com stand na obra',     category: 'marketing', offsetDays: -38 },
      { title: 'Verificação da grade de atividades no sistema',                          category: 'sistemas',  offsetDays: -35 },
      { title: 'Teste de internet, rede interna, Wi-Fi, integração EVO + Stone/Vindi',  category: 'sistemas',  offsetDays: -30 },
      { title: 'Definição dos fluxos: acesso, atendimento, treino e limpeza',           category: 'operação',  offsetDays: -28 },
      { title: 'Definição de horário de funcionamento e grade de aulas coletivas',      category: 'operação',  offsetDays: -25 },
      // Obra — fase final
      { title: 'Elétrica finalizada',        category: 'engenharia', offsetDays: -30 },
      { title: 'Iluminação instalada',       category: 'engenharia', offsetDays: -28 },
      { title: 'Climatização funcionando',   category: 'engenharia', offsetDays: -25 },
      { title: 'Piso instalado',             category: 'engenharia', offsetDays: -22 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // FASE 4 — Fase Final e Inauguração
  // ════════════════════════════════════════════════════════════════════
  {
    milestoneId: MILESTONE_IDS.FASE_4,
    order: 4,
    name: 'Fase 4 — Final & Inauguração',
    color: '#10b981',
    tasks: [
      { title: 'Contratação de empresa de limpeza pós-obra',                                       category: 'operação',   offsetDays: -10 },
      { title: 'Reunião de alinhamento sobre o evento de inauguração',                             category: 'operação',   offsetDays: -10 },
      { title: 'Conclusão da identidade visual',                                                   category: 'marketing',  offsetDays:  -8 },
      { title: 'Entrega dos móveis',                                                               category: 'compras',    offsetDays:  -8 },
      { title: 'Instalação final do som',                                                          category: 'engenharia', offsetDays:  -7 },
      { title: 'Instalação e funcionamento do ar-condicionado',                                    category: 'engenharia', offsetDays:  -7 },
      { title: 'Ativação do TotalPass',                                                            category: 'sistemas',   offsetDays:  -7 },
      { title: 'Ativação do Wellhub',                                                              category: 'sistemas',   offsetDays:  -7 },
      { title: 'Instalação e posicionamento dos móveis',                                           category: 'engenharia', offsetDays:  -6 },
      { title: 'Aplicação completa da identidade visual',                                          category: 'marketing',  offsetDays:  -6 },
      { title: 'Solicitação e verificação da instalação das catracas',                             category: 'engenharia', offsetDays:  -5 },
      { title: 'Visita final de validação da academia (até 4 dias antes da inauguração)',         category: 'operação',   offsetDays:  -4 },
      { title: 'Verificação in loco',                                                              category: 'operação',   offsetDays:  -4 },
      { title: 'Ajustes finais operacionais, comerciais e de experiência do cliente',             category: 'operação',   offsetDays:  -3 },
      { title: 'Verificação do funcionamento do App',                                              category: 'sistemas',   offsetDays:  -3 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // FASE 5 — Obra Finalizada (checklist pré-abertura)
  // ════════════════════════════════════════════════════════════════════
  {
    milestoneId: MILESTONE_IDS.FASE_5,
    order: 5,
    name: 'Fase 5 — Obra Finalizada',
    color: '#6b7280',
    tasks: [
      // Jurídico
      { title: 'AVCB / Certificado do Corpo de Bombeiros', category: 'jurídico',   offsetDays: -10 },
      { title: 'Alvará de Funcionamento',                  category: 'jurídico',   offsetDays: -10 },
      { title: 'Licenças municipais vigentes',             category: 'jurídico',   offsetDays: -10 },
      // RH
      { title: 'Time completo contratado',                 category: 'rh',         offsetDays:  -7 },
      { title: 'Treinamento final realizado',              category: 'rh',         offsetDays:  -5 },
      { title: 'Uniformes entregues',                      category: 'rh',         offsetDays:  -5 },
      { title: 'Escalas definidas',                        category: 'rh',         offsetDays:  -4 },
      // Obra / acabamento
      { title: 'Obra civil 100% concluída',                category: 'engenharia', offsetDays:  -5 },
      { title: 'Pintura final aprovada',                   category: 'engenharia', offsetDays:  -4 },
      // Marketing / identidade visual
      { title: 'Evento de inauguração alinhado',           category: 'operação',   offsetDays:  -5 },
      { title: 'Ações promocionais ativas',                category: 'marketing',  offsetDays:  -5 },
      { title: 'Comunicação visual instalada',             category: 'marketing',  offsetDays:  -4 },
      { title: 'Fachada instalada e iluminada',            category: 'marketing',  offsetDays:  -4 },
      // Compras / equipamentos
      { title: 'Equipamentos entregues, montados e testados', category: 'compras', offsetDays:  -3 },
      { title: 'Móveis entregues',                            category: 'compras', offsetDays:  -3 },
      { title: 'Acessórios organizados e etiquetados',        category: 'compras', offsetDays:  -2 },
      // Sistemas
      { title: 'EVO configurado e testado',                category: 'sistemas',   offsetDays:  -3 },
      { title: 'Meios de pagamento operando',              category: 'sistemas',   offsetDays:  -2 },
      { title: 'Catracas funcionando',                     category: 'sistemas',   offsetDays:  -2 },
      { title: 'TotalPass ativo',                          category: 'sistemas',   offsetDays:  -2 },
      { title: 'Wellhub ativo',                            category: 'sistemas',   offsetDays:  -2 },
      { title: 'Internet e Wi-Fi funcionando',             category: 'sistemas',   offsetDays:  -2 },
      { title: 'Câmeras funcionando',                      category: 'sistemas',   offsetDays:  -2 },
      { title: 'Som funcionando',                          category: 'sistemas',   offsetDays:  -2 },
      // Operação
      { title: 'Limpeza pós-obra realizada',               category: 'operação',   offsetDays:  -3 },
      { title: 'Comunicação final com leads',              category: 'marketing',  offsetDays:  -2 },
      { title: 'Operação validada em "dia teste"',         category: 'operação',   offsetDays:  -1 },
    ],
  },
]

// ─── Totais (útil para log/debug) ────────────────────────────────────

export const TOTAL_TASKS = PHASE_TEMPLATES.reduce((n, p) => n + p.tasks.length, 0)
