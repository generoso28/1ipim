<?php
/**
 * Plugin Name: 1IPIM Registration
 * Description: Cadastro de voluntários e assinantes, verificação de e-mail e convites.
 * Version: 0.1.0
 * Author: 1IPIM Dev
 *
 * Must-use plugin. Substitui o antigo endpoint de cadastro público.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/1ipim-rbac.php';

define('IPIM_REG_VERSION', '0.1.0');

function ipim_reg_client_ip(): string
{
    $forwarded = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
    if ($forwarded !== '') {
        $first = trim(explode(',', $forwarded)[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) {
            return $first;
        }
    }

    $real = (string) ($_SERVER['HTTP_X_REAL_IP'] ?? '');
    if (filter_var($real, FILTER_VALIDATE_IP)) {
        return $real;
    }

    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

/**
 * Limite simples por IP em arquivo fora do public_html.
 */
function ipim_reg_rate_limit(string $bucket, int $max = 5, int $window = 3600): bool
{
    $dir = dirname(ABSPATH, 2) . '/1ipim-cache/registration-rate-limit';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return true;
    }

    $file = $dir . '/' . hash('sha256', $bucket . '|' . ipim_reg_client_ip()) . '.json';
    $now = time();
    $data = ['first' => $now, 'count' => 0];

    if (is_file($file)) {
        $raw = @file_get_contents($file);
        $parsed = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($parsed)) {
            $data = [
                'first' => (int) ($parsed['first'] ?? $now),
                'count' => (int) ($parsed['count'] ?? 0),
            ];
        }
    }

    if ($now - $data['first'] > $window) {
        $data = ['first' => $now, 'count' => 0];
    }

    if ($data['count'] >= $max) {
        return false;
    }

    $data['count']++;
    @file_put_contents($file, wp_json_encode($data), LOCK_EX);
    @chmod($file, 0600);

    return true;
}

function ipim_reg_is_honeypot(WP_REST_Request $request): bool
{
    return trim((string) $request->get_param('website')) !== '';
}

/**
 * @return string[]
 */
function ipim_reg_ministries(WP_REST_Request $request): array
{
    $raw = $request->get_param('ministries');
    if (is_string($raw)) {
        $decoded = json_decode($raw, true);
        $raw = is_array($decoded) ? $decoded : [];
    }
    if (!is_array($raw)) {
        return [];
    }

    return array_values(array_unique(array_filter(array_map('intval', $raw))));
}

function ipim_reg_send_volunteer_admin_email(int $user_id, array $ministries): void
{
    $user = get_userdata($user_id);
    if (!$user) {
        return;
    }

    $names = [];
    foreach ($ministries as $ministry_id) {
        $post = get_post($ministry_id);
        if ($post && $post->post_type === 'ministerio') {
            $names[] = $post->post_title;
        }
    }

    $subject = 'Novo cadastro de voluntário — Portal 1IPIM';
    $message = "Um novo voluntário solicitou acesso ao portal.\n\n";
    $message .= "Nome: {$user->display_name}\n";
    $message .= "E-mail: {$user->user_email}\n";
    $message .= 'Ministérios: ' . ($names !== [] ? implode(', ', $names) : 'Nenhum') . "\n\n";
    $message .= "Aprove em: https://1ipim.online/portal/usuarios\n";

    wp_mail(get_option('admin_email'), $subject, $message);
}

function ipim_reg_send_volunteer_confirmation(string $email, string $name): void
{
    $subject = 'Recebemos seu cadastro — Portal 1IPIM';
    $message = "Olá, {$name}!\n\n";
    $message .= "Recebemos seu cadastro no Portal 1IPIM. Aguarde a aprovação de um líder ou administrador para acessar as áreas de voluntariado.\n\n";
    $message .= "Quando for aprovado, você poderá entrar em https://1ipim.online/portal/login\n";
    wp_mail($email, $subject, $message);
}

function ipim_reg_send_verification(int $user_id): bool
{
    $user = get_userdata($user_id);
    if (!$user) {
        return false;
    }

    $token = wp_generate_password(32, false, false);
    update_user_meta($user_id, '_ipim_email_token', $token);
    update_user_meta($user_id, '_ipim_email_token_expires', time() + DAY_IN_SECONDS);

    $link = 'https://1ipim.online/admin/portal-auth/verify.php?uid=' . $user_id . '&token=' . rawurlencode($token);
    $subject = 'Confirme seu e-mail — Bible Rats 1IPIM';
    $message = "Olá, {$user->display_name}!\n\n";
    $message .= "Confirme seu e-mail para ativar sua conta no Bible Rats:\n\n{$link}\n\n";
    $message .= "O link expira em 24 horas. Se você não fez este cadastro, ignore esta mensagem.\n";

    return wp_mail($user->user_email, $subject, $message);
}

/**
 * @return true|WP_Error
 */
function ipim_reg_verify_email(int $user_id, string $token)
{
    $user = get_userdata($user_id);
    if (!$user) {
        return new WP_Error('invalid_user', 'Usuário não encontrado.');
    }

    $stored = (string) get_user_meta($user_id, '_ipim_email_token', true);
    $expires = (int) get_user_meta($user_id, '_ipim_email_token_expires', true);

    if ($stored === '' || !hash_equals($stored, $token)) {
        return new WP_Error('invalid_token', 'Link de confirmação inválido.');
    }
    if ($expires > 0 && $expires < time()) {
        return new WP_Error('expired_token', 'Link de confirmação expirado. Solicite um novo cadastro.');
    }

    update_user_meta($user_id, '_ipim_email_verified', '1');
    delete_user_meta($user_id, '_ipim_email_token');
    delete_user_meta($user_id, '_ipim_email_token_expires');

    return true;
}

/**
 * @return array<string,mixed>|WP_Error
 */
function ipim_reg_create_user(array $data, string $account_type)
{
    $username = sanitize_user((string) ($data['username'] ?? ''), true);
    $email = sanitize_email((string) ($data['email'] ?? ''));
    $password = (string) ($data['password'] ?? '');
    $name = sanitize_text_field((string) ($data['display_name'] ?? ''));

    if ($username === '' || $email === '' || $password === '' || $name === '') {
        return new WP_Error('missing_fields', 'Preencha nome, usuário, e-mail e senha.', ['status' => 400]);
    }
    if (!is_email($email)) {
        return new WP_Error('invalid_email', 'Informe um e-mail válido.', ['status' => 400]);
    }
    if (strlen($password) < 8) {
        return new WP_Error('weak_password', 'A senha deve ter pelo menos 8 caracteres.', ['status' => 400]);
    }
    if (username_exists($username)) {
        return new WP_Error('user_exists', 'Este nome de usuário já está em uso.', ['status' => 409]);
    }
    if (email_exists($email)) {
        return new WP_Error('email_exists', 'Este e-mail já está cadastrado.', ['status' => 409]);
    }

    $user_id = wp_create_user($username, $password, $email);
    if (is_wp_error($user_id)) {
        return $user_id;
    }

    $first_name = explode(' ', $name)[0] ?? $name;
    wp_update_user([
        'ID' => $user_id,
        'display_name' => $name,
        'first_name' => $first_name,
        'role' => $account_type === 'bible_rats' ? 'assinante' : 'subscriber',
    ]);

    update_user_meta($user_id, '_ipim_account_type', $account_type);
    update_user_meta($user_id, '_ipim_email_verified', $account_type === 'bible_rats' ? '0' : '1');

    return ['id' => (int) $user_id, 'name' => $name, 'email' => $email];
}

function ipim_reg_find_user(string $login): ?WP_User
{
    $login = trim($login);
    if ($login === '') {
        return null;
    }

    $user = is_email($login) ? get_user_by('email', $login) : get_user_by('login', $login);
    if (!$user && !is_email($login)) {
        $user = get_user_by('email', $login);
    }

    return $user instanceof WP_User ? $user : null;
}

add_action('rest_api_init', static function (): void {
    register_rest_route('1ipim/v1', '/registrar', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            if (ipim_reg_is_honeypot($request)) {
                return ['success' => true, 'message' => 'Cadastro realizado! Aguarde a aprovação.'];
            }
            if (!ipim_reg_rate_limit('volunteer', 20, 3600)) {
                return new WP_Error('rate_limited', 'Muitas tentativas. Tente novamente mais tarde.', ['status' => 429]);
            }

            $data = (array) $request->get_json_params();
            $user = ipim_reg_create_user($data, 'volunteer');
            if (is_wp_error($user)) {
                return $user;
            }

            $ministries = ipim_reg_ministries($request);
            update_user_meta($user['id'], 'ministries_requested', wp_json_encode($ministries));
            update_user_meta($user['id'], 'ministries_approved', '[]');

            ipim_reg_send_volunteer_admin_email($user['id'], $ministries);
            ipim_reg_send_volunteer_confirmation($user['email'], $user['name']);
            ipim_rbac_audit(0, 'user_register_volunteer', 'user', $user['id'], null, [
                'email' => $user['email'],
                'ministries' => $ministries,
            ]);
            if (function_exists('ipim_notify_admins')) {
                ipim_notify_admins(
                    'user_pending',
                    'Novo cadastro pendente',
                    $user['name'] . ' (' . $user['email'] . ') solicitou acesso ao portal.',
                    '/portal/usuarios'
                );
            }

            return [
                'success' => true,
                'message' => 'Cadastro realizado! Aguarde a aprovação de um líder ou administrador.',
                'user_id' => $user['id'],
            ];
        },
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('1ipim/v1', '/registrar-assinante', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            if (ipim_reg_is_honeypot($request)) {
                return ['success' => true, 'message' => 'Conta criada! Confirme seu e-mail para ativar.'];
            }
            if (!ipim_reg_rate_limit('subscriber', 20, 3600)) {
                return new WP_Error('rate_limited', 'Muitas tentativas. Tente novamente mais tarde.', ['status' => 429]);
            }

            $data = (array) $request->get_json_params();
            $user = ipim_reg_create_user($data, 'bible_rats');
            if (is_wp_error($user)) {
                return $user;
            }

            $sent = ipim_reg_send_verification($user['id']);
            ipim_rbac_audit(0, 'user_register_bible_rats', 'user', $user['id'], null, [
                'email' => $user['email'],
                'verification_sent' => $sent,
            ]);

            return [
                'success' => true,
                'message' => 'Conta criada! Confirme seu e-mail para ativar o acesso ao Bible Rats.',
                'user_id' => $user['id'],
                'verification_sent' => $sent,
            ];
        },
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('1ipim/v1', '/reenviar-verificacao', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            if (!ipim_reg_rate_limit('resend_verification', 5, 3600)) {
                return new WP_Error('rate_limited', 'Muitas tentativas. Tente novamente mais tarde.', ['status' => 429]);
            }

            $login = sanitize_text_field((string) $request->get_param('login'));
            $user = ipim_reg_find_user($login);
            if ($user && get_user_meta($user->ID, '_ipim_account_type', true) === 'bible_rats') {
                if (get_user_meta($user->ID, '_ipim_email_verified', true) !== '1') {
                    ipim_reg_send_verification((int) $user->ID);
                }
            }

            return [
                'success' => true,
                'message' => 'Se a conta existir e estiver pendente, enviaremos um novo link de confirmação.',
            ];
        },
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('1ipim/v1', '/admin/users/(?P<id>\d+)/verify-email', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $user_id = (int) $request['id'];
            $user = get_userdata($user_id);
            if (!$user) {
                return new WP_Error('ipim_user_not_found', 'Usuário não encontrado.', ['status' => 404]);
            }
            $before = [
                'verified' => get_user_meta($user_id, '_ipim_email_verified', true),
                'account_type' => get_user_meta($user_id, '_ipim_account_type', true),
            ];
            update_user_meta($user_id, '_ipim_email_verified', '1');
            delete_user_meta($user_id, '_ipim_email_token');
            delete_user_meta($user_id, '_ipim_email_token_expires');
            ipim_rbac_audit(get_current_user_id(), 'email_verify_manual', 'user', $user_id, $before, ['verified' => '1']);
            if (function_exists('ipim_notify')) {
                ipim_notify($user_id, 'email_verified', 'E-mail confirmado', 'Sua conta foi verificada manualmente. Você já pode acessar o portal.', '/portal/login/');
            }

            return [
                'success' => true,
                'id' => $user_id,
                'email_verified' => true,
                'message' => 'E-mail verificado manualmente.',
            ];
        },
        'permission_callback' => static fn (): bool => current_user_can('manage_options'),
    ]);

    register_rest_route('1ipim/v1', '/admin/users/(?P<id>\d+)/resend-verification', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            $user_id = (int) $request['id'];
            $user = get_userdata($user_id);
            if (!$user) {
                return new WP_Error('ipim_user_not_found', 'Usuário não encontrado.', ['status' => 404]);
            }
            if (get_user_meta($user_id, '_ipim_account_type', true) !== 'bible_rats') {
                return new WP_Error('ipim_not_bible_rats', 'Este usuário não é uma conta Bible Rats.', ['status' => 400]);
            }
            $sent = ipim_reg_send_verification($user_id);
            ipim_rbac_audit(get_current_user_id(), 'email_verification_resend', 'user', $user_id, null, ['sent' => $sent]);

            return [
                'success' => true,
                'sent' => $sent,
                'message' => $sent ? 'Confirmação reenviada.' : 'Não foi possível enviar o e-mail.',
            ];
        },
        'permission_callback' => static fn (): bool => current_user_can('manage_options'),
    ]);

    register_rest_route('1ipim/v1', '/admin/users/invite', [
        'methods' => 'POST',
        'callback' => static function (WP_REST_Request $request) {
            if (!current_user_can('manage_options')) {
                return new WP_Error('rest_forbidden', 'Apenas administradores podem convidar usuários.', ['status' => 403]);
            }

            $data = (array) $request->get_json_params();
            $data['password'] = wp_generate_password(32, true, true);
            $user = ipim_reg_create_user($data, 'volunteer');
            if (is_wp_error($user)) {
                return $user;
            }

            $ministries = ipim_reg_ministries($request);
            update_user_meta($user['id'], 'ministries_requested', wp_json_encode($ministries));
            update_user_meta($user['id'], 'ministries_approved', '[]');

            $wp_user = get_userdata($user['id']);
            $key = $wp_user ? get_password_reset_key($wp_user) : new WP_Error('reset_key', 'Não foi possível gerar o convite.');
            $reset_link = '';
            $sent = false;
            if (!is_wp_error($key) && $wp_user) {
                $reset_link = network_site_url(
                    'wp-login.php?action=rp&key=' . rawurlencode($key) . '&login=' . rawurlencode($wp_user->user_login),
                    'login'
                );
                $subject = 'Convite para o Portal 1IPIM';
                $message = "Olá, {$user['name']}!\n\n";
                $message .= "Você foi convidado para o Portal 1IPIM. Defina sua senha pelo link abaixo:\n\n{$reset_link}\n\n";
                $message .= "Se você não esperava este convite, ignore esta mensagem.\n";
                $sent = wp_mail($user['email'], $subject, $message);
            }

            ipim_rbac_audit(get_current_user_id(), 'user_invite', 'user', $user['id'], null, [
                'email' => $user['email'],
                'invite_sent' => $sent,
            ]);

            return [
                'success' => true,
                'id' => $user['id'],
                'invite_sent' => $sent,
                'reset_link' => $reset_link,
                'message' => $sent
                    ? 'Convite enviado por e-mail.'
                    : 'Usuário criado, mas o e-mail falhou. Use o link de definição de senha abaixo.',
            ];
        },
        'permission_callback' => static fn (): bool => current_user_can('manage_options'),
    ]);
});

add_filter('wp_authenticate_user', static function ($user, string $password) {
    if (is_wp_error($user)) {
        return $user;
    }
    if (
        get_user_meta($user->ID, '_ipim_account_type', true) === 'bible_rats'
        && get_user_meta($user->ID, '_ipim_email_verified', true) !== '1'
    ) {
        return new WP_Error(
            'ipim_email_unverified',
            'Confirme seu e-mail para acessar. Verifique sua caixa de entrada.'
        );
    }

    return $user;
}, 10, 2);
