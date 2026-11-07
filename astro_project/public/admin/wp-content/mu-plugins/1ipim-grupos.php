<?php
/**
 * Plugin Name: 1IPIM Grupos
 * Description: Pequenos Grupos (PGs): cadastro, líderes, encontros e presença.
 * Version: 0.1.0
 * Author: 1IPIM Dev
 *
 * Must-use plugin. Os PGs são um ministério (tipo=pequenos_grupos). O líder de
 * PG é colaborador desse ministério e gerencia o próprio grupo; o líder do
 * ministério (delegado por admin/pastor) vê todos.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/1ipim-rbac.php';

define('IPIM_GRUPOS_VERSION', '0.1.0');

function ipim_grupos_table(string $name): string
{
    global $wpdb;
    return $wpdb->prefix . '1ipim_' . $name;
}

function ipim_grupos_install(): void
{
    if (get_option('ipim_grupos_version') === IPIM_GRUPOS_VERSION) {
        return;
    }

    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset = $wpdb->get_charset_collate();
    $grupos = ipim_grupos_table('grupos');
    $lideres = ipim_grupos_table('grupo_lideres');
    $encontros = ipim_grupos_table('grupo_encontros');
    $presenca = ipim_grupos_table('grupo_encontro_presenca');

    dbDelta("CREATE TABLE {$grupos} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        slug varchar(190) NOT NULL,
        nome varchar(190) NOT NULL,
        descricao text NULL,
        publico_alvo varchar(190) NULL,
        frequencia varchar(32) NULL,
        dia_semana tinyint(4) NULL,
        horario varchar(16) NULL,
        local varchar(255) NULL,
        contato varchar(64) NULL,
        responsavel varchar(255) NULL,
        imagem varchar(500) NULL,
        status enum('ativo','inativo','arquivado') NOT NULL DEFAULT 'ativo',
        ministerio_id bigint(20) unsigned NOT NULL DEFAULT 0,
        room_id bigint(20) unsigned NULL,
        created_by bigint(20) unsigned NOT NULL DEFAULT 0,
        updated_by bigint(20) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY slug (slug),
        KEY status (status),
        KEY dia_semana (dia_semana)
    ) {$charset};");

    dbDelta("CREATE TABLE {$lideres} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        grupo_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        papel enum('lider','colider') NOT NULL DEFAULT 'lider',
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY grupo_user (grupo_id,user_id),
        KEY user_id (user_id)
    ) {$charset};");

    dbDelta("CREATE TABLE {$encontros} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        grupo_id bigint(20) unsigned NOT NULL,
        data date NOT NULL,
        texto_lido varchar(255) NULL,
        tema varchar(255) NULL,
        preletor varchar(190) NULL,
        foto_url varchar(500) NULL,
        foto_attachment_id bigint(20) unsigned NULL,
        observacoes text NULL,
        publico_presente int(11) NOT NULL DEFAULT 0,
        publicar_feed tinyint(1) NOT NULL DEFAULT 0,
        created_by bigint(20) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY grupo_data (grupo_id,data)
    ) {$charset};");

    dbDelta("CREATE TABLE {$presenca} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        encontro_id bigint(20) unsigned NOT NULL,
        nome varchar(190) NOT NULL,
        user_id bigint(20) unsigned NULL,
        convidado_em datetime NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY encontro (encontro_id)
    ) {$charset};");

    update_option('ipim_grupos_version', IPIM_GRUPOS_VERSION);
    ipim_rbac_audit(0, 'grupos_install', 'system', 0, null, ['version' => IPIM_GRUPOS_VERSION]);

    // Popula os grupos atuais do site na primeira instalação.
    if (get_option('ipim_grupos_seeded') !== '1') {
        ipim_grupos_seed();
        update_option('ipim_grupos_seeded', '1');
    }
}
add_action('init', 'ipim_grupos_install', 20);

/**
 * Garante o ministério de Pequenos Grupos (tipo=pequenos_grupos).
 */
function ipim_grupos_ensure_ministry(): int
{
    $posts = get_posts([
        'post_type' => 'ministerio',
        'post_status' => 'any',
        'numberposts' => -1,
        'fields' => 'all',
    ]);

    foreach ($posts as $post) {
        $tipo = get_post_meta($post->ID, 'tipo', true);
        $title = strtolower(trim($post->post_title));
        if ($tipo === 'pequenos_grupos' || $title === 'pequenos grupos' || $title === 'pgs') {
            update_post_meta($post->ID, 'tipo', 'pequenos_grupos');
            return (int) $post->ID;
        }
    }

    $post_id = wp_insert_post([
        'post_type' => 'ministerio',
        'post_status' => 'publish',
        'post_title' => 'Pequenos Grupos',
    ], true);

    if (is_wp_error($post_id)) {
        return 0;
    }

    update_post_meta($post_id, 'tipo', 'pequenos_grupos');

    return (int) $post_id;
}
add_action('init', 'ipim_grupos_ensure_ministry', 21);

// --------------------------------------------------------------------------
// Permissões
// --------------------------------------------------------------------------

function ipim_grupos_can_manage_all(): bool
{
    if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
        return true;
    }

    $ministry_id = ipim_grupos_ensure_ministry();
    return $ministry_id > 0 && ipim_rbac_can_manage_ministry(get_current_user_id(), $ministry_id);
}

function ipim_grupos_can_access(): bool
{
    if (ipim_grupos_can_manage_all()) {
        return true;
    }

    $ministry_id = ipim_grupos_ensure_ministry();
    return $ministry_id > 0 && ipim_rbac_can_view_ministry(get_current_user_id(), $ministry_id);
}

function ipim_grupos_user_leads(int $grupo_id): bool
{
    global $wpdb;
    $user_id = get_current_user_id();
    if ($user_id <= 0 || $grupo_id <= 0) {
        return false;
    }

    $table = ipim_grupos_table('grupo_lideres');
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$table} WHERE grupo_id=%d AND user_id=%d",
        $grupo_id,
        $user_id
    ));
}

/**
 * O usuário lidera ao menos um PG? (usado por auditoria/relatórios)
 */
function ipim_grupos_user_leads_any(int $user_id = 0): bool
{
    global $wpdb;
    $user_id = $user_id > 0 ? $user_id : get_current_user_id();
    if ($user_id <= 0) {
        return false;
    }

    $table = ipim_grupos_table('grupo_lideres');
    return (bool) $wpdb->get_var($wpdb->prepare(
        "SELECT 1 FROM {$table} WHERE user_id=%d LIMIT 1",
        $user_id
    ));
}

function ipim_grupos_can_manage_group(int $grupo_id): bool
{
    return ipim_grupos_can_manage_all() || ipim_grupos_user_leads($grupo_id);
}

function ipim_grupos_rest_access(): bool
{
    if (!is_user_logged_in()) {
        return false;
    }
    if (!ipim_grupos_can_access()) {
        return false;
    }
    return true;
}

function ipim_grupos_rest_manage(): bool
{
    return is_user_logged_in() && ipim_grupos_can_manage_all();
}

// --------------------------------------------------------------------------
// Serialização
// --------------------------------------------------------------------------

function ipim_grupos_public_fields(object $row): array
{
    return [
        'id' => (int) $row->id,
        'slug' => (string) $row->slug,
        'nome' => (string) $row->nome,
        'descricao' => (string) $row->descricao,
        'publico_alvo' => (string) $row->publico_alvo,
        'frequencia' => (string) $row->frequencia,
        'dia_semana' => $row->dia_semana === null ? null : (int) $row->dia_semana,
        'horario' => (string) $row->horario,
        'local' => (string) $row->local,
        'contato' => (string) $row->contato,
        'responsavel' => (string) $row->responsavel,
        'imagem' => (string) $row->imagem,
        'status' => (string) $row->status,
    ];
}

function ipim_grupos_admin_fields(object $row): array
{
    $data = ipim_grupos_public_fields($row);
    $data['ministerio_id'] = (int) $row->ministerio_id;
    $data['room_id'] = $row->room_id === null ? null : (int) $row->room_id;
    $data['created_by'] = (int) $row->created_by;
    $data['updated_by'] = (int) $row->updated_by;
    $data['created_at'] = (string) $row->created_at;
    $data['updated_at'] = (string) $row->updated_at;

    global $wpdb;
    $lideres_table = ipim_grupos_table('grupo_lideres');
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT user_id, papel FROM {$lideres_table} WHERE grupo_id=%d ORDER BY id",
        (int) $row->id
    ), ARRAY_A);
    $data['lideres'] = array_map(static function (array $item): array {
        $user = get_userdata((int) $item['user_id']);
        return [
            'user_id' => (int) $item['user_id'],
            'papel' => (string) $item['papel'],
            'nome' => $user instanceof WP_User ? $user->display_name : '',
        ];
    }, $rows ?: []);

    return $data;
}

// --------------------------------------------------------------------------
// Seed (importa os grupos atuais do site)
// --------------------------------------------------------------------------

function ipim_grupos_seed_data(): array
{
    $base = '/assets/img/pgs/';
    $whats = '5535988613046';

    return [
        ['nome' => 'Porção de fé', 'publico_alvo' => 'Mulheres', 'responsavel' => 'Rita', 'dia_semana' => 1, 'horario' => '19:30', 'frequencia' => 'Quinzenal', 'imagem' => $base . 'porcao_de_fe.jpeg'],
        ['nome' => 'Koinonia', 'publico_alvo' => 'Mulheres', 'responsavel' => 'Milka', 'dia_semana' => 2, 'horario' => '14:00', 'frequencia' => 'Semanal', 'imagem' => $base . 'koinonia.jpeg'],
        ['nome' => 'Peniel', 'publico_alvo' => 'Mulheres', 'responsavel' => 'Ester', 'dia_semana' => 2, 'horario' => '14:30', 'frequencia' => 'Semanal', 'imagem' => $base . 'peniel.jpeg'],
        ['nome' => 'Entre Meninas e Deus (9 a 11 anos)', 'publico_alvo' => 'Meninas de 9 a 11 anos', 'responsavel' => 'Tati, Thays, Manuela e Anne', 'dia_semana' => 2, 'horario' => '19:00', 'frequencia' => 'Semanal', 'imagem' => $base . 'entre-meninas-e-Deus.jpeg'],
        ['nome' => 'Entre Meninas e Deus (12 a 14 anos)', 'publico_alvo' => 'Meninas de 12 a 14 anos', 'responsavel' => 'Iara, Cris e Fabi', 'dia_semana' => 2, 'horario' => '19:00', 'frequencia' => 'Semanal', 'imagem' => $base . 'entre-meninas-e-Deus.jpeg'],
        ['nome' => 'PG dos meninos', 'publico_alvo' => 'Pré-adolescência e juventude', 'responsavel' => 'Pedro Luz e Davi Bertelli', 'dia_semana' => 2, 'horario' => '19:30', 'frequencia' => 'Semanal', 'imagem' => $base . 'pg-pedro.jpeg'],
        ['nome' => 'PG Online', 'publico_alvo' => 'Estudantes que moram fora', 'responsavel' => 'Lucas Generoso, Lucas Sodré e Nathan', 'dia_semana' => 2, 'horario' => '21:30', 'frequencia' => 'Semanal', 'imagem' => $base . 'pg-online.jpeg'],
        ['nome' => 'PG das meninas', 'publico_alvo' => 'Juventude', 'responsavel' => 'Larah e Alicia', 'dia_semana' => 3, 'horario' => '19:30', 'frequencia' => 'Semanal', 'imagem' => $base . 'pg-lara.jpeg'],
        ['nome' => 'Mulheres com Propósito', 'publico_alvo' => 'Mulheres acima de 30 anos', 'responsavel' => 'Karina e Maressa', 'dia_semana' => 4, 'horario' => '19:30', 'frequencia' => 'Semanal', 'imagem' => $base . 'mulheres-com-proposito.jpeg'],
        ['nome' => 'Famílias em Cristo', 'publico_alvo' => 'Casais', 'responsavel' => 'Rodrigo Coelho e Lucyara', 'dia_semana' => 4, 'horario' => '19:30', 'frequencia' => 'Semanal', 'imagem' => $base . 'pg-da-familia.jpeg'],
        ['nome' => 'PG Enrico', 'publico_alvo' => 'Jovens/Adultos', 'responsavel' => 'Enrico', 'dia_semana' => 4, 'horario' => '19:30', 'frequencia' => 'Semanal', 'imagem' => $base . 'pg-enrico.jpeg'],
        ['nome' => 'Bereanos', 'publico_alvo' => 'Homens', 'responsavel' => 'Pr. Arruda', 'dia_semana' => 4, 'horario' => '19:30', 'frequencia' => 'Quinzenal', 'imagem' => $base . 'bereanos.jpeg'],
        ['nome' => 'Florescer', 'publico_alvo' => 'Jovens adultas', 'responsavel' => 'Paulinha, Sandrinha e Eluan', 'dia_semana' => 4, 'horario' => '19:30', 'frequencia' => 'Semanal', 'imagem' => $base . 'florescer.jpeg'],
        ['nome' => 'Casa de oração', 'publico_alvo' => 'Mulheres', 'responsavel' => 'Eliza', 'dia_semana' => 5, 'horario' => '19:15', 'frequencia' => 'Quinzenal', 'imagem' => $base . 'pg-eliza.jpeg'],
        ['nome' => 'PG Toshiba', 'publico_alvo' => 'Casais', 'responsavel' => 'Pr. Arruda', 'dia_semana' => 5, 'horario' => '19:30', 'frequencia' => 'Semanal', 'imagem' => $base . 'pg-toshiba.jpeg'],
    ];
}

function ipim_grupos_seed(bool $force = false): array
{
    global $wpdb;
    $table = ipim_grupos_table('grupos');
    $ministry_id = ipim_grupos_ensure_ministry();
    $existing = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");

    if ($existing > 0 && !$force) {
        return ['created' => 0, 'skipped' => $existing];
    }

    $created = 0;
    foreach (ipim_grupos_seed_data() as $item) {
        $slug = sanitize_title($item['nome']);
        $exists = (int) $wpdb->get_var($wpdb->prepare("SELECT id FROM {$table} WHERE slug=%s", $slug));
        if ($exists > 0) {
            continue;
        }

        $now = current_time('mysql');
        $wpdb->insert($table, [
            'slug' => $slug,
            'nome' => $item['nome'],
            'descricao' => '',
            'publico_alvo' => $item['publico_alvo'],
            'frequencia' => $item['frequencia'],
            'dia_semana' => $item['dia_semana'],
            'horario' => $item['horario'],
            'local' => '',
            'contato' => '5535988613046',
            'responsavel' => $item['responsavel'],
            'imagem' => $item['imagem'],
            'status' => 'ativo',
            'ministerio_id' => $ministry_id,
            'created_by' => get_current_user_id(),
            'updated_by' => get_current_user_id(),
            'created_at' => $now,
            'updated_at' => $now,
        ], ['%s','%s','%s','%s','%s','%d','%s','%s','%s','%s','%s','%s','%d','%d','%d','%s','%s']);
        $created++;
    }

    if ($created > 0) {
        ipim_rbac_audit(get_current_user_id(), 'grupos_seed', 'system', 0, null, ['created' => $created]);
    }

    return ['created' => $created, 'skipped' => $existing];
}

// --------------------------------------------------------------------------
// Upload de foto do encontro
// --------------------------------------------------------------------------

/**
 * Salva a foto enviada em $_FILES['foto'] e devolve URL + attachment_id.
 *
 * @return array{url:string,attachment_id:int}|null
 */
function ipim_grupos_upload_photo(int $grupo_id, string $title): ?array
{
    if (empty($_FILES['foto']) || !is_array($_FILES['foto'])) {
        return null;
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $overrides = ['test_form' => false];
    $upload = wp_handle_upload($_FILES['foto'], $overrides);
    if (!is_array($upload) || isset($upload['error'])) {
        return null;
    }

    $attachment_id = wp_insert_attachment([
        'post_mime_type' => $upload['type'],
        'post_title' => sanitize_text_field($title),
        'post_content' => '',
        'post_status' => 'inherit',
    ], $upload['file'], $grupo_id);

    if (is_wp_error($attachment_id)) {
        return null;
    }

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

/**
 * Candidatos a líder de PG: membros ativos do ministério de Pequenos Grupos.
 *
 * @return array<int,array{user_id:int,nome:string,email:string}>
 */
function ipim_grupos_leader_candidates(): array
{
    $ministry_id = ipim_grupos_ensure_ministry();
    if ($ministry_id <= 0) {
        return [];
    }

    global $wpdb;
    $table = ipim_rbac_table('ministry_memberships');
    $user_ids = $wpdb->get_col($wpdb->prepare(
        "SELECT user_id FROM {$table} WHERE ministry_id=%d AND status='active' ORDER BY user_id",
        $ministry_id
    ));

    $candidates = [];
    foreach ($user_ids ?: [] as $user_id) {
        $user = get_userdata((int) $user_id);
        if (!$user instanceof WP_User) {
            continue;
        }
        $candidates[] = [
            'user_id' => (int) $user->ID,
            'nome' => (string) $user->display_name,
            'email' => (string) $user->user_email,
        ];
    }

    return $candidates;
}

// --------------------------------------------------------------------------
// REST handlers
// --------------------------------------------------------------------------

function ipim_grupos_rest_public_list(): WP_REST_Response
{
    global $wpdb;
    $table = ipim_grupos_table('grupos');
    $rows = $wpdb->get_results("SELECT * FROM {$table} WHERE status='ativo' ORDER BY dia_semana ASC, horario ASC, nome ASC");
    return rest_ensure_response(array_map('ipim_grupos_public_fields', $rows ?: []));
}

function ipim_grupos_rest_public_get(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $table = ipim_grupos_table('grupos');
    $slug = sanitize_title((string) $request->get_param('slug'));
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE slug=%s AND status='ativo'", $slug));
    if (!$row) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    return rest_ensure_response(ipim_grupos_public_fields($row));
}

function ipim_grupos_rest_list(): WP_REST_Response
{
    global $wpdb;
    $table = ipim_grupos_table('grupos');
    $uid = get_current_user_id();

    if (ipim_grupos_can_manage_all()) {
        $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY status ASC, dia_semana ASC, horario ASC, nome ASC");
    } else {
        $leader_table = ipim_grupos_table('grupo_lideres');
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT DISTINCT g.* FROM {$table} g
             INNER JOIN {$leader_table} l ON l.grupo_id = g.id
             WHERE l.user_id = %d
             ORDER BY g.dia_semana ASC, g.horario ASC, g.nome ASC",
            $uid
        ));
    }

    return rest_ensure_response(array_map('ipim_grupos_admin_fields', $rows ?: []));
}

function ipim_grupos_rest_save(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $table = ipim_grupos_table('grupos');
    $id = (int) ($request->get_param('id') ?: 0);
    $nome = sanitize_text_field((string) $request->get_param('nome'));

    if ($nome === '') {
        return new WP_REST_Response(['error' => 'missing_nome'], 400);
    }

    if ($id > 0 && !ipim_grupos_can_manage_group($id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }
    if ($id <= 0 && !ipim_grupos_can_manage_all()) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $before = null;
    if ($id > 0) {
        $before = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id), ARRAY_A);
        if (!$before) {
            return new WP_REST_Response(['error' => 'not_found'], 404);
        }
    }

    $slug = sanitize_title((string) ($request->get_param('slug') ?: $nome));
    $status = (string) ($request->get_param('status') ?: 'ativo');
    if (!in_array($status, ['ativo', 'inativo', 'arquivado'], true)) {
        $status = 'ativo';
    }

    $dia = $request->get_param('dia_semana');
    $dia = ($dia === null || $dia === '') ? null : max(1, min(7, (int) $dia));

    $data = [
        'slug' => $slug,
        'nome' => $nome,
        'descricao' => wp_kses_post((string) $request->get_param('descricao')),
        'publico_alvo' => sanitize_text_field((string) $request->get_param('publico_alvo')),
        'frequencia' => sanitize_text_field((string) $request->get_param('frequencia')),
        'dia_semana' => $dia,
        'horario' => sanitize_text_field((string) $request->get_param('horario')),
        'local' => sanitize_text_field((string) $request->get_param('local')),
        'contato' => preg_replace('/\D+/', '', (string) $request->get_param('contato')),
        'responsavel' => sanitize_text_field((string) $request->get_param('responsavel')),
        'imagem' => esc_url_raw((string) $request->get_param('imagem')),
        'status' => $status,
        'ministerio_id' => ipim_grupos_ensure_ministry(),
        'updated_by' => get_current_user_id(),
        'updated_at' => current_time('mysql'),
    ];

    $formats = ['%s','%s','%s','%s','%s','%d','%s','%s','%s','%s','%s','%s','%d','%d','%s'];

    if ($id > 0) {
        $wpdb->update($table, $data, ['id' => $id], $formats, ['%d']);
    } else {
        $data['created_by'] = get_current_user_id();
        $data['created_at'] = current_time('mysql');
        $formats[] = '%d';
        $formats[] = '%s';
        $wpdb->insert($table, $data, $formats);
        $id = (int) $wpdb->insert_id;
    }

    // Líderes vinculados (opcional). Só admin/pastor/líder do ministério alteram.
    $lideres = $request->get_param('lideres');
    if (is_array($lideres) && ipim_grupos_can_manage_all()) {
        $leader_table = ipim_grupos_table('grupo_lideres');
        $wpdb->delete($leader_table, ['grupo_id' => $id], ['%d']);
        foreach (array_unique(array_map('intval', $lideres)) as $user_id) {
            if ($user_id <= 0) {
                continue;
            }
            $wpdb->insert($leader_table, [
                'grupo_id' => $id,
                'user_id' => $user_id,
                'papel' => 'lider',
                'created_at' => current_time('mysql'),
            ], ['%d','%d','%s','%s']);
        }
    }

    $saved = ipim_grupos_admin_fields($wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id)));
    ipim_rbac_audit(get_current_user_id(), $before ? 'grupo_update' : 'grupo_create', 'grupo', $id, $before, $saved);

    return rest_ensure_response($saved);
}

function ipim_grupos_rest_delete(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $table = ipim_grupos_table('grupos');
    $id = (int) $request->get_param('id');

    if ($id <= 0) {
        return new WP_REST_Response(['error' => 'invalid_id'], 400);
    }
    if (!ipim_grupos_can_manage_all()) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $before = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id), ARRAY_A);
    if (!$before) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }

    $wpdb->update($table, ['status' => 'arquivado', 'updated_at' => current_time('mysql')], ['id' => $id], ['%s','%s'], ['%d']);
    ipim_rbac_audit(get_current_user_id(), 'grupo_archive', 'grupo', $id, $before, ['status' => 'arquivado']);

    return rest_ensure_response(['ok' => true, 'id' => $id, 'status' => 'arquivado']);
}

function ipim_grupos_rest_encounters(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $grupo_id = (int) $request->get_param('id');
    if ($grupo_id <= 0 || !ipim_grupos_can_access()) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $encontros = ipim_grupos_table('grupo_encontros');
    $presenca = ipim_grupos_table('grupo_encontro_presenca');
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$encontros} WHERE grupo_id=%d ORDER BY data DESC, id DESC",
        $grupo_id
    ), ARRAY_A);

    $items = array_map(static function (array $row) use ($wpdb, $presenca): array {
        $people = $wpdb->get_results($wpdb->prepare(
            "SELECT nome, user_id FROM {$presenca} WHERE encontro_id=%d ORDER BY id",
            (int) $row['id']
        ), ARRAY_A);
        $row['id'] = (int) $row['id'];
        $row['grupo_id'] = (int) $row['grupo_id'];
        $row['publico_presente'] = (int) $row['publico_presente'];
        $row['publicar_feed'] = (bool) $row['publicar_feed'];
        $row['foto_attachment_id'] = empty($row['foto_attachment_id']) ? null : (int) $row['foto_attachment_id'];
        $row['presenca'] = array_map(static fn (array $p): array => [
            'nome' => (string) $p['nome'],
            'user_id' => $p['user_id'] === null ? null : (int) $p['user_id'],
        ], $people ?: []);
        return $row;
    }, $rows ?: []);

    return rest_ensure_response($items);
}

function ipim_grupos_rest_create_encounter(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $grupo_id = (int) $request->get_param('id');
    if ($grupo_id <= 0 || !ipim_grupos_can_manage_group($grupo_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $data_date = sanitize_text_field((string) $request->get_param('data'));
    if ($data_date === '') {
        return new WP_REST_Response(['error' => 'missing_data'], 400);
    }

    $encontros = ipim_grupos_table('grupo_encontros');
    $presenca = ipim_grupos_table('grupo_encontro_presenca');
    $now = current_time('mysql');

    $wpdb->insert($encontros, [
        'grupo_id' => $grupo_id,
        'data' => $data_date,
        'texto_lido' => sanitize_text_field((string) $request->get_param('texto_lido')),
        'tema' => sanitize_text_field((string) $request->get_param('tema')),
        'preletor' => sanitize_text_field((string) $request->get_param('preletor')),
        'foto_url' => esc_url_raw((string) $request->get_param('foto_url')),
        'foto_attachment_id' => (int) $request->get_param('foto_attachment_id') ?: null,
        'observacoes' => wp_kses_post((string) $request->get_param('observacoes')),
        'publico_presente' => max(0, (int) $request->get_param('publico_presente')),
        'publicar_feed' => $request->get_param('publicar_feed') ? 1 : 0,
        'created_by' => get_current_user_id(),
        'created_at' => $now,
        'updated_at' => $now,
    ], ['%d','%s','%s','%s','%s','%s','%d','%s','%d','%d','%d','%s','%s']);

    $encontro_id = (int) $wpdb->insert_id;
    ipim_grupos_save_presence_rows($encontro_id, $request->get_param('presenca'));

    $saved = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$encontros} WHERE id=%d", $encontro_id), ARRAY_A);
    ipim_rbac_audit(get_current_user_id(), 'grupo_encontro_create', 'grupo_encontro', $encontro_id, null, $saved ?: ['grupo_id' => $grupo_id]);

    return rest_ensure_response(['ok' => true, 'id' => $encontro_id]);
}

function ipim_grupos_save_presence_rows(int $encontro_id, $presenca): void
{
    global $wpdb;
    if ($encontro_id <= 0 || !is_array($presenca)) {
        return;
    }

    $table = ipim_grupos_table('grupo_encontro_presenca');
    $wpdb->delete($table, ['encontro_id' => $encontro_id], ['%d']);
    $now = current_time('mysql');

    foreach ($presenca as $person) {
        if (is_string($person)) {
            $nome = trim($person);
            $user_id = null;
        } elseif (is_array($person)) {
            $nome = trim((string) ($person['nome'] ?? ''));
            $user_id = !empty($person['user_id']) ? (int) $person['user_id'] : null;
        } else {
            continue;
        }

        if ($nome === '' && $user_id === null) {
            continue;
        }

        if ($nome === '' && $user_id !== null) {
            $user = get_userdata($user_id);
            $nome = $user instanceof WP_User ? $user->display_name : 'Membro';
        }

        $wpdb->insert($table, [
            'encontro_id' => $encontro_id,
            'nome' => $nome,
            'user_id' => $user_id,
            'created_at' => $now,
        ], ['%d','%s','%d','%s']);
    }
}

function ipim_grupos_rest_save_presence(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $encontro_id = (int) $request->get_param('encontro_id');
    if ($encontro_id <= 0) {
        return new WP_REST_Response(['error' => 'invalid_encontro'], 400);
    }

    $encontros = ipim_grupos_table('grupo_encontros');
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$encontros} WHERE id=%d", $encontro_id));
    if (!$row) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }
    if (!ipim_grupos_can_manage_group((int) $row->grupo_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    ipim_grupos_save_presence_rows($encontro_id, $request->get_param('presenca'));
    ipim_rbac_audit(get_current_user_id(), 'grupo_encontro_presence', 'grupo_encontro', $encontro_id, null, ['encontro_id' => $encontro_id]);

    return rest_ensure_response(['ok' => true, 'encontro_id' => $encontro_id]);
}

function ipim_grupos_rest_upload_photo(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $grupo_id = (int) $request->get_param('id');
    if ($grupo_id <= 0 || !ipim_grupos_can_manage_group($grupo_id)) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $table = ipim_grupos_table('grupos');
    $grupo = $wpdb->get_row($wpdb->prepare("SELECT nome FROM {$table} WHERE id=%d", $grupo_id));
    if (!$grupo) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }

    $photo = ipim_grupos_upload_photo($grupo_id, $grupo->nome . ' - encontro');
    if (!$photo) {
        return new WP_REST_Response(['error' => 'upload_failed'], 400);
    }

    ipim_rbac_audit(get_current_user_id(), 'grupo_encontro_foto', 'grupo', $grupo_id, null, $photo);

    return rest_ensure_response($photo);
}

function ipim_grupos_rest_candidates(): WP_REST_Response
{
    if (!ipim_grupos_can_manage_all()) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    return rest_ensure_response(ipim_grupos_leader_candidates());
}

function ipim_grupos_rest_seed(WP_REST_Request $request): WP_REST_Response
{
    if (!ipim_rbac_is_admin()) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }
    $force = (bool) $request->get_param('force');
    return rest_ensure_response(ipim_grupos_seed($force));
}

// --------------------------------------------------------------------------
// Rotas
// --------------------------------------------------------------------------

add_action('rest_api_init', static function (): void {
    register_rest_route('1ipim/v1', '/grupos', [
        'methods' => 'GET',
        'callback' => 'ipim_grupos_rest_public_list',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('1ipim/v1', '/grupos/(?P<slug>[a-z0-9-]+)', [
        'methods' => 'GET',
        'callback' => 'ipim_grupos_rest_public_get',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('1ipim/v1', '/admin/grupos', [
        [
            'methods' => 'GET',
            'callback' => 'ipim_grupos_rest_list',
            'permission_callback' => 'ipim_grupos_rest_access',
        ],
        [
            'methods' => 'POST',
            'callback' => 'ipim_grupos_rest_save',
            'permission_callback' => 'ipim_grupos_rest_access',
        ],
    ]);

    register_rest_route('1ipim/v1', '/admin/grupos/(?P<id>\d+)', [
        [
            'methods' => 'PUT,PATCH,POST',
            'callback' => 'ipim_grupos_rest_save',
            'permission_callback' => 'ipim_grupos_rest_access',
        ],
        [
            'methods' => 'DELETE',
            'callback' => 'ipim_grupos_rest_delete',
            'permission_callback' => 'ipim_grupos_rest_manage',
        ],
    ]);

    register_rest_route('1ipim/v1', '/admin/grupos/(?P<id>\d+)/encontros', [
        [
            'methods' => 'GET',
            'callback' => 'ipim_grupos_rest_encounters',
            'permission_callback' => 'ipim_grupos_rest_access',
        ],
        [
            'methods' => 'POST',
            'callback' => 'ipim_grupos_rest_create_encounter',
            'permission_callback' => 'ipim_grupos_rest_access',
        ],
    ]);

    register_rest_route('1ipim/v1', '/admin/grupos/(?P<id>\d+)/foto', [
        'methods' => 'POST',
        'callback' => 'ipim_grupos_rest_upload_photo',
        'permission_callback' => 'ipim_grupos_rest_access',
    ]);

    register_rest_route('1ipim/v1', '/admin/grupos/candidatos', [
        'methods' => 'GET',
        'callback' => 'ipim_grupos_rest_candidates',
        'permission_callback' => 'ipim_grupos_rest_manage',
    ]);

    register_rest_route('1ipim/v1', '/admin/grupos/encontros/(?P<encontro_id>\d+)/presenca', [
        'methods' => 'POST',
        'callback' => 'ipim_grupos_rest_save_presence',
        'permission_callback' => 'ipim_grupos_rest_access',
    ]);

    register_rest_route('1ipim/v1', '/admin/grupos/seed', [
        'methods' => 'POST',
        'callback' => 'ipim_grupos_rest_seed',
        'permission_callback' => 'ipim_grupos_rest_manage',
    ]);
});
