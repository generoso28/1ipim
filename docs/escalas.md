# Escalas — conflito entre ministérios (especificação)

**Objetivo:** impedir que a mesma pessoa assuma duas escalas no mesmo horário,
mesmo em ministérios diferentes. Exemplo: Ana está na **Mídia** e no **Louvor**
e tenta entrar nas duas escalas às 19h do mesmo dia.

## Regra de conflito

Uma pessoa (`user_id` ou `email`) tem conflito quando:

- está **ativa** em duas escalas diferentes;
- as escalas têm a **mesma data**;
- os intervalos de horário **se sobrepõem** (`inicio A < fim B` e `inicio B < fim A`).

Se a escala não tiver horário de fim, usar uma duração padrão configurável
(`1ipim_default_schedule_minutes`, sugestão: 120). Se não tiver horário, tratar
como conflito no mesmo dia.

Escalas canceladas, recusadas ou excluídas não contam.

## Onde validar

1. **Autoatendimento** (`join-scale`): bloquear e mostrar alerta com o
   ministério, data e horário conflitantes.
2. **Cadastro/edição pelo líder**: alertar e exigir confirmação explícita
   (“Autorizar mesmo assim”), com justificativa.
3. **Edição em lote** (recorrência): validar cada data antes de gravar.

## Resposta da API

```json
{
  "error": "schedule_conflict",
  "message": "Você já está escalada na Mídia às 19h em 20/11/2026.",
  "conflicts": [
    {
      "schedule_id": 123,
      "ministry_id": 4,
      "ministry": "Mídia",
      "date": "2026-11-20",
      "start": "19:00",
      "end": "21:00"
    }
  ]
}
```

- Autoatendimento: HTTP **409** e bloqueio.
- Líder/admin: HTTP **409** com `can_override: true`; a confirmação envia
  `override: true` + `override_reason` e gera log de auditoria.

## Modelo de dados

Hoje a escala guarda `equipe_emails` em meta. Para consultar conflitos com
segurança, normalizar participantes:

```sql
CREATE TABLE {$wpdb->prefix}1ipim_escala_participantes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  schedule_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  email VARCHAR(190) NOT NULL,
  status ENUM('escalado','confirmado','recusado','cancelado') NOT NULL DEFAULT 'escalado',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY schedule_email (schedule_id, email),
  KEY user_status (user_id, status),
  KEY email_status (email, status)
) {$charset_collate};
```

Campos de horário na escala (meta ou tabela):

- `data_da_escala` (Y-m-d) — já existe
- `horario_inicio` (HH:MM) — já existe como `horario`
- `horario_fim` (HH:MM) — **adicionar**
- `ministerio_id` — já existe

Migração: percorrer as escalas existentes, separar `equipe_emails` por vírgula,
criar as linhas em `1ipim_escala_participantes` e preencher `horario_fim` com
`horario_inicio + duração padrão` quando estiver vazio.

## Consulta de conflito

```sql
SELECT p.schedule_id, s.ministry_id, s.date, s.start, s.end
FROM {$wpdb->prefix}1ipim_escala_participantes p
JOIN {$wpdb->prefix}1ipim_escalas s ON s.id = p.schedule_id
WHERE p.email = %s
  AND p.status IN ('escalado','confirmado')
  AND s.date = %s
  AND s.start < %s
  AND s.end > %s;
```

A consulta ignora a própria escala ao editar.

## Testes de aceitação

| Cenário | Esperado |
|---|---|
| Ana (Mídia + Louvor) tenta entrar no Louvor às 19h, já estando na Mídia às 19h | 409 + alerta + bloqueio |
| Ana entra no Louvor às 19h, mas a Mídia é às 9h | permitido |
| Ana entra no Louvor em outro dia | permitido |
| Líder adiciona Ana em conflito | 409 + opção “Autorizar mesmo assim” |
| Líder autoriza com justificativa | grava + auditoria |
| Escala da Mídia cancelada | não gera conflito |
| Escala sem horário de fim | usa duração padrão |
| Edição em lote com uma data conflitante | aborta ou lista conflitos antes de gravar |

## Notificações

- Conflito no autoatendimento: mensagem na tela (sem notificação externa).
- Override do líder: registrar no log e notificar o voluntário na central
  interna do portal.
