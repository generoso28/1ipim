<?php
declare(strict_types=1);

require __DIR__ . '/_bootstrap.php';

require_method('POST');
load_wordpress();

wp_logout();

json_response(200, ['ok' => true]);
