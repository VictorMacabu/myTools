<?php
/**
 * Development server router
 * Run with: php -S localhost:8000 server.php
 *
 * Static files (css, js, images, uploads) are served directly.
 * Everything else goes through index.php (MVC).
 */

// Suppress PHP errors to stdout/stderr before any output is sent.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Log all requests (including static files served by php -S)
$logFile = __DIR__ . '/logs/requests.log';
if (!is_dir(dirname($logFile))) @mkdir(dirname($logFile), 0755, true);
$requestLog = date('Y-m-d H:i:s')
    . " | REQ " . ($_SERVER['REQUEST_METHOD'] ?? '?')
    . " " . ($_SERVER['REQUEST_URI'] ?? '?')
    . " | CTLEN " . ($_SERVER['CONTENT_LENGTH'] ?? '0')
    . " | FILES " . json_encode(!empty($_FILES) ? array_keys($_FILES) : [])
    . " | F_ERR " . json_encode(
        (!empty($_FILES) && isset($_FILES['arquivo']) ? $_FILES['arquivo']['error'] : null)
    )
    . PHP_EOL;
@file_put_contents($logFile, $requestLog, FILE_APPEND | LOCK_EX);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Static file serving
$staticExts = ['css', 'js', 'ico', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
$uploadExts = ['mp3', 'wav', 'm4a', 'ogg', 'mp4', 'webm', 'avi', 'mov', 'mkv', 'pdf', 'txt', 'doc', 'docx', 'md', 'srt', 'vtt'];
$ext = pathinfo($uri, PATHINFO_EXTENSION);

$root = __DIR__;

// Check if file exists directly
$file = $root . $uri;
if (file_exists($file) && is_file($file)) {
    // Serve static files
    $mimeMap = [
        'css'    => 'text/css',
        'js'     => 'application/javascript',
        'png'    => 'image/png',
        'jpg'    => 'image/jpeg',
        'jpeg'   => 'image/jpeg',
        'gif'    => 'image/gif',
        'svg'    => 'image/svg+xml',
        'ico'    => 'image/x-icon',
        'webp'   => 'image/webp',
        'bmp'    => 'image/bmp',
        'tiff'   => 'image/tiff',
        'mp3'    => 'audio/mpeg',
        'wav'    => 'audio/wav',
        'm4a'    => 'audio/mp4',
        'ogg'    => 'audio/ogg',
        'flac'   => 'audio/flac',
        'aac'    => 'audio/aac',
        'mp4'    => 'video/mp4',
        'webm'   => 'video/webm',
        'avi'    => 'video/x-msvideo',
        'mov'    => 'video/quicktime',
        'mkv'    => 'video/x-matroska',
        'pdf'    => 'application/pdf',
        'txt'    => 'text/plain',
        'md'     => 'text/markdown',
        'json'   => 'application/json',
        'csv'    => 'text/csv',
        'xls'    => 'application/vnd.ms-excel',
        'xlsx'   => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'doc'    => 'application/msword',
        'docx'   => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'srt'    => 'application/x-subrip',
        'vtt'    => 'text/vtt',
        'rtf'    => 'application/rtf',
    ];

    $mime = $mimeMap[$ext] ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    readfile($file);
    return true;
}

// Favicon fallback
if ($uri === '/favicon.ico') {
    http_response_code(204);
    return true;
}

// Route everything else to MVC
$_SERVER['SCRIPT_NAME'] = '/index.php';
require $root . '/index.php';
return true;
