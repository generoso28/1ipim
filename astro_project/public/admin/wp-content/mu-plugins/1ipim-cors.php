<?php
/**
 * Plugin Name: 1IPIM CORS
 * Description: Libera os subdomínios da 1IPIM nas requisições REST autenticadas.
 *
 * O WordPress, por padrão, só permite CORS a partir de home_url()/site_url().
 * Como o portal e o Berea rodam em subdomínios próprios e chamam a API em
 * `1ipim.online/admin`, é preciso autorizar essas origens explicitamente.
 *
 * Esta lista deve espelhar a de `portal-auth/_bootstrap.php`.
 */

add_filter('allowed_http_origins', static function (array $origins): array {
    $extra = [
        'https://1ipim.online',
        'https://www.1ipim.online',
        'https://staging.1ipim.online',
        'https://admin.1ipim.online',
        'https://portal.1ipim.online',
        'https://berea.1ipim.online',
    ];

    return array_values(array_unique(array_merge($origins, $extra)));
});
