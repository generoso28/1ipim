<?php
/**
 * Plugin Name: 1IPIM RBAC REST
 * Description: Guards de escopo por ministério e endpoints do portal.
 * Version: 0.2.0
 * Author: 1IPIM Dev
 *
 * Carregado como must-use plugin. Depende de 1ipim-rbac.php.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/1ipim-rbac.php';
require_once __DIR__ . '/1ipim-relatorios.php';

/* -------------------------------------------------------------------------
 * Helpers de domínio
 * ---------------------------------------------------------------------- */

/**
 * Converte o conteúdo legado `<p>data|emails|hora|nomes|ministerio</p>`.
 *
 * @return array{date:string,emails:string,time:string,names:string,ministry_id:int}
 */
function ipim_schedule_parse(string $content): array
{
    $plain = trim(strip_tags($content));
    $parts = explode('|', $plain);

    return [
        'date' => trim($parts[0] ?? ''),
        'emails' => trim($parts[1] ?? ''),
        'time' => trim($parts[2] ?? ''),
        'names' => trim($parts[3] ?? ''),
        'ministry_id' => (int) ($parts[4] ?? 0),
    ];
}

/**
 * @return array{date:string,emails:string,time:string,names:string,ministry_id:int}
 */
function ipim_schedule_data(int $post_id): array
{
    $post = get_post($post_id);
    if (!$post || $post->post_type !== 'escala') {
        return ['date' => '', 'emails' => '', 'time' => '', 'names' => '', 'ministry_id' => 0];
    }

    $data = ipim_schedule_parse($post->post_content);
    if ($data['ministry_id'] <= 0) {
        $data['ministry_id'] = (int) get_post_meta($post_id, 'ministerio_id', true);
    }

    return $data;
}

/** @return string[] */
function ipim_emails(string $raw): array
{
    $items = array_map('trim', explode(',', $raw));
    $items = array_map('strtolower', $items);
    $items = array_filter($items, static fn (string $email): bool => $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL));

    return array_values(array_unique($items));
}

/** @return string[] */
function ipim_names(string $raw): array
{
    return array_values(array_filter(array_map('trim', explode(',', $raw)), static fn (string $name): bool => $name !== ''));
}

/** @return string[] */
function ipim_user_emails(int $user_id): array
{
    $user = get_userdata($user_id);
    if (!$user || !$user->user_email) {
        return [];
    }

    return [strtolower($user->user_email)];
}

/** @return int[] */
function ipim_user_ministry_ids(int $user_id): array
{
    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    $ids = $wpdb->get_col($wpdb->prepare(
        "SELECT ministry_id FROM {$table} WHERE user_id = %d AND status = 'active'",
        $user_id
    ));

    if ($ids === []) {
        $raw = get_user_meta($user_id, 'ministries_approved', true);
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        if (is_array($decoded)) {
            $ids = array_map('intval', $decoded);
        }
    }

    return array_values(array_unique(array_map('intval', $ids)));
}

function ipim_user_is_schedule_participant(int $user_id, int $post_id): bool
{
    $data = ipim_schedule_data($post_id);
    $emails = ipim_emails($data['emails']);

    return (bool) array_intersect(ipim_user_emails($user_id), $emails);
}

function ipim_can_view_schedule(int $user_id, int $post_id): bool
{
    if ($user_id <= 0) {
        return false;
    }

    if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
        return true;
    }

    $data = ipim_schedule_data($post_id);
    if ($data['ministry_id'] > 0) {
        // Isolamento por ministério: estar na equipe não dá acesso à agenda
        // de um ministério do qual a pessoa não participa.
        return ipim_rbac_can_view_ministry($user_id, $data['ministry_id']);
    }

    return ipim_user_is_schedule_participant($user_id, $post_id);
}

function ipim_can_manage_schedule(int $user_id, int $post_id): bool
{
    if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
        return true;
    }

    $data = ipim_schedule_data($post_id);
    if ($data['ministry_id'] <= 0) {
        return false;
    }

    return ipim_rbac_can_manage_ministry($user_id, $data['ministry_id']);
}

function ipim_schedule_meta(int $post_id): array
{
    $data = ipim_schedule_data($post_id);

    return [
        'data_da_escala' => $data['date'],
        'ministerio_id' => (string) $data['ministry_id'],
        'equipe_nomes' => $data['names'],
        'equipe_emails' => $data['emails'],
        'horario' => $data['time'],
    ];
}

/**
 * Verifica sobreposição de horário.
 *
 * @return array<int,array<string,mixed>>
 */
function ipim_schedule_conflicts(string $email, string $date, string $time, int $exclude_id = 0): array
{
    if ($date === '') {
        return [];
    }

    $email = strtolower(trim($email));
    if ($email === '') {
        return [];
    }

    $duration = max(15, (int) get_option('1ipim_default_schedule_minutes', 120));
    $start = $time !== '' ? strtotime($date . ' ' . $time) : strtotime($date . ' 00:00');
    $end = $time !== '' ? $start + ($duration * 60) : strtotime($date . ' 23:59');
    if ($start === false || $end === false) {
        return [];
    }

    $posts = get_posts([
        'post_type' => 'escala',
        'post_status' => 'publish',
        'numberposts' => -1,
        'fields' => 'ids',
    ]);

    $conflicts = [];
    foreach ($posts as $post_id) {
        if ((int) $post_id === $exclude_id) {
            continue;
        }

        $data = ipim_schedule_data((int) $post_id);
        if ($data['date'] !== $date) {
            continue;
        }
        if (!in_array($email, ipim_emails($data['emails']), true)) {
            continue;
        }

        $other_start = $data['time'] !== '' ? strtotime($date . ' ' . $data['time']) : strtotime($date . ' 00:00');
        $other_end = $data['time'] !== '' ? $other_start + ($duration * 60) : strtotime($date . ' 23:59');
        if ($other_start === false || $other_end === false) {
            continue;
        }

        if ($start < $other_end && $other_start < $end) {
            $ministry_id = (int) $data['ministry_id'];
            $conflicts[] = [
                'schedule_id' => (int) $post_id,
                'ministry_id' => $ministry_id,
                'ministry' => $ministry_id > 0 ? get_the_title($ministry_id) : 'Geral',
                'date' => $date,
                'start' => $data['time'] !== '' ? $data['time'] : '00:00',
                'end' => $data['time'] !== '' ? gmdate('H:i', $other_end) : '23:59',
            ];
        }
    }

    return $conflicts;
}

/**
 * Retorna os conflitos de uma lista de e-mails.
 *
 * @param string[] $emails
 * @return array<int,array<string,mixed>>
 */
function ipim_schedule_conflicts_for_emails(array $emails, string $date, string $time, int $exclude_id = 0): array
{
    $all = [];
    foreach ($emails as $email) {
        foreach (ipim_schedule_conflicts($email, $date, $time, $exclude_id) as $conflict) {
            $conflict['email'] = $email;
            $all[] = $conflict;
        }
    }

    return $all;
}

/**
 * Deduplica e-mails/nomes mantendo o alinhamento entre eles.
 *
 * @return array{names:string,emails:string}
 */
function ipim_schedule_normalize_participants(array $data): array
{
    $emails = ipim_emails((string) ($data['emails'] ?? ''));
    $names = ipim_names((string) ($data['names'] ?? ''));

    $uniqueNames = [];
    $seenNames = [];
    foreach ($names as $name) {
        $key = strtolower($name);
        if (!isset($seenNames[$key])) {
            $seenNames[$key] = true;
            $uniqueNames[] = $name;
        }
    }

    if (count($uniqueNames) === count($emails)) {
        return [
            'names' => implode(', ', $uniqueNames),
            'emails' => implode(', ', $emails),
        ];
    }

    return [
        'names' => implode(', ', $uniqueNames),
        'emails' => implode(', ', $emails),
    ];
}

/**
 * Corrige nomes/e-mails duplicados nas escalas existentes.
 *
 * @return array{changed:int,total:int}
 */
function ipim_schedule_cleanup_duplicates(): array
{
    $posts = get_posts([
        'post_type' => 'escala',
        'post_status' => 'any',
        'numberposts' => -1,
        'fields' => 'ids',
    ]);

    $changed = 0;
    foreach ($posts as $post_id) {
        $data = ipim_schedule_data((int) $post_id);
        $normalized = ipim_schedule_normalize_participants($data);
        if ($normalized['emails'] !== $data['emails'] || $normalized['names'] !== $data['names']) {
            $data['emails'] = $normalized['emails'];
            $data['names'] = $normalized['names'];
            ipim_schedule_write_content((int) $post_id, $data);
            $changed++;
        }
    }

    ipim_rbac_audit(get_current_user_id(), 'schedule_cleanup_duplicates', 'system', 0, null, [
        'changed' => $changed,
        'total' => count($posts),
    ]);

    return ['changed' => $changed, 'total' => count($posts)];
}

function ipim_schedule_write_content(int $post_id, array $data): void
{
    $normalized = ipim_schedule_normalize_participants($data);
    $data['emails'] = $normalized['emails'];
    $data['names'] = $normalized['names'];

    $content = sprintf(
        '<p>%s|%s|%s|%s|%s</p>',
        $data['date'],
        $data['emails'],
        $data['time'],
        $data['names'],
        $data['ministry_id'] > 0 ? (string) $data['ministry_id'] : ''
    );

    wp_update_post([
        'ID' => $post_id,
        'post_content' => $content,
    ]);

    update_post_meta($post_id, 'data_da_escala', $data['date']);
    update_post_meta($post_id, 'ministerio_id', (string) $data['ministry_id']);
    update_post_meta($post_id, 'equipe_nomes', $data['names']);
    update_post_meta($post_id, 'equipe_emails', $data['emails']);
    update_post_meta($post_id, 'horario', $data['time']);
}

/**
 * Remove um participante mantendo nomes e e-mails alinhados.
 *
 * @return array{names:string,emails:string}
 */
function ipim_schedule_remove_participant(array $data, string $email): array
{
    $emails = ipim_emails($data['emails']);
    $names = ipim_names($data['names']);
    $index = array_search(strtolower($email), $emails, true);

    if ($index === false) {
        return ['names' => $data['names'], 'emails' => $data['emails']];
    }

    array_splice($emails, $index, 1);
    if (isset($names[$index])) {
        array_splice($names, $index, 1);
    }

    return [
        'names' => implode(', ', $names),
        'emails' => implode(', ', $emails),
    ];
}

/** @return array<string,mixed> */
function ipim_user_summary(int $user_id): array
{
    $user = get_userdata($user_id);
    if (!$user) {
        return [];
    }

    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    $memberships = $wpdb->get_results($wpdb->prepare(
        "SELECT ministry_id, role, status FROM {$table} WHERE user_id = %d AND status = 'active' ORDER BY ministry_id",
        $user_id
    ), ARRAY_A);

    return [
        'id' => (int) $user->ID,
        'name' => $user->display_name,
        'email' => $user->user_email,
        'roles' => array_values((array) $user->roles),
        'account_type' => (string) get_user_meta($user->ID, '_ipim_account_type', true),
        'email_verified' => get_user_meta($user->ID, '_ipim_email_verified', true) === '1',
        'meta' => [
            'ministries_approved' => (string) get_user_meta($user->ID, 'ministries_approved', true),
            'ministries_requested' => (string) get_user_meta($user->ID, 'ministries_requested', true),
        ],
        'memberships' => array_map(static fn (array $row): array => [
            'ministry_id' => (int) $row['ministry_id'],
            'role' => (string) $row['role'],
            'status' => (string) $row['status'],
        ], $memberships ?: []),
    ];
}

/** @return array<string,mixed> */
function ipim_ministry_summary(int $ministry_id): array
{
    $post = get_post($ministry_id);
    if (!$post || $post->post_type !== 'ministerio') {
        return [];
    }

    $user_id = get_current_user_id();

    return [
        'id' => (int) $post->ID,
        'title' => ['rendered' => get_the_title($post)],
        'status' => $post->post_status,
        'tipo' => ipim_rbac_ministry_type($post->ID),
        'descricao' => (string) get_post_meta($post->ID, 'descricao', true),
        'arquivado' => $post->post_status !== 'publish',
        'can_view' => ipim_rbac_can_view_ministry($user_id, $post->ID),
        'can_manage' => ipim_rbac_can_manage_ministry($user_id, $post->ID),
    ];
}

function ipim_rest_forbidden(string $message = 'Acesso negado.'): WP_Error
{
    return new WP_Error('ipim_forbidden', $message, ['status' => 403]);
}

function ipim_rest_conflict(array $conflicts): WP_Error
{
    $first = $conflicts[0] ?? [];
    $message = isset($first['ministry'])
        ? sprintf('Conflito de escala em %s às %s (%s).', $first['date'], $first['start'], $first['ministry'])
        : 'Conflito de escala.';

    return new WP_Error('schedule_conflict', $message, [
        'status' => 409,
        'conflicts' => $conflicts,
        'can_override' => true,
    ]);
}

function ipim_rest_assign_membership(int $user_id, int $ministry_id, string $role): void
{
    $role = in_array($role, ['colaborador', 'lider'], true) ? $role : 'colaborador';
    $raw = get_user_meta($user_id, 'ministries_approved', true);
    $approved = is_string($raw) ? json_decode($raw, true) : $raw;
    $approved = is_array($approved) ? array_values(array_unique(array_map('intval', $approved))) : [];
    if (!in_array($ministry_id, $approved, true)) {
        $approved[] = $ministry_id;
    }
    update_user_meta($user_id, 'ministries_approved', wp_json_encode($approved));

    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    $wpdb->query($wpdb->prepare(
        "INSERT INTO {$table} (user_id, ministry_id, role, status, created_at, updated_at)
         VALUES (%d, %d, %s, 'active', %s, %s)
         ON DUPLICATE KEY UPDATE role = VALUES(role), status = 'active', updated_at = VALUES(updated_at)",
        $user_id,
        $ministry_id,
        $role,
        current_time('mysql'),
        current_time('mysql')
    ));
}

/* -------------------------------------------------------------------------
 * Endpoints REST do portal
 * ---------------------------------------------------------------------- */

add_action('rest_api_init', static function (): void {
    $login = static fn (): bool => is_user_logged_in();
    $manager = static fn (): bool => ipim_rbac_is_admin() || ipim_rbac_is_pastor();

    register_rest_route('1ipim/v1', '/me', [
        'methods' => 'GET',
        'callback' => static function (): array {
            $user = wp_get_current_user();

            return [
                'id' => (int) $user->ID,
                'name' => $user->display_name,
                'email' => $user->user_email,
                'roles' => array_values((array) $user->roles),
                'memberships' => ipim_user_summary((int) $user->ID)['memberships'] ?? [],
            ];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/dashboard', [
        'methods' => 'GET',
        'callback' => static function (): array {
            $user_id = get_current_user_id();
            $is_manager = ipim_rbac_is_admin() || ipim_rbac_is_pastor();

            $pending_users = 0;
            if ($is_manager) {
                foreach (get_users(['fields' => 'all']) as $user) {
                    $requested = json_decode((string) get_user_meta($user->ID, 'ministries_requested', true), true);
                    $approved = json_decode((string) get_user_meta($user->ID, 'ministries_approved', true), true);
                    $requested = is_array($requested) ? array_map('intval', $requested) : [];
                    $approved = is_array($approved) ? array_map('intval', $approved) : [];
                    if (count(array_diff($requested, $approved)) > 0) {
                        $pending_users++;
                    }
                }
            }

            $low_stock = 0;
            $livraria_id = function_exists('ipim_rbac_ensure_livraria') ? ipim_rbac_ensure_livraria() : 0;
            if ($is_manager || ($livraria_id > 0 && ipim_rbac_can_manage_ministry($user_id, $livraria_id))) {
                global $wpdb;
                $table = $wpdb->prefix . '1ipim_livros';
                if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) === $table) {
                    $low_stock = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE ativo = 1 AND estoque <= estoque_minimo");
                }
            }

            $unread = function_exists('ipim_notifications_unread_count')
                ? ipim_notifications_unread_count($user_id)
                : 0;

            $today = current_time('Y-m-d');
            $schedules = [];
            foreach (get_posts(['post_type' => 'escala', 'post_status' => 'publish', 'numberposts' => -1]) as $post) {
                $data = ipim_schedule_data($post->ID);
                if ($data['date'] < $today || !ipim_can_view_schedule($user_id, $post->ID)) {
                    continue;
                }
                $schedules[] = [
                    'id' => $post->ID,
                    'title' => get_the_title($post),
                    'date' => $data['date'],
                    'time' => $data['time'],
                    'ministry' => $data['ministry_id'] > 0 ? get_the_title($data['ministry_id']) : 'Geral',
                    'names' => $data['names'],
                ];
            }
            usort($schedules, static fn (array $a, array $b): int => strcmp($a['date'] . $a['time'], $b['date'] . $b['time']));

            return [
                'pending_users' => $pending_users,
                'low_stock' => $low_stock,
                'unread_notifications' => $unread,
                'next_schedules' => array_slice($schedules, 0, 3),
            ];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/me/password', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $user = wp_get_current_user();
            $current = (string) $request->get_param('current_password');
            $new = (string) $request->get_param('new_password');
            if (!wp_check_password($current, $user->user_pass, $user->ID)) {
                return new WP_Error('ipim_wrong_password', 'A senha atual está incorreta.', ['status' => 400]);
            }
            if (strlen($new) < 8) {
                return new WP_Error('ipim_weak_password', 'A nova senha deve ter pelo menos 8 caracteres.', ['status' => 400]);
            }
            wp_set_password($new, $user->ID);
            ipim_rbac_audit((int) $user->ID, 'password_change', 'user', (int) $user->ID, null, null);

            return ['success' => true, 'message' => 'Senha alterada. Faça login novamente.'];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/ministries', [
        [
            'methods' => 'GET',
            'callback' => static function (WP_REST_Request $request): array {
                $manage = (bool) $request->get_param('manage');
                if ($manage && !ipim_rbac_is_admin() && !ipim_rbac_is_pastor()) {
                    $ids = [];
                    global $wpdb;
                    $table = ipim_rbac_table('ministry_memberships');
                    $rows = $wpdb->get_results($wpdb->prepare(
                        "SELECT ministry_id FROM {$table} WHERE user_id = %d AND role = 'lider' AND status = 'active'",
                        get_current_user_id()
                    ));
                    foreach ($rows as $row) {
                        $ids[] = (int) $row->ministry_id;
                    }
                    $posts = $ids === [] ? [] : get_posts([
                        'post_type' => 'ministerio',
                        'post_status' => ['publish', 'draft'],
                        'numberposts' => -1,
                        'post__in' => $ids,
                        'orderby' => 'title',
                        'order' => 'ASC',
                    ]);
                } else {
                    $posts = get_posts([
                        'post_type' => 'ministerio',
                        'post_status' => $manage ? ['publish', 'draft'] : 'publish',
                        'numberposts' => -1,
                        'orderby' => 'title',
                        'order' => 'ASC',
                    ]);
                }

                return array_values(array_filter(array_map(
                    static fn (WP_Post $post): array => ipim_ministry_summary((int) $post->ID),
                    $posts
                )));
            },
            'permission_callback' => $login,
        ],
        [
            'methods' => 'POST',
            'callback' => static function (WP_REST_Request $request) {
                $title = sanitize_text_field((string) $request->get_param('title'));
                if ($title === '') {
                    return new WP_Error('ipim_invalid_title', 'Informe o nome do ministério.', ['status' => 400]);
                }

                $post_id = wp_insert_post([
                    'post_type' => 'ministerio',
                    'post_status' => 'publish',
                    'post_title' => $title,
                ], true);
                if (is_wp_error($post_id)) {
                    return $post_id;
                }

                $tipo = sanitize_key((string) $request->get_param('tipo'));
                if ($tipo !== '') {
                    update_post_meta($post_id, 'tipo', $tipo);
                }
                $descricao = sanitize_textarea_field((string) $request->get_param('descricao'));
                if ($descricao !== '') {
                    update_post_meta($post_id, 'descricao', $descricao);
                }
                $leader_id = (int) $request->get_param('leader_id');
                if ($leader_id > 0) {
                    ipim_rest_assign_membership($leader_id, (int) $post_id, 'lider');
                }

                ipim_rbac_audit(get_current_user_id(), 'ministry_create', 'ministerio', (int) $post_id, null, ['title' => $title, 'tipo' => $tipo, 'descricao' => $descricao]);

                return ipim_ministry_summary((int) $post_id);
            },
            'permission_callback' => $manager,
        ],
    ]);

    register_rest_route('1ipim/v1', '/ministries/(?P<id>\d+)', [
        'methods' => 'POST,PUT,PATCH',
        'callback' => static function (WP_REST_Request $request) {
            $id = (int) $request['id'];
            $post = get_post($id);
            if (!$post || $post->post_type !== 'ministerio') {
                return new WP_Error('ipim_not_found', 'Ministério não encontrado.', ['status' => 404]);
            }
            if (!ipim_rbac_can_manage_ministry(get_current_user_id(), $id)) {
                return ipim_rest_forbidden();
            }

            $is_manager = ipim_rbac_is_admin() || ipim_rbac_is_pastor();
            $before = ipim_ministry_summary($id);
            $update = ['ID' => $id];

            $title = $request->get_param('title');
            if ($title !== null) {
                $title = sanitize_text_field((string) $title);
                if ($title !== '') {
                    $update['post_title'] = $title;
                }
            }

            if ($request->get_param('descricao') !== null) {
                update_post_meta($id, 'descricao', sanitize_textarea_field((string) $request->get_param('descricao')));
            }

            if ($is_manager) {
                $tipo = $request->get_param('tipo');
                if ($tipo !== null) {
                    update_post_meta($id, 'tipo', sanitize_key((string) $tipo));
                }
                $leader_id = (int) $request->get_param('leader_id');
                if ($leader_id > 0) {
                    ipim_rest_assign_membership($leader_id, $id, 'lider');
                }
                $arquivado = $request->get_param('arquivado');
                if ($arquivado !== null) {
                    $update['post_status'] = (bool) $arquivado ? 'draft' : 'publish';
                }
            }

            wp_update_post($update);
            ipim_rbac_audit(get_current_user_id(), 'ministry_update', 'ministerio', $id, $before, ipim_ministry_summary($id));

            return ipim_ministry_summary($id);
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/ministries/(?P<id>\d+)', [
        'methods' => 'DELETE',
        'callback' => static function (WP_REST_Request $request) {
            $id = (int) $request['id'];
            $post = get_post($id);
            if (!$post || $post->post_type !== 'ministerio') {
                return new WP_Error('ipim_not_found', 'Ministério não encontrado.', ['status' => 404]);
            }

            global $wpdb;
            $table = ipim_rbac_table('ministry_memberships');
            $wpdb->update($table, ['status' => 'inactive'], ['ministry_id' => $id], ['%s'], ['%d']);
            wp_delete_post($id, true);
            ipim_rbac_audit(get_current_user_id(), 'ministry_delete', 'ministerio', $id, ['title' => $post->post_title], null);

            return ['deleted' => true, 'id' => $id];
        },
        'permission_callback' => $manager,
    ]);

    register_rest_route('1ipim/v1', '/ministries/(?P<id>\d+)/members', [
        'methods' => 'GET',
        'callback' => static function (WP_REST_Request $request) {
            $id = (int) $request['id'];
            if (!ipim_rbac_can_view_ministry(get_current_user_id(), $id)) {
                return ipim_rest_forbidden();
            }

            global $wpdb;
            $table = ipim_rbac_table('ministry_memberships');
            $user_ids = $wpdb->get_col($wpdb->prepare(
                "SELECT user_id FROM {$table} WHERE ministry_id = %d AND status = 'active'",
                $id
            ));

            return array_values(array_filter(array_map('ipim_user_summary', array_map('intval', $user_ids))));
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/ministries/(?P<id>\d+)/members', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $ministry_id = (int) $request['id'];
            if (!ipim_rbac_can_manage_ministry(get_current_user_id(), $ministry_id)) {
                return ipim_rest_forbidden();
            }

            $role = (string) $request->get_param('role');
            $role = in_array($role, ['colaborador', 'lider'], true) ? $role : 'colaborador';
            if ($role === 'lider' && !ipim_rbac_is_admin() && !ipim_rbac_is_pastor()) {
                return ipim_rest_forbidden('Apenas administradores podem nomear líderes.');
            }

            $user_id = (int) $request->get_param('user_id');
            if ($user_id <= 0) {
                $email = sanitize_email((string) $request->get_param('email'));
                $user = $email !== '' ? get_user_by('email', $email) : false;
                $user_id = $user ? (int) $user->ID : 0;
            }

            if ($user_id <= 0) {
                return new WP_Error('ipim_user_not_found', 'Usuário não encontrado.', ['status' => 404]);
            }

            $raw = get_user_meta($user_id, 'ministries_approved', true);
            $approved = is_string($raw) ? json_decode($raw, true) : $raw;
            $approved = is_array($approved) ? array_values(array_unique(array_map('intval', $approved))) : [];
            if (!in_array($ministry_id, $approved, true)) {
                $approved[] = $ministry_id;
            }
            update_user_meta($user_id, 'ministries_approved', wp_json_encode($approved));

            global $wpdb;
            $table = ipim_rbac_table('ministry_memberships');
            $wpdb->query($wpdb->prepare(
                "INSERT INTO {$table} (user_id, ministry_id, role, status, created_at, updated_at)
                 VALUES (%d, %d, %s, 'active', %s, %s)
                 ON DUPLICATE KEY UPDATE role = VALUES(role), status = 'active', updated_at = VALUES(updated_at)",
                $user_id,
                $ministry_id,
                $role,
                current_time('mysql'),
                current_time('mysql')
            ));

            ipim_rbac_audit(get_current_user_id(), 'membership_set', 'user', $user_id, null, [
                'ministry_id' => $ministry_id,
                'role' => $role,
            ]);
            if (function_exists('ipim_notify')) {
                ipim_notify(
                    $user_id,
                    'membership_approved',
                    'Novo vínculo de ministério',
                    'Você foi vinculado ao ministério ' . get_the_title($ministry_id) . '.',
                    '/portal'
                );
            }

            return ipim_user_summary($user_id);
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/ministries/(?P<id>\d+)/members/(?P<user_id>\d+)', [
        'methods' => 'DELETE',
        'callback' => static function (WP_REST_Request $request) {
            $ministry_id = (int) $request['id'];
            $user_id = (int) $request['user_id'];
            if (!ipim_rbac_can_manage_ministry(get_current_user_id(), $ministry_id)) {
                return ipim_rest_forbidden();
            }

            global $wpdb;
            $table = ipim_rbac_table('ministry_memberships');
            $row = $wpdb->get_row($wpdb->prepare(
                "SELECT role FROM {$table} WHERE ministry_id = %d AND user_id = %d AND status = 'active'",
                $ministry_id,
                $user_id
            ));
            if ($row && $row->role === 'lider' && !ipim_rbac_is_admin() && !ipim_rbac_is_pastor()) {
                return ipim_rest_forbidden('Apenas administradores podem remover líderes.');
            }

            $raw = get_user_meta($user_id, 'ministries_approved', true);
            $approved = is_string($raw) ? json_decode($raw, true) : $raw;
            $approved = is_array($approved) ? array_values(array_unique(array_map('intval', $approved))) : [];
            $approved = array_values(array_filter($approved, static fn (int $id): bool => $id !== $ministry_id));
            update_user_meta($user_id, 'ministries_approved', wp_json_encode($approved));

            $wpdb->update(
                $table,
                ['status' => 'inactive', 'updated_at' => current_time('mysql')],
                ['ministry_id' => $ministry_id, 'user_id' => $user_id],
                ['%s', '%s'],
                ['%d', '%d']
            );

            ipim_rbac_audit(get_current_user_id(), 'membership_remove', 'user', $user_id, null, [
                'ministry_id' => $ministry_id,
            ]);

            return ['removed' => true, 'user_id' => $user_id, 'ministry_id' => $ministry_id];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/users', [
        'methods' => 'GET',
        'callback' => static function (): array {
            $current = get_current_user_id();
            if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
                $user_ids = get_users(['fields' => 'ID']);
            } else {
                global $wpdb;
                $memberships = ipim_rbac_table('ministry_memberships');
                $ministry_ids = $wpdb->get_col($wpdb->prepare(
                    "SELECT ministry_id FROM {$memberships} WHERE user_id = %d AND role = 'lider' AND status = 'active'",
                    $current
                ));
                $ministry_ids = array_map('intval', $ministry_ids);
                $user_ids = [$current];
                if ($ministry_ids !== []) {
                    $placeholders = implode(',', array_fill(0, count($ministry_ids), '%d'));
                    $scoped = $wpdb->get_col($wpdb->prepare(
                        "SELECT user_id FROM {$memberships} WHERE status = 'active' AND ministry_id IN ({$placeholders})",
                        $ministry_ids
                    ));
                    $user_ids = array_values(array_unique(array_merge($user_ids, array_map('intval', $scoped))));
                }
            }

            $users = array_values(array_filter(array_map('ipim_user_summary', array_map('intval', $user_ids))));

            return $users;
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/admin/audit', [
        'methods' => 'GET',
        'callback' => static function (WP_REST_Request $request): array {
            $isGlobal = ipim_rbac_is_admin() || ipim_rbac_is_pastor();
            $hasScope = function_exists('ipim_relatorios_has_scope') && ipim_relatorios_has_scope();
            if (!$isGlobal && !$hasScope) {
                return ['items' => [], 'total' => 0, 'page' => 1, 'pages' => 0, 'per_page' => 30];
            }

            global $wpdb;
            $table = ipim_rbac_table('audit_log');
            $page = max(1, (int) $request->get_param('page'));
            $per_page = min(100, max(1, (int) ($request->get_param('per_page') ?: 30)));
            $where = ['1=1'];
            $params = [];

            $action = sanitize_text_field((string) $request->get_param('action'));
            if ($action !== '') {
                $where[] = 'action = %s';
                $params[] = $action;
            }
            $actor = (int) $request->get_param('actor_id');
            if ($actor > 0) {
                $where[] = 'actor_id = %d';
                $params[] = $actor;
            }
            $target_type = sanitize_key((string) $request->get_param('target_type'));
            if ($target_type !== '') {
                $where[] = 'target_type = %s';
                $params[] = $target_type;
            }
            $target_id = (int) $request->get_param('target_id');
            if ($target_id > 0) {
                $where[] = 'target_id = %d';
                $params[] = $target_id;
            }

            if (!$isGlobal && function_exists('ipim_relatorios_audit_where')) {
                [$scope_sql, $scope_params] = ipim_relatorios_audit_where();
                $where[] = $scope_sql;
                $params = array_merge($params, $scope_params);
            }

            $where_sql = implode(' AND ', $where);
            $total = (int) ($params === []
                ? $wpdb->get_var("SELECT COUNT(*) FROM {$table} WHERE {$where_sql}")
                : $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE {$where_sql}", $params)));

            $list_sql = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY id DESC LIMIT %d OFFSET %d";
            $rows = $wpdb->get_results($wpdb->prepare(
                $list_sql,
                array_merge($params, [$per_page, ($page - 1) * $per_page])
            ), ARRAY_A);

            $items = [];
            foreach ($rows ?: [] as $row) {
                $actor_user = get_userdata((int) $row['actor_id']);
                $items[] = [
                    'id' => (int) $row['id'],
                    'actor_id' => (int) $row['actor_id'],
                    'actor_name' => $actor_user ? $actor_user->display_name : 'Sistema',
                    'action' => (string) $row['action'],
                    'target_type' => (string) $row['target_type'],
                    'target_id' => (int) $row['target_id'],
                    'before_json' => (string) $row['before_json'],
                    'after_json' => (string) $row['after_json'],
                    'created_at' => (string) $row['created_at'],
                ];
            }

            return [
                'items' => $items,
                'total' => $total,
                'page' => $page,
                'per_page' => $per_page,
                'pages' => $per_page > 0 ? (int) ceil($total / $per_page) : 0,
            ];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/admin/users', [
        'methods' => 'GET',
        'callback' => static function (WP_REST_Request $request): array {
            if (!ipim_rbac_is_admin() && !ipim_rbac_is_pastor()) {
                return ['items' => [], 'total' => 0, 'page' => 1, 'pages' => 0, 'stats' => []];
            }

            $q = trim((string) $request->get_param('q'));
            $role = sanitize_key((string) $request->get_param('role'));
            $ministry = (int) $request->get_param('ministry');
            $pending = (bool) $request->get_param('pending');
            $page = max(1, (int) $request->get_param('page'));
            $per_page = min(100, max(1, (int) ($request->get_param('per_page') ?: 20)));

            $all = get_users(['fields' => 'all', 'orderby' => 'display_name', 'order' => 'ASC']);
            $ministry_users = [];
            if ($ministry > 0) {
                global $wpdb;
                $table = ipim_rbac_table('ministry_memberships');
                $ids = $wpdb->get_col($wpdb->prepare(
                    "SELECT user_id FROM {$table} WHERE ministry_id = %d AND status = 'active'",
                    $ministry
                ));
                $ministry_users = array_map('intval', $ids ?: []);
            }

            $stats = ['total' => count($all), 'pending' => 0, 'bible_rats' => 0, 'unverified' => 0];
            $filtered = [];
            foreach ($all as $user) {
                $requested = json_decode((string) get_user_meta($user->ID, 'ministries_requested', true), true);
                $approved = json_decode((string) get_user_meta($user->ID, 'ministries_approved', true), true);
                $requested = is_array($requested) ? array_map('intval', $requested) : [];
                $approved = is_array($approved) ? array_map('intval', $approved) : [];
                $isPending = count(array_diff($requested, $approved)) > 0;
                if ($isPending) {
                    $stats['pending']++;
                }
                $isBible = get_user_meta($user->ID, '_ipim_account_type', true) === 'bible_rats';
                if ($isBible) {
                    $stats['bible_rats']++;
                    if (get_user_meta($user->ID, '_ipim_email_verified', true) !== '1') {
                        $stats['unverified']++;
                    }
                }

                if ($role !== '' && !in_array($role, (array) $user->roles, true)) {
                    continue;
                }
                if ($ministry > 0 && !in_array((int) $user->ID, $ministry_users, true)) {
                    continue;
                }
                if ($pending && !$isPending) {
                    continue;
                }
                if ($q !== '') {
                    $haystack = strtolower($user->display_name . ' ' . $user->user_login . ' ' . $user->user_email);
                    if (strpos($haystack, strtolower($q)) === false) {
                        continue;
                    }
                }
                $filtered[] = $user;
            }

            $total = count($filtered);
            $pages = $per_page > 0 ? (int) ceil($total / $per_page) : 0;
            $slice = array_slice($filtered, ($page - 1) * $per_page, $per_page);

            return [
                'items' => array_values(array_map(static fn (WP_User $user): array => ipim_user_summary((int) $user->ID), $slice)),
                'total' => $total,
                'page' => $page,
                'pages' => $pages,
                'stats' => $stats,
            ];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/users/(?P<id>\d+)/role', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $user_id = (int) $request['id'];
            $user = get_userdata($user_id);
            if (!$user) {
                return new WP_Error('ipim_user_not_found', 'Usuário não encontrado.', ['status' => 404]);
            }

            $role = sanitize_key((string) $request->get_param('role'));
            $allowed = ['administrator', 'pastor', 'editor', 'lider_ministerio', 'contributor', 'colaborador_ministerio', 'subscriber', 'assinante'];
            if (!in_array($role, $allowed, true)) {
                return new WP_Error('ipim_invalid_role', 'Papel inválido.', ['status' => 400]);
            }

            $before = ['roles' => array_values((array) $user->roles)];
            if ($user_id === get_current_user_id() && $role !== 'administrator') {
                $admins = get_users(['role' => 'administrator', 'fields' => 'ID']);
                if (count($admins) <= 1) {
                    return ipim_rest_forbidden('Não é possível remover o último administrador.');
                }
            }

            $user->set_role($role);

            $ministry_id = (int) $request->get_param('ministry_id');
            if ($ministry_id > 0 && in_array($role, ['editor', 'lider_ministerio', 'contributor', 'colaborador_ministerio'], true)) {
                $membership_role = in_array($role, ['editor', 'lider_ministerio'], true) ? 'lider' : 'colaborador';
                $raw = get_user_meta($user_id, 'ministries_approved', true);
                $approved = is_string($raw) ? json_decode($raw, true) : $raw;
                $approved = is_array($approved) ? array_values(array_unique(array_map('intval', $approved))) : [];
                if (!in_array($ministry_id, $approved, true)) {
                    $approved[] = $ministry_id;
                }
                update_user_meta($user_id, 'ministries_approved', wp_json_encode($approved));

                global $wpdb;
                $table = ipim_rbac_table('ministry_memberships');
                $wpdb->query($wpdb->prepare(
                    "INSERT INTO {$table} (user_id, ministry_id, role, status, created_at, updated_at)
                     VALUES (%d, %d, %s, 'active', %s, %s)
                     ON DUPLICATE KEY UPDATE role = VALUES(role), status = 'active', updated_at = VALUES(updated_at)",
                    $user_id,
                    $ministry_id,
                    $membership_role,
                    current_time('mysql'),
                    current_time('mysql')
                ));
            }

            ipim_rbac_audit(get_current_user_id(), 'user_role', 'user', $user_id, $before, [
                'roles' => array_values((array) get_userdata($user_id)->roles),
                'ministry_id' => $ministry_id ?: null,
            ]);

            return ipim_user_summary($user_id);
        },
        'permission_callback' => $manager,
    ]);

    register_rest_route('1ipim/v1', '/users/(?P<id>\d+)', [
        'methods' => 'DELETE',
        'callback' => static function (WP_REST_Request $request) {
            $user_id = (int) $request['id'];
            if ($user_id === get_current_user_id()) {
                return ipim_rest_forbidden('Não é possível excluir a própria conta.');
            }

            $user = get_userdata($user_id);
            if (!$user) {
                return new WP_Error('ipim_user_not_found', 'Usuário não encontrado.', ['status' => 404]);
            }

            ipim_rbac_audit(get_current_user_id(), 'user_delete', 'user', $user_id, ipim_user_summary($user_id), null);
            require_once ABSPATH . 'wp-admin/includes/user.php';
            wp_delete_user($user_id, get_current_user_id());

            return ['deleted' => true, 'id' => $user_id];
        },
        'permission_callback' => $manager,
    ]);

    register_rest_route('1ipim/v1', '/escalas/(?P<id>\d+)/participar', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $post_id = (int) $request['id'];
            $post = get_post($post_id);
            if (!$post || $post->post_type !== 'escala' || $post->post_status !== 'publish') {
                return new WP_Error('ipim_not_found', 'Escala não encontrada.', ['status' => 404]);
            }

            $user = wp_get_current_user();
            $data = ipim_schedule_data($post_id);
            $is_manager = ipim_can_manage_schedule((int) $user->ID, $post_id);
            $is_member = ipim_rbac_can_view_ministry((int) $user->ID, $data['ministry_id']);
            if (!$is_manager && !$is_member) {
                return ipim_rest_forbidden('Você não participa deste ministério.');
            }

            $email = strtolower((string) $user->user_email);
            if ($email === '') {
                return new WP_Error('ipim_invalid_email', 'Usuário sem e-mail cadastrado.', ['status' => 400]);
            }

            $emails = ipim_emails($data['emails']);
            if (in_array($email, $emails, true)) {
                return ['already' => true, 'schedule_id' => $post_id];
            }

            $override = (bool) $request->get_param('override');
            $reason = sanitize_text_field((string) $request->get_param('override_reason'));
            $conflicts = ipim_schedule_conflicts($email, $data['date'], $data['time'], $post_id);
            if ($conflicts !== []) {
                if (!$override || !$is_manager) {
                    return ipim_rest_conflict($conflicts);
                }
                if ($reason === '') {
                    return new WP_Error('ipim_override_reason', 'Informe a justificativa para autorizar o conflito.', ['status' => 400]);
                }
                ipim_rbac_audit((int) $user->ID, 'schedule_override', 'escala', $post_id, null, [
                    'email' => $email,
                    'reason' => $reason,
                    'conflicts' => $conflicts,
                ]);
            }

            $names = ipim_names($data['names']);
            $names[] = $user->display_name;
            $emails[] = $email;
            $data['names'] = implode(', ', $names);
            $data['emails'] = implode(', ', $emails);
            ipim_schedule_write_content($post_id, $data);
            ipim_rbac_audit((int) $user->ID, 'schedule_join', 'escala', $post_id, null, ['email' => $email]);
            if (function_exists('ipim_notify_ministry_leaders')) {
                ipim_notify_ministry_leaders(
                    (int) $data['ministry_id'],
                    'schedule_join',
                    'Novo voluntário na escala',
                    $user->display_name . ' entrou na escala de ' . $data['date'] . ' às ' . $data['time'] . '.',
                    '/portal/escalas'
                );
            }

            return ['joined' => true, 'schedule_id' => $post_id, 'names' => $data['names'], 'emails' => $data['emails']];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/escalas/(?P<id>\d+)/sair', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $post_id = (int) $request['id'];
            $post = get_post($post_id);
            if (!$post || $post->post_type !== 'escala') {
                return new WP_Error('ipim_not_found', 'Escala não encontrada.', ['status' => 404]);
            }

            $user = wp_get_current_user();
            $data = ipim_schedule_data($post_id);
            $is_manager = ipim_can_manage_schedule((int) $user->ID, $post_id);
            $email = sanitize_email((string) $request->get_param('email'));
            if ($email === '' || !$is_manager) {
                $email = (string) $user->user_email;
            }

            $result = ipim_schedule_remove_participant($data, $email);
            $data['names'] = $result['names'];
            $data['emails'] = $result['emails'];
            ipim_schedule_write_content($post_id, $data);
            ipim_rbac_audit((int) $user->ID, 'schedule_leave', 'escala', $post_id, null, ['email' => strtolower($email)]);

            return ['left' => true, 'schedule_id' => $post_id, 'names' => $data['names'], 'emails' => $data['emails']];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/escalas/(?P<id>\d+)/equipe', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $post_id = (int) $request['id'];
            if (!ipim_can_manage_schedule(get_current_user_id(), $post_id)) {
                return ipim_rest_forbidden();
            }

            $data = ipim_schedule_data($post_id);
            $names = sanitize_text_field((string) $request->get_param('names'));
            $emails = sanitize_text_field((string) $request->get_param('emails'));
            $new_emails = ipim_emails($emails);
            $added = array_values(array_diff($new_emails, ipim_emails($data['emails'])));
            $conflicts = ipim_schedule_conflicts_for_emails($added, $data['date'], $data['time'], $post_id);

            $override = (bool) $request->get_param('override');
            $reason = sanitize_text_field((string) $request->get_param('override_reason'));
            if ($conflicts !== []) {
                if (!$override) {
                    return ipim_rest_conflict($conflicts);
                }
                if ($reason === '') {
                    return new WP_Error('ipim_override_reason', 'Informe a justificativa para autorizar o conflito.', ['status' => 400]);
                }
                ipim_rbac_audit(get_current_user_id(), 'schedule_override', 'escala', $post_id, null, [
                    'emails' => $added,
                    'reason' => $reason,
                    'conflicts' => $conflicts,
                ]);
            }

            $data['names'] = $names;
            $data['emails'] = implode(', ', $new_emails);
            ipim_schedule_write_content($post_id, $data);
            ipim_rbac_audit(get_current_user_id(), 'schedule_team_update', 'escala', $post_id, null, [
                'names' => $names,
                'emails' => $data['emails'],
            ]);

            return ['updated' => true, 'schedule_id' => $post_id, 'names' => $data['names'], 'emails' => $data['emails']];
        },
        'permission_callback' => $login,
    ]);
});

/* -------------------------------------------------------------------------
 * Guards dos endpoints nativos usados pelo portal
 * ---------------------------------------------------------------------- */

add_filter('rest_pre_dispatch', static function ($result, WP_REST_Server $server, WP_REST_Request $request) {
    if ($result !== null) {
        return $result;
    }

    $route = $request->get_route();
    $method = strtoupper($request->get_method());
    $is_logged = is_user_logged_in();
    $GLOBALS['ipim_escala_manage_allowed'] = false;

    // O preflight CORS não carrega cookie de sessão. Deixar o WordPress
    // responder 200 com os headers antes de qualquer verificação de papel.
    if ($method === 'OPTIONS') {
        return $result;
    }

    if (strpos($route, '/wp/v2/escala') === 0) {
        if (!$is_logged) {
            return new WP_Error('rest_forbidden', 'Faça login para acessar as escalas.', ['status' => 401]);
        }

        if ($method === 'GET') {
            return $result;
        }

        $schedule_id = 0;
        if (preg_match('#/wp/v2/escala/(\d+)#', $route, $match)) {
            $schedule_id = (int) $match[1];
        }

        if ($schedule_id === 0 && $method === 'POST') {
            $params = $request->get_json_params();
            $content = (string) ($params['content'] ?? '');
            $parsed = ipim_schedule_parse($content);
            $ministry_id = (int) ($params['meta']['ministerio_id'] ?? $parsed['ministry_id']);
            if (!ipim_rbac_can_manage_ministry(get_current_user_id(), $ministry_id)) {
                return ipim_rest_forbidden('Você não gerencia este ministério.');
            }
            $GLOBALS['ipim_escala_manage_allowed'] = true;
            return $result;
        }

        if ($schedule_id > 0 && !ipim_can_manage_schedule(get_current_user_id(), $schedule_id)) {
            return ipim_rest_forbidden('Você não gerencia esta escala.');
        }

        $GLOBALS['ipim_escala_manage_allowed'] = true;
        return $result;
    }

    if (strpos($route, '/wp/v2/ministerio') === 0 && $method !== 'GET') {
        if (!ipim_rbac_is_admin() && !ipim_rbac_is_pastor()) {
            return ipim_rest_forbidden('Apenas administradores podem alterar ministérios.');
        }
        return $result;
    }

    if (strpos($route, '/wp/v2/users') === 0) {
        if (!ipim_rbac_is_admin() && !ipim_rbac_is_pastor()) {
            return ipim_rest_forbidden('Use a gestão de ministérios para acessar os membros.');
        }
    }

    return $result;
}, 10, 3);

add_filter('user_has_cap', static function (array $allcaps, array $caps, array $args, WP_User $user): array {
    if (empty($GLOBALS['ipim_escala_manage_allowed'])) {
        return $allcaps;
    }

    foreach ([
        'edit_posts',
        'edit_others_posts',
        'edit_published_posts',
        'publish_posts',
        'delete_posts',
        'delete_others_posts',
        'delete_published_posts',
        'edit_private_posts',
        'delete_private_posts',
    ] as $cap) {
        $allcaps[$cap] = true;
    }

    return $allcaps;
}, 10, 4);

add_filter('rest_post_dispatch', static function ($response, WP_REST_Server $server, WP_REST_Request $request) {
    $route = $request->get_route();
    if (strpos($route, '/wp/v2/escala') !== 0 || strtoupper($request->get_method()) !== 'GET') {
        return $response;
    }

    if (!($response instanceof WP_REST_Response)) {
        return $response;
    }

    $data = $response->get_data();
    $user_id = get_current_user_id();

    if (is_array($data) && array_values($data) === $data) {
        $filtered = [];
        foreach ($data as $item) {
            if (!is_array($item) || !isset($item['id'])) {
                continue;
            }
            $id = (int) $item['id'];
            if (!ipim_can_view_schedule($user_id, $id)) {
                continue;
            }
            $item['meta'] = ipim_schedule_meta($id);
            $filtered[] = $item;
        }
        $response->set_data($filtered);
        return $response;
    }

    if (is_array($data) && isset($data['id'])) {
        $id = (int) $data['id'];
        if (!ipim_can_view_schedule($user_id, $id)) {
            $response->set_status(403);
            $response->set_data([
                'code' => 'rest_forbidden',
                'message' => 'Você não tem acesso a esta escala.',
                'data' => ['status' => 403],
            ]);
            return $response;
        }
        $data['meta'] = ipim_schedule_meta($id);
        $response->set_data($data);
    }

    return $response;
}, 10, 3);

add_filter('rest_pre_insert_escala', static function ($prepared, WP_REST_Request $request) {
    if (!is_object($prepared) || !isset($prepared->post_content)) {
        return $prepared;
    }

    $parsed = ipim_schedule_parse((string) $prepared->post_content);
    $emails = ipim_emails($parsed['emails']);
    if ($emails === []) {
        return $prepared;
    }

    $schedule_id = (int) ($request['id'] ?? 0);
    $ministry_id = (int) ($request->get_param('meta')['ministerio_id'] ?? $parsed['ministry_id']);
    $can_manage = $schedule_id > 0
        ? ipim_can_manage_schedule(get_current_user_id(), $schedule_id)
        : ipim_rbac_can_manage_ministry(get_current_user_id(), $ministry_id);

    $check_emails = $emails;
    if ($schedule_id > 0) {
        $old = ipim_schedule_data($schedule_id);
        $check_emails = array_values(array_diff($emails, ipim_emails($old['emails'])));
    }

    $conflicts = ipim_schedule_conflicts_for_emails($check_emails, $parsed['date'], $parsed['time'], $schedule_id);
    if ($conflicts === []) {
        return $prepared;
    }

    $override = (bool) $request->get_param('ipim_override');
    $reason = sanitize_text_field((string) $request->get_param('ipim_override_reason'));
    if (!$override || !$can_manage) {
        return ipim_rest_conflict($conflicts);
    }
    if ($reason === '') {
        return new WP_Error('ipim_override_reason', 'Informe a justificativa para autorizar o conflito.', ['status' => 400]);
    }

    ipim_rbac_audit(get_current_user_id(), 'schedule_override', 'escala', $schedule_id, null, [
        'emails' => $emails,
        'reason' => $reason,
        'conflicts' => $conflicts,
    ]);

    return $prepared;
}, 10, 2);

add_action('rest_after_insert_escala', static function (WP_Post $post, WP_REST_Request $request, bool $creating): void {
    $data = ipim_schedule_parse($post->post_content);
    update_post_meta($post->ID, 'data_da_escala', $data['date']);
    update_post_meta($post->ID, 'ministerio_id', (string) $data['ministry_id']);
    update_post_meta($post->ID, 'equipe_nomes', $data['names']);
    update_post_meta($post->ID, 'equipe_emails', $data['emails']);
    update_post_meta($post->ID, 'horario', $data['time']);
    ipim_rbac_audit(get_current_user_id(), $creating ? 'schedule_create' : 'schedule_update', 'escala', $post->ID, null, $data);

    if (function_exists('ipim_notify')) {
        foreach (ipim_emails($data['emails']) as $email) {
            $participant = get_user_by('email', $email);
            if ($participant && (int) $participant->ID !== get_current_user_id()) {
                ipim_notify(
                    (int) $participant->ID,
                    $creating ? 'schedule_created' : 'schedule_updated',
                    $creating ? 'Você foi escalado' : 'Sua escala foi atualizada',
                    $data['date'] . ' às ' . $data['time'] . ' — ' . get_the_title($data['ministry_id']),
                    '/portal/escalas'
                );
            }
        }
    }
}, 10, 3);
