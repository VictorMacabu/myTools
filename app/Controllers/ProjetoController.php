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
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Método não suportado'], 405);
            return;
        }

        // Accept single file (name="arquivo") or multiple files (name="arquivo[]")
        $files = [];
        if (!empty($_FILES['arquivo']) && is_array($_FILES['arquivo']['name'] ?? null)) {
            // Multiple files
            $count = count($_FILES['arquivo']['name']);
            for ($i = 0; $i < $count; $i++) {
                $files[] = [
                    'name'     => $_FILES['arquivo']['name'][$i],
                    'type'     => $_FILES['arquivo']['type'][$i],
                    'tmp_name' => $_FILES['arquivo']['tmp_name'][$i],
                    'error'    => $_FILES['arquivo']['error'][$i],
                    'size'     => $_FILES['arquivo']['size'][$i],
                ];
            }
        } elseif (!empty($_FILES['arquivo']) && !is_array($_FILES['arquivo']['name'] ?? null)) {
            // Single file
            $files[] = $_FILES['arquivo'];
        }

        if (empty($files)) {
            // Check if POST body is empty (file rejected by PHP at core level due to size)
            if ($_SERVER['CONTENT_LENGTH'] && (int)$_SERVER['CONTENT_LENGTH'] > 0 && empty($_FILES) && empty($_POST)) {
                $this->json(['error' => 'Arquivo muito grande. Reduza o tamanho ou use Cortar áudio para dividir.'], 400);
            } else {
                $this->json(['error' => 'Nenhum arquivo enviado'], 400);
            }
            return;
        }

        $uploadDir = dirname(__DIR__, 2) . '/uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $errorMessages = [
            UPLOAD_ERR_INI_SIZE   => 'excede limite do servidor',
            UPLOAD_ERR_FORM_SIZE  => 'excede limite do formulário',
            UPLOAD_ERR_PARTIAL    => 'upload parcial, tente novamente',
            UPLOAD_ERR_NO_TMP_DIR => 'diretório temporário indisponível',
            UPLOAD_ERR_CANT_WRITE => 'falha ao gravar em disco',
            UPLOAD_ERR_EXTENSION  => 'bloqueado por extensão PHP',
        ];

        $success = [];
        $errors  = [];

        foreach ($files as $file) {
            $fileName = $file['name'] ?? 'arquivo_sem_nome';

            if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
                $code = (int)$file['error'];
                $msg  = $errorMessages[$code] ?? 'erro desconhecido';
                $errors[] = $fileName . ': ' . $msg;
                continue;
            }

            $uniqueName = uniqid() . '_' . basename($fileName);
            $dest = $uploadDir . $uniqueName;

            if (!move_uploaded_file($file['tmp_name'], $dest)) {
                $errors[] = $fileName . ': falha ao salvar';
                continue;
            }

            $tipo = Arquivo::classifyFileType($fileName);
            $tamanho = (int) round($file['size'] / 1024);

            $arquivoId = Arquivo::create([
                'nome'       => $fileName,
                'caminho'    => '/uploads/' . $uniqueName,
                'tipo'       => $tipo,
                'tamanho_kb' => $tamanho,
                'projeto_id' => $id,
            ]);

            $success[] = [
                'id'  => $arquivoId,
                'nome' => $fileName,
                'tipo' => $tipo,
                'caminho' => '/uploads/' . $uniqueName,
                'tamanho_kb' => $tamanho,
            ];
        }

        // Always return 200 so the UI updates — individual errors are in the response
        $this->json([
            'success' => $success,
            'errors'  => $errors,
        ]);
    }
}
