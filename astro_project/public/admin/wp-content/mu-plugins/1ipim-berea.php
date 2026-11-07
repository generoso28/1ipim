<?php
/**
 * Plugin Name: 1IPIM Berea
 * Description: Comunidade de leitura Berea: feed, check-ins, diário, salas, plano e moderação.
 * Version: 0.1.0
 * Author: 1IPIM Dev
 *
 * Must-use plugin. O Berea é a camada social da igreja; o Portal continua sendo
 * a fonte oficial dos Pequenos Grupos e dos registros de encontro.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/1ipim-rbac.php';
require_once __DIR__ . '/1ipim-notifications.php';

define('IPIM_BEREA_VERSION', '0.1.0');

function ipim_berea_table(string $name): string
{
    global $wpdb;
    return $wpdb->prefix . '1ipim_berea_' . $name;
}

function ipim_berea_origin(): string
{
    return rtrim((string) get_option('ipim_berea_origin', 'https://berea.1ipim.online'), '/');
}

// --------------------------------------------------------------------------
// Instalação
// --------------------------------------------------------------------------

function ipim_berea_install(): void
{
    if (get_option('ipim_berea_version') === IPIM_BEREA_VERSION) {
        return;
    }

    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset = $wpdb->get_charset_collate();
    $rooms = ipim_berea_table('rooms');
    $members = ipim_berea_table('room_members');
    $invites = ipim_berea_table('room_invites');
    $checkins = ipim_berea_table('checkins');
    $checkinRooms = ipim_berea_table('checkin_rooms');
    $comments = ipim_berea_table('comments');
    $reactions = ipim_berea_table('reactions');
    $reports = ipim_berea_table('reports');
    $blocks = ipim_berea_table('blocks');
    $plans = ipim_berea_table('plans');
    $planDays = ipim_berea_table('plan_days');
    $userPlans = ipim_berea_table('user_plans');
    $badges = ipim_berea_table('badges');
    $streaks = ipim_berea_table('streaks');

    dbDelta("CREATE TABLE {$rooms} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        nome varchar(190) NOT NULL,
        slug varchar(190) NOT NULL,
        descricao text NULL,
        codigo varchar(8) NOT NULL,
        tipo enum('livre','pg','ministerio') NOT NULL DEFAULT 'livre',
        privacidade enum('privada','publica') NOT NULL DEFAULT 'privada',
        grupo_id bigint(20) unsigned NULL,
        owner_id bigint(20) unsigned NOT NULL DEFAULT 0,
        imagem varchar(500) NULL,
        postagem enum('membros','moderadores') NOT NULL DEFAULT 'membros',
        status enum('ativa','arquivada') NOT NULL DEFAULT 'ativa',
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY slug (slug),
        UNIQUE KEY codigo (codigo),
        KEY grupo (grupo_id),
        KEY status (status)
    ) {$charset};");

    dbDelta("CREATE TABLE {$members} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        room_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        papel enum('membro','moderador') NOT NULL DEFAULT 'membro',
        status enum('ativo','removido') NOT NULL DEFAULT 'ativo',
        joined_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY room_user (room_id,user_id),
        KEY user_status (user_id,status),
        KEY room_status (room_id,status)
    ) {$charset};");

    dbDelta("CREATE TABLE {$invites} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        room_id bigint(20) unsigned NOT NULL,
        email varchar(190) NOT NULL,
        token varchar(64) NOT NULL,
        invited_by bigint(20) unsigned NOT NULL DEFAULT 0,
        status enum('pendente','aceito','expirado') NOT NULL DEFAULT 'pendente',
        created_at datetime NOT NULL,
        accepted_at datetime NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY token (token),
        KEY room_email (room_id,email),
        KEY status (status)
    ) {$charset};");

    dbDelta("CREATE TABLE {$checkins} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        data date NOT NULL,
        texto text NULL,
        foto_url varchar(500) NULL,
        foto_attachment_id bigint(20) unsigned NULL,
        foto_expira_em datetime NULL,
        visibilidade enum('privado','grupos') NOT NULL DEFAULT 'privado',
        plan_id bigint(20) unsigned NULL,
        plan_day_id bigint(20) unsigned NULL,
        plan_day int(11) NULL,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY user_data (user_id,data),
        KEY user_created (user_id,created_at),
        KEY data (data)
    ) {$charset};");

    dbDelta("CREATE TABLE {$checkinRooms} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        checkin_id bigint(20) unsigned NOT NULL,
        room_id bigint(20) unsigned NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY checkin_room (checkin_id,room_id),
        KEY room (room_id)
    ) {$charset};");

    dbDelta("CREATE TABLE {$comments} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        checkin_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        texto text NOT NULL,
        status enum('ativo','removido') NOT NULL DEFAULT 'ativo',
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY checkin_status (checkin_id,status),
        KEY user (user_id)
    ) {$charset};");

    dbDelta("CREATE TABLE {$reactions} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        alvo_tipo varchar(24) NOT NULL DEFAULT 'checkin',
        alvo_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        tipo varchar(24) NOT NULL DEFAULT 'amem',
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY alvo_user (alvo_tipo,alvo_id,user_id),
        KEY alvo (alvo_tipo,alvo_id)
    ) {$charset};");

    dbDelta("CREATE TABLE {$reports} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        alvo_tipo varchar(24) NOT NULL,
        alvo_id bigint(20) unsigned NOT NULL,
        denunciante_id bigint(20) unsigned NOT NULL,
        motivo varchar(64) NOT NULL,
        detalhe text NULL,
        status enum('aberto','resolvido','ignorado') NOT NULL DEFAULT 'aberto',
        resolvido_por bigint(20) unsigned NOT NULL DEFAULT 0,
        resolvido_em datetime NULL,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY status (status),
        KEY alvo (alvo_tipo,alvo_id),
        KEY denunciante (denunciante_id)
    ) {$charset};");

    dbDelta("CREATE TABLE {$blocks} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        bloqueado_id bigint(20) unsigned NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY user_blocked (user_id,bloqueado_id),
        KEY bloqueado (bloqueado_id)
    ) {$charset};");

    dbDelta("CREATE TABLE {$plans} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        slug varchar(190) NOT NULL,
        titulo varchar(190) NOT NULL,
        descricao text NULL,
        dias int(11) NOT NULL DEFAULT 31,
        traducao varchar(32) NOT NULL DEFAULT 'almeida1819',
        status enum('ativo','inativo') NOT NULL DEFAULT 'ativo',
        created_by bigint(20) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY slug (slug),
        KEY status (status)
    ) {$charset};");

    dbDelta("CREATE TABLE {$planDays} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        plan_id bigint(20) unsigned NOT NULL,
        dia int(11) NOT NULL,
        passagem varchar(190) NOT NULL,
        titulo varchar(190) NOT NULL,
        reflexao text NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY plan_day (plan_id,dia)
    ) {$charset};");

    dbDelta("CREATE TABLE {$userPlans} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        plan_id bigint(20) unsigned NOT NULL,
        started_on date NOT NULL,
        current_day int(11) NOT NULL DEFAULT 1,
        status enum('ativo','concluido','pausado') NOT NULL DEFAULT 'ativo',
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY user_plan (user_id,plan_id),
        KEY user_status (user_id,status)
    ) {$charset};");

    dbDelta("CREATE TABLE {$badges} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        badge varchar(64) NOT NULL,
        concedido_em datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY user_badge (user_id,badge),
        KEY user (user_id)
    ) {$charset};");

    dbDelta("CREATE TABLE {$streaks} (
        user_id bigint(20) unsigned NOT NULL,
        atual int(11) NOT NULL DEFAULT 0,
        recorde int(11) NOT NULL DEFAULT 0,
        ultimo_checkin date NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (user_id)
    ) {$charset};");

    add_option('ipim_berea_origin', 'https://berea.1ipim.online');
    add_option('ipim_berea_day_cutoff', '00:00');
    add_option('ipim_berea_rankings_enabled', 1);
    update_option('ipim_berea_version', IPIM_BEREA_VERSION);

    ipim_berea_install_roles();
    ipim_berea_seed_plan();
    ipim_berea_sync_pg_rooms();

    ipim_rbac_audit(0, 'berea_install', 'system', 0, null, ['version' => IPIM_BEREA_VERSION]);
}
// Depois dos PGs (init 20/21) e do RBAC (init 20).
add_action('init', 'ipim_berea_install', 25);

/**
 * Papéis criados nesta fase: conteudista e moderador do Berea.
 */
function ipim_berea_install_roles(): void
{
    ipim_rbac_ensure_role('conteudista_berea', 'Conteudista Berea', [
        'read' => true,
        'access_bible_rats' => true,
        'manage_berea_content' => true,
    ]);

    ipim_rbac_ensure_role('moderador_berea', 'Moderador Berea', [
        'read' => true,
        'access_bible_rats' => true,
        'moderate_berea' => true,
    ]);

    $admin = get_role('administrator');
    if ($admin) {
        $admin->add_cap('manage_berea_content', true);
        $admin->add_cap('moderate_berea', true);
        $admin->add_cap('access_bible_rats', true);
    }
}

/**
 * Primeiro plano: Provérbios em 31 dias.
 */
function ipim_berea_seed_plan(): void
{
    global $wpdb;
    $plans = ipim_berea_table('plans');
    $planDays = ipim_berea_table('plan_days');

    $existing = (int) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$plans} WHERE slug=%s", 'proverbios-31'));
    if ($existing > 0) {
        return;
    }

    $now = current_time('mysql');
    $wpdb->insert($plans, [
        'slug' => 'proverbios-31',
        'titulo' => 'Provérbios em 31 dias',
        'descricao' => 'Um capítulo por dia. Leia, observe e escreva o que chamou sua atenção.',
        'dias' => 31,
        'traducao' => (string) get_option('1ipim_default_translation', 'almeida1819'),
        'status' => 'ativo',
        'created_by' => 0,
        'created_at' => $now,
        'updated_at' => $now,
    ], ['%s','%s','%s','%d','%s','%s','%d','%s','%s']);

    $plan_id = (int) $wpdb->insert_id;
    if ($plan_id <= 0) {
        return;
    }

    $questions = [
        'O que este capítulo ensina sobre sabedoria?',
        'Que atitude você precisa abandonar hoje?',
        'Onde você vê a disciplina de Deus em sua vida?',
        'Que palavra você precisa guardar no coração?',
        'Como aplicar esta verdade em casa?',
        'Que conselho você daria a alguém com base neste texto?',
        'O que este capítulo revela sobre o temor do Senhor?',
    ];

    for ($dia = 1; $dia <= 31; $dia++) {
        $wpdb->insert($planDays, [
            'plan_id' => $plan_id,
            'dia' => $dia,
            'passagem' => 'Provérbios ' . $dia,
            'titulo' => 'Provérbios ' . $dia,
            'reflexao' => $questions[($dia - 1) % count($questions)],
        ], ['%d','%d','%s','%s','%s']);
    }
}

// --------------------------------------------------------------------------
// Acesso e papéis
// --------------------------------------------------------------------------

function ipim_berea_user_can_access(int $user_id = 0): bool
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0) {
        return false;
    }

    if (get_user_meta($user_id, '_ipim_account_type', true) === 'bible_rats'
        && get_user_meta($user_id, '_ipim_email_verified', true) !== '1') {
        return false;
    }

    return user_can($user_id, 'read') || user_can($user_id, 'manage_options');
}

function ipim_berea_rest_access(): bool
{
    return is_user_logged_in() && ipim_berea_user_can_access();
}

function ipim_berea_can_manage_content(int $user_id = 0): bool
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    return $user_id > 0
        && (user_can($user_id, 'manage_berea_content') || user_can($user_id, 'manage_options'));
}

/**
 * Líder do ministério de PGs (delegado por admin/pastor).
 */
function ipim_berea_is_pg_ministry_leader(int $user_id = 0): bool
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0 || !function_exists('ipim_grupos_ensure_ministry')) {
        return false;
    }
    $ministry_id = ipim_grupos_ensure_ministry();
    return $ministry_id > 0 && ipim_rbac_can_manage_ministry($user_id, $ministry_id);
}

/**
 * Moderadores globais: admin/pastor + líder do ministério de PGs.
 */
function ipim_berea_is_global_moderator(int $user_id = 0): bool
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0) {
        return false;
    }

    return user_can($user_id, 'manage_options')
        || user_can($user_id, 'view_all_ministries')
        || ipim_berea_is_pg_ministry_leader($user_id);
}

function ipim_berea_user_leads_group(int $user_id, int $grupo_id): bool
{
    if ($user_id <= 0 || $grupo_id <= 0) {
        return false;
    }
    global $wpdb;
    $table = $wpdb->prefix . '1ipim_grupo_lideres';
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$table} WHERE grupo_id=%d AND user_id=%d LIMIT 1",
        $grupo_id,
        $user_id
    ));
}

function ipim_berea_room_row(int $room_id): ?object
{
    global $wpdb;
    $table = ipim_berea_table('rooms');
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $room_id));
    return $row ?: null;
}

function ipim_berea_room_role(int $room_id, int $user_id): string
{
    if ($room_id <= 0 || $user_id <= 0) {
        return '';
    }
    global $wpdb;
    $table = ipim_berea_table('room_members');
    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT papel FROM {$table} WHERE room_id=%d AND user_id=%d AND status='ativo'",
        $room_id,
        $user_id
    ));
    return $row ? (string) $row->papel : '';
}

function ipim_berea_is_room_member(int $room_id, int $user_id): bool
{
    return ipim_berea_room_role($room_id, $user_id) !== '';
}

function ipim_berea_can_moderate_room(int $room_id, int $user_id = 0): bool
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0 || $room_id <= 0) {
        return false;
    }
    if (ipim_berea_is_global_moderator($user_id)) {
        return true;
    }

    $room = ipim_berea_room_row($room_id);
    if (!$room) {
        return false;
    }
    if ((int) $room->owner_id === $user_id) {
        return true;
    }
    if (ipim_berea_room_role($room_id, $user_id) === 'moderador') {
        return true;
    }
    if ((string) $room->tipo === 'pg' && (int) $room->grupo_id > 0) {
        return ipim_berea_user_leads_group($user_id, (int) $room->grupo_id);
    }

    return false;
}

function ipim_berea_can_moderate_any(int $user_id = 0): bool
{
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0) {
        return false;
    }
    if (ipim_berea_is_global_moderator($user_id) || user_can($user_id, 'moderate_berea')) {
        return true;
    }

    global $wpdb;
    $members = ipim_berea_table('room_members');
    if ((bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$members} WHERE user_id=%d AND status='ativo' AND papel='moderador' LIMIT 1",
        $user_id
    ))) {
        return true;
    }

    $rooms = ipim_berea_table('rooms');
    if ((bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$rooms} WHERE owner_id=%d LIMIT 1",
        $user_id
    ))) {
        return true;
    }

    if (function_exists('ipim_grupos_user_leads_any')) {
        return ipim_grupos_user_leads_any($user_id);
    }
    return false;
}

// --------------------------------------------------------------------------
// Data, streak e badges
// --------------------------------------------------------------------------

function ipim_berea_user_timezone(int $user_id): string
{
    $tz = (string) get_user_meta($user_id, '_ipim_berea_timezone', true);
    if ($tz === '') {
        $tz = (string) get_option('timezone_string', 'America/Sao_Paulo');
    }
    try {
        new DateTimeZone($tz);
        return $tz;
    } catch (Throwable $e) {
        return 'America/Sao_Paulo';
    }
}

/**
 * Data local do usuário, respeitando o limite do dia (ex.: 04:00).
 */
function ipim_berea_user_today(int $user_id): string
{
    $cutoff = (string) get_user_meta($user_id, '_ipim_berea_day_cutoff', true);
    if ($cutoff === '') {
        $cutoff = (string) get_option('ipim_berea_day_cutoff', '00:00');
    }

    $now = new DateTimeImmutable('now', new DateTimeZone(ipim_berea_user_timezone($user_id)));
    if (preg_match('/^(\d{2}):(\d{2})$/', $cutoff, $m)) {
        $limit = $now->setTime((int) $m[1], (int) $m[2], 0);
        if ($now < $limit) {
            $now = $now->modify('-1 day');
        }
    }

    return $now->format('Y-m-d');
}

function ipim_berea_streak(int $user_id): array
{
    global $wpdb;
    $table = ipim_berea_table('streaks');
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE user_id=%d", $user_id));
    return [
        'atual' => $row ? (int) $row->atual : 0,
        'recorde' => $row ? (int) $row->recorde : 0,
        'ultimo_checkin' => $row ? (string) $row->ultimo_checkin : '',
    ];
}

function ipim_berea_register_checkin_streak(int $user_id, string $date): array
{
    global $wpdb;
    $table = ipim_berea_table('streaks');
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE user_id=%d", $user_id));
    $atual = $row ? (int) $row->atual : 0;
    $recorde = $row ? (int) $row->recorde : 0;
    $ultimo = $row ? (string) $row->ultimo_checkin : '';

    $yesterday = (new DateTimeImmutable($date))->modify('-1 day')->format('Y-m-d');
    if ($ultimo === $date) {
        // Já contou hoje.
    } elseif ($ultimo === $yesterday) {
        $atual++;
    } else {
        $atual = 1;
    }
    $recorde = max($recorde, $atual);

    $now = current_time('mysql');
    if ($row) {
        $wpdb->update($table, [
            'atual' => $atual,
            'recorde' => $recorde,
            'ultimo_checkin' => $date,
            'updated_at' => $now,
        ], ['user_id' => $user_id], ['%d','%d','%s','%s'], ['%d']);
    } else {
        $wpdb->insert($table, [
            'user_id' => $user_id,
            'atual' => $atual,
            'recorde' => $recorde,
            'ultimo_checkin' => $date,
            'updated_at' => $now,
        ], ['%d','%d','%d','%s','%s']);
    }

    ipim_berea_grant_badges($user_id, $atual);

    return ['atual' => $atual, 'recorde' => $recorde, 'ultimo_checkin' => $date];
}

function ipim_berea_badge_catalog(): array
{
    return [
        'primeiro_checkin' => ['label' => 'Primeiro check-in', 'icon' => 'auto_awesome', 'dias' => 1],
        'streak_7' => ['label' => '7 dias seguidos', 'icon' => 'local_fire_department', 'dias' => 7],
        'streak_30' => ['label' => '30 dias seguidos', 'icon' => 'workspace_premium', 'dias' => 30],
        'streak_100' => ['label' => '100 dias seguidos', 'icon' => 'military_tech', 'dias' => 100],
        'streak_365' => ['label' => '365 dias seguidos', 'icon' => 'diamond', 'dias' => 365],
    ];
}

function ipim_berea_grant_badges(int $user_id, int $streak): void
{
    global $wpdb;
    $table = ipim_berea_table('badges');
    foreach (ipim_berea_badge_catalog() as $badge => $config) {
        if ($streak < (int) $config['dias']) {
            continue;
        }
        $exists = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table} WHERE user_id=%d AND badge=%s",
            $user_id,
            $badge
        ));
        if ($exists > 0) {
            continue;
        }
        $wpdb->insert($table, [
            'user_id' => $user_id,
            'badge' => $badge,
            'concedido_em' => current_time('mysql'),
        ], ['%d','%s','%s']);
        ipim_notify($user_id, 'berea_badge', 'Nova conquista no Berea', $config['label'], ipim_berea_origin() . '/perfil');
    }
}

function ipim_berea_badges(int $user_id): array
{
    global $wpdb;
    $table = ipim_berea_table('badges');
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT badge, concedido_em FROM {$table} WHERE user_id=%d ORDER BY concedido_em ASC",
        $user_id
    ), ARRAY_A);
    $catalog = ipim_berea_badge_catalog();
    $out = [];
    foreach ($rows ?: [] as $row) {
        $key = (string) $row['badge'];
        $out[] = [
            'badge' => $key,
            'label' => $catalog[$key]['label'] ?? $key,
            'icon' => $catalog[$key]['icon'] ?? 'star',
            'concedido_em' => (string) $row['concedido_em'],
        ];
    }
    return $out;
}

// --------------------------------------------------------------------------
// Serialização
// --------------------------------------------------------------------------

function ipim_berea_user_public(int $user_id): array
{
    $user = get_userdata($user_id);
    $avatar = (string) get_user_meta($user_id, '_ipim_berea_avatar_url', true);
    $name = $user instanceof WP_User ? (string) $user->display_name : 'Membro';
    $initials = '';
    foreach (preg_split('/\s+/', trim($name)) ?: [] as $part) {
        if ($part !== '') {
            $initials .= mb_strtoupper(mb_substr($part, 0, 1));
        }
        if (mb_strlen($initials) >= 2) {
            break;
        }
    }

    return [
        'id' => $user_id,
        'nome' => $name,
        'avatar' => $avatar,
        'iniciais' => $initials !== '' ? $initials : '?',
    ];
}

function ipim_berea_room_public(object $room, int $user_id): array
{
    global $wpdb;
    $members = ipim_berea_table('room_members');
    $count = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$members} WHERE room_id=%d AND status='ativo'",
        (int) $room->id
    ));
    $role = ipim_berea_room_role((int) $room->id, $user_id);
    $group_name = '';
    if ((int) $room->grupo_id > 0) {
        $group = $wpdb->get_row($wpdb->prepare(
            "SELECT nome FROM {$wpdb->prefix}1ipim_grupos WHERE id=%d",
            (int) $room->grupo_id
        ));
        $group_name = $group ? (string) $group->nome : '';
    }

    return [
        'id' => (int) $room->id,
        'nome' => (string) $room->nome,
        'slug' => (string) $room->slug,
        'descricao' => (string) $room->descricao,
        'codigo' => ipim_berea_is_room_member((int) $room->id, $user_id) ? (string) $room->codigo : '',
        'tipo' => (string) $room->tipo,
        'privacidade' => (string) $room->privacidade,
        'grupo_id' => (int) $room->grupo_id,
        'grupo_nome' => $group_name,
        'owner_id' => (int) $room->owner_id,
        'imagem' => (string) $room->imagem,
        'postagem' => (string) $room->postagem,
        'membros' => $count,
        'is_member' => $role !== '',
        'papel' => $role,
        'can_moderate' => ipim_berea_can_moderate_room((int) $room->id, $user_id),
        'created_at' => (string) $room->created_at,
    ];
}

function ipim_berea_reaction_counts(int $checkin_id, int $user_id): array
{
    global $wpdb;
    $table = ipim_berea_table('reactions');
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT tipo, COUNT(*) AS total FROM {$table}
         WHERE alvo_tipo='checkin' AND alvo_id=%d GROUP BY tipo",
        $checkin_id
    ), ARRAY_A);
    $counts = [];
    foreach ($rows ?: [] as $row) {
        $counts[(string) $row['tipo']] = (int) $row['total'];
    }
    $mine = (string) $wpdb->get_var($wpdb->prepare(
        "SELECT tipo FROM {$table} WHERE alvo_tipo='checkin' AND alvo_id=%d AND user_id=%d",
        $checkin_id,
        $user_id
    ));
    return ['counts' => $counts, 'mine' => $mine];
}

function ipim_berea_checkin_rooms(int $checkin_id): array
{
    global $wpdb;
    $checkinRooms = ipim_berea_table('checkin_rooms');
    $rooms = ipim_berea_table('rooms');
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT r.id, r.nome, r.codigo, r.tipo FROM {$checkinRooms} cr
         INNER JOIN {$rooms} r ON r.id = cr.room_id
         WHERE cr.checkin_id=%d ORDER BY r.nome",
        $checkin_id
    ), ARRAY_A);
    return array_map(static fn (array $row): array => [
        'id' => (int) $row['id'],
        'nome' => (string) $row['nome'],
        'codigo' => (string) $row['codigo'],
        'tipo' => (string) $row['tipo'],
    ], $rows ?: []);
}

function ipim_berea_checkin_payload(object $row, int $user_id): array
{
    global $wpdb;
    $comments = ipim_berea_table('comments');
    $comment_count = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$comments} WHERE checkin_id=%d AND status='ativo'",
        (int) $row->id
    ));
    $reactions = ipim_berea_reaction_counts((int) $row->id, $user_id);

    $plan_title = '';
    if ((int) $row->plan_day > 0) {
        $plans = ipim_berea_table('plans');
        $plan = $wpdb->get_row($wpdb->prepare(
            "SELECT titulo FROM {$plans} WHERE id=%d",
            (int) $row->plan_id
        ));
        $plan_title = $plan ? (string) $plan->titulo : '';
    }

    return [
        'tipo' => 'checkin',
        'id' => (int) $row->id,
        'data' => (string) $row->data,
        'texto' => (string) $row->texto,
        'foto_url' => (string) $row->foto_url,
        'foto_expira_em' => (string) $row->foto_expira_em,
        'visibilidade' => (string) $row->visibilidade,
        'autor' => ipim_berea_user_public((int) $row->user_id),
        'rooms' => ipim_berea_checkin_rooms((int) $row->id),
        'plan_day' => $row->plan_day === null ? null : (int) $row->plan_day,
        'plan_titulo' => $plan_title,
        'comentarios' => $comment_count,
        'reacoes' => $reactions['counts'],
        'minha_reacao' => $reactions['mine'],
        'is_own' => (int) $row->user_id === $user_id,
        'created_at' => (string) $row->created_at,
        'updated_at' => (string) $row->updated_at,
    ];
}

function ipim_berea_encounter_payload(object $row, string $group_name): array
{
    global $wpdb;
    $presence = $wpdb->prefix . '1ipim_grupo_encontro_presenca';
    $names = $wpdb->get_col($wpdb->prepare(
        "SELECT nome FROM {$presence} WHERE encontro_id=%d ORDER BY id",
        (int) $row->id
    ));

    return [
        'tipo' => 'encontro',
        'id' => (int) $row->id,
        'data' => (string) $row->data,
        'texto_lido' => (string) $row->texto_lido,
        'tema' => (string) $row->tema,
        'preletor' => (string) $row->preletor,
        'foto_url' => (string) $row->foto_url,
        'observacoes' => (string) $row->observacoes,
        'publico_presente' => (int) $row->publico_presente,
        'presentes' => array_map('strval', $names ?: []),
        'grupo_nome' => $group_name,
        'created_at' => (string) $row->created_at,
    ];
}

// --------------------------------------------------------------------------
// Salas (inclui salas dos PGs)
// --------------------------------------------------------------------------

function ipim_berea_random_code(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < 5; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $code;
}

function ipim_berea_unique_code(): string
{
    global $wpdb;
    $table = ipim_berea_table('rooms');
    for ($attempt = 0; $attempt < 20; $attempt++) {
        $code = ipim_berea_random_code();
        $exists = (int) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$table} WHERE codigo=%s", $code));
        if ($exists <= 0) {
            return $code;
        }
    }
    return strtoupper(substr(md5((string) microtime(true)), 0, 5));
}

function ipim_berea_unique_room_slug(string $name): string
{
    global $wpdb;
    $table = ipim_berea_table('rooms');
    $base = sanitize_title($name) ?: 'sala';
    $slug = $base;
    $i = 2;
    while ((int) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$table} WHERE slug=%s", $slug)) > 0) {
        $slug = $base . '-' . $i;
        $i++;
    }
    return $slug;
}

function ipim_berea_create_room(array $data): int
{
    global $wpdb;
    $table = ipim_berea_table('rooms');
    $members = ipim_berea_table('room_members');
    $now = current_time('mysql');
    $name = trim((string) ($data['nome'] ?? 'Nova sala'));
    if ($name === '') {
        $name = 'Nova sala';
    }

    $wpdb->insert($table, [
        'nome' => $name,
        'slug' => ipim_berea_unique_room_slug($name),
        'descricao' => (string) ($data['descricao'] ?? ''),
        'codigo' => ipim_berea_unique_code(),
        'tipo' => in_array($data['tipo'] ?? 'livre', ['livre','pg','ministerio'], true) ? $data['tipo'] : 'livre',
        'privacidade' => ($data['privacidade'] ?? 'privada') === 'publica' ? 'publica' : 'privada',
        'grupo_id' => !empty($data['grupo_id']) ? (int) $data['grupo_id'] : null,
        'owner_id' => (int) ($data['owner_id'] ?? 0),
        'imagem' => (string) ($data['imagem'] ?? ''),
        'postagem' => ($data['postagem'] ?? 'membros') === 'moderadores' ? 'moderadores' : 'membros',
        'status' => 'ativa',
        'created_at' => $now,
        'updated_at' => $now,
    ], ['%s','%s','%s','%s','%s','%s','%d','%d','%s','%s','%s','%s','%s']);

    $room_id = (int) $wpdb->insert_id;
    if ($room_id <= 0) {
        return 0;
    }

    $owner = (int) ($data['owner_id'] ?? 0);
    if ($owner > 0) {
        ipim_berea_add_member($room_id, $owner, 'moderador');
    }

    return $room_id;
}

function ipim_berea_add_member(int $room_id, int $user_id, string $role = 'membro'): void
{
    if ($room_id <= 0 || $user_id <= 0) {
        return;
    }
    global $wpdb;
    $table = ipim_berea_table('room_members');
    $now = current_time('mysql');
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT id, papel, status FROM {$table} WHERE room_id=%d AND user_id=%d",
        $room_id,
        $user_id
    ));
    $role = $role === 'moderador' ? 'moderador' : 'membro';

    if ($existing) {
        $wpdb->update($table, [
            'papel' => $role === 'moderador' ? 'moderador' : (string) $existing->papel,
            'status' => 'ativo',
            'updated_at' => $now,
        ], ['id' => (int) $existing->id], ['%s','%s','%s'], ['%d']);
        return;
    }

    $wpdb->insert($table, [
        'room_id' => $room_id,
        'user_id' => $user_id,
        'papel' => $role,
        'status' => 'ativo',
        'joined_at' => $now,
        'updated_at' => $now,
    ], ['%d','%d','%s','%s','%s','%s']);
}

/**
 * Garante uma sala para cada PG ativo e grava o vínculo em 1ipim_grupos.room_id.
 */
function ipim_berea_sync_pg_rooms(): array
{
    global $wpdb;
    $groups_table = $wpdb->prefix . '1ipim_grupos';
    $leaders_table = $wpdb->prefix . '1ipim_grupo_lideres';
    $rooms_table = ipim_berea_table('rooms');

    if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $groups_table)) !== $groups_table) {
        return ['created' => 0, 'linked' => 0];
    }

    $groups = $wpdb->get_results("SELECT * FROM {$groups_table} WHERE status='ativo'");
    $created = 0;
    $linked = 0;

    foreach ($groups ?: [] as $group) {
        $room_id = (int) $group->room_id;
        if ($room_id > 0) {
            $exists = (int) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$rooms_table} WHERE id=%d", $room_id));
            if ($exists > 0) {
                $linked++;
                continue;
            }
        }

        // Reaproveita sala já vinculada ao grupo.
        $existing_room = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$rooms_table} WHERE grupo_id=%d AND tipo='pg' LIMIT 1",
            (int) $group->id
        ));
        if ($existing_room) {
            $wpdb->update($groups_table, ['room_id' => (int) $existing_room->id], ['id' => (int) $group->id], ['%d'], ['%d']);
            $linked++;
            continue;
        }

        $leader_ids = $wpdb->get_col($wpdb->prepare(
            "SELECT user_id FROM {$leaders_table} WHERE grupo_id=%d ORDER BY papel='lider' DESC, id",
            (int) $group->id
        ));
        $owner_id = !empty($leader_ids) ? (int) $leader_ids[0] : 0;

        $room_id = ipim_berea_create_room([
            'nome' => (string) $group->nome,
            'descricao' => (string) $group->descricao,
            'tipo' => 'pg',
            'privacidade' => 'privada',
            'grupo_id' => (int) $group->id,
            'owner_id' => $owner_id,
            'imagem' => (string) $group->imagem,
        ]);

        if ($room_id <= 0) {
            continue;
        }

        foreach ($leader_ids ?: [] as $leader_id) {
            ipim_berea_add_member($room_id, (int) $leader_id, 'moderador');
        }

        $wpdb->update($groups_table, ['room_id' => $room_id], ['id' => (int) $group->id], ['%d'], ['%d']);
        $created++;
    }

    return ['created' => $created, 'linked' => $linked];
}

// --------------------------------------------------------------------------
// Fotos (compressão, EXIF e retenção)
// --------------------------------------------------------------------------

/**
 * Recebe o arquivo enviado, limita a 1600 px, recomprime (remove EXIF) e
 * garante no máximo ~500 KB. Devolve URL + attachment.
 *
 * @param array<string,mixed> $file
 * @return array{url:string,attachment_id:int,expira_em:string}|null
 */
function ipim_berea_process_photo(array $file, string $title): ?array
{
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $upload = wp_handle_upload($file, ['test_form' => false]);
    if (!is_array($upload) || isset($upload['error'])) {
        return null;
    }

    $path = (string) $upload['file'];
    $editor = wp_get_image_editor($path);
    if (!is_wp_error($editor)) {
        $size = $editor->get_size();
        if ((int) $size['width'] > 1600 || (int) $size['height'] > 1600) {
            $editor->resize(1600, 1600, false);
        }

        foreach ([82, 72, 62, 52, 42] as $quality) {
            $editor->set_quality($quality);
            $saved = $editor->save($path);
            if (is_wp_error($saved)) {
                break;
            }
            clearstatcache(true, $path);
            if ((int) filesize($path) <= 512000) {
                break;
            }
        }
    }

    $mime = (string) ($upload['type'] ?? 'image/jpeg');
    $attachment_id = wp_insert_attachment([
        'post_mime_type' => $mime,
        'post_title' => sanitize_text_field($title),
        'post_content' => '',
        'post_status' => 'inherit',
    ], $path, 0);

    if (is_wp_error($attachment_id)) {
        return null;
    }

    wp_update_attachment_metadata(
        (int) $attachment_id,
        wp_generate_attachment_metadata((int) $attachment_id, $path)
    );
    update_post_meta((int) $attachment_id, '_wp_attachment_image_alt', sanitize_text_field($title));
    update_post_meta((int) $attachment_id, '_ipim_berea_photo', '1');

    $days = max(1, (int) get_option('1ipim_photo_retention_days', 90));
    $expires = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
        ->modify('+' . $days . ' days')
        ->format('Y-m-d H:i:s');

    return [
        'url' => (string) wp_get_attachment_url((int) $attachment_id),
        'attachment_id' => (int) $attachment_id,
        'expira_em' => $expires,
    ];
}

function ipim_berea_cleanup_photos(): void
{
    global $wpdb;
    $table = ipim_berea_table('checkins');
    $rows = $wpdb->get_results(
        "SELECT id, foto_attachment_id FROM {$table}
         WHERE foto_attachment_id IS NOT NULL AND foto_expira_em IS NOT NULL
           AND foto_expira_em < UTC_TIMESTAMP()"
    );

    foreach ($rows ?: [] as $row) {
        wp_delete_attachment((int) $row->foto_attachment_id, true);
        $wpdb->update($table, [
            'foto_url' => '',
            'foto_attachment_id' => null,
            'foto_expira_em' => null,
        ], ['id' => (int) $row->id], ['%s','%d','%s'], ['%d']);
        ipim_rbac_audit(0, 'berea_photo_expire', 'berea_checkin', (int) $row->id, null, null);
    }
}
add_action('ipim_berea_cleanup_photos', 'ipim_berea_cleanup_photos');
add_action('init', static function (): void {
    if (!wp_next_scheduled('ipim_berea_cleanup_photos')) {
        wp_schedule_event(time() + 3600, 'daily', 'ipim_berea_cleanup_photos');
    }
}, 30);

// --------------------------------------------------------------------------
// Plano de leitura
// --------------------------------------------------------------------------

function ipim_berea_active_user_plan(int $user_id): ?object
{
    global $wpdb;
    $userPlans = ipim_berea_table('user_plans');
    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$userPlans} WHERE user_id=%d AND status='ativo' ORDER BY id DESC LIMIT 1",
        $user_id
    ));
    return $row ?: null;
}

function ipim_berea_plan_payload(int $plan_id, int $user_id): ?array
{
    global $wpdb;
    $plans = ipim_berea_table('plans');
    $days_table = ipim_berea_table('plan_days');
    $userPlans = ipim_berea_table('user_plans');
    $checkins = ipim_berea_table('checkins');

    $plan = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$plans} WHERE id=%d", $plan_id));
    if (!$plan) {
        return null;
    }

    $days = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$days_table} WHERE plan_id=%d ORDER BY dia",
        $plan_id
    ), ARRAY_A);

    $progress = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$userPlans} WHERE user_id=%d AND plan_id=%d",
        $user_id,
        $plan_id
    ));
    $started = $progress ? (string) $progress->started_on : '';
    $today = ipim_berea_user_today($user_id);
    $current_day = 1;
    if ($started !== '') {
        $diff = (new DateTimeImmutable($today))->diff(new DateTimeImmutable($started))->days;
        $current_day = min((int) $plan->dias, max(1, $diff + 1));
    }

    $done = [];
    $rows = $wpdb->get_col($wpdb->prepare(
        "SELECT plan_day FROM {$checkins} WHERE user_id=%d AND plan_id=%d AND plan_day IS NOT NULL",
        $user_id,
        $plan_id
    ));
    foreach ($rows ?: [] as $day) {
        $done[(int) $day] = true;
    }

    return [
        'id' => (int) $plan->id,
        'slug' => (string) $plan->slug,
        'titulo' => (string) $plan->titulo,
        'descricao' => (string) $plan->descricao,
        'dias' => (int) $plan->dias,
        'traducao' => (string) $plan->traducao,
        'started_on' => $started,
        'current_day' => $current_day,
        'status' => $progress ? (string) $progress->status : 'nao_iniciado',
        'hoje' => $started !== '' ? min((int) $plan->dias, $current_day) : null,
        'days' => array_map(static function (array $day) use ($done): array {
            $n = (int) $day['dia'];
            return [
                'dia' => $n,
                'passagem' => (string) $day['passagem'],
                'titulo' => (string) $day['titulo'],
                'reflexao' => (string) $day['reflexao'],
                'concluido' => isset($done[$n]),
            ];
        }, $days ?: []),
    ];
}

// --------------------------------------------------------------------------
// Visibilidade
// --------------------------------------------------------------------------

function ipim_berea_blocked_ids(int $user_id): array
{
    global $wpdb;
    $table = ipim_berea_table('blocks');
    $ids = $wpdb->get_col($wpdb->prepare(
        "SELECT bloqueado_id FROM {$table} WHERE user_id=%d",
        $user_id
    ));
    return array_map('intval', $ids ?: []);
}

function ipim_berea_can_view_checkin(object $checkin, int $user_id): bool
{
    if ((int) $checkin->user_id === $user_id) {
        return true;
    }
    if (get_post_meta(0, '_noop', true) === '') {
        // no-op para manter leitura simples
    }

    global $wpdb;
    $checkinRooms = ipim_berea_table('checkin_rooms');
    $members = ipim_berea_table('room_members');
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$checkinRooms} cr
         INNER JOIN {$members} m ON m.room_id=cr.room_id
         WHERE cr.checkin_id=%d AND m.user_id=%d AND m.status='ativo'
         LIMIT 1",
        (int) $checkin->id,
        $user_id
    ));
}

function ipim_berea_checkin_row(int $checkin_id): ?object
{
    global $wpdb;
    $table = ipim_berea_table('checkins');
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $checkin_id));
    return $row ?: null;
}

// --------------------------------------------------------------------------
// Feed e check-ins
// --------------------------------------------------------------------------

function ipim_berea_room_ids_for_user(int $user_id): array
{
    global $wpdb;
    $members = ipim_berea_table('room_members');
    $ids = $wpdb->get_col($wpdb->prepare(
        "SELECT room_id FROM {$members} WHERE user_id=%d AND status='ativo'",
        $user_id
    ));
    return array_map('intval', $ids ?: []);
}

function ipim_berea_feed_items(int $user_id, int $room_id, int $page, int $per_page): array
{
    global $wpdb;
    $checkins = ipim_berea_table('checkins');
    $checkinRooms = ipim_berea_table('checkin_rooms');
    $members = ipim_berea_table('room_members');
    $rooms = ipim_berea_table('rooms');
    $encounters = $wpdb->prefix . '1ipim_grupo_encontros';
    $groups = $wpdb->prefix . '1ipim_grupos';

    $offset = max(0, ($page - 1) * $per_page);
    $limit = $per_page * max(1, $page);
    $blocked = ipim_berea_blocked_ids($user_id);
    $blockedSql = '';
    if ($blocked !== []) {
        $blockedSql = ' AND c.user_id NOT IN (' . implode(',', array_map('intval', $blocked)) . ')';
    }

    $sql = "SELECT DISTINCT c.* FROM {$checkins} c
            INNER JOIN {$checkinRooms} cr ON cr.checkin_id = c.id
            INNER JOIN {$members} m ON m.room_id = cr.room_id
            WHERE m.user_id = %d AND m.status = 'ativo' AND c.visibilidade = 'grupos'"
            . $blockedSql;
    $params = [$user_id];
    if ($room_id > 0) {
        $sql .= ' AND cr.room_id = %d';
        $params[] = $room_id;
    }
    $sql .= ' ORDER BY c.data DESC, c.id DESC LIMIT %d';
    $params[] = $limit;

    $rows = $wpdb->get_results($wpdb->prepare($sql, $params));

    $items = [];
    foreach ($rows ?: [] as $row) {
        $items[] = ipim_berea_checkin_payload($row, $user_id);
    }

    // Encontros de PG publicados no feed (opcional pelo líder, no Portal).
    $encSql = "SELECT DISTINCT e.*, g.nome AS grupo_nome FROM {$encounters} e
               INNER JOIN {$groups} g ON g.id = e.grupo_id
               INNER JOIN {$rooms} r ON r.grupo_id = g.id
               INNER JOIN {$members} m ON m.room_id = r.id
               WHERE m.user_id = %d AND m.status = 'ativo' AND e.publicar_feed = 1";
    $encParams = [$user_id];
    if ($room_id > 0) {
        $encSql .= ' AND r.id = %d';
        $encParams[] = $room_id;
    }
    $encSql .= ' ORDER BY e.data DESC, e.id DESC LIMIT %d';
    $encParams[] = $limit;

    $encRows = $wpdb->get_results($wpdb->prepare($encSql, $encParams));
    foreach ($encRows ?: [] as $row) {
        $item = ipim_berea_encounter_payload($row, (string) $row->grupo_nome);
        $item['sort_key'] = (string) $row->data;
        $items[] = $item;
    }

    usort($items, static function (array $a, array $b): int {
        $ka = ($a['sort_key'] ?? $a['data'] ?? '') . ' ' . ($a['id'] ?? 0);
        $kb = ($b['sort_key'] ?? $b['data'] ?? '') . ' ' . ($b['id'] ?? 0);
        return strcmp($kb, $ka);
    });

    return array_slice($items, $offset, $per_page);
}

function ipim_berea_rest_me(): WP_REST_Response
{
    $user_id = get_current_user_id();
    $plan = ipim_berea_active_user_plan($user_id);

    global $wpdb;
    $members = ipim_berea_table('room_members');
    $rooms_table = ipim_berea_table('rooms');
    $room_rows = $wpdb->get_results($wpdb->prepare(
        "SELECT r.* FROM {$rooms_table} r
         INNER JOIN {$members} m ON m.room_id = r.id
         WHERE m.user_id = %d AND m.status = 'ativo' AND r.status = 'ativa'
         ORDER BY r.tipo='pg' DESC, r.nome ASC",
        $user_id
    ));

    $plan_summary = null;
    if ($plan) {
        $payload = ipim_berea_plan_payload((int) $plan->plan_id, $user_id);
        if ($payload) {
            $plan_summary = [
                'id' => $payload['id'],
                'slug' => $payload['slug'],
                'titulo' => $payload['titulo'],
                'dias' => $payload['dias'],
                'current_day' => $payload['current_day'],
                'started_on' => $payload['started_on'],
                'hoje' => $payload['hoje'],
                'concluidos' => count(array_filter($payload['days'], static fn (array $d): bool => (bool) $d['concluido'])),
            ];
        }
    }

    return rest_ensure_response([
        'user' => ipim_berea_user_public($user_id),
        'profile' => [
            'bio' => (string) get_user_meta($user_id, 'description', true),
            'timezone' => ipim_berea_user_timezone($user_id),
            'day_cutoff' => (string) get_user_meta($user_id, '_ipim_berea_day_cutoff', true) ?: (string) get_option('ipim_berea_day_cutoff', '00:00'),
            'ranking_optin' => get_user_meta($user_id, '_ipim_berea_ranking_optin', true) === '1',
            'notifications' => [
                'daily' => get_user_meta($user_id, '_ipim_berea_notify_daily', true) !== '0',
                'activity' => get_user_meta($user_id, '_ipim_berea_notify_activity', true) !== '0',
            ],
        ],
        'streak' => ipim_berea_streak($user_id),
        'badges' => ipim_berea_badges($user_id),
        'rooms' => array_map(static fn (object $row): array => ipim_berea_room_public($row, $user_id), $room_rows ?: []),
        'plan' => $plan_summary,
        'permissions' => [
            'can_manage_content' => ipim_berea_can_manage_content($user_id),
            'can_moderate' => ipim_berea_can_moderate_any($user_id),
            'is_global_moderator' => ipim_berea_is_global_moderator($user_id),
        ],
        'unread_notifications' => function_exists('ipim_notifications_unread_count')
            ? ipim_notifications_unread_count($user_id)
            : 0,
    ]);
}

function ipim_berea_rest_feed(WP_REST_Request $request): WP_REST_Response
{
    $user_id = get_current_user_id();
    $room_id = (int) ($request->get_param('room_id') ?: 0);
    if ($room_id > 0 && !ipim_berea_is_room_member($room_id, $user_id) && !ipim_berea_can_moderate_room($room_id, $user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }
    $page = max(1, (int) ($request->get_param('page') ?: 1));
    $per_page = min(50, max(1, (int) ($request->get_param('per_page') ?: 12)));

    return rest_ensure_response([
        'items' => ipim_berea_feed_items($user_id, $room_id, $page, $per_page),
        'page' => $page,
        'per_page' => $per_page,
    ]);
}

function ipim_berea_rest_diary(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $table = ipim_berea_table('checkins');
    $page = max(1, (int) ($request->get_param('page') ?: 1));
    $per_page = min(50, max(1, (int) ($request->get_param('per_page') ?: 20)));
    $offset = ($page - 1) * $per_page;
    $q = trim((string) $request->get_param('q'));

    $where = 'user_id = %d';
    $params = [$user_id];
    if ($q !== '') {
        $where .= ' AND texto LIKE %s';
        $params[] = '%' . $wpdb->esc_like($q) . '%';
    }

    $total = (int) $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE {$where}", $params));
    $sql = "SELECT * FROM {$table} WHERE {$where} ORDER BY data DESC, id DESC LIMIT %d OFFSET %d";
    $params[] = $per_page;
    $params[] = $offset;
    $rows = $wpdb->get_results($wpdb->prepare($sql, $params));

    return rest_ensure_response([
        'items' => array_map(static fn (object $row): array => ipim_berea_checkin_payload($row, $user_id), $rows ?: []),
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page,
    ]);
}

function ipim_berea_validate_room_ids(int $user_id, $raw): array
{
    if (!is_array($raw)) {
        return [];
    }
    $ids = array_values(array_unique(array_filter(array_map('intval', $raw))));
    if ($ids === []) {
        return [];
    }
    global $wpdb;
    $members = ipim_berea_table('room_members');
    $placeholders = implode(',', array_fill(0, count($ids), '%d'));
    $params = array_merge([$user_id], $ids);
    $allowed = $wpdb->get_col($wpdb->prepare(
        "SELECT room_id FROM {$members} WHERE user_id=%d AND status='ativo' AND room_id IN ({$placeholders})",
        $params
    ));
    return array_map('intval', $allowed ?: []);
}

function ipim_berea_save_checkin_rooms(int $checkin_id, array $room_ids): void
{
    global $wpdb;
    $table = ipim_berea_table('checkin_rooms');
    $wpdb->delete($table, ['checkin_id' => $checkin_id], ['%d']);
    foreach ($room_ids as $room_id) {
        $wpdb->insert($table, [
            'checkin_id' => $checkin_id,
            'room_id' => (int) $room_id,
            'created_at' => current_time('mysql'),
        ], ['%d','%d','%s']);
    }
}

function ipim_berea_rest_checkin_create(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $table = ipim_berea_table('checkins');
    $today = ipim_berea_user_today($user_id);
    $texto = trim(wp_strip_all_tags((string) $request->get_param('texto')));

    if ($texto === '') {
        return new WP_REST_Response(['error' => 'missing_texto', 'message' => 'Escreva uma frase do seu check-in.'], 400);
    }

    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table} WHERE user_id=%d AND data=%s",
        $user_id,
        $today
    ));
    if ($existing) {
        return new WP_REST_Response([
            'error' => 'already_checked_in',
            'message' => 'Você já fez o check-in de hoje.',
            'checkin' => ipim_berea_checkin_payload($existing, $user_id),
        ], 409);
    }

    $room_ids = ipim_berea_validate_room_ids($user_id, $request->get_param('room_ids'));
    $plan_id = (int) ($request->get_param('plan_id') ?: 0);
    $plan_day = (int) ($request->get_param('plan_day') ?: 0);
    if ($plan_id > 0 && $plan_day > 0) {
        $days_table = ipim_berea_table('plan_days');
        $valid = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT 1 FROM {$days_table} WHERE plan_id=%d AND dia=%d",
            $plan_id,
            $plan_day
        ));
        if ($valid <= 0) {
            $plan_id = 0;
            $plan_day = 0;
        }
    } else {
        $plan_id = 0;
        $plan_day = 0;
    }

    $photo = null;
    $files = $request->get_file_params();
    if (!empty($files['foto']) && is_array($files['foto'])) {
        $photo = ipim_berea_process_photo($files['foto'], 'Berea - check-in');
    }

    $now = current_time('mysql');
    $wpdb->insert($table, [
        'user_id' => $user_id,
        'data' => $today,
        'texto' => $texto,
        'foto_url' => $photo['url'] ?? '',
        'foto_attachment_id' => $photo['attachment_id'] ?? null,
        'foto_expira_em' => $photo['expira_em'] ?? null,
        'visibilidade' => $room_ids !== [] ? 'grupos' : 'privado',
        'plan_id' => $plan_id ?: null,
        'plan_day_id' => null,
        'plan_day' => $plan_day ?: null,
        'created_at' => $now,
        'updated_at' => $now,
    ], ['%d','%s','%s','%s','%d','%s','%s','%d','%d','%d','%s','%s']);

    $checkin_id = (int) $wpdb->insert_id;
    if ($checkin_id <= 0) {
        return new WP_REST_Response(['error' => 'insert_failed'], 500);
    }

    ipim_berea_save_checkin_rooms($checkin_id, $room_ids);
    $streak = ipim_berea_register_checkin_streak($user_id, $today);

    if ($plan_id > 0 && $plan_day > 0) {
        $userPlans = ipim_berea_table('user_plans');
        $wpdb->query($wpdb->prepare(
            "UPDATE {$userPlans} SET current_day=GREATEST(current_day,%d), updated_at=%s
             WHERE user_id=%d AND plan_id=%d AND status='ativo'",
            $plan_day,
            $now,
            $user_id,
            $plan_id
        ));
    }

    ipim_rbac_audit($user_id, 'berea_checkin', 'berea_checkin', $checkin_id, null, [
        'data' => $today,
        'rooms' => $room_ids,
        'plan_day' => $plan_day,
    ]);

    $row = ipim_berea_checkin_row($checkin_id);
    return rest_ensure_response([
        'ok' => true,
        'checkin' => $row ? ipim_berea_checkin_payload($row, $user_id) : null,
        'streak' => $streak,
    ]);
}

function ipim_berea_rest_checkin_update(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $checkin_id = (int) $request->get_param('id');
    $row = ipim_berea_checkin_row($checkin_id);
    if (!$row) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if ((int) $row->user_id !== $user_id && !ipim_berea_is_global_moderator($user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $table = ipim_berea_table('checkins');
    $texto = $request->get_param('texto');
    if ($texto !== null) {
        $texto = trim(wp_strip_all_tags((string) $texto));
        if ($texto === '') {
            return new WP_REST_Response(['error' => 'missing_texto'], 400);
        }
    }

    $data = ['updated_at' => current_time('mysql')];
    $formats = ['%s'];
    if ($texto !== null) {
        $data['texto'] = $texto;
        array_unshift($formats, '%s');
    }

    $room_ids = $request->get_param('room_ids');
    if ($room_ids !== null) {
        $room_ids = ipim_berea_validate_room_ids($user_id, $room_ids);
        $data['visibilidade'] = $room_ids !== [] ? 'grupos' : 'privado';
        array_unshift($formats, '%s');
    }

    $wpdb->update($table, $data, ['id' => $checkin_id], $formats, ['%d']);
    if ($room_ids !== null) {
        ipim_berea_save_checkin_rooms($checkin_id, $room_ids);
    }

    ipim_rbac_audit($user_id, 'berea_checkin_update', 'berea_checkin', $checkin_id, null, ['texto' => $texto !== null]);
    $fresh = ipim_berea_checkin_row($checkin_id);
    return rest_ensure_response(['ok' => true, 'checkin' => $fresh ? ipim_berea_checkin_payload($fresh, $user_id) : null]);
}

function ipim_berea_rest_checkin_delete(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $checkin_id = (int) $request->get_param('id');
    $row = ipim_berea_checkin_row($checkin_id);
    if (!$row) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }

    $is_owner = (int) $row->user_id === $user_id;
    $can_moderate = false;
    if (!$is_owner) {
        foreach (ipim_berea_checkin_rooms($checkin_id) as $room) {
            if (ipim_berea_can_moderate_room((int) $room['id'], $user_id)) {
                $can_moderate = true;
                break;
            }
        }
    }
    if (!$is_owner && !$can_moderate && !ipim_berea_is_global_moderator($user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    if ((int) ($row->foto_attachment_id ?? 0) > 0) {
        wp_delete_attachment((int) $row->foto_attachment_id, true);
    }

    $wpdb->delete(ipim_berea_table('checkin_rooms'), ['checkin_id' => $checkin_id], ['%d']);
    $wpdb->delete(ipim_berea_table('comments'), ['checkin_id' => $checkin_id], ['%d']);
    $wpdb->delete(ipim_berea_table('reactions'), ['alvo_tipo' => 'checkin', 'alvo_id' => $checkin_id], ['%s','%d']);
    $wpdb->delete(ipim_berea_table('checkins'), ['id' => $checkin_id], ['%d']);

    ipim_rbac_audit($user_id, 'berea_checkin_delete', 'berea_checkin', $checkin_id, [
        'user_id' => (int) $row->user_id,
        'data' => (string) $row->data,
    ], null);

    return rest_ensure_response(['ok' => true]);
}

// --------------------------------------------------------------------------
// Comentários e reações
// --------------------------------------------------------------------------

function ipim_berea_comment_payload(object $row, int $user_id, int $checkin_id): array
{
    global $wpdb;
    $can_moderate = false;
    foreach (ipim_berea_checkin_rooms($checkin_id) as $room) {
        if (ipim_berea_can_moderate_room((int) $room['id'], $user_id)) {
            $can_moderate = true;
            break;
        }
    }

    return [
        'id' => (int) $row->id,
        'checkin_id' => (int) $row->checkin_id,
        'texto' => (string) $row->texto,
        'status' => (string) $row->status,
        'autor' => ipim_berea_user_public((int) $row->user_id),
        'is_own' => (int) $row->user_id === $user_id,
        'can_delete' => (int) $row->user_id === $user_id || $can_moderate || ipim_berea_is_global_moderator($user_id),
        'created_at' => (string) $row->created_at,
    ];
}

function ipim_berea_rest_comments(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $checkin_id = (int) $request->get_param('id');
    $checkin = ipim_berea_checkin_row($checkin_id);
    if (!$checkin) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_berea_can_view_checkin($checkin, $user_id) && !ipim_berea_is_global_moderator($user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $table = ipim_berea_table('comments');
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$table} WHERE checkin_id=%d AND status='ativo' ORDER BY id ASC",
        $checkin_id
    ));

    return rest_ensure_response([
        'items' => array_map(static fn (object $row): array => ipim_berea_comment_payload($row, $user_id, $checkin_id), $rows ?: []),
    ]);
}

function ipim_berea_rest_comment_create(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $checkin_id = (int) $request->get_param('id');
    $checkin = ipim_berea_checkin_row($checkin_id);
    if (!$checkin) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_berea_can_view_checkin($checkin, $user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $texto = trim(wp_strip_all_tags((string) $request->get_param('texto')));
    if ($texto === '') {
        return new WP_REST_Response(['error' => 'missing_texto'], 400);
    }

    $table = ipim_berea_table('comments');
    $now = current_time('mysql');
    $wpdb->insert($table, [
        'checkin_id' => $checkin_id,
        'user_id' => $user_id,
        'texto' => $texto,
        'status' => 'ativo',
        'created_at' => $now,
    ], ['%d','%d','%s','%s','%s']);

    $comment_id = (int) $wpdb->insert_id;
    if ((int) $checkin->user_id !== $user_id) {
        ipim_notify(
            (int) $checkin->user_id,
            'berea_comment',
            'Novo comentário no Berea',
            wp_trim_words($texto, 18),
            ipim_berea_origin() . '/'
        );
    }

    ipim_rbac_audit($user_id, 'berea_comment', 'berea_comment', $comment_id, null, ['checkin_id' => $checkin_id]);
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $comment_id));
    return rest_ensure_response([
        'ok' => true,
        'comment' => $row ? ipim_berea_comment_payload($row, $user_id, $checkin_id) : null,
    ]);
}

function ipim_berea_rest_comment_delete(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $comment_id = (int) $request->get_param('comment_id');
    $table = ipim_berea_table('comments');
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $comment_id));
    if (!$row) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }

    $checkin = ipim_berea_checkin_row((int) $row->checkin_id);
    $can_moderate = false;
    if ($checkin) {
        foreach (ipim_berea_checkin_rooms((int) $row->checkin_id) as $room) {
            if (ipim_berea_can_moderate_room((int) $room['id'], $user_id)) {
                $can_moderate = true;
                break;
            }
        }
    }
    if ((int) $row->user_id !== $user_id && !$can_moderate && !ipim_berea_is_global_moderator($user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $wpdb->update($table, ['status' => 'removido'], ['id' => $comment_id], ['%s'], ['%d']);
    ipim_rbac_audit($user_id, 'berea_comment_delete', 'berea_comment', $comment_id, null, null);
    return rest_ensure_response(['ok' => true]);
}

function ipim_berea_rest_reaction(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $checkin_id = (int) $request->get_param('id');
    $checkin = ipim_berea_checkin_row($checkin_id);
    if (!$checkin) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_berea_can_view_checkin($checkin, $user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $allowed = ['amem', 'oracao', 'coracao', 'fogo'];
    $tipo = sanitize_key((string) $request->get_param('tipo'));
    if (!in_array($tipo, $allowed, true)) {
        $tipo = 'amem';
    }

    $table = ipim_berea_table('reactions');
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table} WHERE alvo_tipo='checkin' AND alvo_id=%d AND user_id=%d",
        $checkin_id,
        $user_id
    ));

    $action = 'added';
    if ($existing) {
        if ((string) $existing->tipo === $tipo) {
            $wpdb->delete($table, ['id' => (int) $existing->id], ['%d']);
            $action = 'removed';
        } else {
            $wpdb->update($table, ['tipo' => $tipo], ['id' => (int) $existing->id], ['%s'], ['%d']);
            $action = 'changed';
        }
    } else {
        $wpdb->insert($table, [
            'alvo_tipo' => 'checkin',
            'alvo_id' => $checkin_id,
            'user_id' => $user_id,
            'tipo' => $tipo,
            'created_at' => current_time('mysql'),
        ], ['%s','%d','%d','%s','%s']);
    }

    if ($action === 'added' && (int) $checkin->user_id !== $user_id) {
        ipim_notify(
            (int) $checkin->user_id,
            'berea_reaction',
            'Nova reação no Berea',
            'Alguém reagiu ao seu check-in.',
            ipim_berea_origin() . '/'
        );
    }

    return rest_ensure_response([
        'ok' => true,
        'action' => $action,
        'reacoes' => ipim_berea_reaction_counts($checkin_id, $user_id),
    ]);
}

// --------------------------------------------------------------------------
// Denúncias e moderação
// --------------------------------------------------------------------------

function ipim_berea_report_target_payload(string $tipo, int $id): array
{
    global $wpdb;
    if ($tipo === 'checkin') {
        $row = ipim_berea_checkin_row($id);
        return $row ? ['tipo' => 'checkin', 'id' => $id, 'texto' => (string) $row->texto, 'autor' => ipim_berea_user_public((int) $row->user_id)] : [];
    }
    if ($tipo === 'comment') {
        $table = ipim_berea_table('comments');
        $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id));
        return $row ? ['tipo' => 'comment', 'id' => $id, 'texto' => (string) $row->texto, 'autor' => ipim_berea_user_public((int) $row->user_id)] : [];
    }
    if ($tipo === 'room') {
        $room = ipim_berea_room_row($id);
        return $room ? ['tipo' => 'room', 'id' => $id, 'texto' => (string) $room->nome, 'autor' => ipim_berea_user_public((int) $room->owner_id)] : [];
    }
    return [];
}

function ipim_berea_can_moderate_target(string $tipo, int $id, int $user_id): bool
{
    if (ipim_berea_is_global_moderator($user_id)) {
        return true;
    }
    if ($tipo === 'checkin') {
        foreach (ipim_berea_checkin_rooms($id) as $room) {
            if (ipim_berea_can_moderate_room((int) $room['id'], $user_id)) {
                return true;
            }
        }
        return false;
    }
    if ($tipo === 'comment') {
        global $wpdb;
        $table = ipim_berea_table('comments');
        $checkin_id = (int) $wpdb->get_var($wpdb->prepare("SELECT checkin_id FROM {$table} WHERE id=%d", $id));
        return $checkin_id > 0 && ipim_berea_can_moderate_target('checkin', $checkin_id, $user_id);
    }
    if ($tipo === 'room') {
        return ipim_berea_can_moderate_room($id, $user_id);
    }
    return false;
}

function ipim_berea_rest_report_create(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $tipo = sanitize_key((string) $request->get_param('alvo_tipo'));
    $alvo_id = (int) $request->get_param('alvo_id');
    if (!in_array($tipo, ['checkin', 'comment', 'room', 'user'], true) || $alvo_id <= 0) {
        return new WP_REST_Response(['error' => 'invalid_target'], 400);
    }

    if ($tipo === 'checkin') {
        $checkin = ipim_berea_checkin_row($alvo_id);
        if (!$checkin || !ipim_berea_can_view_checkin($checkin, $user_id)) {
            return new WP_REST_Response(['error' => 'forbidden'], 403);
        }
    }

    $motivo = sanitize_key((string) $request->get_param('motivo'));
    if ($motivo === '') {
        $motivo = 'outro';
    }

    $table = ipim_berea_table('reports');
    $now = current_time('mysql');
    $wpdb->insert($table, [
        'alvo_tipo' => $tipo,
        'alvo_id' => $alvo_id,
        'denunciante_id' => $user_id,
        'motivo' => $motivo,
        'detalhe' => sanitize_textarea_field((string) $request->get_param('detalhe')),
        'status' => 'aberto',
        'resolvido_por' => 0,
        'resolvido_em' => null,
        'created_at' => $now,
        'updated_at' => $now,
    ], ['%s','%d','%d','%s','%s','%s','%d','%s','%s','%s']);

    $report_id = (int) $wpdb->insert_id;
    ipim_notify_admins(
        'berea_report',
        'Nova denúncia no Berea',
        'Uma denúncia aguarda moderação.',
        ipim_berea_origin() . '/moderacao'
    );
    if (function_exists('ipim_grupos_ensure_ministry')) {
        ipim_notify_ministry_leaders(
            ipim_grupos_ensure_ministry(),
            'berea_report',
            'Nova denúncia no Berea',
            'Uma denúncia aguarda moderação.',
            ipim_berea_origin() . '/moderacao'
        );
    }

    ipim_rbac_audit($user_id, 'berea_report', 'berea_report', $report_id, null, ['alvo_tipo' => $tipo, 'alvo_id' => $alvo_id]);
    return rest_ensure_response(['ok' => true, 'id' => $report_id]);
}

function ipim_berea_rest_moderation_reports(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    if (!ipim_berea_can_moderate_any($user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $table = ipim_berea_table('reports');
    $status = sanitize_key((string) ($request->get_param('status') ?: 'aberto'));
    if (!in_array($status, ['aberto', 'resolvido', 'ignorado', 'todos'], true)) {
        $status = 'aberto';
    }

    $where = $status === 'todos' ? '1=1' : 'status=%s';
    $params = $status === 'todos' ? [] : [$status];
    $sql = "SELECT * FROM {$table} WHERE {$where} ORDER BY id DESC LIMIT 200";
    $rows = $params === [] ? $wpdb->get_results($sql) : $wpdb->get_results($wpdb->prepare($sql, $params));

    $items = [];
    foreach ($rows ?: [] as $row) {
        $tipo = (string) $row->alvo_tipo;
        $alvo_id = (int) $row->alvo_id;
        if (!ipim_berea_can_moderate_target($tipo, $alvo_id, $user_id)) {
            continue;
        }
        $items[] = [
            'id' => (int) $row->id,
            'alvo_tipo' => $tipo,
            'alvo_id' => $alvo_id,
            'motivo' => (string) $row->motivo,
            'detalhe' => (string) $row->detalhe,
            'status' => (string) $row->status,
            'denunciante' => ipim_berea_user_public((int) $row->denunciante_id),
            'alvo' => ipim_berea_report_target_payload($tipo, $alvo_id),
            'created_at' => (string) $row->created_at,
        ];
    }

    return rest_ensure_response(['items' => $items]);
}

function ipim_berea_rest_report_resolve(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $report_id = (int) $request->get_param('id');
    $table = ipim_berea_table('reports');
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $report_id));
    if (!$row) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_berea_can_moderate_target((string) $row->alvo_tipo, (int) $row->alvo_id, $user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $status = sanitize_key((string) $request->get_param('status'));
    if (!in_array($status, ['resolvido', 'ignorado'], true)) {
        $status = 'resolvido';
    }

    $wpdb->update($table, [
        'status' => $status,
        'resolvido_por' => $user_id,
        'resolvido_em' => current_time('mysql'),
        'updated_at' => current_time('mysql'),
    ], ['id' => $report_id], ['%s','%d','%s','%s'], ['%d']);

    ipim_rbac_audit($user_id, 'berea_report_resolve', 'berea_report', $report_id, ['status' => (string) $row->status], ['status' => $status]);
    return rest_ensure_response(['ok' => true, 'status' => $status]);
}

// --------------------------------------------------------------------------
// Planos de leitura
// --------------------------------------------------------------------------

function ipim_berea_rest_plans(): WP_REST_Response
{
    global $wpdb;
    $table = ipim_berea_table('plans');
    $rows = $wpdb->get_results("SELECT id, slug, titulo, descricao, dias FROM {$table} WHERE status='ativo' ORDER BY id");
    return rest_ensure_response(array_map(static fn (object $row): array => [
        'id' => (int) $row->id,
        'slug' => (string) $row->slug,
        'titulo' => (string) $row->titulo,
        'descricao' => (string) $row->descricao,
        'dias' => (int) $row->dias,
    ], $rows ?: []));
}

function ipim_berea_rest_plan_current(): WP_REST_Response
{
    $user_id = get_current_user_id();
    $plan = ipim_berea_active_user_plan($user_id);
    if (!$plan) {
        $available = ipim_berea_rest_plans()->get_data();
        return rest_ensure_response(['plan' => null, 'available' => $available]);
    }
    return rest_ensure_response(['plan' => ipim_berea_plan_payload((int) $plan->plan_id, $user_id)]);
}

function ipim_berea_rest_plan_start(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $plan_id = (int) $request->get_param('plan_id');
    $slug = sanitize_title((string) $request->get_param('slug'));
    $plans = ipim_berea_table('plans');

    if ($plan_id <= 0 && $slug !== '') {
        $plan_id = (int) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$plans} WHERE slug=%s AND status='ativo'", $slug));
    }
    if ($plan_id <= 0) {
        return new WP_REST_Response(['error' => 'invalid_plan'], 400);
    }

    $userPlans = ipim_berea_table('user_plans');
    $now = current_time('mysql');
    $exists = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$userPlans} WHERE user_id=%d AND plan_id=%d",
        $user_id,
        $plan_id
    ));

    if ($exists) {
        $wpdb->update($userPlans, [
            'started_on' => ipim_berea_user_today($user_id),
            'current_day' => 1,
            'status' => 'ativo',
            'updated_at' => $now,
        ], ['id' => (int) $exists->id], ['%s','%d','%s','%s'], ['%d']);
    } else {
        $wpdb->insert($userPlans, [
            'user_id' => $user_id,
            'plan_id' => $plan_id,
            'started_on' => ipim_berea_user_today($user_id),
            'current_day' => 1,
            'status' => 'ativo',
            'created_at' => $now,
            'updated_at' => $now,
        ], ['%d','%d','%s','%d','%s','%s','%s']);
    }

    ipim_rbac_audit($user_id, 'berea_plan_start', 'berea_plan', $plan_id, null, null);
    return rest_ensure_response(['ok' => true, 'plan' => ipim_berea_plan_payload($plan_id, $user_id)]);
}

// --------------------------------------------------------------------------
// Salas
// --------------------------------------------------------------------------

function ipim_berea_rest_rooms(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $members = ipim_berea_table('room_members');
    $rooms_table = ipim_berea_table('rooms');

    $mine = $wpdb->get_results($wpdb->prepare(
        "SELECT r.* FROM {$rooms_table} r
         INNER JOIN {$members} m ON m.room_id=r.id
         WHERE m.user_id=%d AND m.status='ativo' AND r.status='ativa'
         ORDER BY r.tipo='pg' DESC, r.nome ASC",
        $user_id
    ), ARRAY_A);

    $discover = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$rooms_table} r
         WHERE r.status='ativa' AND r.privacidade='publica'
           AND r.id NOT IN (SELECT room_id FROM {$members} WHERE user_id=%d AND status='ativo')
         ORDER BY r.nome ASC LIMIT 50",
        $user_id
    ), ARRAY_A);

    $map = static fn (array $row): array => ipim_berea_room_public((object) $row, $user_id);
    return rest_ensure_response([
        'minhas' => array_map($map, $mine ?: []),
        'descobrir' => array_map($map, $discover ?: []),
    ]);
}

function ipim_berea_rest_room_create(WP_REST_Request $request): WP_REST_Response
{
    $user_id = get_current_user_id();
    $nome = trim(wp_strip_all_tags((string) $request->get_param('nome')));
    if ($nome === '') {
        return new WP_REST_Response(['error' => 'missing_nome'], 400);
    }

    $room_id = ipim_berea_create_room([
        'nome' => $nome,
        'descricao' => sanitize_textarea_field((string) $request->get_param('descricao')),
        'tipo' => 'livre',
        'privacidade' => $request->get_param('privacidade') === 'publica' ? 'publica' : 'privada',
        'owner_id' => $user_id,
    ]);

    if ($room_id <= 0) {
        return new WP_REST_Response(['error' => 'create_failed'], 500);
    }

    ipim_rbac_audit($user_id, 'berea_room_create', 'berea_room', $room_id, null, ['nome' => $nome]);
    $room = ipim_berea_room_row($room_id);
    return rest_ensure_response(['ok' => true, 'room' => $room ? ipim_berea_room_public($room, $user_id) : null]);
}

function ipim_berea_rest_room_get(WP_REST_Request $request): WP_REST_Response
{
    $user_id = get_current_user_id();
    $room_id = (int) $request->get_param('id');
    $room = ipim_berea_room_row($room_id);
    if (!$room) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }

    $is_member = ipim_berea_is_room_member($room_id, $user_id);
    if (!$is_member && (string) $room->privacidade !== 'publica' && !ipim_berea_can_moderate_room($room_id, $user_id)) {
        return new WP_REST_Response(['error' => 'forbidden', 'message' => 'Entre com o código para acessar esta sala.'], 403);
    }

    global $wpdb;
    $members_table = ipim_berea_table('room_members');
    $member_rows = $wpdb->get_results($wpdb->prepare(
        "SELECT user_id, papel FROM {$members_table} WHERE room_id=%d AND status='ativo' ORDER BY papel='moderador' DESC, joined_at ASC",
        $room_id
    ), ARRAY_A);
    $members = array_map(static function (array $row) use ($room_id): array {
        $user = ipim_berea_user_public((int) $row['user_id']);
        $user['papel'] = (string) $row['papel'];
        return $user;
    }, $member_rows ?: []);

    $encounters = [];
    if ((int) $room->grupo_id > 0 && $is_member) {
        $enc_table = $wpdb->prefix . '1ipim_grupo_encontros';
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$enc_table} WHERE grupo_id=%d ORDER BY data DESC, id DESC LIMIT 50",
            (int) $room->grupo_id
        ));
        foreach ($rows ?: [] as $row) {
            $encounters[] = ipim_berea_encounter_payload($row, (string) $room->nome);
        }
    }

    return rest_ensure_response([
        'room' => ipim_berea_room_public($room, $user_id),
        'members' => $members,
        'encounters' => $encounters,
        'can_post' => $is_member && (
            (string) $room->postagem === 'membros' || ipim_berea_can_moderate_room($room_id, $user_id)
        ),
    ]);
}

function ipim_berea_join_room(int $room_id, int $user_id): bool
{
    $room = ipim_berea_room_row($room_id);
    if (!$room || (string) $room->status !== 'ativa') {
        return false;
    }
    ipim_berea_add_member($room_id, $user_id, 'membro');

    // Aceita convites pendentes para o e-mail do usuário.
    $user = get_userdata($user_id);
    if ($user instanceof WP_User) {
        global $wpdb;
        $invites = ipim_berea_table('room_invites');
        $wpdb->query($wpdb->prepare(
            "UPDATE {$invites} SET status='aceito', accepted_at=%s
             WHERE room_id=%d AND email=%s AND status='pendente'",
            current_time('mysql'),
            $room_id,
            $user->user_email
        ));
    }

    ipim_rbac_audit($user_id, 'berea_room_join', 'berea_room', $room_id, null, null);
    return true;
}

function ipim_berea_rest_room_join(WP_REST_Request $request): WP_REST_Response
{
    $room_id = (int) $request->get_param('id');
    $room = ipim_berea_room_row($room_id);
    if (!$room) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if ((string) $room->privacidade !== 'publica' && !ipim_berea_is_room_member($room_id, get_current_user_id())) {
        return new WP_REST_Response(['error' => 'code_required', 'message' => 'Use o código da sala para entrar.'], 403);
    }
    ipim_berea_join_room($room_id, get_current_user_id());
    return rest_ensure_response(['ok' => true, 'room' => ipim_berea_room_public($room, get_current_user_id())]);
}

function ipim_berea_rest_room_join_code(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $request->get_param('codigo')));
    if (strlen($code) < 4) {
        return new WP_REST_Response(['error' => 'invalid_code'], 400);
    }
    $table = ipim_berea_table('rooms');
    $room = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$table} WHERE codigo=%s AND status='ativa'",
        $code
    ));
    if (!$room) {
        return new WP_REST_Response(['error' => 'room_not_found', 'message' => 'Código não encontrado.'], 404);
    }
    ipim_berea_join_room((int) $room->id, get_current_user_id());
    return rest_ensure_response(['ok' => true, 'room' => ipim_berea_room_public($room, get_current_user_id())]);
}

function ipim_berea_rest_room_leave(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $room_id = (int) $request->get_param('id');
    $room = ipim_berea_room_row($room_id);
    if (!$room) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if ((int) $room->owner_id === $user_id) {
        return new WP_REST_Response(['error' => 'owner_cannot_leave', 'message' => 'O criador não pode sair da própria sala.'], 400);
    }

    $members = ipim_berea_table('room_members');
    $wpdb->update($members, ['status' => 'removido', 'updated_at' => current_time('mysql')], [
        'room_id' => $room_id,
        'user_id' => $user_id,
    ], ['%s','%s'], ['%d','%d']);

    $checkinRooms = ipim_berea_table('checkin_rooms');
    $checkins = ipim_berea_table('checkins');
    $wpdb->query($wpdb->prepare(
        "DELETE cr FROM {$checkinRooms} cr
         INNER JOIN {$checkins} c ON c.id=cr.checkin_id
         WHERE cr.room_id=%d AND c.user_id=%d",
        $room_id,
        $user_id
    ));

    ipim_rbac_audit($user_id, 'berea_room_leave', 'berea_room', $room_id, null, null);
    return rest_ensure_response(['ok' => true]);
}

function ipim_berea_rest_room_update(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $room_id = (int) $request->get_param('id');
    $room = ipim_berea_room_row($room_id);
    if (!$room) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_berea_can_moderate_room($room_id, $user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $data = [];
    $formats = [];
    $nome = $request->get_param('nome');
    if ($nome !== null) {
        $nome = trim(wp_strip_all_tags((string) $nome));
        if ($nome !== '') {
            $data['nome'] = $nome;
            $formats[] = '%s';
        }
    }
    $descricao = $request->get_param('descricao');
    if ($descricao !== null) {
        $data['descricao'] = sanitize_textarea_field((string) $descricao);
        $formats[] = '%s';
    }
    $postagem = $request->get_param('postagem');
    if ($postagem !== null) {
        $data['postagem'] = $postagem === 'moderadores' ? 'moderadores' : 'membros';
        $formats[] = '%s';
    }
    $privacidade = $request->get_param('privacidade');
    if ($privacidade !== null) {
        $data['privacidade'] = $privacidade === 'publica' ? 'publica' : 'privada';
        $formats[] = '%s';
    }
    if ($data === []) {
        return new WP_REST_Response(['error' => 'nothing_to_update'], 400);
    }
    $data['updated_at'] = current_time('mysql');
    $formats[] = '%s';

    $before = ['nome' => (string) $room->nome, 'postagem' => (string) $room->postagem, 'privacidade' => (string) $room->privacidade];
    $wpdb->update(ipim_berea_table('rooms'), $data, ['id' => $room_id], $formats, ['%d']);
    ipim_rbac_audit($user_id, 'berea_room_update', 'berea_room', $room_id, $before, $data);
    $fresh = ipim_berea_room_row($room_id);
    return rest_ensure_response(['ok' => true, 'room' => $fresh ? ipim_berea_room_public($fresh, $user_id) : null]);
}

function ipim_berea_rest_room_invite(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $room_id = (int) $request->get_param('id');
    $room = ipim_berea_room_row($room_id);
    if (!$room) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_berea_can_moderate_room($room_id, $user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $email = sanitize_email((string) $request->get_param('email'));
    $token = bin2hex(random_bytes(24));
    $invites = ipim_berea_table('room_invites');
    $wpdb->insert($invites, [
        'room_id' => $room_id,
        'email' => $email,
        'token' => $token,
        'invited_by' => $user_id,
        'status' => 'pendente',
        'created_at' => current_time('mysql'),
        'accepted_at' => null,
    ], ['%d','%s','%s','%d','%s','%s','%s']);

    $link = ipim_berea_origin() . '/sala?convite=' . $token;
    $sent = false;
    if ($email !== '' && is_email($email)) {
        $subject = 'Convite para a sala "' . (string) $room->nome . '" no Berea';
        $message = "Você foi convidado para a sala \"" . (string) $room->nome . "\" no Berea.\n\n"
            . "Entre pelo link: {$link}\n\n"
            . "Ou use o código: " . (string) $room->codigo . "\n\n"
            . "Berea — Juntos, nas Escrituras.";
        $sent = (bool) wp_mail($email, $subject, $message);
    }

    ipim_rbac_audit($user_id, 'berea_room_invite', 'berea_room', $room_id, null, ['email' => $email, 'sent' => $sent]);
    return rest_ensure_response([
        'ok' => true,
        'link' => $link,
        'codigo' => (string) $room->codigo,
        'mail_sent' => $sent,
    ]);
}

function ipim_berea_rest_accept_invite(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $token = preg_replace('/[^a-f0-9]/i', '', (string) $request->get_param('token'));
    if ($token === '') {
        return new WP_REST_Response(['error' => 'invalid_token'], 400);
    }

    $invites = ipim_berea_table('room_invites');
    $invite = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$invites} WHERE token=%s AND status='pendente'",
        $token
    ));
    if (!$invite) {
        return new WP_REST_Response(['error' => 'invite_not_found'], 404);
    }

    ipim_berea_join_room((int) $invite->room_id, $user_id);
    $wpdb->update($invites, [
        'status' => 'aceito',
        'accepted_at' => current_time('mysql'),
    ], ['id' => (int) $invite->id], ['%s','%s'], ['%d']);

    $room = ipim_berea_room_row((int) $invite->room_id);
    return rest_ensure_response([
        'ok' => true,
        'room' => $room ? ipim_berea_room_public($room, $user_id) : null,
    ]);
}

function ipim_berea_rest_member_remove(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $room_id = (int) $request->get_param('id');
    $target_id = (int) $request->get_param('user_id');
    $room = ipim_berea_room_row($room_id);
    if (!$room) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_berea_can_moderate_room($room_id, $user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }
    if ($target_id <= 0 || $target_id === (int) $room->owner_id) {
        return new WP_REST_Response(['error' => 'cannot_remove_owner'], 400);
    }

    $members = ipim_berea_table('room_members');
    $wpdb->update($members, [
        'status' => 'removido',
        'updated_at' => current_time('mysql'),
    ], ['room_id' => $room_id, 'user_id' => $target_id], ['%s','%s'], ['%d','%d']);

    ipim_rbac_audit($user_id, 'berea_member_remove', 'berea_room', $room_id, null, ['user_id' => $target_id]);
    return rest_ensure_response(['ok' => true]);
}

function ipim_berea_rest_room_moderator(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $room_id = (int) $request->get_param('id');
    $target_id = (int) $request->get_param('user_id');
    $action = (string) ($request->get_param('action') ?: 'add');
    $room = ipim_berea_room_row($room_id);
    if (!$room) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_berea_is_global_moderator($user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }
    if ($target_id <= 0) {
        return new WP_REST_Response(['error' => 'invalid_user'], 400);
    }

    if ($action === 'remove') {
        ipim_berea_add_member($room_id, $target_id, 'membro');
        $members = ipim_berea_table('room_members');
        $wpdb->update($members, ['papel' => 'membro', 'updated_at' => current_time('mysql')], [
            'room_id' => $room_id,
            'user_id' => $target_id,
        ], ['%s','%s'], ['%d','%d']);
    } else {
        ipim_berea_add_member($room_id, $target_id, 'moderador');
        $target = get_userdata($target_id);
        if ($target instanceof WP_User && !in_array('moderador_berea', (array) $target->roles, true)
            && !in_array('administrator', (array) $target->roles, true)) {
            $target->add_role('moderador_berea');
        }
    }

    ipim_rbac_audit($user_id, 'berea_room_moderator', 'berea_room', $room_id, null, [
        'user_id' => $target_id,
        'action' => $action,
    ]);
    return rest_ensure_response(['ok' => true]);
}

function ipim_berea_rest_room_encounters(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $room_id = (int) $request->get_param('id');
    $room = ipim_berea_room_row($room_id);
    if (!$room) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_berea_is_room_member($room_id, $user_id) && !ipim_berea_can_moderate_room($room_id, $user_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }
    if ((int) $room->grupo_id <= 0) {
        return rest_ensure_response(['items' => []]);
    }

    $enc_table = $wpdb->prefix . '1ipim_grupo_encontros';
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$enc_table} WHERE grupo_id=%d ORDER BY data DESC, id DESC LIMIT 100",
        (int) $room->grupo_id
    ));

    return rest_ensure_response([
        'items' => array_map(static fn (object $row): array => ipim_berea_encounter_payload($row, (string) $room->nome), $rows ?: []),
    ]);
}

// --------------------------------------------------------------------------
// Perfil, privacidade e conteúdo
// --------------------------------------------------------------------------

function ipim_berea_rest_profile_update(WP_REST_Request $request): WP_REST_Response
{
    $user_id = get_current_user_id();
    $before = [
        'display_name' => (string) get_userdata($user_id)->display_name,
        'bio' => (string) get_user_meta($user_id, 'description', true),
    ];

    $name = $request->get_param('display_name');
    if ($name !== null) {
        $name = trim(sanitize_text_field((string) $name));
        if ($name !== '') {
            wp_update_user(['ID' => $user_id, 'display_name' => $name]);
        }
    }
    $bio = $request->get_param('bio');
    if ($bio !== null) {
        update_user_meta($user_id, 'description', sanitize_textarea_field((string) $bio));
    }
    $tz = $request->get_param('timezone');
    if ($tz !== null && $tz !== '') {
        update_user_meta($user_id, '_ipim_berea_timezone', sanitize_text_field((string) $tz));
    }
    $cutoff = $request->get_param('day_cutoff');
    if ($cutoff !== null && preg_match('/^\d{2}:\d{2}$/', (string) $cutoff)) {
        update_user_meta($user_id, '_ipim_berea_day_cutoff', (string) $cutoff);
    }
    if ($request->get_param('ranking_optin') !== null) {
        update_user_meta($user_id, '_ipim_berea_ranking_optin', $request->get_param('ranking_optin') ? '1' : '0');
    }
    $notifications = $request->get_param('notifications');
    if (is_array($notifications)) {
        update_user_meta($user_id, '_ipim_berea_notify_daily', !empty($notifications['daily']) ? '1' : '0');
        update_user_meta($user_id, '_ipim_berea_notify_activity', !empty($notifications['activity']) ? '1' : '0');
    }

    ipim_rbac_audit($user_id, 'berea_profile_update', 'user', $user_id, $before, null);
    return rest_ensure_response(['ok' => true, 'user' => ipim_berea_user_public($user_id)]);
}

function ipim_berea_rest_avatar_upload(WP_REST_Request $request): WP_REST_Response
{
    $user_id = get_current_user_id();
    $files = $request->get_file_params();
    if (empty($files['avatar']) || !is_array($files['avatar'])) {
        return new WP_REST_Response(['error' => 'missing_file'], 400);
    }
    $photo = ipim_berea_process_photo($files['avatar'], 'Berea - avatar');
    if (!$photo) {
        return new WP_REST_Response(['error' => 'upload_failed'], 400);
    }
    update_user_meta($user_id, '_ipim_berea_avatar_url', $photo['url']);
    ipim_rbac_audit($user_id, 'berea_avatar', 'user', $user_id, null, ['url' => $photo['url']]);
    return rest_ensure_response(['ok' => true, 'avatar' => $photo['url']]);
}

function ipim_berea_rest_export(): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $checkins = ipim_berea_table('checkins');
    $comments = ipim_berea_table('comments');
    $reactions = ipim_berea_table('reactions');
    $members = ipim_berea_table('room_members');

    $rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$checkins} WHERE user_id=%d ORDER BY data", $user_id), ARRAY_A);
    $comment_rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$comments} WHERE user_id=%d ORDER BY id", $user_id), ARRAY_A);
    $reaction_rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$reactions} WHERE user_id=%d ORDER BY id", $user_id), ARRAY_A);
    $room_rows = $wpdb->get_results($wpdb->prepare("SELECT room_id, papel, joined_at FROM {$members} WHERE user_id=%d", $user_id), ARRAY_A);

    return rest_ensure_response([
        'user' => ipim_berea_user_public($user_id),
        'profile' => [
            'bio' => (string) get_user_meta($user_id, 'description', true),
            'timezone' => ipim_berea_user_timezone($user_id),
            'day_cutoff' => (string) get_user_meta($user_id, '_ipim_berea_day_cutoff', true),
        ],
        'streak' => ipim_berea_streak($user_id),
        'badges' => ipim_berea_badges($user_id),
        'checkins' => $rows ?: [],
        'comments' => $comment_rows ?: [],
        'reactions' => $reaction_rows ?: [],
        'rooms' => $room_rows ?: [],
        'exported_at' => current_time('mysql'),
    ]);
}

function ipim_berea_rest_delete_data(): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $checkins = ipim_berea_table('checkins');
    $ids = $wpdb->get_col($wpdb->prepare("SELECT id FROM {$checkins} WHERE user_id=%d", $user_id));
    foreach ($ids ?: [] as $id) {
        $row = ipim_berea_checkin_row((int) $id);
        if ($row && (int) ($row->foto_attachment_id ?? 0) > 0) {
            wp_delete_attachment((int) $row->foto_attachment_id, true);
        }
    }

    $wpdb->delete($checkins, ['user_id' => $user_id], ['%d']);
    $wpdb->delete(ipim_berea_table('comments'), ['user_id' => $user_id], ['%d']);
    $wpdb->delete(ipim_berea_table('reactions'), ['user_id' => $user_id], ['%d']);
    $wpdb->delete(ipim_berea_table('room_members'), ['user_id' => $user_id], ['%d']);
    $wpdb->delete(ipim_berea_table('streaks'), ['user_id' => $user_id], ['%d']);
    $wpdb->delete(ipim_berea_table('badges'), ['user_id' => $user_id], ['%d']);
    $wpdb->delete(ipim_berea_table('user_plans'), ['user_id' => $user_id], ['%d']);
    delete_user_meta($user_id, '_ipim_berea_avatar_url');

    ipim_rbac_audit($user_id, 'berea_data_delete', 'user', $user_id, null, null);
    return rest_ensure_response(['ok' => true]);
}

function ipim_berea_rest_block_toggle(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $user_id = get_current_user_id();
    $target_id = (int) $request->get_param('user_id');
    if ($target_id <= 0 || $target_id === $user_id) {
        return new WP_REST_Response(['error' => 'invalid_user'], 400);
    }
    $table = ipim_berea_table('blocks');
    $existing = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$table} WHERE user_id=%d AND bloqueado_id=%d",
        $user_id,
        $target_id
    ));
    if ($existing > 0) {
        $wpdb->delete($table, ['id' => $existing], ['%d']);
        return rest_ensure_response(['ok' => true, 'blocked' => false]);
    }
    $wpdb->insert($table, [
        'user_id' => $user_id,
        'bloqueado_id' => $target_id,
        'created_at' => current_time('mysql'),
    ], ['%d','%d','%s']);
    return rest_ensure_response(['ok' => true, 'blocked' => true]);
}

function ipim_berea_rest_admin_sync(): WP_REST_Response
{
    if (!ipim_berea_is_global_moderator()) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }
    return rest_ensure_response(ipim_berea_sync_pg_rooms());
}

// --------------------------------------------------------------------------
// Rotas REST
// --------------------------------------------------------------------------

add_action('rest_api_init', static function (): void {
    $login = static fn (): bool => is_user_logged_in();

    register_rest_route('1ipim/v1', '/me', [
        'methods' => 'GET',
        'callback' => 'ipim_berea_rest_me',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/feed', [
        'methods' => 'GET',
        'callback' => 'ipim_berea_rest_feed',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/diario', [
        'methods' => 'GET',
        'callback' => 'ipim_berea_rest_diary',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/plan', [
        'methods' => ['GET', 'POST'],
        'callback' => 'ipim_berea_rest_plan_start',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/plans', [
        'methods' => 'GET',
        'callback' => 'ipim_berea_rest_plans',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/room', [
        'methods' => ['GET', 'POST'],
        'callback' => 'ipim_berea_rest_room_create',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/room/(?P<id>[\\d]+)', [
        'methods' => ['GET', 'PUT', 'DELETE'],
        'callback' => 'ipim_berea_rest_room_get',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/room/(?P<id>[\\d]+)/join', [
        'methods' => ['POST'],
        'callback' => 'ipim_berea_rest_room_join',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/room/code', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_room_join_code',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/room/leave', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_room_leave',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/room/invite', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_room_invite',
        'permission_callback' => 'ipim_berea_can_manage_content',
    ]);

    register_rest_route('1ipim/v1', '/room/invite/accept', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_accept_invite',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/room/remove', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_member_remove',
        'permission_callback' => 'ipim_berea_can_manage_content',
    ]);

    register_rest_route('1ipim/v1', '/room/moderator', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_room_moderator',
        'permission_callback' => 'ipim_berea_is_global_moderator',
    ]);

    register_rest_route('1ipim/v1', '/room/encounters', [
        'methods' => 'GET',
        'callback' => 'ipim_berea_rest_room_encounters',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/comment', [
        'methods' => ['GET', 'POST'],
        'callback' => 'ipim_berea_rest_comments',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/comment/delete', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_comment_delete',
        'permission_callback' => 'ipim_berea_can_manage_content',
    ]);

    register_rest_route('1ipim/v1', '/reaction', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_reaction',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/reports', [
        'methods' => ['GET', 'POST'],
        'callback' => 'ipim_berea_rest_report_create',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/reports/moderation', [
        'methods' => 'GET',
        'callback' => 'ipim_berea_rest_moderation_reports',
        'permission_callback' => 'ipim_berea_is_global_moderator',
    ]);

    register_rest_route('1ipim/v1', '/report/resolve', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_report_resolve',
        'permission_callback' => 'ipim_berea_is_global_moderator',
    ]);

    register_rest_route('1ipim/v1', '/profile/update', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_profile_update',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/avatar/upload', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_avatar_upload',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/export', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_export',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/delete-data', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_delete_data',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/block-toggle', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_block_toggle',
        'permission_callback' => $login,
    ]);

    register_rest_route('1ipim/v1', '/admin/sync-rooms', [
        'methods' => 'POST',
        'callback' => 'ipim_berea_rest_admin_sync',
        'permission_callback' => 'ipim_berea_is_global_moderator',
    ]);
});
