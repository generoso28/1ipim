# RBAC do portal — especificação técnica (passo 1)

**Objetivo:** substituir o modelo atual (papéis do WordPress + `ministries_approved`)
por **papel global + vínculo por ministério**, com escopo no servidor, para
sustentar Bible Rats, livraria e gestão de ministérios.

**Status:** passos 1–3 implementados e validados em produção.

---

## 0. Status da implementação (06/11/2026)

O passo 2 foi aplicado em produção:

- Plugin must-use: `/admin/wp-content/mu-plugins/1ipim-rbac.php`.
- Tabelas criadas: `1ipim_ministry_memberships`, `1ipim_audit_log`,
  `1ipim_ministry_settings`.
- Papéis criados: `assinante`, `colaborador_ministerio`, `lider_ministerio`,
  `pastor`; capabilities adicionadas ao `administrator`.
- Migração: **3 usuários**, **2 papéis adicionados**, **1 vínculo**
  (usuário 4, ministério 9, líder), **1 administrador**.
- Backup: `/home2/edu10350/1ipim-cache/rbac-backup-20261106-194805.json`.
- Idempotência validada: a segunda execução não duplicou papéis/vínculos.
- Compatibilidade: `session.php` prefere o papel legado (`editor`, `subscriber`
  etc.) para o front-end atual continuar funcionando; os novos papéis são
  aditivos.
- Configurações criadas: retenção de fotos 90 dias, tradução padrão
  `almeida1819`, traduções habilitadas e duração padrão de escala 120 min.

### Passo 3 — guards e gestão (06/11/2026)

- Plugin `1ipim-rbac-rest.php` com o namespace `1ipim/v1`:
  - `GET /me`, `GET/POST/DELETE /ministries`, `GET/POST/DELETE /ministries/{id}/members`;
  - `GET /users`, `POST /users/{id}/role`, `DELETE /users/{id}`;
  - `POST /escalas/{id}/participar`, `/sair`, `/equipe`.
- Guards nos endpoints nativos usados pelo portal:
  - `GET /wp/v2/escala` exige login e devolve apenas escalas dos ministérios
    do usuário (admin/pastor veem todas);
  - escrita em `/wp/v2/escala` exige liderança do ministério da escala;
  - `/wp/v2/ministerio` só aceita escrita de admin/pastor;
  - `/wp/v2/users` só aceita admin/pastor; líderes usam `/1ipim/v1/users`.
- Conflito de escala: validação no autoatendimento (409), no cadastro/edição
  e na edição de equipe; líder/admin pode autorizar com justificativa, que
  vai para `1ipim_audit_log`.
- Ministério **Livraria** criado (ID 37) com `tipo=livraria`.
- Front-end: sessão devolve `roles`, `memberships`, `isAdmin`, `isPastor` e
  `isMinistryLeader`; líderes veem apenas seus ministérios e suas escalas.
- Matriz de autorização validada em produção: 25 cenários (público, líder,
  colaborador, assinante e admin), incluindo 401/403/409 e override.
- Playwright: **77/77** testes locais após a atualização dos mocks.

---

## 1. Papéis e capabilities

| Papel (slug) | Base | Capabilities principais |
|---|---|---|
| `visitante` | não autenticado | catálogo público (leitura) |
| `assinante` | subscriber | `access_bible_rats` |
| `colaborador_ministerio` | subscriber | `access_bible_rats`, `participate_schedules` |
| `lider_ministerio` | contributor | `access_bible_rats`, `manage_own_ministry`, `manage_own_schedules`, `view_own_reports` |
| `pastor` | custom | `access_bible_rats`, `view_all_ministries`, `manage_all_ministries`, `manage_prayer_requests`, `moderate_bible_rats`, `view_reports` |
| `administrator` | nativo | todas |

**Livraria como ministério.** A livraria é um ministério com `tipo=livraria`.
O vínculo de líder/colaborador nesse ministério libera
`manage_livraria_catalog` e `upload_livraria_covers`; não existe papel global
separado para a livraria. O mesmo mecanismo serve para Som, Mídia, Louvor etc.

**Regras**

- O papel global define o **teto**; o vínculo por ministério define o **escopo**.
- Um usuário pode ser líder em um ministério e colaborador em outro.
- `administrator` e `pastor` enxergam todos os ministérios.
- O ministério **Livraria** gerencia o catálogo; não usuários/configurações.
- O catálogo é **público**; a gestão exige vínculo ativo no ministério Livraria
  (ou admin).

### 1.1 Isolamento por ministério

O papel de líder/colaborador **não é global**: ele só vale para o ministério ao
qual o usuário está vinculado. Toda requisição administrativa recebe um
`ministry_id` e verifica o vínculo antes de qualquer leitura/escrita.

| Usuário | Papel global | Vínculos | Som | Mídia | Louvor | Livraria |
|---|---|---|---|---|---|---|
| Ana | `lider_ministerio` | Som (líder) | ✏️ | — | — | — |
| João | `lider_ministerio` | Som (líder), Mídia (colaborador) | ✏️ | 👁/participar | — | — |
| Carlos | `colaborador_ministerio` | Livraria (colaborador) | — | — | — | ✏️ catálogo |
| Pr. Marcos | `pastor` | — | ✅ | ✅ | ✅ | ✅ |
| Admin | `administrator` | — | ✅ | ✅ | ✅ | ✅ |

O ministério usa o meta `tipo` (`som`, `midia`, `louvor`, `livraria`, `geral`)
para definir quais recursos expõe. O acesso continua dependendo do vínculo —
o tipo não concede permissão sozinho.

- Líder do **Som** não vê nem edita configurações, membros, escalas ou conteúdo
  da **Mídia**.
- A interface só lista os ministérios em que o usuário tem vínculo ativo.
- O servidor responde **403** se o `ministry_id` não pertencer ao escopo.
- `pastor` e `admin` são as únicas exceções globais.

---

## 2. Schema

### 2.1 Vínculos por ministério

```sql
CREATE TABLE {$wpdb->prefix}1ipim_ministry_memberships (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  ministry_id BIGINT UNSIGNED NOT NULL,
  role ENUM('colaborador','lider') NOT NULL DEFAULT 'colaborador',
  status ENUM('pending','active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_ministry (user_id, ministry_id),
  KEY ministry_role (ministry_id, role, status),
  KEY user_status (user_id, status)
) {$charset_collate};
```

### 2.2 Auditoria

```sql
CREATE TABLE {$wpdb->prefix}1ipim_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id BIGINT UNSIGNED NULL,
  before_json LONGTEXT NULL,
  after_json LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY actor_time (actor_id, created_at),
  KEY target (target_type, target_id)
) {$charset_collate};
```

### 2.3 Configurações por ministério

```sql
CREATE TABLE {$wpdb->prefix}1ipim_ministry_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ministry_id BIGINT UNSIGNED NOT NULL,
  setting_key VARCHAR(64) NOT NULL,
  setting_value LONGTEXT NULL,
  updated_by BIGINT UNSIGNED NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ministry_key (ministry_id, setting_key),
  KEY ministry (ministry_id)
) {$charset_collate};
```

Cada ministério tem suas próprias chaves (ex.: `som` não acessa as chaves de
`midia`). Configurações globais continuam em `wp_options`.

### 2.4 Configurações globais

Usar `wp_options` com prefixo `1ipim_`:

- `1ipim_photo_retention_days` (padrão **90**)
- `1ipim_default_translation` (padrão `almeida1819`)
- `1ipim_enabled_translations` (lista: `almeida1819`, `blivre`, `bpm`, `tb1917`)

### 2.5 Livraria (etapa posterior)

```sql
CREATE TABLE {$wpdb->prefix}1ipim_livraria_books (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NULL,
  publisher VARCHAR(255) NULL,
  category VARCHAR(128) NULL,
  price_cash VARCHAR(32) NULL,
  price_card VARCHAR(32) NULL,
  cover_path VARCHAR(255) NULL,
  cover_source VARCHAR(32) NULL,
  stock INT NULL,
  status ENUM('published','draft','archived') NOT NULL DEFAULT 'published',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY status_title (status, title),
  KEY code (code)
) {$charset_collate};
```

A importação inicial usa `astro_project/src/data/livraria.json` (169 livros).

---

## 3. Verificação no servidor

Helpers em PHP (plugin `1ipim-rbac`):

```php
function 1ipim_is_admin(): bool { return current_user_can('manage_options'); }
function 1ipim_is_pastor(): bool { return current_user_can('view_all_ministries'); }

function 1ipim_can_view_ministry(int $user_id, int $ministry_id): bool {
    if (1ipim_is_admin() || 1ipim_is_pastor()) return true;
    global $wpdb;
    $table = $wpdb->prefix . '1ipim_ministry_memberships';
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM $table WHERE user_id=%d AND ministry_id=%d AND status='active'",
        $user_id, $ministry_id
    ));
}

function 1ipim_can_manage_ministry(int $user_id, int $ministry_id): bool {
    if (1ipim_is_admin() || 1ipim_is_pastor()) return true;
    global $wpdb;
    $table = $wpdb->prefix . '1ipim_ministry_memberships';
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM $table WHERE user_id=%d AND ministry_id=%d AND role='lider' AND status='active'",
        $user_id, $ministry_id
    ));
}

function 1ipim_require_ministry_scope(int $ministry_id, string $level = 'view'): void {
    $user_id = get_current_user_id();
    $ok = $level === 'manage'
        ? 1ipim_can_manage_ministry($user_id, $ministry_id)
        : 1ipim_can_view_ministry($user_id, $ministry_id);
    if (!$ok) {
        wp_send_json_error(['error' => 'forbidden', 'ministry_id' => $ministry_id], 403);
    }
}
```

- **Todos** os endpoints de escrita validam a capability **e** o escopo.
- O front-end só esconde/desabilita; nunca é a única barreira.
- Respostas: `403` para autenticado sem permissão; `401` para não autenticado.

---

## 4. Migração

1. Backup do banco e do `public_html`.
2. Instalar o plugin `1ipim-rbac` (cria roles/capabilities/tabelas).
3. Mapear usuários existentes:
   - `subscriber` → `assinante`
   - `contributor` → `colaborador_ministerio`
   - `editor` → `lider_ministerio`
   - `pastor` → `pastor`
   - `administrator` → mantém
4. Converter `ministries_approved` em linhas de
   `1ipim_ministry_memberships`:
   - `editor` → `lider`
   - `contributor`/`subscriber` → `colaborador`
5. Rodar uma tela/CLI administrativa **uma vez**, com log e contagem.
6. Validar: contagem de usuários por papel; nenhum usuário sem acesso.

**Rollback:** restaurar o backup; o plugin pode ser desativado sem apagar dados.

---

## 5. Testes de aceitação

| Cenário | Esperado |
|---|---|
| Assinante acessa Bible Rats | 200 |
| Assinante tenta editar ministério | 403 |
| Líder A edita ministério A | 200 |
| Líder A edita ministério B | 403 |
| Líder do Som edita configuração do Som | 200 |
| Líder do Som tenta configuração da Mídia | 403 |
| Líder do Som tenta criar escala da Mídia | 403 |
| Líder do Som lista membros da Mídia | 403 |
| Pastor edita Som e Mídia | 200 |
| Admin edita Som e Mídia | 200 |
| Colaborador participa da escala do seu ministério | 200 |
| Colaborador tenta criar escala | 403 |
| Líder/colaborador do ministério Livraria edita catálogo | 200 |
| Assinante tenta editar catálogo | 403 |
| Líder do Som tenta editar catálogo da Livraria | 403 |
| Assinante tenta editar catálogo | 403 |
| Visitante consulta catálogo | 200 (sem login) |
| Pastor vê qualquer ministério | 200 |
| Admin acessa configurações | 200 |

Testes E2E com API mockada e, depois, no staging.

---

## 6. Ordem de execução

| Passo | Entrega |
|---|---|
| **1** | Especificação + schema — ✅ |
| 2 | Plugin `1ipim-rbac` + roles/tabelas + migração — ✅ (06/11/2026) |
| 3 | Guards nos endpoints atuais (reflexões, escalas, ministérios, usuários) |
| 4 | Gestão da livraria (ministério) + busca de capa |
| 5 | Página pública do catálogo |
| 6 | Bible Rats MVP |

Cada passo termina com backup, testes e validação no staging antes da produção.
