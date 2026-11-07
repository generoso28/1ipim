<?php
/**
 * Plugin Name: 1IPIM Notifications
 * Description: Notificações internas do portal e central de avisos.
 * Version: 0.1.0
 * Author: 1IPIM Dev
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/1ipim-rbac.php';

define('IPIM_NOTIFICATIONS_VERSION', '0.1.0');

function ipim_notifications_table(): string
{
    global $wpdb;
    return $wpdb->prefix . '1ipim_notifications';
}

function ipim_notifications_install(): void
{
    if (get_option('ipim_notifications_version') === IPIM_NOTIFICATIONS_VERSION) {
        return;
    }

    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $table = ipim_notifications_table();
    $charset = $wpdb->get_charset_collate();

    dbDelta("CREATE TABLE {$table} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        type varchar(64) NOT NULL,
        title varchar(255) NOT NULL,
        message text NULL,
        link varchar(500) NULL,
        read_at datetime NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY user_read (user_id,read_at),
        KEY created (created_at)
    ) {$charset};");

    update_option('ipim_notifications_version', IPIM_NOTIFICATIONS_VERSION);
}

add_action('init', 'ipim_notifications_install', 20);

function ipim_notify(int $user_id, string $type, string $title, string $message = '', string $link = ''): void
{
    if ($user_id <= 0) {
        return;
    }

    global $wpdb;
    $wpdb->insert(ipim_notifications_table(), [
        'user_id' => $user_id,
        'type' => sanitize_key($type),
        'title' => sanitize_text_field($title),
        'message' => sanitize_textarea_field($message),
        'link' => esc_url_raw($link),
        'read_at' => null,
        'created_at' => current_time('mysql'),
    ], ['%d', '%s', '%s', '%s', '%s', '%s', '%s']);
}

function ipim_notify_admins(string $type, string $title, string $message = '', string $link = ''): void
{
    $admins = get_users(['role' => 'administrator', 'fields' => 'ID']);
    foreach ($admins as $admin_id) {
        ipim_notify((int) $admin_id, $type, $title, $message, $link);
    }
}

function ipim_notify_ministry_leaders(int $ministry_id, string $type, string $title, string $message = '', string $link = ''): void
{
    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    $ids = $wpdb->get_col($wpdb->prepare(
        "SELECT user_id FROM {$table} WHERE ministry_id = %d AND role = 'lider' AND status = 'active'",
        $ministry_id
    ));
    foreach ($ids ?: [] as $user_id) {
        ipim_notify((int) $user_id, $type, $title, $message, $link);
    }
}

function ipim_notifications_unread_count(int $user_id): int
{
    global $wpdb;
    $table = ipim_notifications_table();

    return (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$table} WHERE user_id = %d AND read_at IS NULL",
        $user_id
    ));
}

add_action('rest_api_init', static function (): void {
    $login = static fn (): bool => is_user_logged_in();

    register_rest_route('1ipim/v1', '/notifications', [
        'methods' => 'GET',
        'callback' => static function (WP_REST_Request $request): array {
            global $wpdb;
            $user_id = get_current_user_id();
            $page = max(1, (int) $request->get_param('page'));
            $per_page = min(50, max(1, (int) ($request->get_param('per_page') ?: 20)));
            $unread_only = (bool) $request->get_param('unread_only');
            $table = ipim_notifications_table();

            $where = 'user_id = %d';
            $params = [$user_id];
            if ($unread_only) {
                $where .= ' AND read_at IS NULL';
            }

            $total = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$table} WHERE {$where}",
                $params
            ));
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT id,type,title,message,link,read_at,created_at
                 FROM {$table} WHERE {$where}
                 ORDER BY id DESC LIMIT %d OFFSET %d",
                array_merge($params, [$per_page, ($page - 1) * $per_page])
            ), ARRAY_A);

            return [
                'items' => $rows ?: [],
                'total' => $total,
                'page' => $page,
                'per_page' => $per_page,
                'pages' => $per_page > 0 ? (int) ceil($total / $per_page) : 0,
                'unread_count' => ipim_notifications_unread_count($user_id),
            ];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/notifications/unread-count', [
        'methods' => 'GET',
        'callback' => static fn (): array => [
            'count' => ipim_notifications_unread_count(get_current_user_id()),
        ],
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/notifications/(?P<id>\d+)/read', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request): array {
            global $wpdb;
            $table = ipim_notifications_table();
            $wpdb->update(
                $table,
                ['read_at' => current_time('mysql')],
                ['id' => (int) $request['id'], 'user_id' => get_current_user_id()],
                ['%s'],
                ['%d', '%d']
            );

            return [
                'read' => true,
                'unread_count' => ipim_notifications_unread_count(get_current_user_id()),
            ];
        },
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/notifications/read-all', [
        'methods' => 'POST',
        'callback' => static function (): array {
            global $wpdb;
            $table = ipim_notifications_table();
            $wpdb->query($wpdb->prepare(
                "UPDATE {$table} SET read_at = %s WHERE user_id = %d AND read_at IS NULL",
                current_time('mysql'),
                get_current_user_id()
            ));

            return ['read' => true, 'unread_count' => 0];
        },
        'permission_callback' => $login,
    ]);
});
