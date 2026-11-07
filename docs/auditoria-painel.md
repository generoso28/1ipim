# Auditoria do painel — 06/11/2026

Sondagem com sessões reais de **admin, líder e membro**, em desktop (1440px) e
mobile (390px), com axe/WCAG 2.1 A/AA, console, requests, overflow e inspeção
visual. Foram avaliadas 32 combinações de usuário × viewport × página.

## Status — Fase 1 (07/11/2026)

Os itens P0 foram corrigidos e publicados no build **#37**:

- ✅ Cadastro público corrigido (`1ipim/v1/registrar`, payload de ministérios,
  honeypot e rate limit).
- ✅ Convite/reset para usuários criados pelo admin; link de “Esqueci minha
  senha” no login.
- ✅ Autocadastro Bible Rats separado, com verificação de e-mail e bloqueio de
  login até a confirmação.
- ✅ Spinners de login/cadastro/contato/publicar/escalas ocultos de verdade
  (Font Awesome × cascade layers).
- ✅ Corrida das escalas corrigida; ministério aparece como “Mídia”, não “GERAL”.
- ✅ Acessibilidade do portal: **0 violações sérias** em 32 combinações de
  usuário × viewport × página (axe/WCAG 2.1 A/AA).
- ✅ Rótulos visíveis na sidebar, menu mobile com backdrop/fechamento e ações
  acessíveis no toque.
- ✅ Página “Novo Voluntário” padronizada dentro do PortalLayout.
- ✅ 84/84 testes Playwright; build #37 verde em staging e produção.

Pendente para as próximas fases: P1 (ministérios/usuários/escalas/reflexões) e
P2 (FR-70, notificações, auditoria, perfil, relatórios e dados legados).

### Fallback de confirmação de e-mail

O SMTP aceitou a mensagem, mas um Hotmail específico não recebeu. Fica no
backlog:

- **FR-72 — reenviar confirmação:** botão no login para solicitar novo link,
  com rate limit e resposta genérica.
- **FR-73 — verificação manual:** na lista de usuários, admin vê “e-mail
  pendente” e pode confirmar a conta Bible Rats, com auditoria.
- Se o problema se repetir em outros provedores, avaliar um provedor
  transacional (Resend/SendGrid/Mailgun) como fallback de entrega.

## Pontos positivos

- Nenhum erro de console ou request nas páginas auditadas.
- Nenhum overflow horizontal em 390px.
- Guards de permissão funcionando: líder não acessa Livraria/Voluntários;
  membro só vê suas participações.
- Login/logout, redirecionamentos e carregamento inicial estáveis.

## P0 — corrigir primeiro

| # | Problema | Evidência |
|---|---|---|
| 1 | Cadastro público quebrado | `cadastro.ts` chama `/wp/v2/users/register`, rota inexistente; o plugin expõe `/1ipim/v1/registrar`. O payload usa `meta_input`, mas o plugin espera `ministries`. |
| 2 | Usuário criado pelo admin sem credencial | `novo-usuario.ts` gera senha aleatória e não mostra/envia; não há “Esqueci minha senha” no login. |
| 3 | Escalas exibem “GERAL” | `loadSchedules()` renderiza antes de `loadMinistries()`; o mapa de ministérios ainda está vazio. |
| 4 | Ícones de carregamento sempre visíveis | `.fa-solid { display: inline-block }` do Font Awesome vence o `.hidden` do Tailwind por causa das cascade layers. Afeta login, “Publicar no Site”, cadastro, contato, toggles de tema e outros spinners. |
| 5 | Acessibilidade | `#portal-logout-btn` e `#mobile-menu-btn` sem nome; `#scale-date` sem label; `#scale-ministry` e `#livraria-category` sem nome acessível; contraste insuficiente em cabeçalhos/labels/iniciais. |
| 6 | Ações só no hover | Remover/alterar papel de membro usa `text-transparent group-hover:...`; no toque o botão fica inacessível. |

## P1 — processos e UI

- **Ministérios:** sem editar/renomear; sem campo `tipo`; sem descrição/líder
  inicial; excluir não mostra impacto; adicionar membro por `prompt()`.
- **Voluntários:** sem busca/filtros/paginação; promover a líder por `prompt()`
  pedindo ID; exclusão permanente sem detalhamento.
- **Escalas:** calendário fixo no mês; edição de equipe em texto livre; sem
  “sair da escala”; lista de voluntários não filtra pelo ministério; sem
  pré-visualização de conflitos; nomes duplicados em dados antigos.
- **Reflexões:** “Lixeira (Rascunhos)” usa `status=draft`, não `trash`;
  “Enviar para Lixeira” despublica; sem busca/paginação/autor.
- **Livraria:** falta FR-70 (movimentação por botões); sem filtro de estoque
  baixo; categoria livre (111 sem categoria); 159 sem capa; sem ordenação.
- **Navegação/dashboard:** sidebar só de ícones; menu mobile não fecha ao clicar
  fora; dashboard sem pendências/próxima escala/estoque baixo; sem central de
  notificações nem tela de auditoria.

## P2 — funcionalidades sugeridas

- Central de notificações interna.
- Perfil com troca de senha e dados pessoais.
- Convite por e-mail com link de definição de senha.
- Histórico de movimentações com filtros/exportação.
- Página individual do livro com SEO.
- Relatórios de escalas, voluntários e estoque baixo.
- Ações em lote.
- Testes axe nas páginas do portal.

## Sequência recomendada

1. **Sprint 1:** cadastro, credenciais/reset, ícones de loading, corrida das
   escalas, acessibilidade e ações no mobile.
2. **Sprint 2:** ministérios (editar/tipo), voluntários (busca/fila/papéis),
   escalas (checkboxes/sair/calendário), reflexões (lixeira real).
3. **Sprint 3:** FR-70, dashboard operacional, notificações e auditoria.
