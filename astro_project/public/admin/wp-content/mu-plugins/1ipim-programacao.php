<?php
/**
 * Plugin Name: 1IPIM Programação
 * Description: Programação da igreja: cultos semanais e eventos do ano.
 * Version: 0.1.0
 * Author: 1IPIM Dev
 *
 * Must-use plugin. Os cultos semanais são definidos por dia da semana (sem
 * recorrência no banco). Os eventos têm data única e a listagem pública é
 * filtrada pelo ano corrente.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/1ipim-rbac.php';

define('IPIM_PROGRAMACAO_VERSION', '0.1.0');

function ipim_programacao_table(string $name): string
{
    global $wpdb;
    return $wpdb->prefix . '1ipim_' . $name;
}

function ipim_programacao_install(): void
{
    if (get_option('ipim_programacao_version') === IPIM_PROGRAMACAO_VERSION) {
        return;
    }

    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';

    $charset = $wpdb->get_charset_collate();
    $table = ipim_programacao_table('programacao');

    dbDelta("CREATE TABLE {$table} (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        tipo enum('semanal','evento') NOT NULL DEFAULT 'semanal',
        titulo varchar(190) NOT NULL,
        subtitulo varchar(190) NULL,
        descricao text NULL,
        horario varchar(16) NULL,
        dia_semana tinyint(4) NULL,
        data date NULL,
        local varchar(255) NULL,
        link varchar(500) NULL,
        tag varchar(64) NULL,
        tag_cor varchar(16) NULL,
        tipo_evento varchar(32) NULL,
        status enum('publicado','rascunho') NOT NULL DEFAULT 'publicado',
        ordem int(11) NOT NULL DEFAULT 0,
        created_by bigint(20) unsigned NOT NULL DEFAULT 0,
        updated_by bigint(20) unsigned NOT NULL DEFAULT 0,
        created_at datetime NOT NULL,
        updated_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY tipo_status (tipo,status),
        KEY data_evento (data),
        KEY dia_semana (dia_semana)
    ) {$charset};");

    update_option('ipim_programacao_version', IPIM_PROGRAMACAO_VERSION);
    ipim_rbac_audit(0, 'programacao_install', 'system', 0, null, ['version' => IPIM_PROGRAMACAO_VERSION]);

    if (get_option('ipim_programacao_seeded') !== '1') {
        ipim_programacao_seed();
        update_option('ipim_programacao_seeded', '1');
    }
}
add_action('init', 'ipim_programacao_install', 22);

/**
 * Garante o ministério de Programação (tipo=programacao).
 */
function ipim_programacao_ensure_ministry(): int
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
        if ($tipo === 'programacao' || $title === 'programação' || $title === 'programacao') {
            update_post_meta($post->ID, 'tipo', 'programacao');
            return (int) $post->ID;
        }
    }

    $post_id = wp_insert_post([
        'post_type' => 'ministerio',
        'post_status' => 'publish',
        'post_title' => 'Programação',
    ], true);

    if (is_wp_error($post_id)) {
        return 0;
    }

    update_post_meta($post_id, 'tipo', 'programacao');

    return (int) $post_id;
}
add_action('init', 'ipim_programacao_ensure_ministry', 23);

// --------------------------------------------------------------------------
// Permissões
// --------------------------------------------------------------------------

function ipim_programacao_can_manage(): bool
{
    if (!is_user_logged_in()) {
        return false;
    }
    if (ipim_rbac_is_admin() || ipim_rbac_is_pastor()) {
        return true;
    }

    $ministry_id = ipim_programacao_ensure_ministry();
    return $ministry_id > 0 && ipim_rbac_can_manage_ministry(get_current_user_id(), $ministry_id);
}

function ipim_programacao_rest_manage(): bool
{
    return ipim_programacao_can_manage();
}

// --------------------------------------------------------------------------
// Seed (programação atual do site)
// --------------------------------------------------------------------------

function ipim_programacao_seed_weekly(): array
{
    return [
        [
            'titulo' => 'Escola Bíblica Dominical',
            'descricao' => 'Às 9:00, no templo. A Escola Bíblica Dominical (EBD) é um ministério de ensino da igreja, dedicado ao estudo sistemático da Bíblia. Ela tem o propósito de instruir crianças, jovens e adultos na fé cristã, promovendo o crescimento espiritual e a aplicação prática das Escrituras na vida diária.',
            'horario' => '09:00',
            'dia_semana' => 0,
            'local' => 'Templo',
            'tag' => 'Doutrina',
            'tag_cor' => '#7ccece',
            'ordem' => 10,
        ],
        [
            'titulo' => 'Culto Solene',
            'descricao' => 'Às 19:00, no Templo. O Culto Solene é o momento central de adoração da igreja, onde os crentes se reúnem para glorificar a Deus por meio da oração, do louvor, da pregação da Palavra e da comunhão.',
            'horario' => '19:00',
            'dia_semana' => 0,
            'local' => 'Templo',
            'tag' => 'Orações',
            'tag_cor' => '#7ace9f',
            'ordem' => 20,
        ],
        [
            'titulo' => 'Reunião de Oração',
            'descricao' => 'Às 18:30, no espaço Get Up, nos reunimos semanalmente com o propósito de orar pela igreja, pelas missões, pelos enfermos e uns pelos outros, fortalecendo a comunhão e a fé da congregação. A prática contínua da oração mantém a igreja centrada na dependência de Deus e no fortalecimento espiritual de todos os membros, sendo o pilar sustentador de todos os demais ministérios da igreja.',
            'horario' => '18:30',
            'dia_semana' => 3,
            'local' => 'Espaço Get Up',
            'tag' => 'Orações',
            'tag_cor' => '#7ace9f',
            'ordem' => 30,
        ],
        [
            'titulo' => 'Get Up',
            'descricao' => 'Às 19:30, no Espaço Get Up, o Get Up, ministério de jovens da igreja, se reúne para louvar a Deus, estudar Sua Palavra e ter um tempo de comunhão entre os irmãos. É um ministério dedicado ao fortalecimento espiritual dos jovens, buscando crescer na fé e no serviço a Deus.',
            'horario' => '19:30',
            'dia_semana' => 6,
            'local' => 'Espaço Get Up',
            'link' => 'https://www.instagram.com/juventude_getup/',
            'tag' => 'Comunhão',
            'tag_cor' => '#6fc7b0',
            'ordem' => 40,
        ],
    ];
}

function ipim_programacao_seed_events(int $ano): array
{
    $date = static fn (string $md): string => sprintf('%04d-%s', $ano, $md);

    return [
        ['titulo' => 'Acampamento Maanaim', 'subtitulo' => 'Temporada de Verão', 'data' => $date('02-14'), 'tipo_evento' => 'camp'],
        ['titulo' => 'Retorno às Aulas do CREIA', 'subtitulo' => '', 'data' => $date('03-01'), 'tipo_evento' => 'education'],
        ['titulo' => 'Encontro da Família', 'subtitulo' => 'c/ Rachel Novaes', 'data' => $date('03-14'), 'tipo_evento' => 'special'],
        ['titulo' => 'Acampamento Maanaim', 'subtitulo' => 'Temporada de Páscoa', 'data' => $date('04-02'), 'tipo_evento' => 'camp'],
        ['titulo' => 'Culto Especial', 'subtitulo' => 'c/ Hernandes Dias Lopes', 'data' => $date('04-29'), 'tipo_evento' => 'worship'],
        ['titulo' => 'Visita do Rev. Sergio Gini', 'subtitulo' => 'Presidente da IPI do Brasil', 'data' => $date('05-16'), 'tipo_evento' => 'special'],
        ['titulo' => 'Congresso de Casais', 'subtitulo' => '', 'data' => $date('06-01'), 'tipo_evento' => 'ministry'],
        ['titulo' => 'Educação Reformada', 'subtitulo' => 'c/ Pr. Davi Manso', 'data' => $date('07-04'), 'tipo_evento' => 'education'],
        ['titulo' => 'Semana Jovem', 'subtitulo' => '', 'data' => $date('07-20'), 'tipo_evento' => 'youth'],
        ['titulo' => 'Acampamento Maanaim', 'subtitulo' => 'Temporada de Festa', 'data' => $date('08-22'), 'tipo_evento' => 'camp'],
        ['titulo' => 'Conferência da Fé Reformada', 'subtitulo' => '', 'data' => $date('09-04'), 'tipo_evento' => 'conference'],
        ['titulo' => '152 Anos da 1IPIM', 'subtitulo' => 'Culto especial c/ Vitor Quevedo', 'data' => $date('09-01'), 'tipo_evento' => 'celebration'],
        ['titulo' => 'Acampamento Maanaim', 'subtitulo' => 'Temporada Kids', 'data' => $date('10-01'), 'tipo_evento' => 'camp'],
        ['titulo' => 'Conferência Missionária', 'subtitulo' => '', 'data' => $date('10-23'), 'tipo_evento' => 'conference'],
        ['titulo' => 'Cultos de Formatura', 'subtitulo' => '', 'data' => $date('11-01'), 'tipo_evento' => 'celebration'],
        ['titulo' => 'Culto de Natal', 'subtitulo' => '', 'data' => $date('12-01'), 'tipo_evento' => 'celebration'],
        ['titulo' => 'Culto de Ano Novo', 'subtitulo' => '', 'data' => $date('12-31'), 'tipo_evento' => 'celebration'],
    ];
}

function ipim_programacao_seed(bool $force = false): array
{
    global $wpdb;
    $table = ipim_programacao_table('programacao');
    $existing = (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");

    if ($existing > 0 && !$force) {
        return ['created' => 0, 'skipped' => $existing];
    }

    $now = current_time('mysql');
    $ano = (int) current_time('Y');
    $created = 0;

    foreach (ipim_programacao_seed_weekly() as $item) {
        $exists = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table} WHERE tipo='semanal' AND titulo=%s AND dia_semana=%d",
            $item['titulo'],
            $item['dia_semana']
        ));
        if ($exists > 0) {
            continue;
        }

        $wpdb->insert($table, [
            'tipo' => 'semanal',
            'titulo' => $item['titulo'],
            'subtitulo' => '',
            'descricao' => $item['descricao'],
            'horario' => $item['horario'],
            'dia_semana' => $item['dia_semana'],
            'data' => null,
            'local' => $item['local'],
            'link' => $item['link'] ?? '',
            'tag' => $item['tag'] ?? '',
            'tag_cor' => $item['tag_cor'] ?? '',
            'tipo_evento' => '',
            'status' => 'publicado',
            'ordem' => $item['ordem'],
            'created_by' => get_current_user_id(),
            'updated_by' => get_current_user_id(),
            'created_at' => $now,
            'updated_at' => $now,
        ], ['%s','%s','%s','%s','%s','%d','%s','%s','%s','%s','%s','%s','%s','%d','%d','%d','%s','%s']);
        $created++;
    }

    foreach (ipim_programacao_seed_events($ano) as $item) {
        $exists = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM {$table} WHERE tipo='evento' AND titulo=%s AND data=%s",
            $item['titulo'],
            $item['data']
        ));
        if ($exists > 0) {
            continue;
        }

        $wpdb->insert($table, [
            'tipo' => 'evento',
            'titulo' => $item['titulo'],
            'subtitulo' => $item['subtitulo'],
            'descricao' => '',
            'horario' => '',
            'dia_semana' => null,
            'data' => $item['data'],
            'local' => '',
            'link' => '',
            'tag' => '',
            'tag_cor' => '',
            'tipo_evento' => $item['tipo_evento'],
            'status' => 'publicado',
            'ordem' => 0,
            'created_by' => get_current_user_id(),
            'updated_by' => get_current_user_id(),
            'created_at' => $now,
            'updated_at' => $now,
        ], ['%s','%s','%s','%s','%s','%d','%s','%s','%s','%s','%s','%s','%s','%d','%d','%d','%s','%s']);
        $created++;
    }

    if ($created > 0) {
        ipim_rbac_audit(get_current_user_id(), 'programacao_seed', 'system', 0, null, ['created' => $created]);
    }

    return ['created' => $created, 'skipped' => $existing];
}

// --------------------------------------------------------------------------
// Serialização
// --------------------------------------------------------------------------

function ipim_programacao_fields(object $row): array
{
    return [
        'id' => (int) $row->id,
        'tipo' => (string) $row->tipo,
        'titulo' => (string) $row->titulo,
        'subtitulo' => (string) $row->subtitulo,
        'descricao' => (string) $row->descricao,
        'horario' => (string) $row->horario,
        'dia_semana' => $row->dia_semana === null ? null : (int) $row->dia_semana,
        'data' => $row->data === null ? null : (string) $row->data,
        'local' => (string) $row->local,
        'link' => (string) $row->link,
        'tag' => (string) $row->tag,
        'tag_cor' => (string) $row->tag_cor,
        'tipo_evento' => (string) $row->tipo_evento,
        'status' => (string) $row->status,
        'ordem' => (int) $row->ordem,
        'created_at' => (string) $row->created_at,
        'updated_at' => (string) $row->updated_at,
    ];
}

function ipim_programacao_public_weekly(): array
{
    global $wpdb;
    $table = ipim_programacao_table('programacao');
    $rows = $wpdb->get_results(
        "SELECT * FROM {$table} WHERE tipo='semanal' AND status='publicado' ORDER BY dia_semana ASC, ordem ASC, horario ASC, titulo ASC"
    );

    return array_map('ipim_programacao_fields', $rows ?: []);
}

function ipim_programacao_public_events(int $ano): array
{
    global $wpdb;
    $table = ipim_programacao_table('programacao');
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$table} WHERE tipo='evento' AND status='publicado' AND YEAR(data)=%d ORDER BY data ASC, ordem ASC, horario ASC, titulo ASC",
        $ano
    ));

    return array_map('ipim_programacao_fields', $rows ?: []);
}

// --------------------------------------------------------------------------
// REST handlers
// --------------------------------------------------------------------------

function ipim_programacao_rest_public(WP_REST_Request $request): WP_REST_Response
{
    $ano = (int) ($request->get_param('ano') ?: current_time('Y'));
    if ($ano < 1900 || $ano > 2999) {
        $ano = (int) current_time('Y');
    }

    $tipo = sanitize_text_field((string) $request->get_param('tipo'));
    if ($tipo === 'semanal') {
        return rest_ensure_response(ipim_programacao_public_weekly());
    }
    if ($tipo === 'evento') {
        return rest_ensure_response(ipim_programacao_public_events($ano));
    }

    return rest_ensure_response([
        'ano' => $ano,
        'semanal' => ipim_programacao_public_weekly(),
        'eventos' => ipim_programacao_public_events($ano),
    ]);
}

function ipim_programacao_rest_list(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $table = ipim_programacao_table('programacao');
    $tipo = sanitize_text_field((string) $request->get_param('tipo'));

    $where = ['1=1'];
    $params = [];
    if (in_array($tipo, ['semanal', 'evento'], true)) {
        $where[] = 'tipo = %s';
        $params[] = $tipo;
    }

    $sql = "SELECT * FROM {$table} WHERE " . implode(' AND ', $where) . ' ORDER BY tipo ASC, dia_semana ASC, data ASC, ordem ASC, horario ASC, titulo ASC';
    $rows = $params
        ? $wpdb->get_results($wpdb->prepare($sql, $params))
        : $wpdb->get_results($sql);

    return rest_ensure_response(array_map('ipim_programacao_fields', $rows ?: []));
}

function ipim_programacao_rest_save(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $table = ipim_programacao_table('programacao');
    $id = (int) ($request->get_param('id') ?: 0);

    $tipo = sanitize_text_field((string) $request->get_param('tipo'));
    if (!in_array($tipo, ['semanal', 'evento'], true)) {
        return new WP_REST_Response(['error' => 'invalid_tipo'], 400);
    }

    $titulo = sanitize_text_field((string) $request->get_param('titulo'));
    if ($titulo === '') {
        return new WP_REST_Response(['error' => 'missing_titulo'], 400);
    }

    $before = null;
    if ($id > 0) {
        $before = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id), ARRAY_A);
        if (!$before) {
            return new WP_REST_Response(['error' => 'not_found'], 404);
        }
    }

    $dia = $request->get_param('dia_semana');
    $dia = ($dia === null || $dia === '') ? null : max(0, min(6, (int) $dia));
    $data = sanitize_text_field((string) $request->get_param('data'));
    $data = $data === '' ? null : $data;
    if ($tipo === 'semanal' && $dia === null) {
        return new WP_REST_Response(['error' => 'missing_dia_semana'], 400);
    }
    if ($tipo === 'evento' && $data === null) {
        return new WP_REST_Response(['error' => 'missing_data'], 400);
    }
    if ($data !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
        return new WP_REST_Response(['error' => 'invalid_data'], 400);
    }

    $horario = sanitize_text_field((string) $request->get_param('horario'));
    if ($horario !== '' && !preg_match('/^\d{2}:\d{2}$/', $horario)) {
        $horario = '';
    }

    $status = (string) $request->get_param('status');
    if (!in_array($status, ['publicado', 'rascunho'], true)) {
        $status = 'publicado';
    }

    $tagCor = (string) $request->get_param('tag_cor');
    if ($tagCor !== '' && !preg_match('/^#[0-9a-fA-F]{6}$/', $tagCor)) {
        $tagCor = '';
    }

    $tipoEvento = sanitize_key((string) $request->get_param('tipo_evento'));
    if (!in_array($tipoEvento, ['camp','worship','education','special','ministry','youth','conference','celebration',''], true)) {
        $tipoEvento = '';
    }

    $dataRow = [
        'tipo' => $tipo,
        'titulo' => $titulo,
        'subtitulo' => sanitize_text_field((string) $request->get_param('subtitulo')),
        'descricao' => wp_kses_post((string) $request->get_param('descricao')),
        'horario' => $horario,
        'dia_semana' => $tipo === 'semanal' ? $dia : null,
        'data' => $tipo === 'evento' ? $data : null,
        'local' => sanitize_text_field((string) $request->get_param('local')),
        'link' => esc_url_raw((string) $request->get_param('link')),
        'tag' => sanitize_text_field((string) $request->get_param('tag')),
        'tag_cor' => $tagCor,
        'tipo_evento' => $tipo === 'evento' ? $tipoEvento : '',
        'status' => $status,
        'ordem' => (int) $request->get_param('ordem'),
        'updated_by' => get_current_user_id(),
        'updated_at' => current_time('mysql'),
    ];

    $formats = ['%s','%s','%s','%s','%s','%d','%s','%s','%s','%s','%s','%s','%s','%d','%d','%s'];

    if ($id > 0) {
        $wpdb->update($table, $dataRow, ['id' => $id], $formats, ['%d']);
    } else {
        $dataRow['created_by'] = get_current_user_id();
        $dataRow['created_at'] = current_time('mysql');
        $formats[] = '%d';
        $formats[] = '%s';
        $wpdb->insert($table, $dataRow, $formats);
        $id = (int) $wpdb->insert_id;
    }

    $saved = ipim_programacao_fields($wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id)));
    ipim_rbac_audit(
        get_current_user_id(),
        $before ? 'programacao_update' : 'programacao_create',
        'programacao',
        $id,
        $before,
        $saved
    );

    return rest_ensure_response($saved);
}

function ipim_programacao_rest_delete(WP_REST_Request $request): WP_REST_Response
{
    global $wpdb;
    $table = ipim_programacao_table('programacao');
    $id = (int) $request->get_param('id');

    if ($id <= 0) {
        return new WP_REST_Response(['error' => 'invalid_id'], 400);
    }

    $before = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id=%d", $id), ARRAY_A);
    if (!$before) {
        return new WP_REST_Response(['error' => 'not_found'], 404);
    }

    $wpdb->delete($table, ['id' => $id], ['%d']);
    ipim_rbac_audit(get_current_user_id(), 'programacao_delete', 'programacao', $id, $before, null);

    return rest_ensure_response(['ok' => true, 'id' => $id]);
}

function ipim_programacao_rest_seed(WP_REST_Request $request): WP_REST_Response
{
    if (!ipim_rbac_is_admin()) {
        return new WP_REST_Response(['error' => 'forbidden'], 403);
    }

    $force = (bool) $request->get_param('force');
    return rest_ensure_response(ipim_programacao_seed($force));
}

// --------------------------------------------------------------------------
// Rotas
// --------------------------------------------------------------------------

add_action('rest_api_init', static function (): void {
    register_rest_route('1ipim/v1', '/programacao', [
        'methods' => 'GET',
        'callback' => 'ipim_programacao_rest_public',
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('1ipim/v1', '/admin/programacao', [
        [
            'methods' => 'GET',
            'callback' => 'ipim_programacao_rest_list',
            'permission_callback' => 'ipim_programacao_rest_manage',
        ],
        [
            'methods' => 'POST',
            'callback' => 'ipim_programacao_rest_save',
            'permission_callback' => 'ipim_programacao_rest_manage',
        ],
    ]);

    register_rest_route('1ipim/v1', '/admin/programacao/(?P<id>\d+)', [
        [
            'methods' => 'PUT,PATCH,POST',
            'callback' => 'ipim_programacao_rest_save',
            'permission_callback' => 'ipim_programacao_rest_manage',
        ],
        [
            'methods' => 'DELETE',
            'callback' => 'ipim_programacao_rest_delete',
            'permission_callback' => 'ipim_programacao_rest_manage',
        ],
    ]);

    register_rest_route('1ipim/v1', '/admin/programacao/seed', [
        'methods' => 'POST',
        'callback' => 'ipim_programacao_rest_seed',
        'permission_callback' => 'ipim_programacao_rest_manage',
    ]);
});
