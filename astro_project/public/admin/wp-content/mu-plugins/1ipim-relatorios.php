<?php
/**
 * Plugin Name: 1IPIM Relatórios
 * Description: Relatórios de PGs, escalas, voluntários e estoque, com escopo por líder.
 * Version: 0.1.0
 * Author: 1IPIM Dev
 *
 * Must-use plugin. O escopo é calculado no servidor: admin/pastor veem tudo;
 * líder de ministério vê o próprio ministério; líder de PG vê os próprios grupos.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/1ipim-rbac.php';

define('IPIM_RELATORIOS_VERSION', '0.1.0');

/**
 * Escopo do usuário para relatórios e auditoria.
 *
 * @return array{global:bool,ministries:int[],groups:int[]}
 */
function ipim_relatorios_scope(int $user_id = 0): array
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0) {
        return ['global' => false, 'ministries' => [], 'groups' => []];
    }

    if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
        return ['global' => true, 'ministries' => [], 'groups' => []];
    }

    global $wpdb;
    $memberships = ipim_rbac_table('ministry_memberships');
    $ministries = $wpdb->get_col($wpdb->prepare(
        "SELECT ministry_id FROM {$memberships} WHERE user_id=%d AND role='lider' AND status='active'",
        $user_id
    ));

    $groups = [];
    $groups_table = $wpdb->prefix . '1ipim_grupos';
    $leaders_table = $wpdb->prefix . '1ipim_grupo_lideres';
    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $groups_table))) {
        $groups = $wpdb->get_col($wpdb->prepare(
            "SELECT grupo_id FROM {$leaders_table} WHERE user_id=%d",
            $user_id
        ));
    }

    return [
        'global' => false,
        'ministries' => array_values(array_unique(array_map('intval', $ministries ?: []))),
        'groups' => array_values(array_unique(array_map('intval', $groups ?: []))),
    ];
}

function ipim_relatorios_has_scope(): bool
{
    $scope = ipim_relatorios_scope();
    return $scope['global'] || $scope['ministries'] !== [] || $scope['groups'] !== [];
}

function ipim_relatorios_rest_access(): bool
{
    return is_user_logged_in() && ipim_relatorios_has_scope();
}

/**
 * IDs de ministérios no escopo. Global devolve null (todos).
 *
 * @param array{global:bool,ministries:int[],groups:int[]} $scope
 * @return int[]|null
 */
function ipim_relatorios_ministry_ids(array $scope): ?array
{
    return $scope['global'] ? null : $scope['ministries'];
}

/**
 * IDs de grupos no escopo. Global ou líder do ministério de PGs devolve null.
 *
 * @param array{global:bool,ministries:int[],groups:int[]} $scope
 * @return int[]|null
 */
function ipim_relatorios_group_ids(array $scope): ?array
{
    if ($scope['global']) {
        return null;
    }

    if (function_exists('ipim_grupos_ensure_ministry')) {
        $pg_ministry = ipim_grupos_ensure_ministry();
        if ($pg_ministry > 0 && in_array($pg_ministry, $scope['ministries'], true)) {
            return null;
        }
    }

    return $scope['groups'];
}

function ipim_relatorios_ministry_name(int $ministry_id): string
{
    if ($ministry_id <= 0) {
        return '—';
    }
    $title = get_the_title($ministry_id);
    return $title ? (string) $title : 'Ministério #' . $ministry_id;
}

/**
 * Condição SQL de auditoria limitada ao escopo do usuário.
 *
 * @return array{0:string,1:array<int,mixed>}
 */
function ipim_relatorios_audit_where(int $user_id = 0): array
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    $scope = ipim_relatorios_scope($user_id);
    if ($scope['global']) {
        return ['1=1', []];
    }

    global $wpdb;
    $memberships = ipim_rbac_table('ministry_memberships');
    $groups_table = $wpdb->prefix . '1ipim_grupos';
    $encontros_table = $wpdb->prefix . '1ipim_grupo_encontros';

    $conditions = ['actor_id = %d'];
    $params = [$user_id];

    $ministries = $scope['ministries'];
    if ($ministries !== []) {
        $ph = implode(',', array_fill(0, count($ministries), '%d'));
        $conditions[] = "(target_type='ministerio' AND target_id IN ({$ph}))";
        $params = array_merge($params, $ministries);

        $conditions[] = "(target_type='escala' AND target_id IN (
            SELECT post_id FROM {$wpdb->postmeta}
            WHERE meta_key='ministerio_id' AND CAST(meta_value AS UNSIGNED) IN ({$ph})
        ))";
        $params = array_merge($params, $ministries);

        $conditions[] = "(target_type='user' AND target_id IN (
            SELECT user_id FROM {$memberships}
            WHERE status='active' AND ministry_id IN ({$ph})
        ))";
        $params = array_merge($params, $ministries);

        $livraria_id = function_exists('ipim_rbac_ensure_livraria') ? ipim_rbac_ensure_livraria() : 0;
        if ($livraria_id > 0 && in_array($livraria_id, $ministries, true)) {
            $conditions[] = "target_type='livro'";
        }

        $programacao_id = function_exists('ipim_programacao_ensure_ministry') ? ipim_programacao_ensure_ministry() : 0;
        if ($programacao_id > 0 && in_array($programacao_id, $ministries, true)) {
            $conditions[] = "target_type='programacao'";
        }
    }

    $groups = $scope['groups'];
    if ($groups !== []) {
        $ph = implode(',', array_fill(0, count($groups), '%d'));
        $conditions[] = "(target_type='grupo' AND target_id IN ({$ph}))";
        $params = array_merge($params, $groups);

        $conditions[] = "(target_type='grupo_encontro' AND target_id IN (
            SELECT id FROM {$encontros_table} WHERE grupo_id IN ({$ph})
        ))";
        $params = array_merge($params, $groups);
    }

    return ['(' . implode(' OR ', $conditions) . ')', $params];
}

// --------------------------------------------------------------------------
// Helpers de CSV
// --------------------------------------------------------------------------

function ipim_relatorios_csv(array $headers, array $rows): string
{
    $out = fopen('php://temp', 'r+');
    if ($out === false) {
        return '';
    }

    fputcsv($out, $headers, ';');
    foreach ($rows as $row) {
        fputcsv($out, array_map(static fn ($value): string => (string) $value, $row), ';');
    }

    rewind($out);
    $csv = stream_get_contents($out);
    fclose($out);

    return "\xEF\xBB\xBF" . (string) $csv;
}

/**
 * @param array<int,array<int,string|int|float>> $rows
 * @param array<string,mixed> $json
 */
function ipim_relatorios_respond(
    WP_REST_Request $request,
    string $filename,
    array $headers,
    array $rows,
    array $json
) {
    $format = sanitize_key((string) $request->get_param('format'));
    if ($format !== 'csv') {
        return rest_ensure_response($json);
    }

    $response = new WP_REST_Response(ipim_relatorios_csv($headers, $rows));
    $response->header('Content-Type', 'text/csv; charset=utf-8');
    $response->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    $response->header('Cache-Control', 'no-store, private');

    return $response;
}

function ipim_relatorios_date_range(WP_REST_Request $request): array
{
    $de = sanitize_text_field((string) $request->get_param('de'));
    $ate = sanitize_text_field((string) $request->get_param('ate'));

    $valid = static fn (string $value): bool => (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $value);

    return [$valid($de) ? $de : '', $valid($ate) ? $ate : ''];
}

// --------------------------------------------------------------------------
// Opções para filtros
// --------------------------------------------------------------------------

function ipim_relatorios_rest_options(): WP_REST_Response
{
    global $wpdb;
    $scope = ipim_relatorios_scope();

    $group_ids = ipim_relatorios_group_ids($scope);
    $groups_table = $wpdb->prefix . '1ipim_grupos';
    if ($group_ids === null) {
        $groups = $wpdb->get_results("SELECT id, nome FROM {$groups_table} WHERE status='ativo' ORDER BY nome", ARRAY_A);
    } elseif ($group_ids === []) {
        $groups = [];
    } else {
        $ph = implode(',', array_fill(0, count($group_ids), '%d'));
        $groups = $wpdb->get_results($wpdb->prepare(
            "SELECT id, nome FROM {$groups_table} WHERE status='ativo' AND id IN ({$ph}) ORDER BY nome",
            $group_ids
        ), ARRAY_A);
    }

    $ministry_ids = ipim_relatorios_ministry_ids($scope);
    $posts = get_posts([
        'post_type' => 'ministerio',
        'post_status' => 'any',
        'numberposts' => -1,
        'orderby' => 'title',
        'order' => 'ASC',
    ]);
    $ministries = [];
    foreach ($posts as $post) {
        if ($ministry_ids !== null && !in_array((int) $post->ID, $ministry_ids, true)) {
            continue;
        }
        $ministries[] = ['id' => (int) $post->ID, 'nome' => (string) $post->post_title];
    }

    return rest_ensure_response([
        'grupos' => array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'nome' => (string) $row['nome'],
        ], $groups ?: []),
        'ministerios' => $ministries,
        'escopo' => [
            'global' => $scope['global'],
            'ministérios' => count($scope['ministries']),
            'grupos' => count($scope['groups']),
        ],
    ]);
}

// --------------------------------------------------------------------------
// Relatório: frequência de PG
// --------------------------------------------------------------------------

function ipim_relatorios_rest_frequencia(WP_REST_Request $request)
{
    global $wpdb;
    $scope = ipim_relatorios_scope();
    $allowed_groups = ipim_relatorios_group_ids($scope);

    $grupo_id = (int) $request->get_param('grupo_id');
    $group_ids = $allowed_groups;
    if ($grupo_id > 0) {
        if ($allowed_groups !== null && !in_array($grupo_id, $allowed_groups, true)) {
            return new WP_REST_Response(['error' => 'forbidden'], 403);
        }
        $group_ids = [$grupo_id];
    }
    if ($group_ids === []) {
        return ipim_relatorios_respond(
            $request,
            'frequencia-pg.csv',
            ['Grupo', 'Data', 'Tema', 'Preletor', 'Público', 'Presentes'],
            [],
            ['grupos' => [], 'encontros' => []]
        );
    }

    [$de, $ate] = ipim_relatorios_date_range($request);

    $grupos_table = $wpdb->prefix . '1ipim_grupos';
    $encontros = $wpdb->prefix . '1ipim_grupo_encontros';
    $presenca = $wpdb->prefix . '1ipim_grupo_encontro_presenca';

    $where = ['1=1'];
    $params = [];
    if ($group_ids !== null) {
        $ph = implode(',', array_fill(0, count($group_ids), '%d'));
        $where[] = "e.grupo_id IN ({$ph})";
        $params = array_merge($params, $group_ids);
    }
    if ($de !== '') {
        $where[] = 'e.data >= %s';
        $params[] = $de;
    }
    if ($ate !== '') {
        $where[] = 'e.data <= %s';
        $params[] = $ate;
    }

    $where_sql = implode(' AND ', $where);
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT e.id, e.grupo_id, e.data, e.tema, e.preletor, e.publico_presente,
                g.nome AS grupo,
                (SELECT GROUP_CONCAT(p.nome SEPARATOR ', ') FROM {$presenca} p WHERE p.encontro_id=e.id) AS presentes
         FROM {$encontros} e
         INNER JOIN {$grupos_table} g ON g.id=e.grupo_id
         WHERE {$where_sql}
         ORDER BY e.data DESC, g.nome ASC",
        $params
    ), ARRAY_A);

    $summary = [];
    foreach ($rows ?: [] as $row) {
        $gid = (int) $row['grupo_id'];
        if (!isset($summary[$gid])) {
            $summary[$gid] = [
                'grupo_id' => $gid,
                'grupo' => (string) $row['grupo'],
                'encontros' => 0,
                'total_presentes' => 0,
                'media' => 0,
                'ultimo_encontro' => (string) $row['data'],
            ];
        }
        $summary[$gid]['encontros']++;
        $summary[$gid]['total_presentes'] += (int) $row['publico_presente'];
        if ((string) $row['data'] > $summary[$gid]['ultimo_encontro']) {
            $summary[$gid]['ultimo_encontro'] = (string) $row['data'];
        }
    }
    foreach ($summary as $gid => $item) {
        $summary[$gid]['media'] = $item['encontros'] > 0
            ? round($item['total_presentes'] / $item['encontros'], 1)
            : 0;
    }

    $csv_rows = array_map(static fn (array $row): array => [
        (string) $row['grupo'],
        (string) $row['data'],
        (string) $row['tema'],
        (string) $row['preletor'],
        (int) $row['publico_presente'],
        (string) ($row['presentes'] ?? ''),
    ], $rows ?: []);

    return ipim_relatorios_respond(
        $request,
        'frequencia-pg.csv',
        ['Grupo', 'Data', 'Tema', 'Preletor', 'Público', 'Presentes'],
        $csv_rows,
        [
            'grupos' => array_values($summary),
            'encontros' => array_map(static fn (array $row): array => [
                'id' => (int) $row['id'],
                'grupo_id' => (int) $row['grupo_id'],
                'grupo' => (string) $row['grupo'],
                'data' => (string) $row['data'],
                'tema' => (string) $row['tema'],
                'preletor' => (string) $row['preletor'],
                'publico_presente' => (int) $row['publico_presente'],
                'presentes' => (string) ($row['presentes'] ?? ''),
            ], $rows ?: []),
        ]
    );
}

// --------------------------------------------------------------------------
// Relatório: escalas
// --------------------------------------------------------------------------

function ipim_relatorios_rest_escalas(WP_REST_Request $request)
{
    $scope = ipim_relatorios_scope();
    $allowed = ipim_relatorios_ministry_ids($scope);

    $ministry_id = (int) $request->get_param('ministerio_id');
    if ($ministry_id > 0 && $allowed !== null && !in_array($ministry_id, $allowed, true)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    [$de, $ate] = ipim_relatorios_date_range($request);

    $posts = get_posts([
        'post_type' => 'escala',
        'post_status' => 'publish',
        'numberposts' => -1,
        'orderby' => 'meta_value',
        'meta_key' => 'data_da_escala',
        'order' => 'DESC',
    ]);

    $rows = [];
    foreach ($posts as $post) {
        $ministerio = (int) get_post_meta($post->ID, 'ministerio_id', true);
        if ($allowed !== null && !in_array($ministerio, $allowed, true)) {
            continue;
        }
        if ($ministry_id > 0 && $ministerio !== $ministry_id) {
            continue;
        }

        $date = (string) get_post_meta($post->ID, 'data_da_escala', true);
        if ($de !== '' && $date < $de) {
            continue;
        }
        if ($ate !== '' && $date > $ate) {
            continue;
        }

        $rows[] = [
            'id' => (int) $post->ID,
            'data' => $date,
            'horario' => (string) get_post_meta($post->ID, 'horario', true),
            'ministerio_id' => $ministerio,
            'ministerio' => ipim_relatorios_ministry_name($ministerio),
            'titulo' => (string) $post->post_title,
            'equipe' => (string) get_post_meta($post->ID, 'equipe_nomes', true),
        ];
    }

    $csv_rows = array_map(static fn (array $row): array => [
        $row['data'],
        $row['horario'],
        $row['ministerio'],
        $row['titulo'],
        $row['equipe'],
    ], $rows);

    return ipim_relatorios_respond(
        $request,
        'escalas.csv',
        ['Data', 'Horário', 'Ministério', 'Escala', 'Equipe'],
        $csv_rows,
        ['items' => $rows, 'total' => count($rows)]
    );
}

// --------------------------------------------------------------------------
// Relatório: voluntários
// --------------------------------------------------------------------------

function ipim_relatorios_rest_voluntarios(WP_REST_Request $request)
{
    global $wpdb;
    $scope = ipim_relatorios_scope();
    $allowed = ipim_relatorios_ministry_ids($scope);

    $ministry_id = (int) $request->get_param('ministerio_id');
    if ($ministry_id > 0 && $allowed !== null && !in_array($ministry_id, $allowed, true)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }
    if ($allowed === []) {
        return ipim_relatorios_respond(
            $request,
            'voluntarios.csv',
            ['Nome', 'E-mail', 'Ministério', 'Papel', 'Status', 'Tipo de conta', 'E-mail verificado'],
            [],
            ['items' => [], 'total' => 0]
        );
    }

    $where = ["role <> ''"];
    $params = [];
    if ($allowed !== null) {
        $ph = implode(',', array_fill(0, count($allowed), '%d'));
        $where[] = "ministry_id IN ({$ph})";
        $params = array_merge($params, $allowed);
    }
    if ($ministry_id > 0) {
        $where[] = 'ministry_id = %d';
        $params[] = $ministry_id;
    }

    $table = ipim_rbac_table('ministry_memberships');
    $sql = "SELECT user_id, ministry_id, role, status FROM {$table} WHERE " . implode(' AND ', $where) . ' ORDER BY ministry_id, user_id';
    $rows_raw = $params
        ? $wpdb->get_results($wpdb->prepare($sql, $params), ARRAY_A)
        : $wpdb->get_results($sql, ARRAY_A);

    $rows = [];
    foreach ($rows_raw ?: [] as $row) {
        $user = get_userdata((int) $row['user_id']);
        if (!$user instanceof WP_User) {
            continue;
        }
        $rows[] = [
            'user_id' => (int) $user->ID,
            'nome' => (string) $user->display_name,
            'email' => (string) $user->user_email,
            'ministry_id' => (int) $row['ministry_id'],
            'ministerio' => ipim_relatorios_ministry_name((int) $row['ministry_id']),
            'papel' => (string) $row['role'],
            'status' => (string) $row['status'],
            'account_type' => (string) get_user_meta((int) $user->ID, 'account_type', true),
            'email_verified' => (string) get_user_meta((int) $user->ID, 'email_verified', true),
        ];
    }

    $csv_rows = array_map(static fn (array $row): array => [
        $row['nome'],
        $row['email'],
        $row['ministerio'],
        $row['papel'] === 'lider' ? 'Líder' : 'Colaborador',
        $row['status'],
        $row['account_type'],
        $row['email_verified'] === '1' ? 'Sim' : 'Não',
    ], $rows);

    return ipim_relatorios_respond(
        $request,
        'voluntarios.csv',
        ['Nome', 'E-mail', 'Ministério', 'Papel', 'Status', 'Tipo de conta', 'E-mail verificado'],
        $csv_rows,
        ['items' => $rows, 'total' => count($rows)]
    );
}

// --------------------------------------------------------------------------
// Relatório: estoque baixo
// --------------------------------------------------------------------------

function ipim_relatorios_rest_estoque(WP_REST_Request $request)
{
    global $wpdb;
    $scope = ipim_relatorios_scope();

    if (!$scope['global']) {
        $livraria_id = function_exists('ipim_rbac_ensure_livraria') ? ipim_rbac_ensure_livraria() : 0;
        if ($livraria_id <= 0 || !in_array($livraria_id, $scope['ministries'], true)) {
            return new WP_REST_Response(['error' => 'forbidden'], 403);
        }
    }

    $table = $wpdb->prefix . '1ipim_livros';
    $rows_raw = $wpdb->get_results(
        "SELECT id, titulo, autor, categoria, estoque, estoque_minimo
         FROM {$table}
         WHERE ativo=1 AND estoque <= estoque_minimo
         ORDER BY (estoque_minimo - estoque) DESC, titulo ASC",
        ARRAY_A
    );

    $rows = array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'titulo' => (string) $row['titulo'],
        'autor' => (string) $row['autor'],
        'categoria' => (string) $row['categoria'],
        'estoque' => (int) $row['estoque'],
        'estoque_minimo' => (int) $row['estoque_minimo'],
    ], $rows_raw ?: []);

    $csv_rows = array_map(static fn (array $row): array => [
        $row['titulo'],
        $row['autor'],
        $row['categoria'],
        $row['estoque'],
        $row['estoque_minimo'],
    ], $rows);

    return ipim_relatorios_respond(
        $request,
        'estoque-baixo.csv',
        ['Título', 'Autor', 'Categoria', 'Estoque', 'Mínimo'],
        $csv_rows,
        ['items' => $rows, 'total' => count($rows)]
    );
}

// --------------------------------------------------------------------------
// Rotas
// --------------------------------------------------------------------------

add_action('rest_api_init', static function (): void {
    register_rest_route('1ipim/v1', '/admin/relatorios/opcoes', [
        'methods' => 'GET',
        'callback' => 'ipim_relatorios_rest_options',
        'permission_callback' => 'ipim_relatorios_rest_access',
    ]);

    register_rest_route('1ipim/v1', '/admin/relatorios/frequencia', [
        'methods' => 'GET',
        'callback' => 'ipim_relatorios_rest_frequencia',
        'permission_callback' => 'ipim_relatorios_rest_access',
    ]);

    register_rest_route('1ipim/v1', '/admin/relatorios/escalas', [
        'methods' => 'GET',
        'callback' => 'ipim_relatorios_rest_escalas',
        'permission_callback' => 'ipim_relatorios_rest_access',
    ]);

    register_rest_route('1ipim/v1', '/admin/relatorios/voluntarios', [
        'methods' => 'GET',
        'callback' => 'ipim_relatorios_rest_voluntarios',
        'permission_callback' => 'ipim_relatorios_rest_access',
    ]);

    register_rest_route('1ipim/v1', '/admin/relatorios/estoque', [
        'methods' => 'GET',
        'callback' => 'ipim_relatorios_rest_estoque',
        'permission_callback' => 'ipim_relatorios_rest_access',
    ]);
});
