<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

require_method('GET');
load_wordpress();

$user = wp_get_current_user();

if (!$user instanceof WP_User || $user->ID <= 0) {
    json_response(401, ['error' => 'not_authenticated']);
}

if (
    get_user_meta($user->ID, '_ipim_account_type', true) === 'bible_rats'
    && get_user_meta($user->ID, '_ipim_email_verified', true) !== '1'
) {
    json_response(403, ['error' => 'email_unverified']);
}

json_response(200, [
    'ok' => true,
    'user' => user_payload($user),
]);
