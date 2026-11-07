<?php
declare(strict_types=1);

/**
 * Confirma o e-mail de uma conta Bible Rats e redireciona para o login.
 */

$wp_load = dirname(__DIR__) . '/wp-load.php';
if (!is_file($wp_load)) {
    http_response_code(500);
    exit('WordPress não encontrado.');
}

require_once $wp_load;

$uid = (int) ($_GET['uid'] ?? 0);
$token = isset($_GET['token']) ? sanitize_text_field(wp_unslash((string) $_GET['token'])) : '';
$base = 'https://1ipim.online/portal/login/';

if (!function_exists('ipim_reg_verify_email')) {
    wp_safe_redirect($base . '?verify_error=missing');
    exit;
}

$result = ipim_reg_verify_email($uid, $token);
if (is_wp_error($result)) {
    wp_safe_redirect($base . '?verify_error=' . rawurlencode($result->get_error_code()));
    exit;
}

wp_safe_redirect($base . '?verified=1');
exit;
