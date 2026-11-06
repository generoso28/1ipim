<?php
declare(strict_types=1);

/**
 * Proxy de leitura do YouTube para o site 1IPIM.
 *
 * A chave NÃO fica no public_html nem no JavaScript.
 * Configuração: /home2/edu10350/1ipim-secrets/youtube.php
 * Cache:        /home2/edu10350/1ipim-cache/youtube-videos.json
 *
 * Uso: /api/youtube.php?limit=12
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 12;
$limit = max(1, min(12, $limit));

$root = dirname(__DIR__, 2);
$configFile = $root . '/1ipim-secrets/youtube.php';
$cacheDir = $root . '/1ipim-cache';
$cacheFile = $cacheDir . '/youtube-videos.json';
$cacheTtl = 600;

if (!is_file($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'config_missing']);
    exit;
}

$config = require $configFile;
$apiKey = is_array($config) ? (string) ($config['api_key'] ?? '') : '';
if ($apiKey === '') {
    http_response_code(500);
    echo json_encode(['error' => 'api_key_missing']);
    exit;
}

/**
 * @return array{videos: array<int, array<string, string>>, fetched_at: int}|null
 */
function read_cache(string $file): ?array
{
    if (!is_file($file)) {
        return null;
    }

    $raw = @file_get_contents($file);
    if ($raw === false) {
        return null;
    }

    $data = json_decode($raw, true);
    if (!is_array($data) || !isset($data['videos']) || !is_array($data['videos'])) {
        return null;
    }

    return $data;
}

/**
 * @param array{videos: array<int, array<string, string>>, fetched_at: int} $payload
 */
function write_cache(string $file, array $payload): void
{
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return;
    }

    $tmp = $file . '.tmp.' . getmypid();
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return;
    }

    if (@file_put_contents($tmp, $json, LOCK_EX) !== false) {
        @chmod($tmp, 0600);
        @rename($tmp, $file);
    } else {
        @unlink($tmp);
    }
}

function respond(array $videos, int $limit, bool $cached, bool $stale = false): void
{
    echo json_encode([
        'videos' => array_slice($videos, 0, $limit),
        'cached' => $cached,
        'stale' => $stale,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

$cache = read_cache($cacheFile);

if ($cache !== null && (time() - (int) ($cache['fetched_at'] ?? 0)) < $cacheTtl) {
    respond($cache['videos'], $limit, true);
    exit;
}

$playlistId = 'UUo1LQoyw17iaoL3y0TnDP9g';
$url = 'https://www.googleapis.com/youtube/v3/playlistItems?' . http_build_query([
    'part' => 'snippet',
    'playlistId' => $playlistId,
    'maxResults' => 12,
    'key' => $apiKey,
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'Referer: https://1ipim.online/',
    ],
    CURLOPT_USERAGENT => '1IPIM-Youtube-Proxy/1.0',
]);

$response = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $status < 200 || $status >= 300) {
    if ($cache !== null) {
        respond($cache['videos'], $limit, true, true);
        exit;
    }

    http_response_code(502);
    echo json_encode(['error' => 'youtube_unavailable']);
    exit;
}

$data = json_decode($response, true);
$items = is_array($data) && isset($data['items']) && is_array($data['items'])
    ? $data['items']
    : [];

$videos = [];
foreach ($items as $item) {
    $snippet = is_array($item) && isset($item['snippet']) && is_array($item['snippet'])
        ? $item['snippet']
        : [];

    $videoId = (string) ($snippet['resourceId']['videoId'] ?? '');
    if ($videoId === '') {
        continue;
    }

    $thumbnails = is_array($snippet['thumbnails'] ?? null) ? $snippet['thumbnails'] : [];
    $thumbnail = (string) (
        $thumbnails['maxres']['url']
        ?? $thumbnails['high']['url']
        ?? $thumbnails['medium']['url']
        ?? ('https://img.youtube.com/vi/' . $videoId . '/hqdefault.jpg')
    );

    $videos[] = [
        'id' => $videoId,
        'title' => (string) ($snippet['title'] ?? 'Vídeo'),
        'published' => (string) ($snippet['publishedAt'] ?? ''),
        'thumbnail' => $thumbnail,
    ];
}

if ($videos === []) {
    if ($cache !== null) {
        respond($cache['videos'], $limit, true, true);
        exit;
    }

    http_response_code(502);
    echo json_encode(['error' => 'no_videos']);
    exit;
}

$payload = ['videos' => $videos, 'fetched_at' => time()];
write_cache($cacheFile, $payload);
respond($videos, $limit, false);
