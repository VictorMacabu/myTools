<?php
namespace App\Core;

class Router {
    private array $getRoutes = [];
    private array $postRoutes = [];

    public function get(string $path, $handler): void {
        $this->getRoutes[$path] = $handler;
    }

    public function post(string $path, $handler): void {
        $this->postRoutes[$path] = $handler;
    }

    public function resolve(): void {
        $method = $_SERVER['REQUEST_METHOD'];
        $isDelete = $method === 'POST' && ($_POST['_method'] ?? '') === 'DELETE';
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // Check exact match first
        if ($method === 'GET' && isset($this->getRoutes[$path])) {
            return $this->dispatch($this->getRoutes[$path]);
        }
        if ($method === 'POST' && isset($this->postRoutes[$path])) {
            return $this->dispatch($this->postRoutes[$path]);
        }

        // Dynamic API routes
        if ($method === 'GET') {
            // GET /api/workspaces
            if ($path === '/api/workspaces') {
                return $this->dispatch([\App\Controllers\ApiController::class, 'workspaces']);
            }
            // GET /api/projeto/{id}/fontes
            if (preg_match('#^/api/projeto/(\d+)/fontes$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ApiController::class, 'fontes'], (int) $m[1]);
            }
        }

        if ($method === 'POST' && !$isDelete) {
            // POST /api/projeto/{id}/upload
            if (preg_match('#^/api/projeto/(\d+)/upload$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ProjetoController::class, 'upload'], (int) $m[1]);
            }
        }

        if ($isDelete || $method === 'POST') {
            // DELETE /api/fontes/{id}/delete
            if (preg_match('#^/api/fontes/(\d+)/delete$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ApiController::class, 'deleteFonte'], (int) $m[1]);
            }
            // POST/PUT /api/fontes/{id}/update
            if (preg_match('#^/api/fontes/(\d+)/update$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ApiController::class, 'updateFonte'], (int) $m[1]);
            }
            // DELETE /api/projeto/{id}/delete
            if (preg_match('#^/api/projeto/(\d+)/delete$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ApiController::class, 'deleteProjeto'], (int) $m[1]);
            }
            // POST /api/projeto/{id}/toggle-fav
            if (preg_match('#^/api/projeto/(\d+)/toggle-fav$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ApiController::class, 'toggleFavorite'], (int) $m[1]);
            }
            // POST /api/projeto/{id}/update
            if (preg_match('#^/api/projeto/(\d+)/update$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ApiController::class, 'updateProjeto'], (int) $m[1]);
            }
            // DELETE /api/workspace/{id}/delete
            if (preg_match('#^/api/workspace/(\d+)/delete$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ApiController::class, 'deleteWorkspace'], (int) $m[1]);
            }
            // POST /api/workspace/{id}/update
            if (preg_match('#^/api/workspace/(\d+)/update$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ApiController::class, 'updateWorkspace'], (int) $m[1]);
            }
            // DELETE /api/grupo/{id}/delete
            if (preg_match('#^/api/grupo/(\d+)/delete$#', $path, $m)) {
                return $this->dispatch([\App\Controllers\ApiController::class, 'deleteGrupo'], (int) $m[1]);
            }
        }

        // Page routes
        $cleanPath = rtrim($path, '/') ?: '/';

        // GET /projeto/{id}
        if (preg_match('#^/projeto/(\d+)$#', $cleanPath, $m)) {
            return $this->dispatch([\App\Controllers\ProjetoController::class, 'show'], (int) $m[1]);
        }

        // GET / or /dashboard
        if ($cleanPath === '/' || $cleanPath === '/dashboard') {
            return $this->dispatch([\App\Controllers\DashboardController::class, 'index']);
        }

        http_response_code(404);
        echo '404 - Page not found';
    }

    private function dispatch($handler, ?int $param = null): void {
        if (is_array($handler) && count($handler) === 2 && class_exists($handler[0])) {
            $controller = new $handler[0]();
            $action = $handler[1];
            if ($param !== null) {
                $controller->$action($param);
            } else {
                $controller->$action();
            }
            return;
        }
        if (is_callable($handler)) {
            $handler();
        }
    }
}
