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
- Denúncia/bloqueio e trilha de auditoria.

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

Esses registros alimentam relatórios de frequência e participação por grupo/período.

## Pequenos grupos e Berea

Recomendação: o **Portal é a fonte oficial** dos grupos e dos registros de encontro
(frequência, foto, texto lido, tema, preletor). O Berea é a camada social.

- tabelas compartilhadas: `1ipim_grupos`, `1ipim_grupo_encontros` e presença por encontro;
- cada grupo pode ter uma sala no Berea (`room_id`);
- o líder registra o encontro no Portal, lista os presentes e pode **convidar quem ainda não tem conta**;
- o convite pode ser por e-mail ou link/código da sala; ao criar a conta, a pessoa entra no grupo;
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

Sugestão de novos papéis/capabilities:

- `conteudista_berea` — cria/edita planos, desafios e devocionais, sem acesso a usuários;
- `moderador_berea` — modera salas/comentários, com escopo por sala quando necessário;
- líder de grupo continua sendo o vínculo do grupo, não um papel global.

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

## Decisões pendentes

1. Marca: **Berea** ou **Bereia** na interface? (`berea.1ipim.online` já está bom.)
2. Feed visível só para membros ou também para visitantes? (recomendo membros, com opt-in público.)
3. Ranking opt-in ou ativo por padrão? (recomendo opt-in.)
4. Primeiro plano de leitura/desafio.
5. Quem são os moderadores iniciais e quem pode delegar.
6. Fotos: moderação manual, automática ou híbrida; retenção de 90 dias.
7. Termos/LGPD e política de conduta.
8. Momento da migração para os subdomínios.
