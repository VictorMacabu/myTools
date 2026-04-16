<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Models\Projeto;
use App\Models\Arquivo;
use App\Models\TipoArquivo;
use App\Helpers\Logger;
use App\Helpers\Transcription;
use App\Helpers\TranscriptionJobStore;
use App\Helpers\TranscriptionJobRunner;

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

    public function transcribeLegacy(int $id): void {
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

    public function transcribe(int $id): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Metodo nao suportado'], 405);
            return;
        }

        $fontId = (int) ($_POST['fonte_id'] ?? 0);
        if (!$fontId) {
            $this->json(['error' => 'ID do arquivo de audio nao fornecido'], 400);
            return;
        }

        $fonte = Arquivo::find($fontId);
        if (!$fonte || (int) $fonte['projeto_id'] !== $id) {
            $this->json(['error' => 'Arquivo nao encontrado'], 404);
            return;
        }

        if ($fonte['tipo'] !== 'audio' && $fonte['tipo'] !== 'video') {
            $this->json(['error' => 'Arquivo nao e audio ou video'], 400);
            return;
        }

        $root = dirname(__DIR__, 2);
        $audioPath = $root . str_replace('/', DIRECTORY_SEPARATOR, $fonte['caminho']);
        if (!file_exists($audioPath)) {
            $this->json(['error' => 'Arquivo de audio nao encontrado no servidor'], 404);
            return;
        }

        $activeJob = TranscriptionJobStore::findActiveBySource($id, $fontId);
        if ($activeJob) {
            $this->json([
                'error' => 'Ja existe uma transcricao ativa para este arquivo.',
                'job' => $this->jobPayload($activeJob),
            ], 409);
            return;
        }

        $jobId = TranscriptionJobStore::createQueued($id, $fontId, (string) $fonte['nome'], (string) $fonte['caminho']);
        Logger::log('TRANSCRIPTION', "Job #{$jobId} enfileirado para {$fonte['nome']}");

        $started = TranscriptionJobRunner::start($jobId);
        if (!$started) {
            TranscriptionJobStore::markFailed($jobId, 'Falha ao iniciar o worker em background.');
            $this->json(['error' => 'Nao foi possivel iniciar a transcricao em background'], 500);
            return;
        }

        $job = TranscriptionJobStore::findByProject($jobId, $id);
        $this->json([
            'success' => true,
            'message' => 'Transcricao iniciada em background.',
            'job' => $this->jobPayload($job ?: []),
        ], 202);
    }

    public function transcribeStatus(int $id, int $jobId): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            $this->json(['error' => 'Metodo nao suportado'], 405);
            return;
        }

        $job = TranscriptionJobStore::findByProject($jobId, $id);
        if (!$job) {
            $this->json(['error' => 'Job de transcricao nao encontrado'], 404);
            return;
        }

        $txt = null;
        $md = null;
        if (!empty($job['txt_arquivo_id'])) {
            $txtFonte = Arquivo::find((int) $job['txt_arquivo_id']);
            if ($txtFonte) $txt = $this->fontePayload($txtFonte);
        }
        if (!empty($job['md_arquivo_id'])) {
            $mdFonte = Arquivo::find((int) $job['md_arquivo_id']);
            if ($mdFonte) $md = $this->fontePayload($mdFonte);
        }

        $this->json([
            'success' => true,
            'job' => $this->jobPayload($job),
            'txt' => $txt,
            'md' => $md,
        ]);
    }

    public function cancelTranscription(int $id, int $jobId): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Metodo nao suportado'], 405);
            return;
        }

        $job = TranscriptionJobStore::findByProject($jobId, $id);
        if (!$job) {
            $this->json(['error' => 'Job de transcricao nao encontrado'], 404);
            return;
        }

        if (in_array($job['status'], ['completed', 'failed', 'cancelled'], true)) {
            $this->json([
                'error' => 'Este job ja foi finalizado e nao pode ser cancelado.',
                'job' => $this->jobPayload($job),
            ], 409);
            return;
        }

        TranscriptionJobStore::requestCancel($jobId);
        $updated = TranscriptionJobStore::findByProject($jobId, $id);
        Logger::log('TRANSCRIPTION', "Cancelamento solicitado para job #{$jobId}");

        $this->json([
            'success' => true,
            'message' => 'Cancelamento solicitado.',
            'job' => $this->jobPayload($updated ?: $job),
        ]);
    }

    private function fontePayload(array $fonte): array {
        return [
            'id' => (int) $fonte['id'],
            'nome' => (string) $fonte['nome'],
            'tipo' => (string) $fonte['tipo'],
            'tamanho_kb' => (int) ($fonte['tamanho_kb'] ?? 0),
            'caminho' => (string) $fonte['caminho'],
        ];
    }

    private function jobPayload(array $job): array {
        $startedAt = $job['iniciado_em'] ?? null;
        $endedAt = $job['finalizado_em'] ?? null;
        $elapsed = null;
        if ($startedAt) {
            $startTs = strtotime((string) $startedAt);
            $endTs = $endedAt ? strtotime((string) $endedAt) : time();
            if ($startTs !== false && $endTs !== false && $endTs >= $startTs) {
                $elapsed = $endTs - $startTs;
            }
        }

        return [
            'id' => isset($job['id']) ? (int) $job['id'] : 0,
            'projeto_id' => isset($job['projeto_id']) ? (int) $job['projeto_id'] : 0,
            'fonte_id' => isset($job['fonte_id']) ? (int) $job['fonte_id'] : 0,
            'source_nome' => (string) ($job['source_nome'] ?? ''),
            'status' => (string) ($job['status'] ?? 'queued'),
            'stage' => (string) ($job['stage'] ?? 'queued'),
            'status_message' => (string) ($job['status_message'] ?? ''),
            'error_message' => (string) ($job['error_message'] ?? ''),
            'cancel_requested' => (int) ($job['cancel_requested'] ?? 0) === 1,
            'worker_pid' => isset($job['worker_pid']) ? (int) $job['worker_pid'] : null,
            'txt_arquivo_id' => isset($job['txt_arquivo_id']) ? (int) $job['txt_arquivo_id'] : null,
            'md_arquivo_id' => isset($job['md_arquivo_id']) ? (int) $job['md_arquivo_id'] : null,
            'attempts' => (int) ($job['attempts'] ?? 0),
            'criado_em' => $job['criado_em'] ?? null,
            'iniciado_em' => $startedAt,
            'finalizado_em' => $endedAt,
            'cancelado_em' => $job['cancelado_em'] ?? null,
            'atualizado_em' => $job['atualizado_em'] ?? null,
            'elapsed_seconds' => $elapsed,
        ];
    }
}
