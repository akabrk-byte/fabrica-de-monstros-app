export interface TaskTemplate {
  nome:       string
  categoria:  'jurídico' | 'engenharia' | 'compras' | 'marketing' | 'rh' | 'sistemas' | 'operação'
  fase_order: number
  fase_nome:  string
  offset_dias: number   // negativo = N dias antes da inauguração
}

export const TASK_TEMPLATES: TaskTemplate[] = [

  // ════════════════════════════════════════════════════════════════
  // FASE 0 — Assinaturas
  // ════════════════════════════════════════════════════════════════
  { nome: 'Assinatura do Contrato de Franquia',        categoria: 'jurídico', fase_order: 0, fase_nome: 'Fase 0 — Assinaturas', offset_dias: -180 },
  { nome: 'Envio do COF (Circular de Oferta de Franquia)', categoria: 'jurídico', fase_order: 0, fase_nome: 'Fase 0 — Assinaturas', offset_dias: -175 },

  // ════════════════════════════════════════════════════════════════
  // FASE 1 — Início da Implantação
  // ════════════════════════════════════════════════════════════════
  { nome: 'Reunião de boas-vindas',                                                                categoria: 'operação',   fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -150 },
  { nome: 'Envio do drive completo da franqueadora',                                               categoria: 'operação',   fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -148 },
  { nome: 'Contrato Social e CNPJ',                                                                categoria: 'jurídico',   fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -145 },
  { nome: 'Definição e contratação do responsável técnico da obra (ART/RRT)',                      categoria: 'jurídico',   fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -145 },
  { nome: 'Envio das plantas do local para equipe de engenharia',                                  categoria: 'engenharia', fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -140 },
  { nome: 'Verificação de alvará de reforma/obra junto à prefeitura',                              categoria: 'jurídico',   fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -140 },
  { nome: 'Envio do Projeto Arquitetônico aprovado',                                               categoria: 'engenharia', fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -135 },
  { nome: 'Análise de viabilidade legal do uso do imóvel como academia',                           categoria: 'jurídico',   fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -138 },
  { nome: 'Visita técnica ao local com responsável pela obra',                                     categoria: 'engenharia', fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -130 },
  { nome: 'Reunião com Jonathan sobre andamento da obra',                                          categoria: 'engenharia', fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -130 },
  { nome: 'Reunião sobre compra dos maquinários da unidade',                                       categoria: 'compras',    fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -128 },
  { nome: 'Levantamento técnico do imóvel (elétrica, hidráulica, estrutura)',                      categoria: 'engenharia', fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -128 },
  { nome: 'Reunião para definição e contratação da equipe de marketing',                           categoria: 'marketing',  fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -125 },
  { nome: 'Compatibilização do projeto arquitetônico (elétrica, hidráulica, estrutura, incêndio)', categoria: 'engenharia', fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -125 },
  { nome: 'Contratação do Social Media',                                                           categoria: 'marketing',  fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -120 },
  { nome: 'Cronograma físico-financeiro da obra',                                                  categoria: 'engenharia', fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -120 },
  { nome: 'Início das campanhas de tráfego pago institucional',                                    categoria: 'marketing',  fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -118 },
  { nome: 'Definição do escopo fechado da obra',                                                   categoria: 'engenharia', fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -118 },
  { nome: 'Contratação do Líder Comercial',                                                        categoria: 'rh',         fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -115 },
  { nome: 'Solicitação dos equipamentos principais',                                               categoria: 'compras',    fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -110 },
  { nome: 'Solicitação dos acessórios (anilhas, halteres, barras)',                                categoria: 'compras',    fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -108 },
  { nome: 'Contratação de Líder Administrativo',                                                   categoria: 'rh',         fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -105 },
  { nome: 'Contratação dos meios de pagamento (Stone e Vindi)',                                    categoria: 'sistemas',   fase_order: 1, fase_nome: 'Fase 1 — Início', offset_dias: -100 },

  // ════════════════════════════════════════════════════════════════
  // FASE 2 — Estrutura & Compras
  // ════════════════════════════════════════════════════════════════
  { nome: 'Início e andamento da obra estrutural',                     categoria: 'engenharia', fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias: -110 },
  { nome: 'Demolições',                                                categoria: 'engenharia', fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias: -108 },
  { nome: 'Acompanhamento da obra — reuniões periódicas',              categoria: 'engenharia', fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias: -105 },
  { nome: 'Definição oficial do mês de abertura',                      categoria: 'operação',   fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias: -100 },
  { nome: 'Regularização de piso',                                     categoria: 'engenharia', fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -95 },
  { nome: 'Elétrica (quadro, carga, aterramento)',                     categoria: 'engenharia', fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -90 },
  { nome: 'Compra dos móveis',                                         categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -90 },
  { nome: 'Alvará de funcionamento',                                   categoria: 'jurídico',   fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -90 },
  { nome: 'Hidráulica',                                                categoria: 'engenharia', fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -88 },
  { nome: 'Compra do sistema de som',                                  categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -88 },
  { nome: 'Licença do Corpo de Bombeiros',                             categoria: 'jurídico',   fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -88 },
  { nome: 'Climatização',                                              categoria: 'engenharia', fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -85 },
  { nome: 'Compra de CFTV / Câmeras',                                  categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -85 },
  { nome: 'Vistoria da Vigilância Sanitária',                          categoria: 'jurídico',   fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -85 },
  { nome: 'Iluminação técnica',                                        categoria: 'engenharia', fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -83 },
  { nome: 'Tratamento acústico',                                       categoria: 'engenharia', fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -80 },
  { nome: 'Contratação de internet',                                   categoria: 'sistemas',   fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -80 },
  { nome: 'Contratação do Coordenador da unidade',                     categoria: 'rh',         fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -80 },
  { nome: 'Compra dos computadores (recepção, professores, avaliação)', categoria: 'compras',   fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -78 },
  { nome: 'Compra das impressoras',                                    categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -75 },
  { nome: 'Letreiro / Fachada',                                        categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -75 },
  { nome: 'Regularização do CREF',                                     categoria: 'jurídico',   fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -75 },
  { nome: 'Compra das webcams para recepção',                          categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -73 },
  { nome: 'Compra das impressoras para treino',                        categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -72 },
  { nome: 'Compra dos itens para sala de avaliação física',            categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -70 },
  { nome: 'Planejamento estratégico com influenciadores digitais',     categoria: 'marketing',  fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -70 },
  { nome: 'Piso emborrachado',                                         categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -68 },
  { nome: 'Captação de currículos (consultoras, recepção, professores)', categoria: 'rh',       fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -68 },
  { nome: 'Ar-condicionado',                                           categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -65 },
  { nome: 'Catracas',                                                  categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -60 },
  { nome: 'Uniformes',                                                 categoria: 'compras',    fase_order: 2, fase_nome: 'Fase 2 — Estrutura & Compras', offset_dias:  -55 },

  // ════════════════════════════════════════════════════════════════
  // FASE 3 — Filiações & Ativação de Vendas
  // ════════════════════════════════════════════════════════════════
  { nome: 'Reunião de alinhamento com Líder Comercial',                            categoria: 'operação',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -60 },
  { nome: 'Contratação e implantação do sistema EVO',                              categoria: 'sistemas',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -58 },
  { nome: 'Contratação do time comercial',                                         categoria: 'rh',        fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -55 },
  { nome: 'Contratação do coordenador da unidade',                                 categoria: 'rh',        fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -55 },
  { nome: 'Treinamento do time comercial',                                         categoria: 'rh',        fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -50 },
  { nome: 'Cadastro de colaboradores no sistema EVO',                              categoria: 'sistemas',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -48 },
  { nome: 'Verificação dos planos e contratos no sistema',                         categoria: 'sistemas',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -45 },
  { nome: 'Treinamento EVO para líderes e consultores',                            categoria: 'sistemas',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -43 },
  { nome: 'Liberação do link de vendas online',                                    categoria: 'marketing', fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -40 },
  { nome: 'Treinamento EVO para equipe técnica',                                   categoria: 'sistemas',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -40 },
  { nome: 'Início oficial da pré-venda online e presencial com stand na obra',    categoria: 'marketing', fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -38 },
  { nome: 'Verificação da grade de atividades no sistema',                         categoria: 'sistemas',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -35 },
  { nome: 'Teste de internet, rede interna, Wi-Fi, integração EVO + Stone/Vindi', categoria: 'sistemas',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -30 },
  { nome: 'Elétrica finalizada',                                                   categoria: 'engenharia',fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -30 },
  { nome: 'Definição dos fluxos: acesso, atendimento, treino e limpeza',           categoria: 'operação',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -28 },
  { nome: 'Iluminação instalada',                                                  categoria: 'engenharia',fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -28 },
  { nome: 'Definição de horário de funcionamento e grade de aulas coletivas',      categoria: 'operação',  fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -25 },
  { nome: 'Climatização funcionando',                                              categoria: 'engenharia',fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -25 },
  { nome: 'Piso instalado',                                                        categoria: 'engenharia',fase_order: 3, fase_nome: 'Fase 3 — Filiações & Vendas', offset_dias: -22 },

  // ════════════════════════════════════════════════════════════════
  // FASE 4 — Fase Final e Inauguração
  // ════════════════════════════════════════════════════════════════
  { nome: 'Contratação de empresa de limpeza pós-obra',                                    categoria: 'operação',   fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias: -10 },
  { nome: 'Reunião de alinhamento sobre o evento de inauguração',                          categoria: 'operação',   fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias: -10 },
  { nome: 'Conclusão da identidade visual',                                                categoria: 'marketing',  fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -8 },
  { nome: 'Entrega dos móveis',                                                            categoria: 'compras',    fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -8 },
  { nome: 'Instalação final do som',                                                       categoria: 'engenharia', fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -7 },
  { nome: 'Instalação e funcionamento do ar-condicionado',                                 categoria: 'engenharia', fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -7 },
  { nome: 'Ativação do TotalPass',                                                         categoria: 'sistemas',   fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -7 },
  { nome: 'Ativação do Wellhub',                                                           categoria: 'sistemas',   fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -7 },
  { nome: 'Instalação e posicionamento dos móveis',                                        categoria: 'engenharia', fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -6 },
  { nome: 'Aplicação completa da identidade visual',                                       categoria: 'marketing',  fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -6 },
  { nome: 'Solicitação e verificação da instalação das catracas',                          categoria: 'engenharia', fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -5 },
  { nome: 'Visita final de validação da academia (até 4 dias antes da inauguração)',      categoria: 'operação',   fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -4 },
  { nome: 'Verificação in loco',                                                           categoria: 'operação',   fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -4 },
  { nome: 'Ajustes finais operacionais, comerciais e de experiência do cliente',           categoria: 'operação',   fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -3 },
  { nome: 'Verificação do funcionamento do App',                                           categoria: 'sistemas',   fase_order: 4, fase_nome: 'Fase 4 — Final & Inauguração', offset_dias:  -3 },

  // ════════════════════════════════════════════════════════════════
  // FASE 5 — Obra Finalizada (checklist pré-abertura)
  // ════════════════════════════════════════════════════════════════
  { nome: 'AVCB / Certificado do Corpo de Bombeiros',    categoria: 'jurídico',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias: -10 },
  { nome: 'Alvará de Funcionamento',                     categoria: 'jurídico',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias: -10 },
  { nome: 'Licenças municipais vigentes',                categoria: 'jurídico',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias: -10 },
  { nome: 'Time completo contratado',                    categoria: 'rh',         fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -7 },
  { nome: 'Evento de inauguração alinhado',              categoria: 'operação',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -5 },
  { nome: 'Ações promocionais ativas',                   categoria: 'marketing',  fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -5 },
  { nome: 'Obra civil 100% concluída',                   categoria: 'engenharia', fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -5 },
  { nome: 'Treinamento final realizado',                 categoria: 'rh',         fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -5 },
  { nome: 'Uniformes entregues',                         categoria: 'rh',         fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -5 },
  { nome: 'Comunicação visual instalada',                categoria: 'marketing',  fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -4 },
  { nome: 'Fachada instalada e iluminada',               categoria: 'marketing',  fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -4 },
  { nome: 'Pintura final aprovada',                      categoria: 'engenharia', fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -4 },
  { nome: 'Escalas definidas',                           categoria: 'rh',         fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -4 },
  { nome: 'Equipamentos entregues, montados e testados', categoria: 'compras',    fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -3 },
  { nome: 'Móveis entregues',                            categoria: 'compras',    fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -3 },
  { nome: 'EVO configurado e testado',                   categoria: 'sistemas',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -3 },
  { nome: 'Limpeza pós-obra realizada',                  categoria: 'operação',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -3 },
  { nome: 'Meios de pagamento operando',                 categoria: 'sistemas',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -2 },
  { nome: 'Catracas funcionando',                        categoria: 'sistemas',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -2 },
  { nome: 'TotalPass ativo',                             categoria: 'sistemas',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -2 },
  { nome: 'Wellhub ativo',                               categoria: 'sistemas',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -2 },
  { nome: 'Internet e Wi-Fi funcionando',                categoria: 'sistemas',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -2 },
  { nome: 'Câmeras funcionando',                         categoria: 'sistemas',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -2 },
  { nome: 'Som funcionando',                             categoria: 'sistemas',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -2 },
  { nome: 'Acessórios organizados e etiquetados',        categoria: 'compras',    fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -2 },
  { nome: 'Comunicação final com leads',                 categoria: 'marketing',  fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -2 },
  { nome: 'Operação validada em "dia teste"',            categoria: 'operação',   fase_order: 5, fase_nome: 'Fase 5 — Obra Finalizada', offset_dias:  -1 },
]

export const TOTAL_TASKS = TASK_TEMPLATES.length
