# Relatório de próximos passos — requisitos funcionais

**Projeto:** site e portal da 1ª Igreja Presbiteriana Independente de Machado
**Data:** novembro de 2026
**Base:** Astro estático + WordPress headless (`/admin`) + portal + Jenkins

---

## 1. Sumário executivo

A base técnica está pronta: site público, SEO, autenticação, formulário de
contato, analytics com consentimento, performance e portões de qualidade
(axe + Lighthouse) no pipeline.

O que falta são **funcionalidades de operação da igreja**: conteúdo indexável,
eventos gerenciáveis, comunicação com voluntários, livraria, acolhimento de
visitantes, pedidos de oração e, se aprovado, doações.

Prioridade recomendada (frente portal/comunidade):

1. **RBAC/portal** — papéis, vínculos por ministério e guards (pré-requisito).
2. **Livraria — catálogo** — catálogo público e gestão pelo ministério Livraria.
3. **Bible Rats MVP** — leitura, check-in, diário, grupos e streak.
4. **Ministérios com escopo** — líder edita os seus; colaborador opera nos seus.
5. **Notificações, badges e ranking** — depois dos canais definidos.
6. **Conteúdo/SEO (trilha paralela)** — reflexões estáticas, eventos e demais módulos.

---

## 2. Estado atual

| Módulo | Status | Observação |
|---|---|---|
| Site público (12 páginas) | ✅ Pronto | Astro, responsivo, SEO e acessibilidade |
| Autenticação do portal | ✅ Pronto | Cookie `HttpOnly` + nonce, sem JWT |
| Reflexões | 🟡 Parcial | Listagem/modal via JS; sem URL própria por artigo |
| Escalas | 🟡 Parcial | CRUD, calendário, participar; sem notificação/confirmação |
| Ministérios | 🟡 Parcial | Criar/excluir, vincular e definir líder/colaborador por ministério |
| Usuários/voluntários | 🟡 Parcial | Aprovar, promover, excluir, criar; sem reset/2FA |
| RBAC/portal | ✅ Base implantada | Papéis, vínculos, guards por ministério e auditoria |
| Livraria | ✅ Catálogo e gestão | 169 livros, 10 capas, API pública, gestão e estoque interno |
| Eventos | 🔴 Não iniciado | Agenda 2026 fixa no código |
| Pequenos Grupos | 🟡 Parcial | Página pública informativa; sem diretório/inscrição |
| Visitantes | 🟡 Parcial | Página + formulário de contato; sem fluxo de follow-up |
| Pedidos de oração | 🟡 Parcial | Apenas assunto no formulário de contato |
| Doações/ofertas | 🔴 Não iniciado | Sem PIX/gateway |
| Newsletter/comunicação | 🔴 Não iniciado | Sem lista de consentimento |
| Congregações | 🟡 Parcial | Lista na página de contato; sem página própria |
| Analytics (GA4) | ✅ Pronto | Consentimento LGPD, pageviews e `generate_lead` |
| SEO estruturado | ✅ Pronto | Church, FAQ, Event semanal, Person, VideoObject |
| Qualidade (axe/Lighthouse) | ✅ Pronto | 14 varreduras axe + Lighthouse CI no Jenkins |
| Bible Rats | 🟡 Referência pronta | App iOS analisado (Expo/Supabase); falta o módulo web no site |

Legenda: ✅ pronto · 🟡 parcial · 🔴 não iniciado

---

## 3. Backlog funcional priorizado

### 3.0 Reestruturação do portal e permissões (RBAC)

O Bible Rats, a livraria e os ministérios precisam do mesmo modelo de acesso.
Hoje o portal usa papéis do WordPress (`subscriber`, `contributor`, `editor`,
`pastor`, `administrator`) + `ministries_approved`. A proposta é evoluir para
**papel global + papel por ministério**.

**Papéis**

| Papel | Escopo |
|---|---|
| Visitante | Site público + catálogo da livraria (consulta, sem login) |
| **Assinante (gratuito)** | Bible Rats + próprio perfil |
| **Colaborador de ministério** | Tudo do assinante + acessos operacionais nos ministérios em que atua |
| **Líder de ministério** | Tudo do colaborador + edição/gestão dos ministérios que lidera |
| **Pastor** | Visão ampla de todos os ministérios, cuidado pastoral, moderação e relatórios |
| **Admin** | Acesso total, incluindo usuários, papéis, configurações e livraria |

> **Definido:** assinante é o membro cadastrado, com acesso gratuito. Não há
> cobrança neste momento. O catálogo da livraria é **público para consulta**; a
> gestão exige vínculo de líder/colaborador no **ministério Livraria** ou admin.

**Livraria como ministério.** A livraria é cadastrada como um ministério
(`tipo=livraria`). Assim, as permissões de catálogo são atribuídas pelo mesmo
mecanismo dos demais ministérios, sem criar um papel global novo.

**Matriz de permissões**

| Recurso | Visitante | Assinante | Colaborador | Líder | Pastor | Admin |
|---|---|---|---|---|---|---|
| Bible Rats | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| Livraria — catálogo (consulta) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Livraria — gestão do catálogo/capas | — | — | ✏️ se ministério Livraria | ✏️ se ministério Livraria | 👁 | ✅ |
| Livraria — estoque/vendas | — | — | — | ✏️ se ministério Livraria | 👁 | ✅ |
| Ministérios — ver | — | — | 👁 próprios | 👁 próprios | 👁 todos | ✅ |
| Ministérios — editar | — | — | — | ✏️ próprios | ✏️ todos | ✅ |
| Escalas — participar | — | — | ✅ próprios | ✅ próprios | ✅ | ✅ |
| Escalas — criar/editar | — | — | — | ✏️ próprios | ✏️ todos | ✅ |
| Usuários e papéis | — | — | — | — | 👁 | ✅ |
| Oração/visitantes | — | — | — | — | ✅ | ✅ |
| Moderação (Bible Rats) | — | — | — | — | ✅ | ✅ |
| Relatórios | — | — | — | ✏️ próprios | ✅ | ✅ |
| Configurações | — | — | — | — | — | ✅ |

Legenda: ✅ total · 👁 leitura · ✏️ edição limitada ao escopo · — sem acesso

**Isolamento por ministério.** O papel de líder/colaborador **não é global**:
ele só vale para o ministério ao qual o usuário está vinculado. O líder do
**Som** não vê nem edita configurações, membros, escalas ou conteúdo do
ministério de **Mídia**; o mesmo vale para qualquer outro ministério. Só
**pastor** e **admin** têm visão ampla. Cada endpoint recebe o `ministry_id` e
verifica o vínculo antes de responder.

| Usuário | Papel global | Vínculos | Som | Mídia | Louvor |
|---|---|---|---|---|---|
| Ana | líder | Som (líder) | ✏️ | — | — |
| João | líder | Som (líder), Mídia (colaborador) | ✏️ | 👁/participar | — |
| Pr. Marcos | pastor | — | ✅ | ✅ | ✅ |
| Admin | administrator | — | ✅ | ✅ | ✅ |

**Como implementar**

- Manter o login do portal (cookie `HttpOnly` + nonce) como única porta.
- Criar papéis/capabilities no WordPress e uma tabela de vínculos
  (`ministry_memberships`: usuário, ministério, papel, status).
- O papel global define o teto; o vínculo por ministério define o escopo.
- **Toda checagem é feita no servidor** (endpoints PHP/REST); o front-end
  apenas esconde/desabilita ações. Nunca confiar só na interface.
- Todo endpoint que lê/edita um ministério recebe o `ministry_id` e chama
  `1ipim_can_view_ministry` / `1ipim_can_manage_ministry`. O papel global
  `lider_ministerio` sozinho **não** libera nenhum ministério específico.
- Configurações por ministério ficam em `1ipim_ministry_settings`
  (`ministry_id`, chave, valor), separadas das configurações globais.
- Migração dos usuários atuais:
  `subscriber → assinante`, `contributor → colaborador`,
  `editor → líder`, `pastor → pastor`, `administrator → admin`.
  Preservar `ministries_approved` e converter em vínculos.
- Auditoria de alterações de papel e de vínculo.

**Status:** passos 2 e 3 implantados em produção em 06/11/2026 (plugin,
tabelas, papéis, migração, guards por ministério, gestão de vínculos e
conflito de escalas).

**Requisitos funcionais**

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-52 | Definir papéis, matriz e capabilities | ✅ | Matriz aprovada e documentada |
| FR-53 | Migrar usuários existentes sem perder vínculos | ✅ | Nenhum usuário perde acesso; testes de regressão |
| FR-54 | Vínculo por ministério (líder/colaborador) | ✅ | Tabela, migração e guards por ministério |
| FR-55 | Guards no servidor e no front-end | ✅ | Tentativa fora do escopo retorna 403 |
| FR-56 | Tela de gestão de papéis/vínculos | ✅ | Admin altera papel e ministério; líder gerencia o próprio time |
| FR-57 | Auditoria de mudanças de papel | ✅ | Log de papel, vínculo, escala e override |
| FR-58 | Assinante acessa Bible Rats | 🟡 | Sessão e papel prontos; falta a área Bible Rats |
| FR-59 | Pastor com visão ampla e moderação | 🟡 | Visão ampla pronta; falta moderação Bible Rats |
| FR-60 | Admin com acesso total | ✅ | Acessa usuários, configurações e livraria |
| FR-61 | Testes automatizados da matriz | ✅ | Matriz PHP (25 cenários) + 77 E2E locais |
| FR-62 | Catálogo público para consulta, sem login | ✅ | Visitante vê a lista e busca |
| FR-63 | Líder/colaborador do ministério Livraria cadastra/edita livros e capas | ✅ | Só o vínculo no ministério Livraria e admin acessam a gestão |
| FR-64 | Busca de capa no cadastro do livro (Google/Open Library) | ✅ | Escolhe imagem, confirma e salva |
| FR-65 | Retenção de fotos configurável (padrão 90 dias) | 🔴 | Admin altera sem deploy |
| FR-66 | Isolamento por ministério: líder do Som não acessa a Mídia | ✅ | 403 ao tentar outro `ministry_id` |
| FR-67 | Configurações por ministério em `1ipim_ministry_settings` | 🔴 | Chave de um ministério não vaza para outro |
| FR-68 | Interface lista apenas os ministérios do usuário | 🔴 | Menu/atalhos não mostram ministérios sem vínculo |
| FR-69 | Auditoria por ministério | 🔴 | Log registra `ministry_id` e autor |

---

### P0 — Fundação de conteúdo e operação

#### 3.1 Reflexões indexáveis

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-01 | Cada reflexão tem URL própria `/reflexoes/{slug}/` com título, data, autor, imagem e conteúdo | 🔴 | Página abre direto, sem modal, com canonical correto |
| FR-02 | Página da reflexão tem `Article`/`BlogPosting` JSON-LD | 🔴 | Rich Results Test sem erro |
| FR-03 | Listagem paginada com busca/filtro por categoria | 🟡 | 12 por página; busca por título; filtro por categoria |
| FR-04 | Publicar/editar no WordPress atualiza o site em até 15 min | 🔴 | Webhook ou rebuild agendado; teste com post novo |
| FR-05 | Rascunhos e lixeira não aparecem publicamente | 🟡 | Status `publish` apenas |
| FR-06 | Sitemap inclui automaticamente as reflexões publicadas | 🔴 | Nova URL aparece no `sitemap.xml` |

**Dependência:** decidir entre webhook do WordPress → Jenkins ou rebuild
agendado (ex.: a cada 15 min). O Jenkins é local, então o webhook exige um
gatilho externo (GitHub Actions ou endpoint no servidor).

#### 3.2 Eventos gerenciáveis

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-07 | CRUD de eventos no WordPress: título, data/hora, local, descrição, imagem, link de inscrição | 🔴 | Gestor cria/edita/exclui sem código |
| FR-08 | Home mostra o próximo evento; `/eventos/` mostra a agenda do ano | 🟡 | Dados vêm do WordPress |
| FR-09 | Evento tem `Event` JSON-LD com data ISO, local e status | 🟡 | Agenda semanal já tem; eventos especiais ainda não |
| FR-10 | Botão “Adicionar ao calendário” (ICS/Google) | 🔴 | Arquivo `.ics` válido |
| FR-11 | Inscrição com vagas e lista de espera (opcional) | 🔴 | Confirmação por e-mail; vagas controladas |

#### 3.3 Escalas com comunicação

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-12 | Notificar voluntário ao ser escalado (e-mail e/ou WhatsApp) | 🔴 | Voluntário recebe link da escala |
| FR-13 | Voluntário confirma ou recusa participação | 🔴 | Status visível ao gestor |
| FR-14 | Lembrete automático 24–48h antes | 🔴 | Envio registrado; sem duplicidade |
| FR-15 | Gestor vê pendentes/confirmados/recusados por escala | 🔴 | Filtro e contagem no painel |
| FR-16 | Histórico de participação por voluntário | 🔴 | Relatório por período |
| FR-17 | Conflito de horário e disponibilidade | 🔴 | Alerta ao escalar duas vezes no mesmo horário |
| FR-70 | Cruzar escalas entre ministérios para a mesma pessoa | 🔴 | Ana (Mídia + Louvor) não entra nas duas no mesmo horário |
| FR-71 | Alerta de conflito no autoatendimento e no cadastro pelo líder | 🔴 | Mostra ministério, data e horário conflitantes |
| FR-72 | Participantes normalizados para consulta eficiente | 🔴 | Tabela `1ipim_escala_participantes` por escala/usuário |
| FR-73 | Janela de horário (início/fim) para detectar sobreposição | 🔴 | Conflito por interseção, não só horário idêntico |
| FR-74 | Override do líder/admin com justificativa e auditoria | 🔴 | Membro não pode; líder pode, com registro |

**Exemplo:** Ana está registrada na **Mídia** e no **Louvor**. Ao tentar entrar
na escala dos dois no mesmo dia e horário, o sistema mostra “Você já está
escalada na Mídia às 19h” e bloqueia o autoatendimento. Um líder pode autorizar
com justificativa, e a ação fica registrada.

Detalhes técnicos (consulta, tabela de participantes, horário de fim e
override): [`docs/escalas.md`](escalas.md).

**Dependência:** definir canal (WP Mail SMTP para e-mail; WhatsApp oficial tem
custo/aprovação) e o horário de término de cada escala (ou duração padrão).

#### 3.4 Ciclo de vida do usuário e segurança

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-18 | Cadastro público com aprovação e e-mail de boas-vindas | 🟡 | Usuário só acessa após aprovação |
| FR-19 | “Esqueci minha senha” com token de uso único | 🔴 | Link expira; senha alterada |
| FR-20 | 2FA opcional/obrigatório para administradores | 🔴 | Login exige segundo fator |
| FR-21 | Perfil do usuário: nome, e-mail, foto, ministérios | 🔴 | Edição reflete no portal |
| FR-22 | Consentimento LGPD e exportação/exclusão de dados | 🔴 | Solicitação registrada e atendida |
| FR-23 | Log de auditoria de ações administrativas | 🔴 | Quem alterou o quê e quando |
| FR-24 | Bloqueio temporário após tentativas inválidas | ✅ | Rate limit já existe no login |

### P1 — Engajamento e operação

#### 3.5 Livraria

**Status:** catálogo importado do Notion em novembro/2026 — **169 livros** em
`astro_project/src/data/livraria.json`.

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-25 | Catálogo somente consulta: título, autor, editora, categoria, preço à vista/cartão e código | 🟡 | Assinante autenticado vê a lista e busca por título/autor |
| FR-26 | Estoque por item (fonte oficial no portal) | 🔴 | Admin atualiza; catálogo mostra disponibilidade |
| FR-27 | Reserva/venda com baixa de estoque | 🔴 (P2) | Estoque não fica negativo |
| FR-28 | Relatório de saídas e comprovante | 🔴 (P2) | Exportação CSV por período |

**Dados importados:** `code`, `title`, `author`, `publisher`, `category`,
`priceCash`, `priceCard`, `coverPrice`, `stockLegacy` e `cover`. Lacunas na
origem: 15 sem autor, 3 sem editora, 111 sem categoria, 14 sem preço à vista,
23 sem preço no cartão, 17 sem estoque legado. **Capas: 10 de 169** (12 tinham
URL no Notion; 2 retornaram 404); as demais usam placeholder e podem ser
enviadas pelo admin depois. O `Estoque` do Notion é uma fórmula que depende de
Compras/Vendas e não veio na API pública; `stockLegacy` é uma referência antiga.
No catálogo público, exibir dados bibliográficos e preços; mostrar estoque só
depois de o admin validar.

**Acesso:** o catálogo é **público para consulta** (sem login). Cadastro,
edição e capas ficam com **líder/colaborador do ministério Livraria** e o
admin. A página pública pode entrar depois do RBAC; a gestão é a prioridade,
porque o catálogo está desatualizado. Venda/pagamento ficam fora do escopo
atual.

**Capas:** o formulário de cadastro/edição terá um botão **“Buscar imagem no
Google”** (Google Books/Open Library + fallback de busca de imagem), com
pré-visualização, recorte/redimensionamento e confirmação. Também aceita upload
manual. Sem capa, o catálogo usa um placeholder com o título.

#### 3.6 Pequenos Grupos

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-29 | Diretório de PGs: dia, horário, local, líder, público | 🔴 | Filtro por região/dia |
| FR-30 | Inscrição/interesse em um PG | 🔴 | Líder recebe notificação |
| FR-31 | Gestão de membros e líderes por PG | 🔴 | Admin/líder edita |

#### 3.7 Visitantes e acolhimento

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-32 | Formulário “Planeje sua visita”: data, nº de pessoas, crianças | 🔴 | Confirmação e aviso à recepção |
| FR-33 | Fila de follow-up com status (novo, contatado, integrado) | 🔴 | Painel de acompanhamento |
| FR-34 | Registro de visitantes sem duplicidade | 🔴 | Busca por e-mail/telefone |

#### 3.8 Pedidos de oração

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-35 | Formulário privado, com opção anônima | 🔴 | Conteúdo não é público |
| FR-36 | Fila pastoral com status e responsável | 🔴 | Equipe vê e atualiza |
| FR-37 | Consentimento e prazo de retenção | 🔴 | Exclusão após o período definido |

#### 3.9 Comunicação

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-38 | Newsletter com duplo opt-in | 🔴 | Lista só com consentimento |
| FR-39 | Avisos/urgências no site e por e-mail | 🔴 | Publicação e envio registrados |
| FR-40 | Integração com WhatsApp (links ou API oficial) | 🔴 | Mensagens sem expor números |

#### 3.10 Congregações

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-41 | Página por congregação: endereço, mapa, horários, líder | 🔴 | 7 congregações com URL própria |
| FR-42 | Lista com filtro por cidade/região | 🟡 | Dados atuais na página de contato |

### P2 — Expansão

#### 3.11 Doações/ofertas

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-43 | Página de ofertas com PIX e dados bancários | 🔴 | QR code e copia-e-cola |
| FR-44 | Comprovante/agradecimento | 🔴 | E-mail de confirmação |
| FR-45 | Gateway online e recorrência (se aprovado) | 🔴 | Conciliação e estorno |

#### 3.12 Conteúdo e mídia

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-46 | Séries/playlists de mensagens com busca | 🔴 | Filtro por série e ano |
| FR-47 | Transcrição/resumo das mensagens | 🔴 | Texto indexável |
| FR-48 | Status de transmissão ao vivo | 🔴 | Embed quando ao vivo |

#### 3.13 Gestão e relatórios

| ID | Requisito | Status | Critério de aceite |
|---|---|---|---|
| FR-49 | Dashboard com pendências (aprovações, escalas, visitantes) | 🔴 | Contadores e atalhos |
| FR-50 | Relatórios de voluntários, escalas, livraria e visitantes | 🔴 | Exportação CSV/PDF |
| FR-51 | Notificações no portal | 🔴 | Sino com não lidos |


#### 3.14 Bible Rats — comunidade de devocionais

**Premissa.** Uma comunidade de devocionais dentro do site: o membro lê a
passagem do dia, faz um check-in com uma frase (e foto opcional), mantém um
diário privado e compartilha o check-in com grupos. A consistência gera
sequência (streak), badges e um pódio do grupo.

**Referência analisada.** O app iOS `Bible Rats` (Expo/React Native +
Supabase, em `~/Code/bible-rats`) tem o fluxo:

- leitura diária (ex.: “um capítulo de Provérbios por dia. Poste o que chamou atenção”);
- check-in com uma frase e foto opcional; o primeiro check-in inicia a sequência;
- diário privado (“seu diário fica privado; só os check-ins são compartilhados”);
- grupos/clubes criados ou entrados por código de 5 letras, link ou QR code;
- feed do grupo, pódio/ranking de consistência, comentários e reações;
- streak atual/recorde, lembretes e badges;
- moderação: denunciar/bloquear autor, excluir conteúdo;
- notificações, perfil, configurações e exclusão de conta.

**Escopo do MVP no site 1IPIM**

| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| BR-01 | Plano de leitura diário (Provérbios ou plano definido pela liderança) com passagem do dia e atrasados | P1 | Membro vê a leitura de hoje e consegue recuperar dias anteriores |
| BR-02 | Check-in diário com uma frase e foto opcional; conta uma vez por dia | P1 | Streak incrementa uma vez; segundo check-in no dia é bloqueado |
| BR-03 | Diário privado: listar, buscar, editar e excluir os próprios check-ins | P1 | Nenhum outro membro acessa o diário |
| BR-04 | Compartilhar/descompartilhar um check-in em um ou mais grupos | P1 | Check-in aparece só nos grupos escolhidos; diário permanece |
| BR-05 | Grupos/clubes: criar, entrar por código de 5 letras/link/QR e sair | P1 | Entrada por código funciona; sair remove os compartilhamentos do grupo |
| BR-06 | Sequência (streak) atual e recorde; lembrete para não perder | P1 | Cálculo correto; fuso/limite do dia configurável |
| BR-07 | Pódio/ranking de consistência do grupo (opt-in) | P1 | Ranking semanal/mensal; pode ser desativado |
| BR-08 | Comentários e reações nos check-ins compartilhados | P1 | Comentar/reagir; autor notificado |
| BR-09 | Notificações: lembrete diário, streak e atividade do grupo | P1 | Opt-in; e-mail/web push; sem duplicidade |
| BR-10 | Badges por marcos (7, 30, 100 dias etc.) | P2 | Badge concedido uma única vez |
| BR-11 | Perfil e configurações: nome, avatar, fuso/limite do dia, notificações e excluir conta | P1 | Alterações refletem no app; exclusão remove dados |
| BR-12 | Moderação: denunciar/bloquear autor; fila de moderação para admin | P1 | Denúncia registrada; autor não é avisado; admin resolve |
| BR-13 | Privacidade/LGPD: diário privado por padrão, consentimento, exportação e exclusão | P1 | Usuário baixa/apaga seus dados |
| BR-14 | Autenticação integrada ao portal (cookie + nonce) ou SSO com Supabase | P1 | Um único login para site/portal/Bible Rats |
| BR-15 | Administração: gerenciar plano de leitura, devocionais e moderação | P1 | Líder publica o plano sem programador |
| BR-16 | Texto bíblico com licença/atribuição correta | P1 | Tradução escolhida e creditada |
| BR-17 | Analytics de participação e retenção (sem expor conteúdo privado) | P2 | Métricas agregadas |
| BR-18 | PWA/offline e app nativo (o IPA é referência) | P2 | Web-first; app depois |
| BR-19 | Compressão/limite de imagem no cliente e no servidor | P1 | ≤500 KB, máx. 1600 px, EXIF removido |
| BR-20 | Prazo de exclusão de fotos/check-ins | P1 | Exclusão automática no prazo; usuário pode antecipar |
| BR-21 | API bíblica com cache, atribuição e chave no servidor | P1 | Nenhuma chave no navegador; falha não quebra o check-in |
| BR-22 | Grupos em múltiplos modos (clubes/ministérios/PGs) | P1 | Modelo definido antes do desenvolvimento |
| BR-23 | Preferências de notificação por canal | P1 | Opt-in, horário de silêncio e descadastro |


**Decisões desta rodada**

- **Login:** sempre pelo portal (cookie `HttpOnly` + nonce). Dados no WordPress
  do portal; sem Supabase. Um app nativo futuro usa SSO/token do portal.
- **Assinante:** membro cadastrado **gratuito**; acesso ao Bible Rats e ao
  catálogo da livraria.
- **Ministérios:** líder edita somente os seus; colaborador opera somente nos
  seus; pastor vê todos; admin total (seção 3.0).
- **Tradução:** **múltiplas opções disponíveis**, com **Almeida 1819** como
  padrão. O texto é baixado do eBible.org e armazenado no WordPress, sem
  API/chave em runtime. O leitor pode trocar a tradução; o `reading_plan` e as
  preferências guardam o `translation`.
- **Grupos:** várias opções (clubes livres, grupos de ministério, Pequenos
  Grupos). A modelagem fica para a próxima rodada; o MVP aceita grupos com
  código de 5 letras.
- **Fotos:** compressão no navegador (máx. 1600 px, WebP/JPEG ~0,8, ≤500 KB),
  remoção de EXIF, recompressão no servidor e **exclusão automática em 90 dias**.
  O prazo fica em uma configuração (`photo_retention_days`) editável pelo admin,
  sem deploy. A limpeza roda em **cron do cPanel + endpoint PHP/WP-Cron**.
- **Notificações:** **somente internas no portal** por enquanto. E-mail, web
  push e WhatsApp ficam para depois.
- **Catálogo:** 169 livros importados; consulta pública e gestão pelo
  colaborador da livraria/admin. Estoque e preço de capa precisam de validação.
  Capas: 10 importadas; as demais podem ser buscadas no Google ou enviadas.

**Traduções gratuitas / domínio público**

| Opção | Licença | Estilo | Observação |
|---|---|---|---|
| **Almeida 1819 (padrão)** | Domínio público | Almeida clássica; arcaica | Sem licença; padrão inicial |
| **Bíblia Livre (BLIVRE)** | CC BY 4.0 (gratuita, com atribuição) | Português brasileiro moderno; base Almeida 1819 | Melhor leitura; exige crédito |
| **Bíblia Portuguesa Mundial (BPM)** | Domínio público | Português brasileiro moderno (em revisão) | Sem licença; ainda rascunho |
| **Tradução Brasileira (1917)** | Domínio público (texto original) | Formal/literal; português antigo | Evitar a revisão SBB 2010 (protegida) |

Todas ficam disponíveis no seletor de tradução; a Almeida 1819 é o padrão. A
interface pode oferecer glossário/nota e troca a qualquer momento.

**Modelo de dados sugerido**

| Entidade | Campos principais |
|---|---|
| `users` | id do usuário do portal, nome, avatar, fuso, limite do dia |
| `reading_plan` | data, passagem, tradução, título, reflexão sugerida |
| `checkins` | user_id, data, texto, foto, foto_expira_em, visibilidade, criado/editado |
| `groups` | nome, código de 5 letras, dono, criado |
| `group_members` | group_id, user_id, papel |
| `checkin_groups` | checkin_id, group_id |
| `comments` | checkin_id, user_id, texto, criado |
| `reactions` | alvo (checkin/comentário), user_id, tipo |
| `reports` | alvo, denunciante, motivo, status |
| `blocks` | user_id, bloqueado_id |
| `badges` | user_id, badge, concedido_em |
| `notifications` | user_id, tipo, payload, lido_em |
| `streaks` | user_id, atual, recorde, último_checkin |

**Decisões de arquitetura (pendentes)**

1. **Onde armazenar:** reutilizar o WordPress do portal (custom tables) ou
   Supabase como no app? Reutilizar o login do portal evita segunda conta;
   Supabase acelera o MVP, mas exige SSO e um segundo cadastro.
2. **Grupos:** clubes livres ou vinculados aos ministérios/Pequenos Grupos
   existentes? Recomendo permitir os dois, com moderação.
3. **Ranking:** opt-in e focado em consistência, não em competição. Para
   menores, considerar desativar por padrão.
4. **Fotos:** mídia do WordPress com limite de tamanho, remoção de EXIF e
   moderação; ou storage externo se o volume crescer.
5. **Texto bíblico:** escolher tradução com licença compatível e creditar.
6. **Notificações:** e-mail primeiro; web push depois; WhatsApp só se aprovado.

**Fora do MVP:** feed público, chat em tempo real, áudio, memorização de
versículos, app nativo e integração com o YouTube.

---

## 4. Requisitos não funcionais transversais

| Área | Requisito |
|---|---|
| Segurança | 2FA para admins, menor privilégio, rate limit, logs, segredos fora do `public_html` |
| LGPD | Consentimento, retenção, exportação/exclusão, política de privacidade |
| Acessibilidade | WCAG 2.1 AA; axe sem violações critical/serious |
| Performance | Lighthouse ≥ 75 mobile; Core Web Vitals no verde |
| Disponibilidade | Backups diários, rollback, staging antes da produção |
| SEO | Conteúdo indexável, canonical, sitemap, schema, Search Console |
| Observabilidade | Alertas de erro, uptime, monitoramento de build |

---

## 5. Sequenciamento sugerido

| Sprint | Escopo | Resultado |
|---|---|---|
| **0** | FR-52 a FR-61 (RBAC/portal) | Papéis, escopo por ministério e guards no servidor |
| **A** | FR-01 a FR-06 (reflexões estáticas + rebuild) | Conteúdo do pastor indexável no Google |
| **B** | FR-07 a FR-11 (eventos no WordPress) | Agenda editável sem programador |
| **C** | FR-12 a FR-17 (escalas com notificação) | Voluntários confirmam e são lembrados |
| **D** | FR-18 a FR-23 (usuários/segurança) | Reset de senha, 2FA, LGPD, auditoria |
| **E** | BR-01 a BR-14 (Bible Rats MVP) | Comunidade de devocionais com diário, grupos e streak |
| **F** | FR-25 a FR-31 (livraria + PGs) | Operação e comunidade |
| **G** | FR-32 a FR-40 (visitantes, oração, newsletter) | Acolhimento e comunicação |
| **H** | FR-41 a FR-48 (congregações, doações, mídia) | Expansão |

> Cada sprint termina com testes, staging, aprovação e deploy em produção.

---

## 6. Decisões pendentes

1. **Rebuild do conteúdo:** webhook do WordPress, cron de 15 min ou outro gatilho?
2. **Notificações:** só e-mail (SMTP atual) ou WhatsApp oficial (custo/aprovação)?
3. **Livraria:** catálogo/reserva interna ou venda com pagamento online?
4. **Doações:** só PIX/dados bancários ou gateway com recorrência?
5. **2FA:** obrigatório só para admins ou para todos os líderes?
6. **Retenção de dados:** prazo para visitantes, orações e inscrições?
7. **Quem opera:** quais líderes terão acesso a quais módulos?
8. **Bible Rats — grupos:** clubes livres, ministérios/PGs ou os dois?
9. **Bible Rats — ranking:** opt-in? desativado para menores?
10. **Livraria:** exibir preços? O estoque do Notion está inconsistente.
11. **Capas:** busca no Google resolve as 157 sem capa ou o admin envia?
12. **Moderação:** quem cuida das denúncias do Bible Rats?

---

## 7. Definição de pronto (DoD)

Um requisito só é considerado pronto quando:

- comportamento implementado e validado no staging;
- testes automatizados (E2E/SEO/axe) cobrindo o fluxo principal;
- sem violações critical/serious no axe;
- Lighthouse dentro dos limiares;
- documentação atualizada;
- deploy em produção com smoke test;
- backup e rollback disponíveis.

---

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| WordPress desatualizado/plugin vulnerável | Atualizações, 2FA, backup, menor privilégio |
| Limite de hospedagem compartilhada | Cache, imagens otimizadas, evitar processamento pesado |
| E-mail caindo em spam | SMTP autenticado, SPF/DKIM/DMARC |
| WhatsApp API negada/cara | Começar por e-mail; links `wa.me` |
| Escopo de livraria/doações crescer | Decidir pagamento antes de iniciar |
| Conteúdo desatualizado | Fluxo de edição claro + rebuild automático |

---

## 9. Ordem de implementação proposta — portal + Bible Rats

A ordem abaixo assume que o Bible Rats é a próxima frente e que o conteúdo
(SEO/reflexões/eventos) pode correr em paralelo.

| Etapa | Escopo | Por quê |
|---|---|---|
| **0. RBAC/portal** | FR-52 a FR-61: papéis, vínculos por ministério, migração, guards e testes | Pré-requisito de Bible Rats, livraria e ministérios |
| **1. Bible Rats MVP** | BR-01 a BR-14 + BR-19 a BR-21: leitura, check-in, diário, grupos, streak, comentários, moderação, imagens | Valida o modelo de acesso e entrega a comunidade |
| **2. Livraria — catálogo** | FR-25, FR-62 a FR-64: catálogo público, gestão e capas | Banco próprio, estoque interno e API dinâmica |
| **3. Ministérios com escopo** | FR-54, FR-59, FR-60: líder/colaborador nos seus ministérios; pastor com visão ampla | Reaproveita o RBAC da etapa 0 |
| **4. Notificações, badges e ranking** | BR-09, BR-10, BR-23 | Dependem de canais e consentimento |
| **5. PWA/app nativo** | BR-18 | Web-first; o IPA é referência |

**Milestones**

- **M0:** matriz aprovada, usuários migrados, testes de autorização verdes.
- **M1:** check-in + diário privado + grupos + streak; fotos com compressão e prazo de exclusão.
- **M2:** catálogo público; líder/colaborador do ministério Livraria cadastra itens.
- **M3:** líder edita só os seus ministérios; colaborador opera nos seus; pastor vê todos.
- **M4:** notificações com opt-in e horário de silêncio.

**Paralelo:** o Sprint A (reflexões estáticas) continua sendo o maior ganho de
SEO e pode rodar junto, desde que a equipe tenha capacidade para duas frentes.

---

## 10. Próxima ação recomendada

Começar pela **Etapa 0 — RBAC/portal**, porque ela é pré-requisito de Bible
Rats, livraria e permissões por ministério. Entregáveis:

1. Matriz de papéis aprovada (seção 3.0).
2. Migração dos usuários atuais e vínculos por ministério.
3. Guards no servidor + testes de autorização.
4. Tela de gestão de papéis/vínculos.

Em seguida, **Bible Rats MVP** (Etapa 1). O catálogo da livraria (Etapa 2) já
está importado em `astro_project/src/data/livraria.json` (169 livros), faltando
apenas a página de consulta e a validação de estoque. A trilha de conteúdo/SEO
(reflexões e eventos) pode rodar em paralelo. Fora do código: **Google Business
Profile** e sitemap no Search Console.