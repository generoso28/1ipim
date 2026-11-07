<?php
/**
 * Plugin Name: 1IPIM Livraria
 * Description: Catálogo de livros com estoque, capas e API pública.
 * Version: 0.1.0
 * Author: 1IPIM Dev
 *
 * Must-use plugin. A gestão usa o vínculo do ministério Livraria (tipo=livraria).
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/1ipim-rbac.php';

define('IPIM_LIVRARIA_VERSION', '0.1.0');

function ipim_livraria_table(string $name): string
{
    global $wpdb;
    return $wpdb->prefix . '1ipim_' . $name;
}

function ipim_livraria_install(): void
{
    if (get_option('ipim_livraria_version') === IPIM_LIVRARIA_VERSION) {
        return;
    }

    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset = $wpdb->get_charset_collate();
    $livros = ipim_livraria_table('livros');
    $movimentacoes = ipim_livraria_table('livro_movimentacoes');

    dbDelta("CREATE TABLE {$livros} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        legacy_code varchar(64) NULL,
        slug varchar(190) NOT NULL,
        titulo varchar(255) NOT NULL,
        subtitulo varchar(255) NULL,
        autor varchar(255) NULL,
        editora varchar(190) NULL,
        categoria varchar(190) NULL,
        isbn varchar(32) NULL,
        sinopse longtext NULL,
        capa_url varchar(500) NULL,
        capa_attachment_id bigint(20) unsigned NULL,
        preco_dinheiro decimal(10,2) NULL,
        preco_cartao decimal(10,2) NULL,
        preco_capa decimal(10,2) NULL,
        estoque int NOT NULL DEFAULT 0,
        estoque_minimo int NOT NULL DEFAULT 0,
        ativo tinyint(1) NOT NULL DEFAULT 1,
        destaque tinyint(1) NOT NULL DEFAULT 0,
        created_by bigint(20) unsigned NOT NULL DEFAULT 0,
        updated_by bigint(20) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY slug (slug),
        UNIQUE KEY legacy_code (legacy_code),
        KEY categoria (categoria),
        KEY ativo_destaque (ativo,destaque),
        KEY titulo (titulo)
    ) {$charset};");

    dbDelta("CREATE TABLE {$movimentacoes} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        livro_id bigint(20) unsigned NOT NULL,
        tipo enum('entrada','saida','ajuste') NOT NULL,
        quantidade int NOT NULL,
        motivo varchar(255) NULL,
        referencia varchar(190) NULL,
        user_id bigint(20) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY livro_data (livro_id,created_at),
        KEY user_data (user_id,created_at)
    ) {$charset};");

    update_option('ipim_livraria_version', IPIM_LIVRARIA_VERSION);
}

add_action('init', 'ipim_livraria_install', 20);

/* -------------------------------------------------------------------------
 * Permissões
 * ---------------------------------------------------------------------- */

function ipim_livraria_can_manage(): bool
{
    if (!is_user_logged_in()) {
        return false;
    }

    if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
        return true;
    }

    $ministry_id = ipim_rbac_ensure_livraria();
    return $ministry_id > 0 && ipim_rbac_can_view_ministry(get_current_user_id(), $ministry_id);
}

function ipim_livraria_can_delete(): bool
{
    if (!is_user_logged_in()) {
        return false;
    }

    if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
        return true;
    }

    $ministry_id = ipim_rbac_ensure_livraria();
    return $ministry_id > 0 && ipim_rbac_can_manage_ministry(get_current_user_id(), $ministry_id);
}

/* -------------------------------------------------------------------------
 * Normalização
 * ---------------------------------------------------------------------- */

function ipim_livraria_parse_money($value): ?float
{
    if ($value === null || $value === '') {
        return null;
    }
    if (is_int($value) || is_float($value)) {
        return round((float) $value, 2);
    }

    $text = preg_replace('/[^\d,.\-]/', '', (string) $value);
    if ($text === '' || $text === '-') {
        return null;
    }

    if (strpos($text, ',') !== false) {
        $text = str_replace('.', '', $text);
        $text = str_replace(',', '.', $text);
    }

    return is_numeric($text) ? round((float) $text, 2) : null;
}

function ipim_livraria_clean_url(string $url): string
{
    $url = trim($url);
    if ($url === '') {
        return '';
    }
    if (strpos($url, '/') === 0) {
        return esc_url_raw($url);
    }

    return esc_url_raw($url);
}

function ipim_livraria_is_local_cover(string $url): bool
{
    if ($url === '') {
        return false;
    }
    if (strpos($url, '/') === 0) {
        return true;
    }

    $host = wp_parse_url($url, PHP_URL_HOST);
    if (!$host) {
        return true;
    }

    $home = wp_parse_url(home_url(), PHP_URL_HOST);
    return $host === $home;
}

function ipim_livraria_unique_slug(string $slug, int $exclude_id = 0): string
{
    global $wpdb;
    $table = ipim_livraria_table('livros');
    $base = sanitize_title($slug);
    if ($base === '') {
        $base = 'livro';
    }

    $candidate = $base;
    $counter = 2;
    while (true) {
        $id = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table} WHERE slug = %s AND id <> %d LIMIT 1",
            $candidate,
            $exclude_id
        ));
        if ($id === 0) {
            return $candidate;
        }
        $candidate = $base . '-' . $counter;
        $counter++;
    }
}

/* -------------------------------------------------------------------------
 * Payloads
 * ---------------------------------------------------------------------- */

/** @return array<string,mixed> */
function ipim_livraria_public_payload(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'slug' => (string) $row['slug'],
        'titulo' => (string) $row['titulo'],
        'subtitulo' => (string) ($row['subtitulo'] ?? ''),
        'autor' => (string) ($row['autor'] ?? ''),
        'editora' => (string) ($row['editora'] ?? ''),
        'categoria' => (string) ($row['categoria'] ?? ''),
        'isbn' => (string) ($row['isbn'] ?? ''),
        'sinopse' => (string) ($row['sinopse'] ?? ''),
        'capa' => (string) ($row['capa_url'] ?? ''),
        'preco_dinheiro' => $row['preco_dinheiro'] === null ? null : (float) $row['preco_dinheiro'],
        'preco_cartao' => $row['preco_cartao'] === null ? null : (float) $row['preco_cartao'],
        'preco_capa' => $row['preco_capa'] === null ? null : (float) $row['preco_capa'],
    ];
}

/** @return array<string,mixed> */
function ipim_livraria_admin_payload(array $row): array
{
    return array_merge(ipim_livraria_public_payload($row), [
        'legacy_code' => (string) ($row['legacy_code'] ?? ''),
        'estoque' => (int) $row['estoque'],
        'estoque_minimo' => (int) $row['estoque_minimo'],
        'ativo' => (bool) $row['ativo'],
        'destaque' => (bool) $row['destaque'],
        'capa_attachment_id' => (int) ($row['capa_attachment_id'] ?? 0),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'updated_at' => (string) ($row['updated_at'] ?? ''),
    ]);
}

function ipim_livraria_get(int $id): ?array
{
    global $wpdb;
    $table = ipim_livraria_table('livros');
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $id), ARRAY_A);

    return is_array($row) ? $row : null;
}

function ipim_livraria_get_by_slug(string $slug): ?array
{
    global $wpdb;
    $table = ipim_livraria_table('livros');
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE slug = %s AND ativo = 1", $slug), ARRAY_A);

    return is_array($row) ? $row : null;
}

/* -------------------------------------------------------------------------
 * Capas
 * ---------------------------------------------------------------------- */

/**
 * Baixa uma capa externa para a biblioteca de mídia.
 *
 * @return array{url:string,attachment_id:int}|null
 */
function ipim_livraria_sideload_cover(string $url, string $title): ?array
{
    if ($url === '' || ipim_livraria_is_local_cover($url)) {
        return null;
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $url = str_replace('http://', 'https://', $url);
    $attachment_id = media_sideload_image($url, 0, $title, 'id');
    if (is_wp_error($attachment_id)) {
        return null;
    }

    update_post_meta((int) $attachment_id, '_wp_attachment_image_alt', sanitize_text_field($title));

    return [
        'url' => (string) wp_get_attachment_url((int) $attachment_id),
        'attachment_id' => (int) $attachment_id,
    ];
}

/**
 * Salva um upload de capa em $_FILES['capa'].
 *
 * @return array{url:string,attachment_id:int}|null
 */
function ipim_livraria_upload_cover(int $book_id, string $title): ?array
{
    if (empty($_FILES['capa']) || !is_array($_FILES['capa'])) {
        return null;
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $overrides = ['test_form' => false];
    $upload = wp_handle_upload($_FILES['capa'], $overrides);
    if (!is_array($upload) || isset($upload['error'])) {
        return null;
    }

    $attachment = [
        'post_mime_type' => $upload['type'],
        'post_title' => sanitize_text_field($title),
        'post_content' => '',
        'post_status' => 'inherit',
    ];
    $attachment_id = wp_insert_attachment($attachment, $upload['file'], $book_id);
    if (is_wp_error($attachment_id)) {
        return null;
    }

    require_once ABSPATH . 'wp-admin/includes/image.php';
    wp_update_attachment_metadata(
        (int) $attachment_id,
        wp_generate_attachment_metadata((int) $attachment_id, $upload['file'])
    );
    update_post_meta((int) $attachment_id, '_wp_attachment_image_alt', sanitize_text_field($title));

    return [
        'url' => (string) wp_get_attachment_url((int) $attachment_id),
        'attachment_id' => (int) $attachment_id,
    ];
}

/* -------------------------------------------------------------------------
 * CRUD
 * ---------------------------------------------------------------------- */

/**
 * @param array<string,mixed> $data
 * @return array<string,mixed>|WP_Error
 */
function ipim_livraria_save_book(array $data, int $id = 0)
{
    global $wpdb;
    $table = ipim_livraria_table('livros');
    $existing = $id > 0 ? ipim_livraria_get($id) : null;
    if ($id > 0 && !$existing) {
        return new WP_Error('ipim_livro_not_found', 'Livro não encontrado.', ['status' => 404]);
    }

    $titulo = sanitize_text_field((string) ($data['titulo'] ?? $existing['titulo'] ?? ''));
    if ($titulo === '') {
        return new WP_Error('ipim_livro_title', 'Informe o título do livro.', ['status' => 400]);
    }

    $slug_input = sanitize_title((string) ($data['slug'] ?? ''));
    $slug = ipim_livraria_unique_slug(
        $slug_input !== '' ? $slug_input : $titulo,
        $id
    );

    $capa_url = array_key_exists('capa_url', $data)
        ? ipim_livraria_clean_url((string) $data['capa_url'])
        : (string) ($existing['capa_url'] ?? '');
    $capa_attachment_id = (int) ($existing['capa_attachment_id'] ?? 0);

    $now = current_time('mysql');
    $row = [
        'slug' => $slug,
        'titulo' => $titulo,
        'subtitulo' => sanitize_text_field((string) ($data['subtitulo'] ?? $existing['subtitulo'] ?? '')),
        'autor' => sanitize_text_field((string) ($data['autor'] ?? $existing['autor'] ?? '')),
        'editora' => sanitize_text_field((string) ($data['editora'] ?? $existing['editora'] ?? '')),
        'categoria' => sanitize_text_field((string) ($data['categoria'] ?? $existing['categoria'] ?? '')),
        'isbn' => sanitize_text_field((string) ($data['isbn'] ?? $existing['isbn'] ?? '')),
        'sinopse' => wp_kses_post((string) ($data['sinopse'] ?? $existing['sinopse'] ?? '')),
        'capa_url' => $capa_url,
        'capa_attachment_id' => $capa_attachment_id,
        'preco_dinheiro' => ipim_livraria_parse_money($data['preco_dinheiro'] ?? $existing['preco_dinheiro'] ?? null),
        'preco_cartao' => ipim_livraria_parse_money($data['preco_cartao'] ?? $existing['preco_cartao'] ?? null),
        'preco_capa' => ipim_livraria_parse_money($data['preco_capa'] ?? $existing['preco_capa'] ?? null),
        'estoque' => max(0, (int) ($data['estoque'] ?? $existing['estoque'] ?? 0)),
        'estoque_minimo' => max(0, (int) ($data['estoque_minimo'] ?? $existing['estoque_minimo'] ?? 0)),
        'ativo' => array_key_exists('ativo', $data) ? (int) (bool) $data['ativo'] : (int) ($existing['ativo'] ?? 1),
        'destaque' => array_key_exists('destaque', $data) ? (int) (bool) $data['destaque'] : (int) ($existing['destaque'] ?? 0),
        'updated_by' => get_current_user_id(),
        'updated_at' => $now,
    ];

    if ($id > 0) {
        $wpdb->update($table, $row, ['id' => $id]);
        $book_id = $id;
        $action = 'livro_update';
    } else {
        $row['created_by'] = get_current_user_id();
        $row['created_at'] = $now;
        $wpdb->insert($table, $row);
        $book_id = (int) $wpdb->insert_id;
        $action = 'livro_create';
    }

    if ($book_id <= 0) {
        return new WP_Error('ipim_livro_save', 'Não foi possível salvar o livro.', ['status' => 500]);
    }

    if ($capa_url !== '' && !ipim_livraria_is_local_cover($capa_url)) {
        $downloaded = ipim_livraria_sideload_cover($capa_url, $titulo);
        if ($downloaded) {
            $wpdb->update(
                $table,
                [
                    'capa_url' => $downloaded['url'],
                    'capa_attachment_id' => $downloaded['attachment_id'],
                ],
                ['id' => $book_id],
                ['%s', '%d'],
                ['%d']
            );
        }
    }

    $saved = ipim_livraria_get($book_id);
    ipim_rbac_audit(get_current_user_id(), $action, 'livro', $book_id, $existing, $saved);

    return ipim_livraria_admin_payload($saved ?: []);
}

function ipim_livraria_delete_book(int $id): bool
{
    global $wpdb;
    $table = ipim_livraria_table('livros');
    $existing = ipim_livraria_get($id);
    if (!$existing) {
        return false;
    }

    $wpdb->delete($table, ['id' => $id], ['%d']);
    ipim_rbac_audit(get_current_user_id(), 'livro_delete', 'livro', $id, $existing, null);

    return true;
}

/**
 * Movimentação de estoque preparada para a próxima etapa.
 */
function ipim_livraria_move_stock(int $book_id, string $type, int $quantity, string $reason = '', string $reference = ''): ?array
{
    global $wpdb;
    $book = ipim_livraria_get($book_id);
    if (!$book) {
        return null;
    }

    $type = in_array($type, ['entrada', 'saida', 'ajuste'], true) ? $type : 'ajuste';
    $quantity = max(0, $quantity);
    $before = (int) $book['estoque'];

    if ($type === 'entrada') {
        $after = $before + $quantity;
    } elseif ($type === 'saida') {
        $after = max(0, $before - $quantity);
    } else {
        $after = $quantity;
    }

    $table = ipim_livraria_table('livros');
    $wpdb->update(
        $table,
        ['estoque' => $after, 'updated_by' => get_current_user_id(), 'updated_at' => current_time('mysql')],
        ['id' => $book_id],
        ['%d', '%d', '%s'],
        ['%d']
    );

    $movements = ipim_livraria_table('livro_movimentacoes');
    $wpdb->insert($movements, [
        'livro_id' => $book_id,
        'tipo' => $type,
        'quantidade' => $quantity,
        'motivo' => sanitize_text_field($reason),
        'referencia' => sanitize_text_field($reference),
        'user_id' => get_current_user_id(),
        'created_at' => current_time('mysql'),
    ], ['%d', '%s', '%d', '%s', '%s', '%d', '%s']);

    ipim_rbac_audit(get_current_user_id(), 'livro_stock', 'livro', $book_id, ['estoque' => $before], [
        'estoque' => $after,
        'tipo' => $type,
        'quantidade' => $quantity,
        'motivo' => $reason,
        'referencia' => $reference,
    ]);

    if ($after <= (int) $book['estoque_minimo'] && function_exists('ipim_notify')) {
        $message = 'O livro "' . $book['titulo'] . '" está com estoque ' . $after . '.';
        $ministry_id = ipim_rbac_ensure_livraria();
        if ($ministry_id > 0 && function_exists('ipim_notify_ministry_leaders')) {
            ipim_notify_ministry_leaders($ministry_id, 'low_stock', 'Estoque baixo na Livraria', $message, '/portal/livraria');
        }
        ipim_notify_admins('low_stock', 'Estoque baixo na Livraria', $message, '/portal/livraria');
    }

    return ['estoque' => $after];
}

/* -------------------------------------------------------------------------
 * Consulta
 * ---------------------------------------------------------------------- */

/**
 * @param array<string,mixed> $args
 * @return array{items:array<int,array<string,mixed>>,total:int,page:int,per_page:int,pages:int,categorias:string[]}
 */
function ipim_livraria_query(array $args): array
{
    global $wpdb;
    $table = ipim_livraria_table('livros');

    $page = max(1, (int) ($args['page'] ?? 1));
    $per_page = min(100, max(1, (int) ($args['per_page'] ?? 24)));
    $offset = ($page - 1) * $per_page;

    $where = [];
    $params = [];

    if (empty($args['include_inactive'])) {
        $where[] = 'ativo = 1';
    }
    if (!empty($args['categoria'])) {
        $where[] = 'categoria = %s';
        $params[] = sanitize_text_field((string) $args['categoria']);
    }
    if (isset($args['destaque']) && $args['destaque'] !== '') {
        $where[] = 'destaque = %d';
        $params[] = (int) (bool) $args['destaque'];
    }
    if (!empty($args['low_stock'])) {
        $where[] = 'estoque <= estoque_minimo';
    }
    if (!empty($args['sem_capa'])) {
        $where[] = "(capa_url IS NULL OR capa_url = '')";
    }
    if (!empty($args['q'])) {
        $like = '%' . $wpdb->esc_like(sanitize_text_field((string) $args['q'])) . '%';
        $where[] = '(titulo LIKE %s OR autor LIKE %s OR editora LIKE %s OR categoria LIKE %s OR sinopse LIKE %s)';
        array_push($params, $like, $like, $like, $like, $like);
    }

    $where_sql = $where === [] ? '1=1' : implode(' AND ', $where);
    $total_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where_sql}";
    $total = (int) ($params === []
        ? $wpdb->get_var($total_sql)
        : $wpdb->get_var($wpdb->prepare($total_sql, $params)));

    $list_sql = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY destaque DESC, titulo ASC LIMIT %d OFFSET %d";
    $list_params = array_merge($params, [$per_page, $offset]);
    $rows = $wpdb->get_results($wpdb->prepare($list_sql, $list_params), ARRAY_A);
    $payload = !empty($args['admin']) ? 'ipim_livraria_admin_payload' : 'ipim_livraria_public_payload';

    $categories = $wpdb->get_col(
        "SELECT DISTINCT categoria FROM {$table} WHERE ativo = 1 AND categoria <> '' ORDER BY categoria ASC"
    );

    $stats = null;
    if (!empty($args['admin'])) {
        $stats = [
            'total' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}"),
            'ativos' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE ativo = 1"),
            'com_capa' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE capa_url <> ''"),
            'estoque' => (int) $wpdb->get_var("SELECT COALESCE(SUM(estoque),0) FROM {$table}"),
            'low_stock' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE estoque <= estoque_minimo AND ativo = 1"),
        ];
    }

    return [
        'items' => is_array($rows) ? array_map($payload, $rows) : [],
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page,
        'pages' => $per_page > 0 ? (int) ceil($total / $per_page) : 0,
        'categorias' => array_values(array_map('strval', $categories ?: [])),
        'stats' => $stats,
    ];
}

/* -------------------------------------------------------------------------
 * Busca de capas
 * ---------------------------------------------------------------------- */

/**
 * @return array<int,array<string,string>>
 */
function ipim_livraria_normalize_text(string $text): string
{
    $text = remove_accents($text);
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9 ]+/', ' ', $text);

    return trim(preg_replace('/\s+/', ' ', (string) $text));
}

function ipim_livraria_cover_search(string $query, string $author = ''): array
{
    $query = trim($query);
    $author = trim($author);
    if ($query === '') {
        return [];
    }

    $api_key = (string) get_option('1ipim_google_books_api_key', '');
    $cache_key = 'ipim_livraria_cover_' . md5(strtolower($query . '|' . $author . '|' . $api_key));
    $cached = get_transient($cache_key);
    if (is_array($cached)) {
        return $cached;
    }

    $results = [];
    $seen = [];

    $google_query = 'intitle:' . $query;
    if ($author !== '') {
        $google_query .= ' inauthor:' . $author;
    }
    $google_url = 'https://www.googleapis.com/books/v1/volumes?q=' . rawurlencode($google_query) . '&maxResults=8&langRestrict=pt';
    if ($api_key !== '') {
        $google_url .= '&key=' . rawurlencode($api_key);
    }
    $google = wp_remote_get($google_url, ['timeout' => 8, 'headers' => ['Accept' => 'application/json']]);
    if (!is_wp_error($google) && wp_remote_retrieve_response_code($google) === 200) {
        $body = json_decode(wp_remote_retrieve_body($google), true);
        foreach (($body['items'] ?? []) as $item) {
            $info = $item['volumeInfo'] ?? [];
            $image = $info['imageLinks']['thumbnail'] ?? ($info['imageLinks']['smallThumbnail'] ?? '');
            if ($image === '') {
                continue;
            }
            $image = str_replace('http://', 'https://', $image);
            $title = (string) ($info['title'] ?? '');
            $key = strtolower($title) . '|' . $image;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $results[] = [
                'titulo' => $title,
                'autores' => implode(', ', array_map('strval', $info['authors'] ?? [])),
                'editora' => (string) ($info['publisher'] ?? ''),
                'ano' => (string) ($info['publishedDate'] ?? ''),
                'capa' => $image,
                'fonte' => 'Google Books',
            ];
        }
    }

    $open_query = trim($query . ' ' . $author);
    $open_url = 'https://openlibrary.org/search.json?q=' . rawurlencode($open_query) . '&limit=10&fields=title,author_name,cover_i,first_publish_year,publisher';
    $open = wp_remote_get($open_url, ['timeout' => 8, 'headers' => ['Accept' => 'application/json']]);
    if (!is_wp_error($open) && wp_remote_retrieve_response_code($open) === 200) {
        $body = json_decode(wp_remote_retrieve_body($open), true);
        $normalizedQuery = ipim_livraria_normalize_text($query);
        $normalizedAuthor = ipim_livraria_normalize_text($author);
        foreach (($body['docs'] ?? []) as $doc) {
            $cover_id = (int) ($doc['cover_i'] ?? 0);
            if ($cover_id <= 0) {
                continue;
            }
            $image = 'https://covers.openlibrary.org/b/id/' . $cover_id . '-L.jpg';
            $title = (string) ($doc['title'] ?? '');
            $normalizedTitle = ipim_livraria_normalize_text($title);
            similar_text($normalizedQuery, $normalizedTitle, $percent);
            if ($percent < 60) {
                continue;
            }
            if ($normalizedAuthor !== '') {
                $docAuthors = ipim_livraria_normalize_text(implode(' ', array_map('strval', $doc['author_name'] ?? [])));
                if ($docAuthors !== '') {
                    similar_text($normalizedAuthor, $docAuthors, $authorPercent);
                    if ($authorPercent < 45) {
                        continue;
                    }
                }
            }
            $key = strtolower($title) . '|' . $image;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $results[] = [
                'titulo' => $title,
                'autores' => implode(', ', array_map('strval', array_slice($doc['author_name'] ?? [], 0, 3))),
                'editora' => implode(', ', array_map('strval', array_slice($doc['publisher'] ?? [], 0, 2))),
                'ano' => (string) ($doc['first_publish_year'] ?? ''),
                'capa' => $image,
                'fonte' => 'Open Library',
            ];
        }
    }

    $results = array_slice($results, 0, 16);
    set_transient($cache_key, $results, 6 * HOUR_IN_SECONDS);

    return $results;
}

/* -------------------------------------------------------------------------
 * REST
 * ---------------------------------------------------------------------- */

add_action('rest_api_init', static function (): void {
    register_rest_route('1ipim/v1', '/livraria', [
        'methods' => 'GET',
        'callback' => static function (WP_REST_Request $request): array {
            return ipim_livraria_query([
                'q' => (string) $request->get_param('q'),
                'categoria' => (string) $request->get_param('categoria'),
                'destaque' => $request->get_param('destaque'),
                'page' => (int) $request->get_param('page'),
                'per_page' => (int) $request->get_param('per_page'),
            ]);
        },
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('1ipim/v1', '/livraria/(?P<slug>[a-z0-9-]+)', [
        'methods' => 'GET',
        'callback' => static function (WP_REST_Request $request) {
            $row = ipim_livraria_get_by_slug((string) $request['slug']);
            if (!$row) {
                return new WP_Error('ipim_livro_not_found', 'Livro não encontrado.', ['status' => 404]);
            }
            return ipim_livraria_public_payload($row);
        },
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('1ipim/v1', '/admin/livros', [
        [
            'methods' => 'GET',
            'callback' => static function (WP_REST_Request $request): array {
                return ipim_livraria_query([
                    'q' => (string) $request->get_param('q'),
                    'categoria' => (string) $request->get_param('categoria'),
                    'page' => (int) $request->get_param('page'),
                    'per_page' => (int) $request->get_param('per_page'),
                    'include_inactive' => true,
                    'admin' => true,
                    'low_stock' => (bool) $request->get_param('low_stock'),
                    'sem_capa' => (bool) $request->get_param('sem_capa'),
                ]);
            },
            'permission_callback' => 'ipim_livraria_can_manage',
        ],
        [
            'methods' => 'POST',
            'callback' => static function (WP_REST_Request $request) {
                return ipim_livraria_save_book((array) $request->get_json_params());
            },
            'permission_callback' => 'ipim_livraria_can_manage',
        ],
    ]);

    register_rest_route('1ipim/v1', '/admin/livros/(?P<id>\d+)', [
        [
            'methods' => 'GET',
            'callback' => static function (WP_REST_Request $request) {
                $row = ipim_livraria_get((int) $request['id']);
                if (!$row) {
                    return new WP_Error('ipim_livro_not_found', 'Livro não encontrado.', ['status' => 404]);
                }
                return ipim_livraria_admin_payload($row);
            },
            'permission_callback' => 'ipim_livraria_can_manage',
        ],
        [
            'methods' => 'POST,PUT,PATCH',
            'callback' => static function (WP_REST_Request $request) {
                return ipim_livraria_save_book((array) $request->get_json_params(), (int) $request['id']);
            },
            'permission_callback' => 'ipim_livraria_can_manage',
        ],
        [
            'methods' => 'DELETE',
            'callback' => static function (WP_REST_Request $request) {
                return ['deleted' => ipim_livraria_delete_book((int) $request['id'])];
            },
            'permission_callback' => 'ipim_livraria_can_delete',
        ],
    ]);

    register_rest_route('1ipim/v1', '/admin/livros/(?P<id>\d+)/capa', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $id = (int) $request['id'];
            $row = ipim_livraria_get($id);
            if (!$row) {
                return new WP_Error('ipim_livro_not_found', 'Livro não encontrado.', ['status' => 404]);
            }

            $cover = ipim_livraria_upload_cover($id, (string) $row['titulo']);
            if (!$cover) {
                $url = (string) $request->get_param('url');
                if ($url === '') {
                    return new WP_Error('ipim_cover_missing', 'Envie uma imagem ou informe uma URL.', ['status' => 400]);
                }
                $cover = ipim_livraria_sideload_cover($url, (string) $row['titulo']);
            }
            if (!$cover) {
                return new WP_Error('ipim_cover_failed', 'Não foi possível salvar a capa.', ['status' => 500]);
            }

            global $wpdb;
            $wpdb->update(
                ipim_livraria_table('livros'),
                ['capa_url' => $cover['url'], 'capa_attachment_id' => $cover['attachment_id'], 'updated_at' => current_time('mysql')],
                ['id' => $id],
                ['%s', '%d', '%s'],
                ['%d']
            );
            ipim_rbac_audit(get_current_user_id(), 'livro_cover', 'livro', $id, null, $cover);

            return $cover;
        },
        'permission_callback' => 'ipim_livraria_can_manage',
    ]);

    register_rest_route('1ipim/v1', '/admin/livros/(?P<id>\d+)/movimentacoes', [
        'methods' => 'GET',
        'callback' => static function (WP_REST_Request $request): array {
            global $wpdb;
            $id = (int) $request['id'];
            $table = ipim_livraria_table('livro_movimentacoes');
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT id,tipo,quantidade,motivo,referencia,user_id,created_at
                 FROM {$table} WHERE livro_id = %d ORDER BY id DESC LIMIT 30",
                $id
            ), ARRAY_A);

            return ['items' => $rows ?: []];
        },
        'permission_callback' => 'ipim_livraria_can_manage',
    ]);

    register_rest_route('1ipim/v1', '/admin/livros/(?P<id>\d+)/movimentacoes', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $result = ipim_livraria_move_stock(
                (int) $request['id'],
                (string) $request->get_param('tipo'),
                (int) $request->get_param('quantidade'),
                (string) $request->get_param('motivo'),
                (string) $request->get_param('referencia')
            );
            if ($result === null) {
                return new WP_Error('ipim_livro_not_found', 'Livro não encontrado.', ['status' => 404]);
            }
            return $result;
        },
        'permission_callback' => 'ipim_livraria_can_delete',
    ]);

    register_rest_route('1ipim/v1', '/admin/livros/capas', [
        'methods' => 'GET',
        'callback' => static function (WP_REST_Request $request): array {
            return ipim_livraria_cover_search(
                (string) $request->get_param('q'),
                (string) $request->get_param('author')
            );
        },
        'permission_callback' => 'ipim_livraria_can_manage',
    ]);
});

/* -------------------------------------------------------------------------
 * Importação e administração
 * ---------------------------------------------------------------------- */

/**
 * @return array{inserted:int,updated:int,skipped:int,file:string}|WP_Error
 */
function ipim_livraria_import_file()
{
    $file = dirname(ABSPATH) . '/data/livraria-import.json';
    if (!is_file($file)) {
        return new WP_Error('ipim_import_missing', 'Arquivo de importação não encontrado em /data/livraria-import.json.', ['status' => 404]);
    }

    $json = file_get_contents($file);
    $items = is_string($json) ? json_decode($json, true) : null;
    if (!is_array($items)) {
        return new WP_Error('ipim_import_invalid', 'JSON de importação inválido.', ['status' => 400]);
    }

    global $wpdb;
    $table = ipim_livraria_table('livros');
    $counts = ['inserted' => 0, 'updated' => 0, 'skipped' => 0, 'file' => $file];

    foreach ($items as $item) {
        if (!is_array($item)) {
            $counts['skipped']++;
            continue;
        }
        $title = sanitize_text_field((string) ($item['title'] ?? ''));
        if ($title === '') {
            $counts['skipped']++;
            continue;
        }

        $legacy = sanitize_text_field((string) ($item['code'] ?? ''));
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table} WHERE " . ($legacy !== '' ? 'legacy_code = %s' : 'slug = %s') . " LIMIT 1",
            $legacy !== '' ? $legacy : sanitize_title($title)
        ), ARRAY_A);

        $now = current_time('mysql');
        $cover = ipim_livraria_clean_url((string) ($item['cover'] ?? ''));
        $stock = isset($item['stockLegacy']) && $item['stockLegacy'] !== '' ? max(0, (int) $item['stockLegacy']) : null;

        if ($existing) {
            $update = [
                'titulo' => $title,
                'autor' => sanitize_text_field((string) ($item['author'] ?? '')),
                'editora' => sanitize_text_field((string) ($item['publisher'] ?? '')),
                'categoria' => sanitize_text_field((string) ($item['category'] ?? '')),
                'preco_dinheiro' => ipim_livraria_parse_money($item['priceCash'] ?? null),
                'preco_cartao' => ipim_livraria_parse_money($item['priceCard'] ?? null),
                'preco_capa' => ipim_livraria_parse_money($item['coverPrice'] ?? null),
                'updated_at' => $now,
                'updated_by' => get_current_user_id(),
            ];
            if ($cover !== '') {
                $update['capa_url'] = $cover;
            }
            if ($stock !== null) {
                $update['estoque'] = $stock;
            }
            if ($legacy !== '') {
                $update['legacy_code'] = $legacy;
            }
            $wpdb->update($table, $update, ['id' => (int) $existing['id']]);
            $counts['updated']++;
            continue;
        }

        $slug = ipim_livraria_unique_slug($title);
        $wpdb->insert($table, [
            'legacy_code' => $legacy !== '' ? $legacy : null,
            'slug' => $slug,
            'titulo' => $title,
            'autor' => sanitize_text_field((string) ($item['author'] ?? '')),
            'editora' => sanitize_text_field((string) ($item['publisher'] ?? '')),
            'categoria' => sanitize_text_field((string) ($item['category'] ?? '')),
            'capa_url' => $cover,
            'preco_dinheiro' => ipim_livraria_parse_money($item['priceCash'] ?? null),
            'preco_cartao' => ipim_livraria_parse_money($item['priceCard'] ?? null),
            'preco_capa' => ipim_livraria_parse_money($item['coverPrice'] ?? null),
            'estoque' => $stock ?? 0,
            'estoque_minimo' => 0,
            'ativo' => 1,
            'destaque' => 0,
            'created_by' => get_current_user_id(),
            'updated_by' => get_current_user_id(),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $counts['inserted']++;
    }

    update_option('ipim_livraria_last_import', array_merge($counts, ['at' => current_time('mysql')]));
    ipim_rbac_audit(get_current_user_id(), 'livro_import', 'system', 0, null, $counts);

    return $counts;
}

function ipim_livraria_admin_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }

    if (isset($_POST['ipim_google_books_key']) && check_admin_referer('ipim_google_books_key')) {
        update_option('1ipim_google_books_api_key', sanitize_text_field(wp_unslash((string) $_POST['ipim_google_books_api_key'])));
        echo '<div class="notice notice-success"><p>Chave do Google Books atualizada.</p></div>';
    }

    if (isset($_POST['ipim_livraria_import']) && check_admin_referer('ipim_livraria_import')) {
        $result = ipim_livraria_import_file();
        if (is_wp_error($result)) {
            echo '<div class="notice notice-error"><p>' . esc_html($result->get_error_message()) . '</p></div>';
        } else {
            echo '<div class="notice notice-success"><p>Importação concluída: ' .
                esc_html(wp_json_encode($result, JSON_UNESCAPED_UNICODE)) . '</p></div>';
        }
    }

    global $wpdb;
    $table = ipim_livraria_table('livros');
    $total = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
    $active = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE ativo = 1");
    $cover = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE capa_url <> ''");
    $stock = (int) $wpdb->get_var("SELECT COALESCE(SUM(estoque),0) FROM {$table}");
    $last = get_option('ipim_livraria_last_import');
    ?>
    <div class="wrap">
        <h1>1IPIM Livraria</h1>
        <p>Catálogo em tabela própria, com estoque e movimentações preparadas.</p>
        <table class="widefat striped" style="max-width:720px">
            <tbody>
                <tr><td>Livros cadastrados</td><td><strong><?php echo esc_html((string) $total); ?></strong></td></tr>
                <tr><td>Ativos</td><td><strong><?php echo esc_html((string) $active); ?></strong></td></tr>
                <tr><td>Com capa</td><td><strong><?php echo esc_html((string) $cover); ?></strong></td></tr>
                <tr><td>Estoque total</td><td><strong><?php echo esc_html((string) $stock); ?></strong></td></tr>
            </tbody>
        </table>
        <h2>Google Books</h2>
        <p>Sem chave, a API pública tem cota diária compartilhada e pode retornar 429. O Open Library continua como fallback.</p>
        <form method="post">
            <?php wp_nonce_field('ipim_google_books_key'); ?>
            <p>
                <input type="text" name="ipim_google_books_api_key" value="<?php echo esc_attr((string) get_option('1ipim_google_books_api_key', '')); ?>" class="regular-text" placeholder="AIza...">
                <button type="submit" name="ipim_google_books_key" class="button">Salvar chave</button>
            </p>
        </form>
        <h2>Importar catálogo</h2>
        <p>Lê <code>/data/livraria-import.json</code> e atualiza pelo código legado. Campos editados no portal são preservados.</p>
        <form method="post">
            <?php wp_nonce_field('ipim_livraria_import'); ?>
            <p><button type="submit" name="ipim_livraria_import" class="button button-primary">Importar/atualizar 169 livros</button></p>
        </form>
        <?php if (is_array($last)) : ?>
            <h2>Última importação</h2>
            <pre><?php echo esc_html(wp_json_encode($last, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)); ?></pre>
        <?php endif; ?>
        <h2>API</h2>
        <p>Pública: <code>/wp-json/1ipim/v1/livraria</code>. Gestão: <code>/wp-json/1ipim/v1/admin/livros</code>.</p>
    </div>
    <?php
}

add_action('admin_menu', static function (): void {
    add_management_page('1IPIM Livraria', '1IPIM Livraria', 'manage_options', '1ipim-livraria', 'ipim_livraria_admin_page');
});
