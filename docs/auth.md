# Autenticação do portal — opção A (cookie + nonce)

Objetivo: remover o JWT do `localStorage` e usar a sessão nativa do WordPress
(cookies `HttpOnly`) + nonce da REST API.

## Status

Backend criado e publicado:

| Endpoint | Método | Função |
|---|---|---|
| `/api/auth/login.php` | POST | valida usuário/senha, cria sessão WP e devolve usuário + nonce |
| `/api/auth/session.php` | GET | devolve usuário + nonce se houver sessão; 401 se não |
| `/api/auth/logout.php` | POST | encerra a sessão WP |

Ainda **não** houve mudança no front-end: o portal atual continua usando JWT.
Isso permite testar o backend sem risco.

## Como funciona

- `login.php` carrega o WordPress, chama `wp_signon()` e deixa o WordPress
  definir os cookies de autenticação (`HttpOnly`, `Secure`).
- O navegador recebe um `nonce` (`wp_rest`) que deve ser enviado em
  `X-WP-Nonce` nas chamadas à REST API.
- As chamadas usam `credentials: 'include'` para enviar os cookies.
- O nonce **não é um segredo de autenticação**; pode ficar em memória/session
  storage. Quem protege a sessão é o cookie `HttpOnly`.
- O login é servido em `https://1ipim.online/api/auth/...` inclusive quando a
  página está no staging. Assim os cookies pertencem ao domínio de produção,
  que é onde a REST API roda.

## Segurança atual

- Cookies de sessão do WordPress, não legíveis por JavaScript.
- CORS restrito a `https://1ipim.online`, `www` e `staging`.
- `Cache-Control: no-store` nas respostas de login/sessão.
- Limite de tentativas por IP (8 em 10 minutos), com cache fora do webroot.
- `wp-load.php` é carregado de `public_html/admin` (produção ou staging).
- Nenhum segredo no `public_html`.

## Pendente

1. Refatorar o front-end (`auth.ts`, `api.ts`, `login.ts`, `layout.ts` e
   páginas) para:
   - chamar `login.php` em vez do JWT;
   - guardar apenas usuário + nonce (sem token);
   - enviar `X-WP-Nonce` e `credentials: 'include'` em todas as chamadas;
   - renovar a sessão em 401/403;
   - logout via `logout.php`.
2. Validar login real com uma **conta de teste** (subscriber/líder) antes de
   ativar em produção.
3. Remover o plugin JWT do WordPress depois que o front-end estiver migrado.
4. Adicionar captcha/2FA e “esqueci a senha”.

## Testes rápidos

```bash
# sem sessão -> 401
curl -i https://1ipim.online/api/auth/session.php

# preflight para staging
curl -i -X OPTIONS \
  -H 'Origin: https://staging.1ipim.online' \
  -H 'Access-Control-Request-Method: POST' \
  https://1ipim.online/api/auth/login.php
```

O POST de login a partir do **próprio servidor** é bloqueado pelo ModSecurity
(erro 406), então a validação de sucesso deve ser feita pelo navegador de uma
rede normal, com a conta de teste.
