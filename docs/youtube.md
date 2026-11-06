# YouTube sem expor a chave

O site não usa mais a chave do YouTube no build nem no JavaScript. Ele consulta
um proxy PHP no próprio cPanel:

```
GET https://1ipim.online/api/youtube.php?limit=12
GET https://staging.1ipim.online/api/youtube.php?limit=1
```

Resposta:

```json
{
  "videos": [
    {
      "id": "VIDEO_ID",
      "title": "Título",
      "published": "2026-11-02T12:00:00Z",
      "thumbnail": "https://i.ytimg.com/..."
    }
  ],
  "cached": true,
  "stale": false
}
```

## Arquivos no servidor

| Caminho | Função |
|---|---|
| `public_html/api/youtube.php` | proxy público (versionado em `astro_project/public/api/youtube.php`) |
| `/home2/edu10350/1ipim-secrets/youtube.php` | config com a chave (fora do `public_html`, modo 600) |
| `/home2/edu10350/1ipim-cache/youtube-videos.json` | cache do proxy (fora do `public_html`) |

O arquivo de config é simples:

```php
<?php
return ['api_key' => 'SUA_CHAVE'];
```

## Rotacionar a chave

1. Crie a nova chave no Google Cloud, restrita à **YouTube Data API v3**.
2. Edite `/home2/edu10350/1ipim-secrets/youtube.php` com a nova chave.
3. Não precisa rebuildar nem fazer deploy do Astro.
4. Desative/delete a chave antiga.
5. Opcional: apague `1ipim-cache/youtube-videos.json` para forçar atualização
   imediata (senão o cache pode levar até 10 minutos).

## Restrições da chave

O proxy envia `Referer: https://1ipim.online/`, então a chave pode continuar
restrita por **HTTP referrer** (`https://1ipim.online/*`). Se você restringir por
**IP**, remova o header `Referer` do proxy e use o IP de saída do servidor da
HostGator.

## Cache e falhas

- Cache no servidor: 10 minutos.
- `Cache-Control` do navegador: 5 minutos.
- Se a API falhar e existir cache antigo, o proxy devolve o cache com
  `stale: true`; se não existir, retorna erro 502 e o site mostra o fallback.
- A chave antiga que ficou exposta no HTML deve ser desativada de qualquer forma.

## Teste rápido

```bash
curl -s 'https://1ipim.online/api/youtube.php?limit=1' | jq .
curl -s 'https://staging.1ipim.online/api/youtube.php?limit=1' | jq .
```
