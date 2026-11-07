# Berea — comunidade de leitura da 1IPIM

**Nome de trabalho:** Berea (Atos 17:11). Em português bíblico, “Bereia”.
**Subdomínio proposto:** `berea.1ipim.online`.
**Subtítulo:** “Juntos, nas Escrituras”.

## Por que Berea

- Remete aos bereanos que examinavam as Escrituras diariamente.
- Grafia em inglês escolhida: **Berea**; “Bereia” pode aparecer em textos explicativos.
- Funciona para a igreja toda e para pequenos grupos.
- É mais institucional e acolhedor que “Bible Rats”.
- Combina com leitura diária, desafios, salas e feed.

## Arquitetura de subdomínios

Plano com os 5 subdomínios disponíveis:

| Subdomínio | Função |
|---|---|
| `1ipim.online` | Site público, catálogo da Livraria e conteúdo SEO |
| `admin.1ipim.online` | WordPress, REST API, mídia e administração |
| `portal.1ipim.online` | Portal da igreja (voluntários, escalas, ministérios, livraria, relatórios) |
| `berea.1ipim.online` | Comunidade Berea (feed, salas, desafios, ranking) |
| `staging.1ipim.online` | Homologação; pode ser aposentado/repurposed depois |

Pontos técnicos:

- cookie de sessão em `.1ipim.online` (HttpOnly + Secure);
- CORS liberado para os quatro hosts;
- CSP com `connect-src`/`img-src` dos subdomínios;
- SSL individual ou wildcard;
- redirects: `/portal` → `portal.1ipim.online`, `/admin` → `admin.1ipim.online`;
- Jenkins com alvos separados;
- `admin.1ipim.online` pode começar como alias do `/admin` atual para não quebrar URLs; a migração definitiva do WordPress exige backup e search-replace;
- `portal` e `berea` podem compartilhar a mesma API e o mesmo login.

## Produto proposto

- Público: igreja toda; forte uso nos pequenos grupos.
- Feed social interno (padrão: visível para membros; posts públicos opcionais).
- Salas/grupos criados pelos próprios usuários, com acesso por convite/código para desafios específicos; o criador vira moderador.
- Salas vinculadas a um PG têm aba **Encontros** separada do feed.
- Cada sala pode ter planos de leitura, desafios e devocionais próprios; o líder/moderador da sala é responsável por esse conteúdo.
- Desafios com período, plano de leitura e check-ins.
- Ranking geral opt-in; rankings internos por sala.
- Streak privado por padrão.
- Comentários, reações, badges e notificações internas.
- Moderação: admin, pastores e líderes; podem delegar moderador por sala; criador da sala também modera.
- Conteúdo de sala (planos, desafios, devocionais e posts) é **publicado direto**, sem fila de aprovação.
- O moderador pode **apagar conteúdo**, **remover pessoas** da sala e **restringir quem pode postar**.
- Denúncia/bloqueio e trilha de auditoria.

## Acesso: Portal x Berea

São duas audiências diferentes:

| Área | Quem entra |
|---|---|
| **Portal** | Equipe da igreja: admin, pastores, líderes, voluntários e colaboradores aprovados |
| **Berea** | Igreja toda, incluindo membros apenas inscritos no Berea |

**Decisão:** quem tem apenas conta no Berea **não acessa o Portal**.

Fluxo ao tentar entrar no Portal com login do Berea:

1. a pessoa autentica com a conta do Berea;
2. o Portal identifica que ela não tem vínculo de equipe;
3. aparece uma tela de **solicitação de autorização**;
4. o pedido vai para o líder do ministério/PG ou para admin/pastor;
5. o líder aprova e **delega uma função** (ministério, papel e escopo);
6. só então o acesso é liberado.

A solicitação, a aprovação e a função concedida entram na auditoria. Enquanto
não houver aprovação, a pessoa continua usando apenas o Berea.

A conta é a mesma (login em `.1ipim.online`); o que muda é o vínculo de equipe
e as capabilities liberadas no Portal.

## Pequenos grupos no portal

Além do diretório, cada líder poderá publicar o registro do encontro:

- foto do grupo;
- nome do grupo;
- data;
- texto lido;
- tema;
- preletor;
- público presente (quantidade);
- observações opcionais.

**Visibilidade:** o registro do encontro aparece para **todos os líderes de PG**
no Portal (além de admin e pastores), e também na aba **Encontros** da sala do
Berea. O líder escolhe se publica um resumo no feed da sala.

Esses registros alimentam relatórios de frequência e participação por grupo/período.

## Pequenos grupos e Berea

Recomendação: o **Portal é a fonte oficial** dos grupos e dos registros de encontro
(frequência, foto, texto lido, tema, preletor). O Berea é a camada social.

- tabelas compartilhadas: `1ipim_grupos`, `1ipim_grupo_encontros` e presença por encontro;
- cada grupo pode ter uma sala no Berea (`room_id`);
- o líder registra o encontro no Portal, lista os presentes e pode **convidar quem ainda não tem conta**;
- o convite da sala pode ser por **código**, **link** ou **e-mail** (link e e-mail são os canais preferenciais no Berea);
- ao aceitar, a pessoa entra no grupo/sala;
- a sala do PG tem uma **seção separada de Encontros**, fora do feed principal;
- relatórios e frequência saem do Portal, sem depender do feed;
- se o Berea for construído primeiro, a sala pode criar o registro estruturado, mas o modelo de dados continua o mesmo.

Isso evita duplicar grupos, mantém os relatórios confiáveis e permite que o
Berea evolua sem virar o sistema administrativo da igreja.

## Ministério de PGs

Os Pequenos Grupos são um **ministério** (`tipo=pequenos_grupos`), como a
Livraria é `tipo=livraria`:

- cada **líder de PG** entra no Portal com status de **colaborador** nesse
  ministério e gerencia o próprio grupo (registro de encontro, presença,
  convites);
- o **líder do ministério de PGs** (papel `lider`) é delegado por
  **admin/pastor** — e pode ser, inclusive, um pastor;
- o líder de PG **não** altera papéis nem aprova acesso ao Portal (a menos que
  também seja líder de outro ministério);
- o líder do ministério de PGs tem visão de todos os grupos e aprova acesso ao
  Portal **apenas como colaborador**, dentro do escopo de PGs.

Isso mantém a regra: quem altera papel/vínculo é **admin/pastor**; o vínculo de
grupo (líder de PG) é um atributo do grupo, não um papel global.

## Identidade visual do Berea

O Berea é uma **app social** com identidade distinta do portal (teal + Inter,
administrativo). Parâmetros:

| Parâmetro | Valor |
|---|---|
| Posicionamento | App própria em `berea.1ipim.online`, sem o navbar/footer do site |
| Tema padrão | **Light-first**, com toggle para dark |
| Accent | **Dourado quente** `#f59e0b` (500) + `#d97706` (600) para texto/AA — feed, streak, check-in |
| Neutros | Zinc (mesma família de cinzas do portal) |
| Destrutivo | `#f87171` (red-400) |
| Tipografia | Inter (corpo) + Cormorant Garamond (títulos/versículos) |
| Ícones | **Material Symbols** (diferente do Font Awesome do site/portal) |
| Navegação | Bottom tab bar (mobile) / left rail (desktop) + FAB de check-in |
| Superfícies | Raios generosos, cards de feed, avatares circulares |
| Gamificação | Streak, badges e pódio com accent âmbar |

Paleta (referência do app Bible-Rats, ajustada para light-first):

- superfície clara `#ffffff` / `#f4f4f5` / `#e4e4e7`; bordas `#e4e4e7`;
- superfície escura (dark) `#151718` / `#202425` / `#27272a`;
- accent dourado quente `#f59e0b` (500), com `#d97706` (600) para texto/botões e `#b45309` para AA;
- destrutivo `#f87171`.

> Criar tokens `--color-amber-50…700` no `@theme` e validar contraste AA do
> texto dourado sobre superfícies claras (usar o tom 600/700 quando necessário).

## Quem edita o conteúdo inicial

| Conteúdo | Quem edita |
|---|---|
| Termos, LGPD, traduções e configurações globais | Admin |
| Planos de leitura, desafios, devocionais e diretrizes | Pastor + **conteudista Berea** delegado |
| Salas e registros do próprio grupo | Líder do grupo |
| Moderação de posts/comentários | Admin, pastor, líder e moderador delegado |
| Posts/comentários próprios | Membro |

Papéis definidos para a **próxima fase** (ainda não criados no RBAC):

- `conteudista_berea` — cria/edita planos, desafios e devocionais, sem acesso a usuários;
- `moderador_berea` — modera salas/comentários, remove pessoas e restringe postagens, com escopo por sala;
- líder de grupo continua sendo o vínculo do grupo, não um papel global.

**Decisão:** os papéis serão criados na fase do Berea, não agora.

Toda alteração de conteúdo ou moderação entra na auditoria.

## Conteúdo inicial (o que é)

Não é código; é o conteúdo editorial para a comunidade não nascer vazia:

1. Plano de **Provérbios em 31 dias** (um capítulo/dia + pergunta curta) — **escolhido como primeiro plano**.
2. Um segundo plano de leitura (João ou Atos em 21 dias) fica como conteúdo seguinte.
3. 3 a 5 modelos de desafio (7, 21 e 90 dias).
4. Post de boas-vindas e diretrizes da comunidade.
5. Modelos de sala para pequenos grupos (nome, líder, horário, convite).
6. 10 a 20 devocionais/reflexões iniciais.
7. Regras de badges, streak e ranking.
8. Termos de uso, privacidade e LGPD — **provisórios no MVP**, com revisão posterior.
9. Traduções: Almeida 1819 como padrão; confirmar BLIVRE, BPM e TB 1917.

## Decisões fechadas

1. **Marca:** Berea (grafia em inglês). Subtítulo “Juntos, nas Escrituras”.
2. **Acesso:** Portal é restrito à equipe; conta só do Berea pede autorização e função.
3. **Registros de encontro:** visíveis a todos os líderes de PG no Portal, na aba Encontros do Berea, com opção de resumo no feed.
4. **Convites:** código, link e e-mail (link e e-mail preferenciais no Berea).
5. **Conteúdo de sala:** publicado direto; moderador apaga conteúdo, remove pessoas e restringe postagens.
6. **Salas:** usuários podem criar as próprias salas; o criador vira moderador.
7. **Ranking:** opt-in; geral e por sala.
8. **Papéis:** `conteudista_berea` e `moderador_berea` criados na fase do Berea.
9. **PGs:** Portal é a fonte oficial; a sala do Berea é a camada social.
10. **Aprovação do Portal:** líder de ministério aprova só colaborador no próprio
    escopo; admin/pastor aprovam em escopo geral; líder de PG não aprova.
11. **Ministério de PGs:** líder de PG = colaborador; líder do ministério é
    delegado por admin/pastor (pode ser pastor).
12. **Relatórios:** emitidos na página de auditoria; líderes veem log (escopo) +
    relatórios; pastor/admin veem tudo.
13. **Programação:** página dinâmica; semanais por dia da semana (sem recorrência)
    e eventos filtrados pelo ano corrente; mantém o visual atual.
14. **PGs públicos:** página dinâmica, com cadastro/edição via portal.
15. **Salas:** salas dos PGs vinculadas (`room_id`); demais salas criadas pelos usuários.
16. **Berea:** app própria, light-first com toggle dark, accent dourado + zinc,
    Material Symbols, bottom tab bar/FAB.
17. **Subdomínios:** já cadastrados; seguir com a migração.
18. **Primeiro plano:** Provérbios em 31 dias.
19. **Moderadores iniciais:** admin/pastor + líder do ministério de PGs + criador
    da sala; admin/pastor delegam `moderador_berea` por sala.
20. **Fotos:** sempre comprimidas (máx. 1600 px, ≤500 KB, EXIF removido);
    publicação direta + denúncia; sem triagem automática no MVP.
21. **Termos/LGPD/conduta:** provisórios no MVP.
22. **Accent:** dourado quente (`#f59e0b` / `#d97706`).

## Decisões pendentes

Nada bloqueante para o MVP do Berea. Ficam para depois:

1. Revisão jurídica dos termos/LGPD provisórios.
2. Segundo plano de leitura (João/Atos em 21 dias).
3. Triagem automática de fotos, se o volume justificar.
