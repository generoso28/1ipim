# Berea — comunidade de leitura da 1IPIM

**Nome de trabalho:** Berea (Atos 17:11). Em português bíblico, “Bereia”.
**Subdomínio proposto:** `berea.1ipim.online`.

## Por que Berea

- Remete aos bereanos que examinavam as Escrituras diariamente.
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
- Salas/grupos com acesso por convite/código para desafios específicos.
- Desafios com período, plano de leitura e check-ins.
- Ranking geral opt-in; rankings internos por sala.
- Streak privado por padrão.
- Comentários, reações, badges e notificações internas.
- Moderação: admin, pastores e líderes; podem delegar moderador por sala.
- Denúncia/bloqueio e trilha de auditoria.

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
