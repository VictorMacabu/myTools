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
            $this->dispatch($this->getRoutes[$path]);
            return;
        }
        if ($method === 'POST' && isset($this->postRoutes[$path])) {
            $this->dispatch($this->postRoutes[$path]);
            return;
        }

        // Dynamic API routes
        if ($method === 'GET') {
            // GET /api/workspaces
            if ($path === '/api/workspaces') {
                $this->dispatch([\App\Controllers\ApiController::class, 'workspaces']);
                return;
            }
            // GET /api/projeto/{id}/fontes
            if (preg_match('#^/api/projeto/(\d+)/fontes$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'fontes'], (int) $m[1]);
                return;
            }
            // GET /api/projeto/{id}/transcribe/{jobId}/status
            if (preg_match('#^/api/projeto/(\d+)/transcribe/(\d+)/status$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ProjetoController::class, 'transcribeStatus'], (int) $m[1], (int) $m[2]);
                return;
            }
            // GET /api/fontes/{id}/download
            if (preg_match('#^/api/fontes/(\d+)/download$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'downloadFonte'], (int) $m[1]);
                return;
            }
        }

        if ($method === 'POST' && !$isDelete) {
            // POST /api/projeto/{id}/upload
            if (preg_match('#^/api/projeto/(\d+)/upload$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ProjetoController::class, 'upload'], (int) $m[1]);
                return;
            }
            // POST /api/projeto/{id}/audio/cut
            if (preg_match('#^/api/projeto/(\d+)/audio/cut$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ProjetoController::class, 'cutAudio'], (int) $m[1]);
                return;
            }
            // POST /api/projeto/{id}/transcribe
            if (preg_match('#^/api/projeto/(\d+)/transcribe$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ProjetoController::class, 'transcribe'], (int) $m[1]);
                return;
            }
            // POST /api/projeto/{id}/transcribe/{jobId}/cancel
            if (preg_match('#^/api/projeto/(\d+)/transcribe/(\d+)/cancel$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ProjetoController::class, 'cancelTranscription'], (int) $m[1], (int) $m[2]);
                return;
            }
        }

        if ($isDelete || $method === 'POST') {
            // DELETE /api/fontes/{id}/delete
            if (preg_match('#^/api/fontes/(\d+)/delete$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'deleteFonte'], (int) $m[1]);
                return;
            }
            // POST/PUT /api/fontes/{id}/update
            if (preg_match('#^/api/fontes/(\d+)/update$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'updateFonte'], (int) $m[1]);
                return;
            }
            // DELETE /api/projeto/{id}/delete
            if (preg_match('#^/api/projeto/(\d+)/delete$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'deleteProjeto'], (int) $m[1]);
                return;
            }
            // POST /api/projeto/{id}/toggle-fav
            if (preg_match('#^/api/projeto/(\d+)/toggle-fav$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'toggleFavorite'], (int) $m[1]);
                return;
            }
            // POST /api/projeto/{id}/update
            if (preg_match('#^/api/projeto/(\d+)/update$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'updateProjeto'], (int) $m[1]);
                return;
            }
            // DELETE /api/workspace/{id}/delete
            if (preg_match('#^/api/workspace/(\d+)/delete$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'deleteWorkspace'], (int) $m[1]);
                return;
            }
            // POST /api/workspace/{id}/update
            if (preg_match('#^/api/workspace/(\d+)/update$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'updateWorkspace'], (int) $m[1]);
                return;
            }
            // DELETE /api/grupo/{id}/delete
            if (preg_match('#^/api/grupo/(\d+)/delete$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'deleteGrupo'], (int) $m[1]);
                return;
            }
            // POST /api/grupo/{id}/update
            if (preg_match('#^/api/grupo/(\d+)/update$#', $path, $m)) {
                $this->dispatch([\App\Controllers\ApiController::class, 'updateGrupo'], (int) $m[1]);
                return;
            }
        }

        // Page routes
        $cleanPath = rtrim($path, '/') ?: '/';

        // GET /projeto/{id}
        if (preg_match('#^/projeto/(\d+)$#', $cleanPath, $m)) {
            $this->dispatch([\App\Controllers\ProjetoController::class, 'show'], (int) $m[1]);
            return;
        }

        // GET / or /dashboard
        if ($cleanPath === '/' || $cleanPath === '/dashboard') {
            $this->dispatch([\App\Controllers\DashboardController::class, 'index']);
            return;
       }

        http_response_code(404);
        echo '404 - Page not found';
    }

    private function dispatch($handler, ...$params): void {
        if (is_array($handler) && count($handler) === 2 && class_exists($handler[0])) {
            $controller = new $handler[0]();
            $action = $handler[1];
            $controller->$action(...$params);
            return;
        }
        if (is_callable($handler)) {
            $handler();
        }
    }
}
