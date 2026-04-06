<?php
/**
 * Development server router
 * Run with: php -S localhost:8000 server.php
 *
 * Static files (css, js, images, uploads) are served directly.
 * Everything else goes through index.php (MVC).
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Static file serving
$staticExts = ['css', 'js', 'ico', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
$uploadExts = ['mp3', 'wav', 'm4a', 'ogg', 'mp4', 'webm', 'avi', 'mov', 'mkv', 'pdf', 'txt', 'doc', 'docx'];
$ext = pathinfo($uri, PATHINFO_EXTENSION);

$root = __DIR__;

// Check if file exists directly
$file = $root . $uri;
if (file_exists($file) && is_file($file)) {
    // Serve static files
    $mimeMap = [
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
        'webp' => 'image/webp',
        'mp3'  => 'audio/mpeg',
        'wav'  => 'audio/wav',
        'm4a'  => 'audio/mp4',
        'ogg'  => 'audio/ogg',
        'mp4'  => 'video/mp4',
        'webm' => 'video/webm',
        'pdf'  => 'application/pdf',
        'txt'  => 'text/plain',
        'json' => 'application/json',
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
