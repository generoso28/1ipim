<?php
/**
 * Plugin Name: 1IPIM RBAC
 * Description: Papéis, vínculos por ministério, configurações e auditoria do portal.
 * Version: 0.1.0
 * Author: 1IPIM Dev
 *
 * Must-use plugin: carrega automaticamente, sem ativação no wp-admin.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('IPIM_RBAC_VERSION', '0.2.0');

function ipim_rbac_table(string $name): string
{
    global $wpdb;
    return $wpdb->prefix . '1ipim_' . $name;
}

function ipim_rbac_audit(
    int $actor_id,
    string $action,
    string $target_type,
    int $target_id = 0,
    $before = null,
    $after = null
): void {
    global $wpdb;
    $wpdb->insert(
        ipim_rbac_table('audit_log'),
        [
            'actor_id' => $actor_id,
            'action' => $action,
            'target_type' => $target_type,
            'target_id' => $target_id ?: null,
            'before_json' => $before === null ? null : wp_json_encode($before, JSON_UNESCAPED_UNICODE),
            'after_json' => $after === null ? null : wp_json_encode($after, JSON_UNESCAPED_UNICODE),
            'created_at' => current_time('mysql'),
        ],
        ['%d', '%s', '%s', '%d', '%s', '%s', '%s']
    );
}

function ipim_rbac_ensure_role(string $slug, string $label, array $caps): void
{
    $role = get_role($slug);
    if (!$role) {
        add_role($slug, $label, $caps);
        return;
    }

    foreach ($caps as $cap => $grant) {
        $role->add_cap($cap, (bool) $grant);
    }
}

/**
 * Garante o ministério Livraria com tipo=livraria.
 *
 * A livraria não é um papel global: é um ministério como os demais, com
 * líderes e colaboradores próprios.
 */
function ipim_rbac_ensure_livraria(): int
{
    $posts = get_posts([
        'post_type' => 'ministerio',
        'post_status' => 'any',
        'numberposts' => -1,
        'fields' => 'all',
    ]);

    foreach ($posts as $post) {
        if (strtolower(trim($post->post_title)) === 'livraria') {
            update_post_meta($post->ID, 'tipo', 'livraria');
            return (int) $post->ID;
        }
    }

    $post_id = wp_insert_post([
        'post_type' => 'ministerio',
        'post_status' => 'publish',
        'post_title' => 'Livraria',
    ], true);

    if (is_wp_error($post_id)) {
        return 0;
    }

    update_post_meta($post_id, 'tipo', 'livraria');

    return (int) $post_id;
}

function ipim_rbac_install(): void
{
    if (get_option('ipim_rbac_version') === IPIM_RBAC_VERSION) {
        return;
    }

    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset = $wpdb->get_charset_collate();
    $memberships = ipim_rbac_table('ministry_memberships');
    $audit = ipim_rbac_table('audit_log');
    $settings = ipim_rbac_table('ministry_settings');

    dbDelta("CREATE TABLE {$memberships} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        ministry_id bigint(20) unsigned NOT NULL,
        role enum('colaborador','lider') NOT NULL DEFAULT 'colaborador',
        status enum('pending','active','inactive') NOT NULL DEFAULT 'active',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        UNIQUE KEY user_ministry (user_id,ministry_id),
        KEY ministry_role (ministry_id,role,status),
        KEY user_status (user_id,status)
    ) {$charset};");

    dbDelta("CREATE TABLE {$audit} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        actor_id bigint(20) unsigned NOT NULL,
        action varchar(64) NOT NULL,
        target_type varchar(32) NOT NULL,
        target_id bigint(20) unsigned NULL,
        before_json longtext NULL,
        after_json longtext NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY actor_time (actor_id,created_at),
        KEY target (target_type,target_id)
    ) {$charset};");

    dbDelta("CREATE TABLE {$settings} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        ministry_id bigint(20) unsigned NOT NULL,
        setting_key varchar(64) NOT NULL,
        setting_value longtext NULL,
        updated_by bigint(20) unsigned NOT NULL,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        UNIQUE KEY ministry_key (ministry_id,setting_key),
        KEY ministry (ministry_id)
    ) {$charset};");

    $roles = [
        'assinante' => [
            'label' => 'Assinante',
            'caps' => ['read' => true, 'access_bible_rats' => true],
        ],
        'colaborador_ministerio' => [
            'label' => 'Colaborador de Ministério',
            'caps' => [
                'read' => true,
                'access_bible_rats' => true,
                'participate_schedules' => true,
            ],
        ],
        'lider_ministerio' => [
            'label' => 'Líder de Ministério',
            'caps' => [
                'read' => true,
                'access_bible_rats' => true,
                'manage_own_ministry' => true,
                'manage_own_schedules' => true,
                'view_own_reports' => true,
            ],
        ],
        'pastor' => [
            'label' => 'Pastor',
            'caps' => [
                'read' => true,
                'access_bible_rats' => true,
                'view_all_ministries' => true,
                'manage_all_ministries' => true,
                'manage_prayer_requests' => true,
                'moderate_bible_rats' => true,
                'view_reports' => true,
            ],
        ],
    ];

    foreach ($roles as $slug => $config) {
        ipim_rbac_ensure_role($slug, $config['label'], $config['caps']);
    }

    $admin = get_role('administrator');
    if ($admin) {
        foreach ([
            'access_bible_rats',
            'participate_schedules',
            'manage_own_ministry',
            'manage_own_schedules',
            'view_own_reports',
            'view_all_ministries',
            'manage_all_ministries',
            'manage_prayer_requests',
            'moderate_bible_rats',
            'view_reports',
            'manage_livraria_catalog',
            'upload_livraria_covers',
        ] as $cap) {
            $admin->add_cap($cap, true);
        }
    }

    add_option('1ipim_photo_retention_days', 90);
    add_option('1ipim_default_translation', 'almeida1819');
    add_option('1ipim_enabled_translations', ['almeida1819', 'blivre', 'bpm', 'tb1917']);
    add_option('1ipim_default_schedule_minutes', 120);

    ipim_rbac_ensure_livraria();

    update_option('ipim_rbac_version', IPIM_RBAC_VERSION);
    ipim_rbac_audit(0, 'install', 'system', 0, null, ['version' => IPIM_RBAC_VERSION]);
}

/**
 * Mantém a tabela de vínculos em sincronia com o meta ministries_approved.
 *
 * @param int   $user_id
 * @param mixed $raw JSON ou array de IDs de ministérios aprovados.
 */
function ipim_rbac_sync_memberships(int $user_id, $raw): void
{
    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');

    $approved = is_string($raw) ? json_decode($raw, true) : $raw;
    if (!is_array($approved)) {
        $approved = [];
    }

    $approved = array_values(array_unique(array_filter(array_map('intval', $approved))));
    $user = get_userdata($user_id);
    $roles = $user ? (array) $user->roles : [];
    $membership_role = 'colaborador';
    if (array_intersect($roles, ['administrator', 'pastor', 'editor', 'lider_ministerio'])) {
        $membership_role = 'lider';
    }

    foreach ($approved as $ministry_id) {
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

    if ($approved === []) {
        $wpdb->query($wpdb->prepare(
            "UPDATE {$table} SET status = 'inactive', updated_at = %s WHERE user_id = %d AND status = 'active'",
            current_time('mysql'),
            $user_id
        ));
        return;
    }

    $placeholders = implode(',', array_fill(0, count($approved), '%d'));
    $params = array_merge([current_time('mysql'), $user_id], $approved);
    $wpdb->query($wpdb->prepare(
        "UPDATE {$table} SET status = 'inactive', updated_at = %s
         WHERE user_id = %d AND status = 'active' AND ministry_id NOT IN ({$placeholders})",
        $params
    ));
}

function ipim_rbac_migrate(): array
{
    ipim_rbac_install();

    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    $counts = [
        'users' => 0,
        'roles_added' => 0,
        'memberships' => 0,
        'administrators' => 0,
        'errors' => [],
    ];

    $users = get_users(['fields' => 'all']);
    foreach ($users as $user) {
        $counts['users']++;
        $roles = (array) $user->roles;

        if (in_array('administrator', $roles, true)) {
            $counts['administrators']++;
        }

        $new_role = null;
        if (in_array('pastor', $roles, true)) {
            $new_role = 'pastor';
        } elseif (in_array('editor', $roles, true)) {
            $new_role = 'lider_ministerio';
        } elseif (in_array('contributor', $roles, true)) {
            $new_role = 'colaborador_ministerio';
        } elseif (in_array('subscriber', $roles, true)) {
            $new_role = 'assinante';
        }

        if ($new_role && !in_array($new_role, $roles, true)) {
            $user->add_role($new_role);
            $counts['roles_added']++;
        }

        $approved = get_user_meta($user->ID, 'ministries_approved', true);
        $before = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table} WHERE user_id = %d",
            $user->ID
        ));

        ipim_rbac_sync_memberships($user->ID, $approved);

        $after = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$table} WHERE user_id = %d",
            $user->ID
        ));
        $counts['memberships'] += max(0, (int) $after - (int) $before);

        if ($wpdb->last_error) {
            $counts['errors'][] = $user->ID . ': ' . $wpdb->last_error;
        }
    }

    update_option('ipim_rbac_migrated_at', current_time('mysql'));
    ipim_rbac_audit(0, 'migrate', 'system', 0, null, $counts);

    return $counts;
}

function ipim_rbac_is_admin(): bool
{
    return current_user_can('manage_options');
}

function ipim_rbac_is_pastor(): bool
{
    return current_user_can('view_all_ministries');
}

function ipim_rbac_can_view_ministry(int $user_id, int $ministry_id): bool
{
    if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
        return true;
    }

    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');

    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$table} WHERE user_id = %d AND ministry_id = %d AND status = 'active'",
        $user_id,
        $ministry_id
    ));
}

function ipim_rbac_can_manage_ministry(int $user_id, int $ministry_id): bool
{
    if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
        return true;
    }

    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');

    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$table} WHERE user_id = %d AND ministry_id = %d AND role = 'lider' AND status = 'active'",
        $user_id,
        $ministry_id
    ));
}

function ipim_rbac_require_ministry_scope(int $ministry_id, string $level = 'view'): void
{
    $user_id = get_current_user_id();
    $allowed = $level === 'manage'
        ? ipim_rbac_can_manage_ministry($user_id, $ministry_id)
        : ipim_rbac_can_view_ministry($user_id, $ministry_id);

    if (!$allowed) {
        wp_send_json_error(
            ['error' => 'forbidden', 'ministry_id' => $ministry_id],
            403
        );
    }
}

function ipim_rbac_ministry_type(int $ministry_id): string
{
    $type = get_post_meta($ministry_id, 'tipo', true);
    if (!$type) {
        $type = get_post_meta($ministry_id, 'tipo_ministerio', true);
    }
    if (!$type) {
        $type = get_term_meta($ministry_id, 'tipo', true);
    }

    return $type ? (string) $type : 'geral';
}

function ipim_rbac_status(): array
{
    global $wpdb;
    $memberships = ipim_rbac_table('ministry_memberships');
    $audit = ipim_rbac_table('audit_log');
    $settings = ipim_rbac_table('ministry_settings');
    $user_counts = count_users();

    return [
        'version' => get_option('ipim_rbac_version'),
        'migrated_at' => get_option('ipim_rbac_migrated_at'),
        'users_total' => $user_counts['total_users'] ?? 0,
        'roles' => $user_counts['avail_roles'] ?? [],
        'memberships' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$memberships}"),
        'memberships_active' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$memberships} WHERE status = 'active'"),
        'audit_rows' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$audit}"),
        'settings_rows' => (int) $wpdb->get_var("SELECT COUNT(*) FROM {$settings}"),
        'tables' => [
            'memberships' => (bool) $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $memberships)),
            'audit' => (bool) $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $audit)),
            'settings' => (bool) $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $settings)),
        ],
    ];
}

function ipim_rbac_admin_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }

    if (isset($_POST['ipim_rbac_migrate']) && check_admin_referer('ipim_rbac_migrate')) {
        $counts = ipim_rbac_migrate();
        echo '<div class="notice notice-success"><p>Migração concluída: ' .
            esc_html(wp_json_encode($counts, JSON_UNESCAPED_UNICODE)) . '</p></div>';
    }

    $status = ipim_rbac_status();
    ?>
    <div class="wrap">
        <h1>1IPIM RBAC</h1>
        <p>Papéis, vínculos por ministério e auditoria do portal.</p>
        <h2>Status</h2>
        <pre><?php echo esc_html(wp_json_encode($status, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)); ?></pre>
        <form method="post">
            <?php wp_nonce_field('ipim_rbac_migrate'); ?>
            <p>
                <button type="submit" name="ipim_rbac_migrate" class="button button-primary">
                    Rodar migração de papéis e vínculos
                </button>
            </p>
        </form>
    </div>
    <?php
}

add_action('init', 'ipim_rbac_install', 20);

add_action('admin_menu', function (): void {
    add_management_page('1IPIM RBAC', '1IPIM RBAC', 'manage_options', '1ipim-rbac', 'ipim_rbac_admin_page');
});

add_action('user_register', function (int $user_id): void {
    $user = get_userdata($user_id);
    if (!$user) {
        return;
    }
    $roles = (array) $user->roles;
    if (in_array('subscriber', $roles, true) && !in_array('assinante', $roles, true)) {
        $user->add_role('assinante');
    }
});

add_action('set_user_role', function (int $user_id, string $role, array $old_roles): void {
    $map = [
        'subscriber' => 'assinante',
        'contributor' => 'colaborador_ministerio',
        'editor' => 'lider_ministerio',
        'pastor' => 'pastor',
    ];

    if (isset($map[$role])) {
        $user = get_userdata($user_id);
        if ($user && !in_array($map[$role], (array) $user->roles, true)) {
            $user->add_role($map[$role]);
        }
    }

    ipim_rbac_sync_memberships($user_id, get_user_meta($user_id, 'ministries_approved', true));
}, 10, 3);

add_action('added_user_meta', function ($meta_id, $user_id, $meta_key, $meta_value): void {
    if ($meta_key === 'ministries_approved') {
        ipim_rbac_sync_memberships((int) $user_id, $meta_value);
    }
}, 10, 4);

add_action('updated_user_meta', function ($meta_id, $user_id, $meta_key, $meta_value): void {
    if ($meta_key === 'ministries_approved') {
        ipim_rbac_sync_memberships((int) $user_id, $meta_value);
    }
}, 10, 4);
