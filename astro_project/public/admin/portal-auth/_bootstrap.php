<?php
declare(strict_types=1);

/**
 * Bootstrap dos endpoints de autenticação do portal.
 *
 * A sessão é a do WordPress (cookies HttpOnly), não JWT no localStorage.
 * O nonce é devolvido para ser enviado em X-WP-Nonce nas chamadas à REST API.
 */

$allowedOrigins = [
    'https://1ipim.online',
    'https://www.1ipim.online',
    'https://staging.1ipim.online',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-WP-Nonce');
    http_response_code(204);
    exit;
}

/**
 * @param array<string, mixed> $data
 */
function json_response(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_method(string $method): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $method) {
        json_response(405, ['error' => 'method_not_allowed']);
    }
}

/**
 * Localiza e carrega o WordPress tanto no docroot de produção quanto no staging.
 */
function load_wordpress(): void
{
    $candidates = [
        dirname(__DIR__) . '/wp-load.php',                      // production: public_html/admin
        dirname(__DIR__, 3) . '/public_html/admin/wp-load.php', // staging -> public_html/admin
    ];

    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            require_once $candidate;
            return;
        }
    }

    json_response(500, ['error' => 'wordpress_not_found']);
}

/**
 * @return array<string, mixed>
 */
function user_payload(WP_User $user): array
{
    $roles = array_values(array_map('strval', (array) $user->roles));
    $ministriesRaw = get_user_meta($user->ID, 'ministries_approved', true);
    $ministries = is_string($ministriesRaw) ? json_decode($ministriesRaw, true) : $ministriesRaw;
    $ministries = is_array($ministries) ? array_values(array_map('strval', $ministries)) : [];

    return [
        'id' => (string) $user->ID,
        'nicename' => (string) $user->user_nicename,
        'displayName' => (string) $user->display_name,
        'email' => (string) $user->user_email,
        'role' => $roles[0] ?? 'subscriber',
        'roles' => $roles,
        'ministries' => $ministries,
        'nonce' => wp_create_nonce('wp_rest'),
    ];
}

/**
 * IP do cliente atrás do proxy/nginx da HostGator.
 */
function client_ip(): string
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
 * Limite simples de tentativas por IP (arquivo no cache fora do public_html).
 */
function check_login_rate_limit(string $ip): void
{
    $dir = dirname(__DIR__, 3) . '/1ipim-cache/auth-rate-limit';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return;
    }

    $file = $dir . '/' . hash('sha256', $ip) . '.json';
    $now = time();
    $window = 600;
    $maxAttempts = 8;

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

    if ($data['count'] >= $maxAttempts) {
        json_response(429, ['error' => 'too_many_attempts']);
    }
}

function register_failed_login(string $ip): void
{
    $dir = dirname(__DIR__, 3) . '/1ipim-cache/auth-rate-limit';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return;
    }

    $file = $dir . '/' . hash('sha256', $ip) . '.json';
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

    if ($now - $data['first'] > 600) {
        $data = ['first' => $now, 'count' => 0];
    }

    $data['count']++;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    @chmod($file, 0600);
}

function clear_login_rate_limit(string $ip): void
{
    $file = dirname(__DIR__, 3) . '/1ipim-cache/auth-rate-limit/' . hash('sha256', $ip) . '.json';
    if (is_file($file)) {
        @unlink($file);
    }
}
