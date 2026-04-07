<?php
/**
 * Front Controller
 * Run with: php -S localhost:8000 server.php
 */

// Set error handling to never display errors
ini_set('display_errors', '0');
ini_set('log_errors', '1');
if (PHP_SAPI === 'cli-server') {
    ini_set('error_log', sys_get_temp_dir() . '/php_errors.log');
}

// Request/response logging
$root = __DIR__;
$logFile = $root . '/logs/http.log';
$requestLogged = false;

// Log request on shutdown (ensures response code is captured too)
register_shutdown_function(function() use ($logFile) {
    $httpCode = http_response_code();
    if ($httpCode === false) $httpCode = 200;
    $method = $_SERVER['REQUEST_METHOD'] ?? '?';
    $uri    = $_SERVER['REQUEST_URI'] ?? '?';
    $ctLen  = $_SERVER['CONTENT_LENGTH'] ?? '0';
    $postK  = !empty($_POST) ? json_encode(array_keys($_POST)) : '[]';
    $filesK = !empty($_FILES) ? json_encode(array_keys($_FILES)) : '[]';
    $ferr   = (!empty($_FILES) && isset($_FILES['arquivo'])) ? $_FILES['arquivo']['error'] : null;
    $fsize  = (!empty($_FILES) && isset($_FILES['arquivo'])) ? $_FILES['arquivo']['size'] : null;

    if (!is_dir(dirname($logFile))) @mkdir(dirname($logFile), 0755, true);

    $line = date('Y-m-d H:i:s')
        . " | REQ $method $uri"
        . " | CTLEN $ctLen"
        . " | POST $postK"
        . " | FILES $filesK"
        . " | F_ERR " . json_encode($ferr)
        . " | F_SIZE " . json_encode($fsize)
        . " | RESP $httpCode"
        . PHP_EOL;
    @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);

    // Handle fatal errors
    if ($error = error_get_last()) {
        if ($error['type'] === E_ERROR || $error['type'] === E_PARSE) {
            $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '';
            if (strpos($path, '/api') === 0) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(500);
                echo json_encode(['error' => 'Erro fatal: ' . $error['message']], JSON_UNESCAPED_UNICODE);
            }
        }
    }
});

// Custom error handler: intercept errors but ignore deprecation warnings
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Ignore E_DEPRECATED and E_NOTICE — they are not fatal
    if (in_array($errno, [E_DEPRECATED, E_NOTICE, E_WARNING], true)) {
        return false; // Let PHP handle normally
    }
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (strpos($path, '/api') === 0) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'error' => 'Erro no servidor',
            'debug' => $_ENV['DEBUG'] ?? false ? "$errstr in $errfile:$errline" : null
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return false;
});

require_once $root . '/autoload.php';

$router = new \App\Core\Router();

// Page routes
$router->get('/',       [\App\Controllers\DashboardController::class, 'index']);
$router->get('/dashboard', [\App\Controllers\DashboardController::class, 'index']);

// API static routes
$router->get('/api/workspaces', [\App\Controllers\ApiController::class, 'workspaces']);
$router->post('/api/workspaces', [\App\Controllers\ApiController::class, 'createWorkspace']);
$router->post('/api/projetos',  [\App\Controllers\ApiController::class, 'createProjeto']);
$router->post('/api/grupos',    [\App\Controllers\ApiController::class, 'createGrupo']);

// Chat with LLM
$router->post('/api/chat', [\App\Controllers\ApiController::class, 'chat']);

// Dynamic routes handled by pattern matching in resolve()
$router->resolve();
