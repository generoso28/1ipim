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

1. Plano de **Provérbios em 31 dias** (um capítulo/dia + pergunta curta).
2. Um plano de leitura inicial (ex.: João ou Atos em 21 dias).
3. 3 a 5 modelos de desafio (7, 21 e 90 dias).
4. Post de boas-vindas e diretrizes da comunidade.
5. Modelos de sala para pequenos grupos (nome, líder, horário, convite).
6. 10 a 20 devocionais/reflexões iniciais.
7. Regras de badges, streak e ranking.
8. Termos de uso, privacidade e LGPD.
9. Traduções: Almeida 1819 como padrão; confirmar BLIVRE, BPM e TB 1917.

## Decisões fechadas

1. **Marca:** Berea (grafia em inglês). Subtítulo “Juntos, nas Escrituras”.
2. **Acesso:** Portal é restrito à equipe; conta só do Berea pede autorização e função.
3. **Registros de encontro:** visíveis a todos os líderes de PG no Portal, na aba Encontros do Berea, com opção de resumo no feed.
4. **Convites:** código, link e e-mail (link e e-mail preferenciais no Berea).
5. **Conteúdo de sala:** publicado direto; moderador apaga conteúdo, remove pessoas e restringe postagens.
6. **Salas:** usuários podem criar as próprias salas; o criador vira moderador.
7. **Ranking:** opt-in; geral e por sala.
8. **Papéis:** `conteudista_berea` e `moderador_berea` criados na próxima fase.
9. **PGs:** Portal é a fonte oficial; a sala do Berea é a camada social.

## Decisões pendentes

1. Quem aprova o pedido de acesso ao Portal: líder do PG, líder do ministério ou admin/pastor?
2. Feed visível só para membros ou também para visitantes? (recomendo membros, com opt-in público.)
3. Primeiro plano de leitura/desafio.
4. Quem são os moderadores iniciais e quem pode delegar.
5. Fotos: moderação manual, automática ou híbrida; retenção de 90 dias.
6. Termos/LGPD e política de conduta.
7. Momento da migração para os subdomínios.
