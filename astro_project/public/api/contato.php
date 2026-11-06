<?php
declare(strict_types=1);

/**
 * Recebimento do formulário de contato do site.
 *
 * Envia por wp_mail(), reaproveitando a configuração do plugin WP Mail SMTP.
 * Nenhum segredo fica no public_html; o destinatário pode ser sobrescrito em
 * /home2/edu10350/1ipim-secrets/contact.php.
 *
 * Uso: POST /api/contato.php (JSON ou form-urlencoded)
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
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

/**
 * @param array<string, mixed> $data
 */
function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

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

function cache_dir(): string
{
    return dirname(__DIR__, 2) . '/1ipim-cache/contact-rate-limit';
}

function check_rate_limit(string $ip): void
{
    $dir = cache_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return;
    }

    $file = $dir . '/' . hash('sha256', $ip) . '.json';
    $now = time();
    $window = 900;
    $maxAttempts = 5;

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
        respond(429, [
            'error' => 'too_many_requests',
            'message' => 'Muitas mensagens em pouco tempo. Tente novamente mais tarde.',
        ]);
    }

    $data['count']++;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    @chmod($file, 0600);
}

function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
}

function clean_line(string $value): string
{
    $value = strip_tags($value);
    $value = preg_replace('/[\r\n\t]+/', ' ', $value) ?? '';

    return trim($value);
}

function load_wordpress(): void
{
    $candidates = [
        dirname(__DIR__) . '/admin/wp-load.php',
        dirname(__DIR__, 2) . '/public_html/admin/wp-load.php',
    ];

    foreach ($candidates as $candidate) {
        if (is_file($candidate)) {
            require_once $candidate;
            return;
        }
    }

    respond(500, ['error' => 'wordpress_not_found']);
}

$raw = (string) file_get_contents('php://input');
$contentType = (string) ($_SERVER['CONTENT_TYPE'] ?? '');

if (stripos($contentType, 'application/json') !== false) {
    $data = json_decode($raw, true);
} else {
    $data = $_POST;
}

if (!is_array($data)) {
    respond(400, ['error' => 'invalid_payload', 'message' => 'Dados inválidos.']);
}

// Honeypot: bots preenchem este campo invisível.
if (trim((string) ($data['website'] ?? '')) !== '') {
    respond(200, ['ok' => true]);
}

$ip = client_ip();
check_rate_limit($ip);

$name = clean_line((string) ($data['name'] ?? ''));
$email = clean_line((string) ($data['email'] ?? ''));
$phone = clean_line((string) ($data['phone'] ?? ''));
$subjectInput = clean_line((string) ($data['subject'] ?? ''));
$message = trim(strip_tags((string) ($data['message'] ?? '')));

$subjects = [
    'Contato' => 'Contato',
    'Visita' => 'Gostaria de visitar a igreja',
    'Oracao' => 'Pedido de oração',
    'Voluntariado' => 'Quero ser voluntário',
];

$subject = $subjects[$subjectInput] ?? 'Contato';

if (text_length($name) < 2 || text_length($name) > 120) {
    respond(422, ['error' => 'invalid_name', 'message' => 'Informe seu nome completo.']);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['error' => 'invalid_email', 'message' => 'Informe um e-mail válido.']);
}

if (text_length($phone) > 40) {
    respond(422, ['error' => 'invalid_phone', 'message' => 'Telefone muito longo.']);
}

if (text_length($message) < 10) {
    respond(422, ['error' => 'invalid_message', 'message' => 'Escreva uma mensagem com pelo menos 10 caracteres.']);
}

if (text_length($message) > 5000) {
    respond(422, ['error' => 'message_too_long', 'message' => 'A mensagem é muito longa.']);
}

load_wordpress();

$configFile = dirname(__DIR__, 2) . '/1ipim-secrets/contact.php';
$to = 'secretaria1ipi@gmail.com';
if (is_file($configFile)) {
    $config = require $configFile;
    if (is_array($config) && !empty($config['to'])) {
        $to = (string) $config['to'];
    }
}

$safeName = preg_replace('/[<>",]/', '', $name) ?? 'Visitante';
$mailSubject = sprintf('[Site 1IPIM] %s — %s', $subject, $safeName);

$body = implode("\n", [
    'Nova mensagem recebida pelo site.',
    '',
    'Nome: ' . $name,
    'E-mail: ' . $email,
    'Telefone: ' . ($phone !== '' ? $phone : 'não informado'),
    'Assunto: ' . $subject,
    '',
    'Mensagem:',
    $message,
    '',
    '---',
    'IP: ' . $ip,
    'Enviado em: ' . gmdate('Y-m-d H:i:s') . ' UTC',
]);

$headers = [
    'Content-Type: text/plain; charset=UTF-8',
    'Reply-To: ' . $safeName . ' <' . $email . '>',
];

if (!wp_mail($to, $mailSubject, $body, $headers)) {
    respond(502, [
        'error' => 'mail_failed',
        'message' => 'Não foi possível enviar sua mensagem agora. Tente novamente ou use o e-mail/telefone da igreja.',
    ]);
}

respond(200, ['ok' => true]);
