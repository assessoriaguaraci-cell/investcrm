

# CRM Imobiliário — Plano de Implementação (MVP Primeiro)

## Visão Geral
CRM mobile-first para operação de compra, desocupação, reforma e venda de imóveis de leilão. Dois funis Kanban separados (Imóveis e Clientes), relacionamento muitos-para-muitos com propostas, login com permissões, e design light clean com toggle para modo dark.

---

## FASE 1 — Fundação (MVP Core)

### 1.1 Autenticação e Permissões
- Login com email/senha e reset de senha
- Tabela de perfis (profiles) vinculada ao auth do Supabase
- Sistema de roles separado (Admin, Gestor, Comercial, Operações, Leitura) com tabela `user_roles`
- RLS policies por role para controlar acesso a dados
- Função `has_role()` security definer para evitar recursão no RLS

### 1.2 Banco de Dados (Modelo Core)
- **properties** — todos os campos de identificação, financeiro, datas, status e etapa do funil
- **clients** — dados pessoais, perfil financeiro/crédito, campos comerciais
- **client_property_links** — relacionamento muitos-para-muitos com status, valor proposta, observações, responsável
- **property_documents** e **client_documents** — referências a arquivos no Storage
- **activities** — tarefas/lembretes vinculados a imóvel ou cliente
- **audit_logs** — registro de toda alteração (quem, quando, o quê, antes/depois)
- **lead_sources** — lista editável de origens de lead
- Cálculos automáticos: investimento total, lucro e margem (computados no frontend e/ou via views)

### 1.3 Design System
- Tema light clean com toggle para modo dark (usando next-themes)
- Cores distintas por etapa do funil para rápida identificação visual
- Layout mobile-first com navegação por bottom tab bar no celular e sidebar no desktop
- Cards compactos estilo Trello com indicadores visuais (prioridade, alertas)

### 1.4 Dashboard (Home)
- KPIs rápidos: imóveis por etapa, leads por etapa, vendas do mês (valor e qtd), alertas de pendência
- Atalhos: "Novo Imóvel", "Novo Cliente"
- Responsivo: cards empilhados no mobile, grid no desktop

### 1.5 Funil de Imóveis (Kanban)
Funil de Imóveis (Kanban)
Kanban com 8 Etapas
Colunas: Pre arrematação → Documentação → Desocupação → Reforma → Venda → Pós-venda → IR → Finalizado
Cards com: código interno (IL-2026-XXXX), cidade, estado, endereço completo, link do maps para adicionar endereço, estado de ocupação (venda para ocupante, desocupado, imissão na posse, ocupado), investimento total, valor anúncio, responsável, alertas
Drag-and-drop para mover entre etapas (registra evento no histórico)
Cada etapa deve ter seu proprio checklist de tarefas que, quando completas, muda o card do imovel automaticamente para a próxima etapa, esses são os checklits: etapa de pre arrematação: (1º grupo de tarefas: entrada de oportunidade): proposta recebida pelo email, grupo de analise criado, validação de endereço, responsável atribuído (o responsável deve ser vinculado com os usuários do app)(2º grupo de tarefas: documentos): matricula, edital e laudo, acoes judiciais. (3º grupo de tarefas: débitos): IPTU, ITBI e condomínio. (4º grupo de tarefas: diligencia): confirmar ocupação, dados do ocupante fotos externas do imovel, fotos dos arredores do imovel, análise da região. etapa de documentação: (1º grupo de tarefas: organização inicial): pasta criada no drive, matricula, edital, laudo e contratos salvos, gastos lançados nas planilhas e splitwise, (2º grupo de tarefas: controle documental): itbi pago, iptu pago, matrícula em nome do novo proprietário, registro concluído, listar pendências. etapa de desocupação: (1º grupo de tarefas: diagnostico): Imóvel ocupado ou vazio, Perfil do ocupante identificado, Histórico de pagamento conhecido, Risco jurídico avaliado. (2º grupo de tarefas: estratégia definida): Tentativa de acordo, Proposta formal enviada, Valor de eventual indenização definido, Decisão jurídica registrada;(3º grupo de tarefas: execução): CCV assinado (em caso de venda para morador), Contrato de acordo (em caso de desocupação amigável); prazo de saída definido (adicionar lembrete em campo de calendário do app), chaves entregues, fotos pós desocupação. etapa de reforma: (1º grupo de tarefas: planejamento e orçamento): registro do que será e o que não será feito, 3 orçamentos de mao de obra, 3 orçamentos de material inicial, custo total aprovado, planilha de materiais/custo definida. (2º grupo de tarefas: contratos): prazo definido, forma de pagamento por andamento da obra, contrato assinado com o empreiteiro, fotos semanais recebidas, pagamento total feito; (3º grupo de tarefas: finalização): fotos pós reforma, pedir engenharia, engenharia marcada, engenharia feita, laudo valido, custos finais lançados, imovel liberado para venda. etapa de venda: (1º grupo de tarefas: preparacao): fotos do imovel, descrição dos atributos do imovel, condições definidas, (2º grupo de tarefas: divulgação): anuncio criado, anuncio ativo, post no instagram, imovel cadastrado no fluxo do crm, (3º grupo de tarefas: negociação): visita, cliente aprovado, ccv assinado, cliente aguardando reserva, contrato assinado. Etapa de pós venda: (1º grupo de tarefas: finalização da venda): valor recebido, fotos do cliente com as chaves, post depoimento no Instagram, registro concluído, conferir gastos lançados em splitwise e smartapp.
toda semana deve abrir um card para nos lembrar de enviar o relatório semanal daquele imovel do grupo do WhatsApp. as tarefas devem ser padrao para todo novo imovel, porem tambem podem ser editáveis e customizadas, contendo campos para observação e a data deve ficar salva quando cada tarefa do checklist for concluída.
Detalhe do Imóvel (abas)
Resumo: endereço, tipo (casa, casa de condomínio, apto, apto de condomínio, terreno), área, condomínio, prioridade, responsável, observações
Financeiro: todos os custos (arrematação, ITBI, escritura, desocupação, reforma, outros) com cálculo automático de investimento total, lucro e margem %
Documentos: upload organizado (matrícula, edital, laudos, fotos, NFs, contratos)
Clientes Interessados: lista de vínculos com status por cliente
Histórico: log de auditoria de todas as alterações
Regras de Negócio
"Venda": exige cliente comprador, valor final, data, forma de pagamento
"Finalizado": exige checklist de conclusão completo
Filtros por responsável, etapa, cidade, prioridade

### 1.6 Funil de Clientes (Kanban)
Kanban de clientes:
Pipeline inicial: chegada do lead (aqueles que acabaram de ser redirecionados)-> em triagem (estamos coletando os dados)-> Interessados (solicitaram mais detalhes sobre o imovel), aguardando atendimento (enviaram mensagem mas ainda nao foram atendidos) em atendimento (já estamos conversando), lead qualificado (já preencheu as infomracoes que precisávamos e se qualifica para o imovel em questão, se é qualificado para para o pipeline de aprovação de credito)

pipeline de aprovação de credito: orientação sobre o financiamento, aguardando documentação, documentação incompleta, aguardando analise de credito, credito aprovado(passa para o pipeline de financiamento), cliente com pendencia (vai para o pipeline de credito reprovado), crédito reprovado (vai para o pipeline de credito reprovado)

pipeline de financiamento: aguardando prioridade (verificar se cliente é o melhor par aa compra do imovel), agendamento de visitas (gerar automaticamente um card de tarefas para marcar a visita), Aguardando assinatura de CCV, Aguardando reserva, Aguardando contrato caixa, Em registro, venda concretizada (fechar negocio), venda cancelada (adicionar tag de cliente desistiu)

pipeline de credito reprovado: credito reprovado, documentação atualizada, reaprovação de credito, credito aprovado(migrar lead para pipeline de financiamento)

Cards com: nome, telefone, temperatura (frio/morno/quente), responsável (dentro dos usuários da empresa cadastrados), e armazenar dados:

Detalhe do Cliente (abas)
Perfil: nome, CPF (validado), telefone/WhatsApp, email, cidade/UF
Crédito: renda, composição, FGTS, dependentes, estado civil, composição de renda, pendências financeiras, regime de trabalho (CLT, autonomo, funcionário publico, aposentado, bolsa família/outro)
Documentos: upload (RG/CPF, comprovante renda, etc.)
Imóveis Vinculados: lista de vínculos com status e propostas
Conversas/Atividades: timeline de interações
Histórico: auditoria
Regras
"Perdido" exige motivo (sem crédito, desistiu, renda insuficiente etc.)
Dados de campanha/conjunto/anúncio para leads do Meta


### 1.7 Tela de Match / Vínculo Cliente ↔ Imóvel
- Busca e filtros para encontrar clientes ou imóveis
- Criar vínculo rápido com status inicial
- Registrar proposta com valor, data e observações
- Visualizar todos os vínculos de um imóvel ou cliente

### 1.8 Tarefas/Atividades
- Lista de to-dos por responsável, filtrável por status e tipo
- Vincular tarefa a imóvel e/ou cliente
- Campos: descrição, data prevista, responsável, status (pendente/feito/atrasado)

### 1.9 Upload de Documentos
- Storage organizado por `/properties/{id}/` e `/clients/{id}/`
- Upload com tipo de documento (matrícula, edital, RG, comprovante de renda, etc.)
- Visualização e download dos arquivos dentro das abas de cada entidade

### 1.10 Configurações
- Gerenciamento de usuários e atribuição de roles
- Edição de origens de lead (lead_sources)
- Checklists por etapa (customizável)

### 1.11 Funcionalidades Transversais
- Busca global por nome, código, CPF, endereço
- Filtros rápidos: responsável, etapa, cidade, prioridade, temperatura
- Validação de CPF, campos numéricos e obrigatórios por etapa
- Log de auditoria automático em toda alteração de imóvel ou cliente

---

## FASE 2 — Integrações (Pós-MVP)
- Webhook para captura de leads do Meta Ads (Facebook/Instagram) → cria cliente em "Novo Lead" automaticamente
- Integração com WhatsApp multiatendente via API (Z-API, 360dialog ou similar) — botão "Abrir conversa", timeline de mensagens, alerta de mensagem sem resposta
- Configuração de tokens/webhooks pela tela de Configurações

## FASE 3 — Chatbot Builder (Pós-MVP)
- Editor visual de fluxo com blocos (mensagem, pergunta, condição, tag, salvar campo, encaminhar humano)
- Fluxo padrão de qualificação: nome, CPF, renda, FGTS, dependentes, pendências, cidade, orçamento
- Ao final do fluxo: criação/atualização automática do cliente no CRM em "Qualificando"

---

## Resumo da Fase 1 (MVP)
O MVP entrega o core completo: dois funis Kanban com drag-and-drop, cadastro completo de imóveis e clientes, relacionamento muitos-para-muitos com propostas, upload de documentos, dashboard com KPIs, tarefas, auditoria, busca global, login com permissões por role, e interface mobile-first com modo claro/escuro.

