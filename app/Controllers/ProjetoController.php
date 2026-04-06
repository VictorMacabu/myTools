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
        if (!isset($_FILES['arquivo'])) {
            $this->json(['error' => 'Nenhum arquivo enviado'], 400);
            return;
        }

        $file = $_FILES['arquivo'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $this->json(['error' => 'Erro no upload'], 500);
            return;
        }

        $uploadDir = dirname(__DIR__, 2) . '/uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
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
            'caminho'    => 'public/uploads/' . $uniqueName,
            'tipo'       => $tipo,
            'tamanho_kb' => $tamanho,
            'projeto_id' => $id,
        ]);

        $this->json([
            'id'  => $arquivoId,
            'nome' => $file['name'],
            'tipo' => $tipo,
            'caminho' => 'public/uploads/' . $uniqueName,
            'tamanho_kb' => $tamanho,
        ]);
    }
}
