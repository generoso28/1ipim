# Plano de implementação — Portal, Programação, PGs, Relatórios e Berea

**Data:** novembro/2026
**Base:** Astro estático + WordPress headless (`/admin`) + portal + Jenkins
**Status:** plano aprovado; implementação em fases com checkpoint/deploy.

---

## 0. Decisões registradas (resumo)

| # | Decisão |
|---|---|
| 1 | **Presença de encontro** = total (contagem) + lista opcional de nomes (com `user_id` quando houver conta). |
| 2 | **Acesso ao Portal (FR-104):** líder de ministério aprova **só colaborador, no próprio escopo**; admin/pastor aprovam em **escopo geral**; líder de PG **não aprova** (salvo se também for líder de ministério). |
| 3 | **Ministério de PGs:** `tipo=pequenos_grupos`. Líder de PG = **colaborador**; o **líder do ministério de PGs** é delegado por **admin/pastor** (pode ser pastor). |
| 4 | **Relatórios:** emitidos na página de auditoria. **Líderes veem log (escopo) + relatórios**; pastor/admin veem tudo. |
| 5 | **Programação:** página **dinâmica**, separando **semanais** (por dia da semana, sem recorrência) de **eventos** (data única, filtrados pelo ano corrente). Mantém o visual atual. |
| 6 | **PGs públicos:** página **dinâmica**, com cadastro/edição via portal. |
| 7 | **Berea:** identidade **distinta** do portal, social-network-like; **app própria** (sem navbar do site); **light-first** com toggle dark; accent **âmbar** + neutros zinc; ícones **Material Symbols**. |
| 8 | **Salas:** salas dos PGs são **vinculadas** (`room_id`); demais salas são criadas pelos usuários. |
| 9 | **Subdomínios:** já cadastrados; seguir com a migração. |
| 10 | **Feed do Berea:** só membros (posts podem ter opt-in público individual). |

Detalhes completos em [`docs/berea.md`](berea.md) e [`docs/requisitos-funcionais.md`](requisitos-funcionais.md).

---

## 1. Princípios transversais

- **Fonte de verdade:** Portal é a fonte oficial de grupos, encontros, presença e relatórios; Berea é a camada social.
- **RBAC no servidor:** toda checagem de escopo é feita no PHP (`1ipim_can_view_ministry` / `1ipim_can_manage_ministry`); o front-end apenas esconde/desabilita.
- **Auditoria:** toda alteração de grupo, encontro, papel, vínculo e moderação entra em `1ipim_audit_log`.
- **Checkpoint:** cada fase termina com testes (Playwright + axe), staging e deploy em produção.
- **Subdomínios:** `WP_BASE`/`WP_ADMIN_URL` passam a ser config por ambiente **antes** de qualquer nova frente que toque em URL.

---

## 2. Fase 0 — Housekeeping do portal + preparo de subdomínios

**Objetivo:** corrigir a integridade visual do portal e remover URLs hardcoded, preparando a migração.

Entregáveis:

1. Definir `--color-brand-50/100/200` no `@theme` (global.css) e remover o hack
   `.bg-brand-100[data-astro-cid-4d3t45dq]` do `portal.css`.
2. Remover os seletores com `data-astro-cid-*` hardcoded (`4d3t45dq`, `uaub6dnk`).
3. Padronizar raio de borda (inputs `rounded-xl`, cards `rounded-2xl`, destaque `rounded-[2rem]`).
4. Usar Cormorant Garamond nos títulos do portal (coesão com o site público).
5. Trocar `WP_BASE` (api.ts) e `WP_ADMIN_URL` (layout.ts) por config de ambiente
   (`import.meta.env` / build args), com fallback para produção.
6. Preparar `allowedOrigins` (_bootstrap.php) e a CSP (Layout.astro) para os
   4 hosts (portal/berea/admin/staging) e cookie `.1ipim.online`.

**Testes:** Playwright do portal verde; axe sem regressão; smoke de login em staging.

---

## 3. Fase 1 — Pequenos Grupos (ministério + CRUD + encontros + página dinâmica)

**Objetivo:** tornar PGs dinâmicos, com cadastro/edição via portal e registro de encontro.

### 3.1 Modelo de dados

Tabela `{prefix}1ipim_grupos`:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | bigint | PK |
| `slug` | varchar(190) | único, URL pública `/pg/{slug}` (opcional no MVP) |
| `nome` | varchar | obrigatório |
| `descricao` | text | opcional |
| `publico_alvo` | varchar | ex.: "Mulheres", "Casais" |
| `dia_semana` | tinyint | 1–7 (seg–dom) |
| `horario` | varchar | ex.: "19:30" |
| `local` | varchar | endereço/bairro ou "online" |
| `contato` | varchar | WhatsApp/telefone (sem expor número? ver FR-40) |
| `status` | enum | `ativo`, `inativo`, `arquivado` |
| `ministerio_id` | bigint | aponta para o ministério PGs (escopo) |
| `room_id` | bigint null | vínculo com a sala do Berea (fase 5) |
| `created_by` / `updated_by` / timestamps | — | auditoria |

Tabela `{prefix}1ipim_grupo_lideres` (suporta co-líderes):

| Campo | Tipo |
|---|---|
| `id` | bigint PK |
| `grupo_id` | bigint |
| `user_id` | bigint |
| `papel` | enum `lider`, `colider` |
| UNIQUE `(grupo_id, user_id)` | — |

Tabela `{prefix}1ipim_grupo_encontros`:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | bigint PK |
| `grupo_id` | bigint | |
| `data` | date | |
| `texto_lido` | varchar | passagem lida |
| `tema` | varchar | |
| `preletor` | varchar | |
| `foto_url` / `foto_attachment_id` | varchar/bigint | imagem do grupo |
| `observacoes` | text | opcional |
| `publico_presente` | int | total |
| `publicar_feed` | tinyint | resumo no feed do Berea (fase 5) |
| `created_by` / timestamps | — | auditável |

Tabela `{prefix}1ipim_grupo_encontro_presenca`:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | bigint PK |
| `encontro_id` | bigint | |
| `nome` | varchar | nome do presente |
| `user_id` | bigint null | vínculo com conta (para convite/FR-101) |
| `convidado_em` | datetime null | quando o convite foi enviado |

> **Decisão 1:** o líder informa o total e, opcionalmente, a lista de nomes.
> A lista alimenta o relatório de frequência **e** o convite do Berea (FR-101).

### 3.2 RBAC

- Ministério **PGs** criado com `tipo=pequenos_grupos` (mesmo mecanismo da Livraria).
- **Líder de PG** = `colaborador` no ministério PGs + linha em `1ipim_grupo_lideres`.
- **Líder do ministério de PGs** = `lider` no ministério (delegado por admin/pastor).
- Matriz:

| Ação | Admin/pastor | Líder minist. PGs | Líder de PG (colaborador) |
|---|---|---|---|
| Ver todos os grupos | ✅ | ✅ | 👁 apenas o seu |
| Criar/editar grupo | ✅ | ✅ | ✏️ apenas o seu |
| Excluir/arquivar grupo | ✅ | ✅ | — |
| Registrar encontro | ✅ | ✅ | ✏️ apenas o seu |
| Ver encontros de outros | ✅ | ✅ todos | 👁 todos os líderes de PG |
| Gerar relatório | ✅ tudo | ✅ tudo | ✏️ próprio escopo |

> **Visibilidade (FR-102):** o registro do encontro aparece para **todos os
> líderes de PG** no portal (além de admin/pastor/líder do ministério).

### 3.3 API (`/wp-json/1ipim/v1`)

- `GET /grupos` (público, só ativos, para a página pública; **sem** dados sensíveis)
- `GET /grupos/{slug}` (público)
- `GET /admin/grupos` · `POST /admin/grupos` · `PUT|PATCH /admin/grupos/{id}` · `DELETE`
- `GET /admin/grupos/{id}/encontros` · `POST /admin/grupos/{id}/encontros`
- `POST /admin/grupos/{id}/encontros/{eid}/presenca`
- `GET /admin/grupos/{id}/relatorio?de=&ate=` (agregação + CSV)

### 3.4 Front-end

- Página pública `/pg` passa a ler `/wp-json/1ipim/v1/grupos` (mantém o visual dos cards).
- Nova página portal `/portal/pequenos-grupos` (lista + CRUD) e `/portal/grupos/{id}` (encontros + presença).
- Item no sidebar (permissão por vínculo no ministério PGs).

**Testes:** Playwright (CRUD de grupo, registro de encontro, presença total+lista, isolamento por escopo).

---

## 4. Fase 2 — Programação (semanais + eventos, página dinâmica)

**Objetivo:** substituir a agenda estática por gestão dinâmica, mantendo o visual.

### 4.1 Modelo de dados

Tabela `{prefix}1ipim_programacao`:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | bigint PK |
| `tipo` | enum | `semanal` ou `evento` |
| `titulo` | varchar | |
| `descricao` | text | |
| `horario` | varchar | ex.: "19:00" |
| `dia_semana` | tinyint null | só para `semanal` |
| `data` | date null | só para `evento` (sem recorrência) |
| `local` | varchar | |
| `status` | enum | `publicado`, `rascunho` |
| `ordem` | int | ordenação |
| `created_by` / timestamps | — | auditoria |

### 4.2 Regras

- **Semanais:** definidos por **dia da semana** (não há recorrência).
- **Eventos:** data única; na exibição pública, **filtrados pelo ano corrente**.
- Página pública `/programacao` (e `/eventos`) passa a consumir a API, mantendo a visualização atual.

### 4.3 API

- `GET /programacao?tipo=semanal` (público)
- `GET /programacao?tipo=evento&ano=2026` (público; `ano` default = ano corrente)
- `GET/POST/PUT/DELETE /admin/programacao` (admin/pastor/líder de ministério autorizado)

### 4.4 Front-end

- Nova página portal `/portal/programacao` (lista + CRUD por tipo).
- `JSON-LD Event` para eventos.

---

## 5. Fase 3 — Relatórios na auditoria + acesso de líderes

**Objetivo:** líderes emitem relatórios do próprio escopo na página de auditoria; pastor/admin veem tudo.

### 5.1 Acesso (muda FR-87)

- `/portal/auditoria` deixa de ser só admin/pastor.
- **Líder** (de ministério ou de PG) acessa com escopo limitado: log filtrado às ações do próprio escopo + relatórios do próprio escopo.
- **Pastor/admin** veem log e relatórios de tudo.

### 5.2 Relatórios (FR-93 / FR-100)

| Relatório | Escopo | Saída |
|---|---|---|
| Frequência de PG (por grupo/período) | líder de PG: próprio grupo; líder minist. PGs/pastor/admin: todos | CSV + tela |
| Escalas (participação por período) | líder: próprio ministério | CSV |
| Voluntários (ativos/pendentes) | líder: próprio ministério | CSV |
| Estoque baixo (Livraria) | líder Livraria + admin/pastor | CSV |

- Filtros por período e por grupo/ministério; exportação CSV.
- Implementados como **abas** na página de auditoria (aba "Log" + aba "Relatórios").

### 5.3 API

- `GET /admin/relatorios/frequencia?grupo_id=&de=&ate=&format=csv`
- `GET /admin/relatorios/escalas?...` · `GET /admin/relatorios/voluntarios?...` · `GET /admin/relatorios/estoque?...`
- Guards por escopo no servidor (403 fora do escopo).

---

## 6. Fase 4 — Portal restrito à equipe (FR-104)

**Objetivo:** conta só do Berea não acessa o portal; vê tela de solicitação.

### 6.1 Fluxo

1. Usuário autentica (login único).
2. Portal identifica ausência de vínculo de equipe.
3. Tela de **solicitação de autorização** (escolhe ministério/motivo).
4. Pedido vai para os aprovadores do escopo.
5. Aprovação **delega função** (membership de ministério + papel):
   - **Líder de ministério** aprova só `colaborador`, no próprio ministério.
   - **Admin/pastor** aprovam em escopo geral (qualquer ministério/papel).
   - **Líder de PG não aprova** (não é líder de ministério).
6. Solicitação, aprovação e função entram na auditoria.

### 6.2 Modelo de dados

Tabela `{prefix}1ipim_access_requests`:

| Campo | Tipo |
|---|---|
| `id` | bigint PK |
| `user_id` | bigint |
| `ministry_id` | bigint null |
| `motivo` | text |
| `status` | enum `pending`, `approved`, `denied` |
| `papel_concedido` | enum null `colaborador`, `lider` |
| `aprovado_por` | bigint null |
| `created_at` / `updated_at` | — |

### 6.3 Front-end

- Estado no auth-guard: se autenticado sem vínculo → tela de solicitação (em vez do dashboard).
- Fila de aprovação no portal (para líder de ministério/admin/pastor).
- Sem mudança de senha/conta; muda só o vínculo.

---

## 7. Fase 5 — Berea MVP (app social + salas vinculadas + identidade visual)

**Objetivo:** entregar a comunidade com identidade própria e salas dos PGs vinculadas.

### 7.1 Identidade visual (parâmetros)

| Parâmetro | Valor |
|---|---|
| Posicionamento | App própria em `berea.1ipim.online`, **sem** navbar/footer do site |
| Tema | **Light-first**, toggle para dark |
| Accent | **Âmbar** `#fdba74` (300) + derivados AA |
| Neutros | Zinc (`#f4f4f5`, `#e4e4e7`, `#27272a`, `#151718`…) |
| Destrutivo | `#f87171` |
| Tipografia | Inter (corpo) + Cormorant Garamond (títulos/versículos) |
| Ícones | Material Symbols |
| Navegação | Bottom tab bar (mobile) / left rail (desktop) + FAB de check-in |
| Superfícies | Raios generosos, cards de feed, avatares circulares |

> Tokens âmbar precisam de teste de contraste AA sobre superfícies claras antes
> de fechar; criar `--color-amber-*` no `@theme`.

### 7.2 Estrutura de telas (IA)

Bottom tabs (mobile) / left rail (desktop):

1. **Feed** — check-ins compartilhados, comentários, reações.
2. **Check-in** (FAB central) — leitura do dia + frase + foto opcional.
3. **Salas** — salas vinculadas aos PGs + salas criadas pelos usuários.
4. **Desafios/Leitura** — plano do dia, atrasados, progresso.
5. **Perfil** — avatar, streak, badges, configurações, notificações.

### 7.3 Salas

- **Salas de PG** são vinculadas: `1ipim_grupos.room_id` → sala do Berea, com aba
  **Encontros** (registros vindos do portal, separados do feed).
- **Demais salas** são criadas pelos usuários; o criador vira moderador.
- Convite por **código, link e e-mail** (link/e-mail preferenciais).
- Conteúdo publicado direto; moderador apaga conteúdo, remove pessoas e restringe postagens.

### 7.4 Modelo de dados (Berea)

Reutiliza o modelo sugerido na seção 3.14 de `requisitos-funcionais.md`
(`groups`, `group_members`, `checkins`, `checkin_groups`, `comments`, `reactions`,
`reports`, `blocks`, `badges`, `notifications`, `streaks`), com:

- `groups.room_id` ligando à sala; `groups.linked_group_id` ligando ao PG.
- Papéis de sala: `moderador` / `membro`; flags de restrição de postagem.

### 7.5 Papéis novos (nesta fase)

- `conteudista_berea` — planos, desafios e devocionais, sem acesso a usuários.
- `moderador_berea` — moderação por sala (apagar conteúdo, remover pessoas, restringir postagens).
- Auditoria de toda moderação e edição de conteúdo.

---

## 8. Fase 6 — Migração de subdomínios

**Objetivo:** ativar `admin`, `portal`, `berea` e `staging` em `.1ipim.online`.

1. Cookie de sessão em `.1ipim.online` (HttpOnly + Secure).
2. CORS para os 4 hosts; CSP com `connect-src`/`img-src` dos subdomínios.
3. `WP_BASE`/`WP_ADMIN_URL` por ambiente (feito na Fase 0).
4. Redirects `/portal` → `portal.1ipim.online`, `/admin` → `admin.1ipim.online`.
5. `admin.1ipim.online` pode começar como alias do `/admin` atual; migração
   definitiva exige backup + search-replace.
6. Jenkins com alvos separados por subdomínio.

---

## 9. Ordem e milestones

| Fase | Escopo | Milestone |
|---|---|---|
| **0** | Housekeeping + config por ambiente | Portal íntegro; URLs por env |
| **1** | PGs (ministério + CRUD + encontros + página dinâmica) | PGs dinâmicos e auditáveis |
| **2** | Programação (semanais + eventos) | Agenda editável sem programador |
| **3** | Relatórios na auditoria + acesso de líderes | Líder emite do próprio escopo |
| **4** | Portal restrito (FR-104) | Solicitação/aprovação funcionando |
| **5** | Berea MVP (app social + identidade + salas) | Comunidade no ar |
| **6** | Migração de subdomínios | `portal`/`berea`/`admin` ativos |

> Fases 1–2 podem ser paralelizadas com 3; a Fase 5 depende de 1 (salas vinculadas)
> e 4 (login/auth).

---

## 10. Critérios de pronto (DoD)

Um requisito está pronto quando:

- comportamento implementado e validado no staging;
- testes automatizados (Playwright + axe) cobrindo o fluxo principal;
- sem violações critical/serious no axe;
- Lighthouse dentro dos limiares;
- documentação atualizada;
- deploy em produção com smoke test;
- backup e rollback disponíveis.

---

## 11. Decisões ainda pendentes (não bloqueiam as fases 0–4)

1. Primeiro plano de leitura/desafio do Berea.
2. Moderadores iniciais do Berea e quem pode delegar moderador.
3. Fotos do Berea: moderação manual/automática/híbrida (retenção 90 dias já configurada).
4. Termos de uso/LGPD e política de conduta do Berea.
5. Paleta final do âmbar + validação de contraste AA.
