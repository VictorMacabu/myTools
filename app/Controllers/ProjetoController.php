<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Models\Projeto;
use App\Models\Arquivo;
use App\Models\TipoArquivo;

class ProjetoController extends Controller {

    public function show(int $id): void {
        $projeto = Projeto::detail($id);
        if (!$projeto) {
            header('Location: /');
            exit;
        }
        $fontes = Projeto::fontes($id);
        $this->view('projeto.show', [
            'projeto' => $projeto,
            'fontes'  => $fontes,
        ]);
    }

    public function upload(int $id): void {
        try {
            if (!isset($_FILES['arquivo'])) {
                $this->json(['error' => 'Nenhum arquivo enviado.'], 400);
                return;
            }

            $file = $_FILES['arquivo'];

            // Check for upload errors
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $errorMessages = [
                    UPLOAD_ERR_INI_SIZE   => 'Arquivo maior que upload_max_filesize',
                    UPLOAD_ERR_FORM_SIZE  => 'Arquivo maior que MAX_FILE_SIZE',
                    UPLOAD_ERR_PARTIAL    => 'Upload interrompido',
                    UPLOAD_ERR_NO_FILE    => 'Nenhum arquivo em body',
                    UPLOAD_ERR_NO_TMP_DIR => 'Diretório temp faltando',
                    UPLOAD_ERR_CANT_WRITE => 'Falha ao escrever',
                    UPLOAD_ERR_EXTENSION  => 'Extensão bloqueada',
                ];
                $msg = $errorMessages[$file['error']] ?? 'Erro desconhecido (' . $file['error'] . ')';
                $this->json(['error' => $msg], 400);
                return;
            }

            $uploadDir = dirname(__DIR__, 2) . '/uploads/';
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0755, true)) {
                    $this->json(['error' => 'Não foi possível criar diretório de upload'], 500);
                    return;
                }
            }

            $uniqueName = uniqid() . '_' . basename($file['name']);
            $dest = $uploadDir . $uniqueName;

            if (!move_uploaded_file($file['tmp_name'], $dest)) {
                $this->json(['error' => 'Falha ao salvar arquivo'], 500);
                return;
            }

            $tipo = Arquivo::classifyFileType($file['name']);
            $tamanho = (int) round($file['size'] / 1024);

            $arquivoId = Arquivo::create([
                'nome'       => $file['name'],
                'caminho'    => '/uploads/' . $uniqueName,
                'tipo'       => $tipo,
                'tamanho_kb' => $tamanho,
                'projeto_id' => $id,
            ]);

            $this->json([
                'id'  => $arquivoId,
                'nome' => $file['name'],
                'tipo' => $tipo,
                'caminho' => '/uploads/' . $uniqueName,
                'tamanho_kb' => $tamanho,
            ]);
        } catch (\Exception $e) {
            // Always return JSON, never HTML
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
            echo json_encode(['error' => 'Erro ao processar upload: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }
}
