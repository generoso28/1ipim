<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

require_method('GET');
load_wordpress();

$user = wp_get_current_user();

if (!$user instanceof WP_User || $user->ID <= 0) {
    json_response(401, ['error' => 'not_authenticated']);
}

json_response(200, [
    'ok' => true,
    'user' => user_payload($user),
]);
