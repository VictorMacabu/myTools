<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Models\Projeto;
use App\Models\Arquivo;
use App\Models\TipoArquivo;
use App\Helpers\Logger;
use App\Helpers\Transcription;

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
                Logger::upload('unknown', 'FAILED', 'Arquivo muito grande');
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

        // Allowed file extensions
        $allowedExtensions = [
            'mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma',  // audio
            'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv',         // video
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', // image
            'txt', 'pdf', 'doc', 'docx', 'rtf', 'odt', 'md',        // documents
            'csv', 'xls', 'xlsx', 'ods',                        // spreadsheets
            'srt', 'vtt'                                        // subtitles
        ];

        $success = [];
        $errors  = [];

        foreach ($files as $file) {
            $fileName = $file['name'] ?? 'arquivo_sem_nome';

            if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
                $code = (int)$file['error'];
                $msg  = $errorMessages[$code] ?? 'erro desconhecido';
                $errorMsg = $fileName . ': ' . $msg;
                $errors[] = $errorMsg;
                Logger::upload($fileName, 'FAILED', $msg);
                continue;
            }

            // Validate file extension
            $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            if (!in_array($ext, $allowedExtensions, true)) {
                $errorMsg = $fileName . ': tipo de arquivo não permitido (.' . $ext . ')';
                $errors[] = $errorMsg;
                Logger::fileValidation($fileName, false, 'extension not allowed');
                Logger::upload($fileName, 'FAILED', 'tipo de arquivo não permitido');
                continue;
            }

            // Validate file size (max 500MB)
            $maxSize = 500 * 1024 * 1024; // 500MB in bytes
            if ($file['size'] > $maxSize) {
                $errorMsg = $fileName . ': arquivo muito grande (máximo 500MB)';
                $errors[] = $errorMsg;
                Logger::upload($fileName, 'FAILED', 'arquivo muito grande');
                continue;
            }

            Logger::fileValidation($fileName, true);

            $uniqueName = uniqid() . '_' . basename($fileName);
            $dest = $uploadDir . $uniqueName;

            if (!move_uploaded_file($file['tmp_name'], $dest)) {
                $errors[] = $fileName . ': falha ao salvar';
                Logger::upload($fileName, 'FAILED', 'falha ao salvar arquivo');
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

            Logger::upload($fileName, 'SUCCESS', "Tipo: $tipo, Tamanho: {$tamanho}KB");

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

    public function transcribe(int $id): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Método não suportado'], 405);
            return;
        }

        $fontId = (int) ($_POST['fonte_id'] ?? 0);
        if (!$fontId) {
            $this->json(['error' => 'ID do arquivo de áudio não fornecido'], 400);
            return;
        }

        // Buscar arquivo de áudio
        $fonte = Arquivo::find($fontId);
        if (!$fonte || $fonte['projeto_id'] != $id) {
            $this->json(['error' => 'Arquivo não encontrado'], 404);
            return;
        }

        if ($fonte['tipo'] !== 'audio' && $fonte['tipo'] !== 'video') {
            $this->json(['error' => 'Arquivo não é áudio ou vídeo'], 400);
            return;
        }

        $root = dirname(__DIR__, 2);
        $audioPath = $root . str_replace('/', DIRECTORY_SEPARATOR, $fonte['caminho']);

        if (!file_exists($audioPath)) {
            $this->json(['error' => 'Arquivo de áudio não encontrado no servidor'], 404);
            return;
        }

        // Diretório para transcrições
        $transcriptDir = dirname(__DIR__, 2) . '/uploads/transcriptions/';

        // Executor transcrição
        Logger::log('TRANSCRIPTION', 'Iniciando transcrição de: ' . $fonte['nome']);
        $result = Transcription::transcribe($audioPath, $transcriptDir);

        if (!$result['success']) {
            Logger::log('TRANSCRIPTION', 'Falha na transcrição: ' . $result['error']);
            $this->json(['error' => $result['error']], 500);
            return;
        }

        // Salvar arquivos de transcrição no banco
        $txtFileName = basename($fonte['nome'], '.' . pathinfo($fonte['nome'], PATHINFO_EXTENSION)) . '_transcrição.txt';
        $mdFileName = basename($fonte['nome'], '.' . pathinfo($fonte['nome'], PATHINFO_EXTENSION)) . '_transcrição.md';

        $txtSize = (int) round(strlen($result['txt_content']) / 1024);
        $mdSize = (int) round(strlen($result['md_content']) / 1024);

        // Criar registros de arquivo para txt e md
        $txtId = Arquivo::create([
            'nome'       => $txtFileName,
            'caminho'    => '/uploads/transcriptions/' . $txtFileName,
            'tipo'       => 'transcricao',
            'tamanho_kb' => $txtSize,
            'projeto_id' => $id,
            'transcricao' => $result['txt_content'],
        ]);

        $mdId = Arquivo::create([
            'nome'       => $mdFileName,
            'caminho'    => '/uploads/transcriptions/' . $mdFileName,
            'tipo'       => 'transcricao',
            'tamanho_kb' => $mdSize,
            'projeto_id' => $id,
            'transcricao' => $result['md_content'],
        ]);

        Logger::log('TRANSCRIPTION', 'Transcrição concluída: ' . $fonte['nome'] . ' → TXT ID: ' . $txtId . ', MD ID: ' . $mdId);

        $this->json([
            'success' => true,
            'txt' => [
                'id'  => $txtId,
                'nome' => $txtFileName,
                'tipo' => 'transcricao',
                'tamanho_kb' => $txtSize,
                'caminho' => '/uploads/transcriptions/' . $txtFileName,
            ],
            'md' => [
                'id'  => $mdId,
                'nome' => $mdFileName,
                'tipo' => 'transcricao',
                'tamanho_kb' => $mdSize,
                'caminho' => '/uploads/transcriptions/' . $mdFileName,
            ],
        ]);
    }
}
