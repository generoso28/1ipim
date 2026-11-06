# Livraria — catálogo, gestão e API

**Status:** implementado em 06/11/2026.

A Livraria é um **ministério** (`tipo=livraria`) com líderes e colaboradores
próprios. Não existe papel global de livraria: o vínculo ativo no ministério
(ou admin/pastor) libera a gestão.

## Modelo de dados

Tabela `{prefix}1ipim_livros`:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | bigint | PK |
| `legacy_code` | varchar(64) | código da planilha/Notion; único |
| `slug` | varchar(190) | único, usado na URL pública |
| `titulo`, `subtitulo` | varchar | obrigatório / opcional |
| `autor`, `editora`, `categoria`, `isbn` | varchar | catálogo editorial |
| `sinopse` | longtext | HTML sanitizado com `wp_kses_post` |
| `capa_url` | varchar(500) | asset local ou mídia do WordPress |
| `capa_attachment_id` | bigint | vínculo com a biblioteca de mídia |
| `preco_dinheiro`, `preco_cartao`, `preco_capa` | decimal(10,2) | valores em reais |
| `estoque`, `estoque_minimo` | int | **nunca expostos no endpoint público** |
| `ativo`, `destaque` | tinyint | catálogo público / ordenação |
| `created_by`, `updated_by`, `created_at`, `updated_at` | — | auditoria |

Tabela `{prefix}1ipim_livro_movimentacoes` (preparada):

- `livro_id`, `tipo` (`entrada`, `saida`, `ajuste`), `quantidade`, `motivo`,
  `referencia`, `user_id`, `created_at`.
- A função `ipim_livraria_move_stock()` já atualiza o saldo e grava a
  movimentação com auditoria. A interface de movimentações fica para a próxima
  etapa; a estrutura já está pronta.

## Permissões

| Ação | Admin/pastor | Líder Livraria | Colaborador Livraria | Outros |
|---|---|---|---|---|
| Ver catálogo público | ✅ | ✅ | ✅ | ✅ |
| Ver estoque/gestão | ✅ | ✅ | ✅ | — |
| Criar/editar livro | ✅ | ✅ | ✅ | — |
| Excluir livro | ✅ | ✅ | — | — |
| Movimentar estoque | ✅ | ✅ | — | — |
| Importar catálogo | ✅ (WP Admin) | — | — | — |

## API

Pública (sem login):

- `GET /wp-json/1ipim/v1/livraria?q=&categoria=&page=&per_page=`
  - devolve `items`, `total`, `pages`, `categorias`;
  - **não devolve estoque**;
- `GET /wp-json/1ipim/v1/livraria/{slug}`.

Gestão (cookie + nonce, vínculo Livraria ou admin):

- `GET /wp-json/1ipim/v1/admin/livros?q=&categoria=&page=&per_page=`
- `GET /wp-json/1ipim/v1/admin/livros/{id}`
- `POST /wp-json/1ipim/v1/admin/livros`
- `POST|PUT|PATCH /wp-json/1ipim/v1/admin/livros/{id}`
- `DELETE /wp-json/1ipim/v1/admin/livros/{id}`
- `POST /wp-json/1ipim/v1/admin/livros/{id}/capa` (multipart `capa` ou JSON `url`)
- `POST /wp-json/1ipim/v1/admin/livros/{id}/movimentacoes`
- `GET /wp-json/1ipim/v1/admin/livros/capas?q=`

## Capas

1. O formulário consulta o Google Books; se a quota estiver esgotada, usa o
   Open Library.
2. A imagem escolhida é baixada para a biblioteca de mídia do WordPress
   (`media_sideload_image`) e o livro guarda a URL local + attachment ID.
3. Também é possível enviar um arquivo de imagem diretamente.
4. Livros sem capa usam `/assets/img/livraria/placeholder.svg`.

> O Google Books sem chave tem quota diária compartilhada. O fallback Open
> Library mantém a busca funcional; uma chave pode ser adicionada depois.

## Importação

- Arquivo: `/data/livraria-import.json` (169 livros).
- Botão em **WP Admin → Ferramentas → 1IPIM Livraria**.
- Idempotente: usa `legacy_code` (ou `slug`) para atualizar sem duplicar.
- Preserva campos editados no portal (sinopse, ISBN, destaque, capa nova) e
  só atualiza os campos vindos da planilha.
