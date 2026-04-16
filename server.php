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
if (!is_string($uri)) {
    $uri = '/';
}

// Static file serving
$staticExts = ['css', 'js', 'ico', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
$uploadExts = ['mp3', 'wav', 'm4a', 'ogg', 'mp4', 'webm', 'avi', 'mov', 'mkv', 'pdf', 'txt', 'doc', 'docx', 'md', 'srt', 'vtt'];
$ext = pathinfo($uri, PATHINFO_EXTENSION);

$root = __DIR__;

/**
 * Stream file contents safely (supports Range requests for media seeking).
 */
function streamFileResponse(string $filePath, string $mimeType): void {
    $size = @filesize($filePath);
    if ($size === false || $size < 0) {
        http_response_code(404);
        echo 'Arquivo nao encontrado';
        return;
    }

    // Avoid buffering huge files in memory.
    while (ob_get_level() > 0) {
        @ob_end_clean();
    }

    $start = 0;
    $end = $size - 1;
    $isPartial = false;

    if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/i', (string) $_SERVER['HTTP_RANGE'], $m)) {
        $rangeStart = $m[1] !== '' ? (int) $m[1] : null;
        $rangeEnd = $m[2] !== '' ? (int) $m[2] : null;

        if ($rangeStart !== null && $rangeEnd !== null) {
            $start = $rangeStart;
            $end = min($rangeEnd, $end);
        } elseif ($rangeStart !== null) {
            $start = $rangeStart;
        } elseif ($rangeEnd !== null) {
            $suffixLen = $rangeEnd;
            $start = max(0, $size - $suffixLen);
        }

        if ($start > $end || $start < 0 || $end >= $size) {
            http_response_code(416);
            header('Content-Range: bytes */' . $size);
            return;
        }

        $isPartial = true;
    }

    $length = ($end - $start) + 1;

    if ($isPartial) {
        http_response_code(206);
        header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
    } else {
        http_response_code(200);
    }

    header('Content-Type: ' . $mimeType);
    header('Accept-Ranges: bytes');
    header('Content-Length: ' . $length);

    $fp = @fopen($filePath, 'rb');
    if ($fp === false) {
        http_response_code(500);
        echo 'Falha ao abrir arquivo';
        return;
    }

    if ($start > 0) {
        fseek($fp, $start);
    }

    $chunkSize = 8192 * 16; // 128KB
    $remaining = $length;
    while ($remaining > 0 && !feof($fp)) {
        $read = (int) min($chunkSize, $remaining);
        $buffer = fread($fp, $read);
        if ($buffer === false || $buffer === '') break;
        echo $buffer;
        $remaining -= strlen($buffer);
        if (connection_aborted()) break;
        flush();
    }

    fclose($fp);
}

// Check if file exists directly (and stays inside project root)
$candidate = $root . $uri;
$file = realpath($candidate);
$rootReal = realpath($root);
if ($file !== false && $rootReal !== false && str_starts_with($file, $rootReal . DIRECTORY_SEPARATOR) && is_file($file)) {
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

    $servedExt = strtolower((string) pathinfo($file, PATHINFO_EXTENSION));
    $mime = $mimeMap[$servedExt] ?? 'application/octet-stream';
    streamFileResponse($file, $mime);
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
