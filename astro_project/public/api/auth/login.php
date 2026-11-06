<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

require_method('POST');
load_wordpress();

$raw = file_get_contents('php://input');
$data = is_string($raw) ? json_decode($raw, true) : null;

if (!is_array($data)) {
    json_response(400, ['error' => 'invalid_json']);
}

$username = trim((string) ($data['username'] ?? ''));
$password = (string) ($data['password'] ?? '');

if ($username === '' || $password === '') {
    json_response(400, ['error' => 'missing_credentials']);
}

$ip = client_ip();
check_login_rate_limit($ip);

$user = wp_signon([
    'user_login' => $username,
    'user_password' => $password,
    'remember' => true,
], true);

if (is_wp_error($user) || !($user instanceof WP_User)) {
    register_failed_login($ip);
    json_response(401, [
        'error' => 'invalid_credentials',
        'message' => 'Usuário ou senha inválidos.',
    ]);
}

clear_login_rate_limit($ip);
wp_set_current_user($user->ID);

json_response(200, [
    'ok' => true,
    'user' => user_payload($user),
]);
