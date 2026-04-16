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

    public function cutAudio(int $id): void {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->json(['error' => 'Metodo nao suportado'], 405);
            return;
        }

        $fonteId = (int) ($_POST['fonte_id'] ?? 0);
        $startSec = (float) ($_POST['start_sec'] ?? 0);
        $endSec = (float) ($_POST['end_sec'] ?? 0);
        $mode = strtolower(trim((string) ($_POST['mode'] ?? 'extract')));
        $newName = trim((string) ($_POST['new_name'] ?? ''));

        if ($fonteId <= 0) {
            $this->json(['error' => 'Arquivo de audio nao informado'], 400);
            return;
        }

        if ($endSec <= $startSec) {
            $this->json(['error' => 'Intervalo de corte invalido'], 400);
            return;
        }

        if (($endSec - $startSec) < 0.1) {
            $this->json(['error' => 'O trecho selecionado precisa ser maior que 0.1s'], 400);
            return;
        }

        if ($mode !== 'extract' && $mode !== 'remove') {
            $this->json(['error' => 'Modo de corte invalido'], 400);
            return;
        }

        if ($mode === 'extract' && $newName === '') {
            $this->json(['error' => 'Informe o nome do novo arquivo para salvar o trecho'], 400);
            return;
        }

        $fonte = Arquivo::find($fonteId);
        if (!$fonte || (int) $fonte['projeto_id'] !== $id) {
            $this->json(['error' => 'Arquivo nao encontrado'], 404);
            return;
        }

        if (!in_array((string) $fonte['tipo'], ['audio', 'video'], true)) {
            $this->json(['error' => 'Somente arquivos de audio/video podem ser cortados'], 400);
            return;
        }

        $root = dirname(__DIR__, 2);
        $sourcePath = $root . str_replace('/', DIRECTORY_SEPARATOR, (string) $fonte['caminho']);
        if (!file_exists($sourcePath)) {
            $this->json(['error' => 'Arquivo de origem nao encontrado no servidor'], 404);
            return;
        }

        $duration = $this->probeMediaDuration($sourcePath);
        if ($duration > 0) {
            if ($startSec < 0) $startSec = 0;
            if ($endSec > $duration) $endSec = $duration;
        }

        if ($endSec <= $startSec) {
            $this->json(['error' => 'Intervalo de corte fora da duracao do arquivo'], 400);
            return;
        }

        $sourceBase = pathinfo((string) $fonte['nome'], PATHINFO_FILENAME);
        $targetFileName = '';
        $outputPath = '';

        if ($mode === 'extract') {
            $outputDir = $root . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'cuts';
            if (!is_dir($outputDir) && !mkdir($outputDir, 0755, true) && !is_dir($outputDir)) {
                $this->json(['error' => 'Nao foi possivel preparar o diretorio de saida'], 500);
                return;
            }

            $targetFileName = $this->buildComposedCutName($newName, $sourceBase);
            $targetFileName = $this->buildUniqueFileName($outputDir, $targetFileName);
            $outputPath = $outputDir . DIRECTORY_SEPARATOR . $targetFileName;
            [$ok, $errorOutput] = $this->runFfmpegExtractSegment($sourcePath, $outputPath, $startSec, $endSec);
        } else {
            $sourceExt = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
            $sourceDir = dirname($sourcePath);
            $tmpName = 'tmp_cut_' . uniqid('', true) . ($sourceExt !== '' ? ('.' . $sourceExt) : '.tmp');
            $outputPath = $sourceDir . DIRECTORY_SEPARATOR . $tmpName;
            [$ok, $errorOutput] = $this->runFfmpegRemoveSegment($sourcePath, $outputPath, $startSec, $endSec, $sourceExt);
            $targetFileName = (string) $fonte['nome'];
        }

        if (!$ok) {
            $this->json([
                'error' => 'Falha ao executar ffmpeg para cortar audio',
                'details' => substr($errorOutput, 0, 400),
            ], 500);
            return;
        }

        if (!file_exists($outputPath) || filesize($outputPath) <= 0) {
            $this->json(['error' => 'Arquivo de corte nao foi gerado corretamente'], 500);
            return;
        }

        $sizeKb = (int) round(filesize($outputPath) / 1024);

        if ($mode === 'remove') {
            if (file_exists($sourcePath) && !@unlink($sourcePath)) {
                @unlink($outputPath);
                $this->json(['error' => 'Nao foi possivel substituir o arquivo original'], 500);
                return;
            }
            if (!@rename($outputPath, $sourcePath)) {
                @unlink($outputPath);
                $this->json(['error' => 'Falha ao gravar o arquivo cortado no original'], 500);
                return;
            }

            Arquivo::update((int) $fonte['id'], ['tamanho_kb' => $sizeKb]);
            $updated = Arquivo::find((int) $fonte['id']);
            $payload = $updated ? $this->fontePayload($updated) : [
                'id' => (int) $fonte['id'],
                'nome' => (string) $fonte['nome'],
                'tipo' => (string) $fonte['tipo'],
                'caminho' => (string) $fonte['caminho'],
                'tamanho_kb' => $sizeKb,
            ];

            Logger::log('AUDIO_CUT', "Projeto {$id} | Fonte {$fonteId} | Modo remove | Arquivo original sobrescrito");

            $this->json([
                'success' => true,
                'mode' => 'remove',
                'message' => 'Trecho removido e arquivo original atualizado em Fontes.',
                'fonte' => $payload,
            ]);
            return;
        }

        $relativePath = '/uploads/cuts/' . $targetFileName;
        $newId = Arquivo::create([
            'nome' => $targetFileName,
            'caminho' => $relativePath,
            'tipo' => 'audio',
            'tamanho_kb' => $sizeKb,
            'projeto_id' => $id,
        ]);

        Logger::log('AUDIO_CUT', "Projeto {$id} | Fonte {$fonteId} | Modo extract | Novo arquivo {$targetFileName}");

        $this->json([
            'success' => true,
            'mode' => 'extract',
            'message' => 'Trecho recortado salvo em Fontes.',
            'fonte' => [
                'id' => $newId,
                'nome' => $targetFileName,
                'tipo' => 'audio',
                'caminho' => $relativePath,
                'tamanho_kb' => $sizeKb,
            ],
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

    /**
     * @return array{0:bool,1:string}
     */
    private function runFfmpegExtractSegment(string $inputPath, string $outputPath, float $startSec, float $endSec): array {
        $command = sprintf(
            'ffmpeg -y -i %s -ss %s -to %s -vn -acodec libmp3lame -b:a 192k %s 2>&1',
            escapeshellarg($inputPath),
            escapeshellarg(number_format($startSec, 3, '.', '')),
            escapeshellarg(number_format($endSec, 3, '.', '')),
            escapeshellarg($outputPath)
        );
        return $this->runCommand($command);
    }

    /**
     * @return array{0:bool,1:string}
     */
    private function runFfmpegRemoveSegment(string $inputPath, string $outputPath, float $startSec, float $endSec, string $outputExt = 'mp3'): array {
        $filter = sprintf(
            "[0:a]aselect='not(between(t\\,%s\\,%s))',asetpts=N/SR/TB[outa]",
            number_format($startSec, 3, '.', ''),
            number_format($endSec, 3, '.', '')
        );
        $codecArgs = $this->audioCodecArgsForExtension($outputExt);

        $command = sprintf(
            'ffmpeg -y -i %s -vn -filter_complex %s -map [outa] %s %s 2>&1',
            escapeshellarg($inputPath),
            escapeshellarg($filter),
            $codecArgs,
            escapeshellarg($outputPath)
        );
        return $this->runCommand($command);
    }

    private function audioCodecArgsForExtension(string $ext): string {
        $ext = strtolower(trim($ext));
        return match ($ext) {
            'wav' => '-c:a pcm_s16le',
            'flac' => '-c:a flac',
            'ogg' => '-c:a libvorbis -q:a 5',
            'm4a', 'mp4', 'aac' => '-c:a aac -b:a 192k',
            'wma' => '-c:a wmav2 -b:a 192k',
            default => '-acodec libmp3lame -b:a 192k',
        };
    }

    /**
     * @return array{0:bool,1:string}
     */
    private function runCommand(string $command): array {
        $output = [];
        $exitCode = 1;
        exec($command, $output, $exitCode);
        $joined = trim(implode("\n", $output));
        return [$exitCode === 0, $joined];
    }

    private function probeMediaDuration(string $inputPath): float {
        $command = sprintf(
            'ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 %s 2>&1',
            escapeshellarg($inputPath)
        );
        [$ok, $output] = $this->runCommand($command);
        if (!$ok) return 0.0;
        $duration = (float) trim($output);
        return $duration > 0 ? $duration : 0.0;
    }

    private function buildComposedCutName(string $newName, string $oldBaseName): string {
        $newBase = $this->sanitizeCutToken(pathinfo($newName, PATHINFO_FILENAME));
        $oldBase = $this->sanitizeCutToken(pathinfo($oldBaseName, PATHINFO_FILENAME));
        if ($newBase === '') $newBase = 'trecho';
        if ($oldBase === '') $oldBase = 'audio';
        return $newBase . '-' . $oldBase . '.MP3';
    }

    private function sanitizeCutToken(string $value): string {
        $value = trim($value);
        $value = preg_replace('/[^\p{L}\p{N}_-]+/u', '_', $value) ?? '';
        $value = preg_replace('/_+/', '_', $value) ?? '';
        return trim($value, '._- ');
    }

    private function buildUniqueFileName(string $dir, string $fileName): string {
        $base = pathinfo($fileName, PATHINFO_FILENAME);
        $ext = pathinfo($fileName, PATHINFO_EXTENSION);
        $candidate = $fileName;
        $index = 1;
        while (file_exists($dir . DIRECTORY_SEPARATOR . $candidate)) {
            $candidate = $base . '_' . $index . ($ext !== '' ? '.' . $ext : '');
            $index++;
        }
        return $candidate;
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
