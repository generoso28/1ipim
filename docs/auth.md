# Autenticação do portal — opção A (cookie + nonce)

O portal usa a sessão nativa do WordPress (cookies `HttpOnly`) + nonce da REST
API. O JWT antigo foi retirado do front-end.

## Endpoints

Publicados em `https://1ipim.online/admin/portal-auth/` (e espelhados no staging):

| Endpoint | Método | Função |
|---|---|---|
| `login.php` | POST | valida usuário/senha, cria sessão WP e devolve usuário + nonce |
| `session.php` | GET | devolve usuário + nonce se houver sessão; 401 se não |
| `logout.php` | POST | encerra a sessão WP |

O caminho fica em `/admin/portal-auth/` porque o WordPress grava os cookies com
`path=/admin/`. Fora desse caminho, o navegador não envia a sessão.

## Front-end

- `src/scripts/portal/auth.ts`: cache do usuário + nonce, `refresh()` valida a
  sessão no servidor, `logout()` encerra no servidor.
- `src/scripts/portal/api.ts`: todas as chamadas usam `credentials: "include"` e
  enviam `X-WP-Nonce` automaticamente.
- `login.ts`, `layout.ts`, `dashboard.ts` e demais telas foram migrados; não há
  mais `Authorization: Bearer` nem token em `localStorage`.
- O layout valida a sessão em `session.php` ao carregar e redireciona para
  `/portal/login` quando recebe 401.

## Segurança

- Cookies de sessão do WordPress, não legíveis por JavaScript.
- CORS restrito a `https://1ipim.online`, `www` e `staging` nos endpoints de
  autenticação.
- `Cache-Control: no-store` nas respostas de login/sessão.
- Limite de tentativas por IP (8 em 10 minutos), com cache fora do webroot.
- `wp-load.php` é carregado de `public_html/admin` (produção ou staging).
- Nenhum segredo no `public_html`.

## Validação feita

- `session.php` sem cookie → 401 JSON.
- `wp_signon` com conta de teste → `Set-Cookie` + `session.php` 200.
- REST `GET /users/me` com `X-WP-Nonce` → 200.
- Testes Playwright: 29/29 com API e sessão mockadas.

> O POST de login a partir do IP deste servidor recebe **406 do ModSecurity**,
> igual ao endpoint JWT antigo. Pelo navegador em rede residencial o login
> funciona; por isso a validação final deve ser feita no staging.

## Próximos passos

1. Validar login real no **staging** com a conta de teste.
2. Publicar em produção.
3. Remover o plugin JWT do WordPress depois da validação.
4. Adicionar captcha/2FA e “esqueci a senha”.
