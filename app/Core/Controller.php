<?php
namespace App\Core;

abstract class Controller {
    protected function json(mixed $data, int $code = 200): void {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    }

    protected function view(string $name, array $vars = []): void {
        $viewDir = dirname(__DIR__) . '/Views/';
        $contentPath = $viewDir . str_replace('.', '/', $name) . '.php';

        if (!file_exists($contentPath)) {
            http_response_code(500);
            echo "View not found: $name";
            return;
        }

        extract($vars, EXTR_SKIP);
        $pageTitle = $vars['pageTitle'] ?? 'Projetos & Ferramentas';

        // Include layout that will include $contentPath internally
        include $viewDir . 'partials/_layout.php';
    }

    protected function input(string $key, mixed $default = ''): mixed {
        return $_POST[$key] ?? $_REQUEST[$key] ?? $default;
    }
}
