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

// Create a custom error handler for API endpoints
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // For API endpoints, always return JSON
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
    // For HTML pages, use default error handling
    return false;
});

// Handle fatal errors too
register_shutdown_function(function() {
    if ($error = error_get_last()) {
        if ($error['type'] === E_ERROR || $error['type'] === E_PARSE) {
            $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            if (strpos($path, '/api') === 0) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(500);
                echo json_encode([
                    'error' => 'Erro fatal no servidor'
                ], JSON_UNESCAPED_UNICODE);
            }
        }
    }
});

$root = __DIR__;
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

// Dynamic routes handled by pattern matching in resolve()
$router->resolve();
