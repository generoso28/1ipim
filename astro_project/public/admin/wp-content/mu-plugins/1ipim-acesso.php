<?php
/**
 * Plugin Name: 1IPIM Acesso ao Portal
 * Description: Restringe o Portal à equipe e gerencia solicitações de acesso.
 * Version: 0.1.0
 * Author: 1IPIM Dev
 *
 * Must-use plugin. Contas do Berea (sem vínculo de equipe) não acessam o
 * Portal: veem a tela de solicitação. A aprovação delega um vínculo de
 * ministério (colaborador ou líder) conforme o escopo do aprovador.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/1ipim-rbac.php';
require_once __DIR__ . '/1ipim-relatorios.php';

define('IPIM_ACESSO_VERSION', '0.1.0');

function ipim_acesso_table(string $name): string
{
    global $wpdb;
    return $wpdb->prefix . '1ipim_' . $name;
}

function ipim_acesso_install(): void
{
    if (get_option('ipim_acesso_version') === IPIM_ACESSO_VERSION) {
        return;
    }

    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset = $wpdb->get_charset_collate();
    $table = ipim_acesso_table('access_requests');

    dbDelta("CREATE TABLE {$table} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        ministry_id bigint(20) unsigned NOT NULL,
        requested_role enum('colaborador','lider') NOT NULL DEFAULT 'colaborador',
        motivo text NULL,
        status enum('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
        reviewed_by bigint(20) unsigned NOT NULL DEFAULT 0,
        reviewed_at datetime NULL,
        review_note text NULL,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY user_status (user_id,status),
        KEY ministry_status (ministry_id,status),
        KEY status (status)
    ) {$charset};");

    update_option('ipim_acesso_version', IPIM_ACESSO_VERSION);
    ipim_rbac_audit(0, 'acesso_install', 'system', 0, null, ['version' => IPIM_ACESSO_VERSION]);
}
add_action('init', 'ipim_acesso_install', 24);

// --------------------------------------------------------------------------
// Permissões
// --------------------------------------------------------------------------

/**
 * O usuário pertence à equipe (admin/pastor, papel de equipe ou vínculo ativo)?
 */
function ipim_acesso_user_has_team(int $user_id = 0): bool
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0) {
        return false;
    }

    if (user_can($user_id, 'manage_options') || user_can($user_id, 'view_all_ministries')) {
        return true;
    }

    $user = get_userdata($user_id);
    if ($user instanceof WP_User) {
        $team_roles = ['lider_ministerio', 'colaborador_ministerio', 'editor', 'pastor'];
        if (array_intersect($team_roles, (array) $user->roles) !== []) {
            return true;
        }
    }

    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$table} WHERE user_id=%d AND status='active' LIMIT 1",
        $user_id
    ));
}

/**
 * Pode aprovar solicitações? Admin/pastor ou líder de ministério.
 * Líder de PG (apenas vínculo em 1ipim_grupo_lideres) NÃO aprova.
 */
function ipim_acesso_can_approve(int $user_id = 0): bool
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0) {
        return false;
    }

    if (user_can($user_id, 'manage_options') || user_can($user_id, 'view_all_ministries')) {
        return true;
    }

    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$table} WHERE user_id=%d AND role='lider' AND status='active' LIMIT 1",
        $user_id
    ));
}

/**
 * Ministérios que o usuário pode aprovar. null = todos (admin/pastor).
 *
 * @return int[]|null
 */
function ipim_acesso_approval_ministries(int $user_id = 0): ?array
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0) {
        return [];
    }

    if (user_can($user_id, 'manage_options') || user_can($user_id, 'view_all_ministries')) {
        return null;
    }

    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    $ids = $wpdb->get_col($wpdb->prepare(
        "SELECT ministry_id FROM {$table} WHERE user_id=%d AND role='lider' AND status='active'",
        $user_id
    ));

    return array_values(array_unique(array_map('intval', $ids ?: [])));
}

function ipim_acesso_rest_logged_in(): bool
{
    return is_user_logged_in();
}

function ipim_acesso_rest_approver(): bool
{
    return is_user_logged_in() && ipim_acesso_can_approve();
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * @return array<int,array{id:int,nome:string}>
 */
function ipim_acesso_ministries(): array
{
    $posts = get_posts([
        'post_type' => 'ministerio',
        'post_status' => ['publish', 'draft', 'pending', 'private'],
        'numberposts' => -1,
        'orderby' => 'title',
        'order' => 'ASC',
    ]);

    return array_map(static fn (WP_Post $post): array => [
        'id' => (int) $post->ID,
        'nome' => (string) $post->post_title,
    ], $posts);
}

/**
 * @return array<string,mixed>|null
 */
function ipim_acesso_request_fields(object $row): array
{
    $user = get_userdata((int) $row->user_id);

    return [
        'id' => (int) $row->id,
        'user_id' => (int) $row->user_id,
        'user_name' => $user instanceof WP_User ? (string) $user->display_name : 'Usuário #' . (int) $row->user_id,
        'user_email' => $user instanceof WP_User ? (string) $user->user_email : '',
        'ministry_id' => (int) $row->ministry_id,
        'ministry_name' => get_the_title((int) $row->ministry_id) ?: 'Ministério #' . (int) $row->ministry_id,
        'requested_role' => (string) $row->requested_role,
        'motivo' => (string) $row->motivo,
        'status' => (string) $row->status,
        'reviewed_by' => (int) $row->reviewed_by,
        'reviewed_at' => $row->reviewed_at === null ? null : (string) $row->reviewed_at,
        'review_note' => (string) $row->review_note,
        'created_at' => (string) $row->created_at,
        'updated_at' => (string) $row->updated_at,
    ];
}

/**
 * @return array<string,mixed>|null
 */
function ipim_acesso_latest_request(int $user_id): ?array
{
    global $wpdb;
    $table = ipim_acesso_table('access_requests');
    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table} WHERE user_id=%d ORDER BY id DESC LIMIT 1",
        $user_id
    ));

    return $row ? ipim_acesso_request_fields($row) : null;
}

function ipim_acesso_notify_approvers(int $ministry_id, int $requester_id, string $requester_name): void
{
    if (!function_exists('ipim_notify')) {
        return;
    }

    $targets = [];
    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    $leaders = $wpdb->get_col($wpdb->prepare(
        "SELECT user_id FROM {$table} WHERE ministry_id=%d AND role='lider' AND status='active'",
        $ministry_id
    ));
    foreach ($leaders ?: [] as $leader_id) {
        $targets[] = (int) $leader_id;
    }

    foreach (get_users(['role__in' => ['administrator', 'pastor'], 'fields' => 'ID']) as $admin_id) {
        $targets[] = (int) $admin_id;
    }

    $targets = array_values(array_unique(array_filter($targets, static fn (int $id): bool => $id > 0 && $id !== $requester_id)));

    foreach ($targets as $target_id) {
        ipim_notify(
            $target_id,
            'portal_access_request',
            'Nova solicitação de acesso ao Portal',
            $requester_name . ' solicitou acesso ao Portal para o ministério ' . get_the_title($ministry_id) . '.',
            '/portal/solicitacoes'
        );
    }
}

// --------------------------------------------------------------------------
// REST: minha situação
// --------------------------------------------------------------------------

function ipim_acesso_rest_me(WP_REST_Request $request): WP_REST_Response
{
    $user_id = get_current_user_id();

    return rest_ensure_response([
        'has_access' => ipim_acesso_user_has_team($user_id),
        'can_approve' => ipim_acesso_can_approve($user_id),
        'is_global' => user_can($user_id, 'manage_options') || user_can($user_id, 'view_all_ministries'),
        'request' => ipim_acesso_latest_request($user_id),
        'ministries' => ipim_acesso_ministries(),
    ]);
}

function ipim_acesso_rest_request(WP_REST_Request $request): WP_REST_Response
{
    $user_id = get_current_user_id();
    if (ipim_acesso_user_has_team($user_id)) {
        return new WP_REST_Response(['error' => 'already_team'], 400);
    }

    $ministry_id = (int) $request->get_param('ministry_id');
    if ($ministry_id <= 0 || get_post_type($ministry_id) !== 'ministerio') {
        return new WP_REST_Response(['error' => 'invalid_ministry'], 400);
    }

    $motivo = sanitize_textarea_field((string) $request->get_param('motivo'));
    if ($motivo === '') {
        return new WP_REST_Response(['error' => 'missing_motivo'], 400);
    }

    global $wpdb;
    $table = ipim_acesso_table('access_requests');
    $now = current_time('mysql');

    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table} WHERE user_id=%d AND status='pendente' ORDER BY id DESC LIMIT 1",
        $user_id
    ));

    if ($existing) {
        $wpdb->update(
            $table,
            [
                'ministry_id' => $ministry_id,
                'requested_role' => 'colaborador',
                'motivo' => $motivo,
                'updated_at' => $now,
            ],
            ['id' => (int) $existing->id],
            ['%d', '%s', '%s', '%s'],
            ['%d']
        );
        $id = (int) $existing->id;
    } else {
        $wpdb->insert($table, [
            'user_id' => $user_id,
            'ministry_id' => $ministry_id,
            'requested_role' => 'colaborador',
            'motivo' => $motivo,
            'status' => 'pendente',
            'reviewed_by' => 0,
            'reviewed_at' => null,
            'review_note' => '',
            'created_at' => $now,
            'updated_at' => $now,
        ], ['%d', '%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s', '%s']);
        $id = (int) $wpdb->insert_id;
    }

    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id));
    $fields = $row ? ipim_acesso_request_fields($row) : null;

    ipim_rbac_audit($user_id, 'access_request_create', 'access_request', $id, null, $fields);
    $user = wp_get_current_user();
    ipim_acesso_notify_approvers($ministry_id, $user_id, (string) $user->display_name);

    return rest_ensure_response($fields);
}

// --------------------------------------------------------------------------
// REST: fila de aprovação
// --------------------------------------------------------------------------

function ipim_acesso_rest_list(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $table = ipim_acesso_table('access_requests');

    $status = sanitize_key((string) $request->get_param('status'));
    if (!in_array($status, ['pendente', 'aprovado', 'recusado'], true)) {
        $status = 'pendente';
    }

    $allowed = ipim_acesso_approval_ministries();
    $where = ['status = %s'];
    $params = [$status];

    if ($allowed !== null) {
        if ($allowed === []) {
            return rest_ensure_response([]);
        }
        $ph = implode(',', array_fill(0, count($allowed), '%d'));
        $where[] = "ministry_id IN ({$ph})";
        $params = array_merge($params, $allowed);
    }

    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$table} WHERE " . implode(' AND ', $where) . ' ORDER BY id DESC LIMIT 200',
        $params
    ));

    return rest_ensure_response(array_map('ipim_acesso_request_fields', $rows ?: []));
}

function ipim_acesso_review(WP_REST_Request $request, string $decision): WP_REST_Response
{
    global $wpdb;
    $table = ipim_acesso_table('access_requests');
    $id = (int) $request->get_param('id');

    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id));
    if (!$row) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if ((string) $row->status !== 'pendente') {
        return new WP_REST_Response(['error' => 'already_reviewed'], 400);
    }

    $ministry_id = (int) $row->ministry_id;
    $allowed = ipim_acesso_approval_ministries();
    if ($allowed !== null && !in_array($ministry_id, $allowed, true)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $role = sanitize_key((string) $request->get_param('role'));
    $role = $role === 'lider' ? 'lider' : 'colaborador';

    $isGlobal = user_can(get_current_user_id(), 'manage_options') || user_can(get_current_user_id(), 'view_all_ministries');
    if (!$isGlobal && $role !== 'colaborador') {
        return new WP_REST_Response(['error' => 'role_forbidden'], 403);
    }

    $now = current_time('mysql');
    $note = sanitize_textarea_field((string) $request->get_param('note'));

    if ($decision === 'reject') {
        $wpdb->update($table, [
            'status' => 'recusado',
            'reviewed_by' => get_current_user_id(),
            'reviewed_at' => $now,
            'review_note' => $note,
            'updated_at' => $now,
        ], ['id' => $id], ['%s', '%d', '%s', '%s', '%s'], ['%d']);

        ipim_rbac_audit(get_current_user_id(), 'access_request_reject', 'access_request', $id, null, [
            'user_id' => (int) $row->user_id,
            'ministry_id' => $ministry_id,
            'note' => $note,
        ]);
        if (function_exists('ipim_notify')) {
            ipim_notify(
                (int) $row->user_id,
                'portal_access_rejected',
                'Solicitação de acesso recusada',
                'Sua solicitação de acesso ao Portal foi recusada.' . ($note !== '' ? ' Motivo: ' . $note : ''),
                '/portal/solicitar-acesso'
            );
        }

        $updated = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id));
        return rest_ensure_response($updated ? ipim_acesso_request_fields($updated) : null);
    }

    $user_id = (int) $row->user_id;
    $user = get_userdata($user_id);
    if (!$user instanceof WP_User) {
        return new WP_REST_Response(['error' => 'user_not_found'], 404);
    }

    // Vínculo ativo no ministério.
    $memberships = ipim_rbac_table('ministry_memberships');
    $wpdb->query($wpdb->prepare(
        "INSERT INTO {$memberships} (user_id, ministry_id, role, status, created_at, updated_at)
         VALUES (%d, %d, %s, 'active', %s, %s)
         ON DUPLICATE KEY UPDATE role = VALUES(role), status = 'active', updated_at = VALUES(updated_at)",
        $user_id,
        $ministry_id,
        $role,
        $now,
        $now
    ));

    // Meta usada pelo portal legado.
    $raw = get_user_meta($user_id, 'ministries_approved', true);
    $approved = is_string($raw) ? json_decode($raw, true) : $raw;
    $approved = is_array($approved) ? array_values(array_unique(array_map('intval', $approved))) : [];
    if (!in_array($ministry_id, $approved, true)) {
        $approved[] = $ministry_id;
    }
    update_user_meta($user_id, 'ministries_approved', wp_json_encode($approved));

    // Papel WordPress correspondente.
    $wp_role = $role === 'lider' ? 'lider_ministerio' : 'colaborador_ministerio';
    if (!in_array($wp_role, (array) $user->roles, true)) {
        $user->add_role($wp_role);
    }

    $wpdb->update($table, [
        'status' => 'aprovado',
        'requested_role' => $role,
        'reviewed_by' => get_current_user_id(),
        'reviewed_at' => $now,
        'review_note' => $note,
        'updated_at' => $now,
    ], ['id' => $id], ['%s', '%s', '%d', '%s', '%s', '%s'], ['%d']);

    ipim_rbac_audit(get_current_user_id(), 'access_request_approve', 'access_request', $id, null, [
        'user_id' => $user_id,
        'ministry_id' => $ministry_id,
        'role' => $role,
    ]);

    if (function_exists('ipim_notify')) {
        ipim_notify(
            $user_id,
            'portal_access_approved',
            'Acesso ao Portal aprovado',
            'Seu acesso ao Portal foi aprovado para o ministério ' . get_the_title($ministry_id) . '.',
            '/portal'
        );
    }

    $updated = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id));
    return rest_ensure_response($updated ? ipim_acesso_request_fields($updated) : null);
}

function ipim_acesso_rest_approve(WP_REST_Request $request): WP_REST_Response
{
    return ipim_acesso_review($request, 'approve');
}

function ipim_acesso_rest_reject(WP_REST_Request $request): WP_REST_Response
{
    return ipim_acesso_review($request, 'reject');
}

// --------------------------------------------------------------------------
// Rotas
// --------------------------------------------------------------------------

add_action('rest_api_init', static function (): void {
    register_rest_route('1ipim/v1', '/me/portal-access', [
        [
            'methods' => 'GET',
            'callback' => 'ipim_acesso_rest_me',
            'permission_callback' => 'ipim_acesso_rest_logged_in',
        ],
        [
            'methods' => 'POST',
            'callback' => 'ipim_acesso_rest_request',
            'permission_callback' => 'ipim_acesso_rest_logged_in',
        ],
    ]);

    register_rest_route('1ipim/v1', '/admin/access-requests', [
        'methods' => 'GET',
        'callback' => 'ipim_acesso_rest_list',
        'permission_callback' => 'ipim_acesso_rest_approver',
    ]);

    register_rest_route('1ipim/v1', '/admin/access-requests/(?P<id>\d+)/approve', [
        'methods' => 'POST',
        'callback' => 'ipim_acesso_rest_approve',
        'permission_callback' => 'ipim_acesso_rest_approver',
    ]);

    register_rest_route('1ipim/v1', '/admin/access-requests/(?P<id>\d+)/reject', [
        'methods' => 'POST',
        'callback' => 'ipim_acesso_rest_reject',
        'permission_callback' => 'ipim_acesso_rest_approver',
    ]);
});
