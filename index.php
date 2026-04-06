<?php
/**
 * Front Controller
 * Run with: php -S localhost:8000 server.php
 */
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
