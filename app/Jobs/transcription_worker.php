<?php
declare(strict_types=1);

use App\Helpers\Logger;
use App\Helpers\Transcription;
use App\Helpers\TranscriptionJobStore;
use App\Models\Arquivo;

require dirname(__DIR__, 2) . '/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit(1);
}

@set_time_limit(0);

$jobId = isset($argv[1]) ? (int) $argv[1] : 0;
if ($jobId <= 0) {
    Logger::log('TRANSCRIPTION', 'Worker iniciado sem job id valido.');
    exit(1);
}

try {
    $job = TranscriptionJobStore::find($jobId);
    if (!$job) {
        Logger::log('TRANSCRIPTION', 'Job não encontrado: ' . $jobId);
        exit(1);
    }

    if (in_array($job['status'], ['completed', 'failed', 'cancelled'], true)) {
        exit(0);
    }

    if (TranscriptionJobStore::isCancellationRequested($jobId)) {
        TranscriptionJobStore::markCancelled($jobId, 'Transcricao cancelada antes de iniciar.');
        exit(0);
    }

    TranscriptionJobStore::markRunning($jobId, getmypid(), 'starting', 'Preparando arquivo para transcricao...');

    $fonte = Arquivo::find((int) $job['fonte_id']);
    if (!$fonte) {
        TranscriptionJobStore::markFailed($jobId, 'Arquivo fonte nao encontrado para este job.');
        exit(1);
    }

    $projectId = (int) $job['projeto_id'];
    if ((int) $fonte['projeto_id'] !== $projectId) {
        TranscriptionJobStore::markFailed($jobId, 'Arquivo fonte nao pertence ao projeto informado.');
        exit(1);
    }

    $root = dirname(__DIR__, 2);
    $audioPath = $root . str_replace('/', DIRECTORY_SEPARATOR, $fonte['caminho']);
    if (!file_exists($audioPath)) {
        TranscriptionJobStore::markFailed($jobId, 'Arquivo de audio nao encontrado no servidor.');
        exit(1);
    }

    $transcriptDir = $root . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'transcriptions';
    Logger::log('TRANSCRIPTION', "Job #{$jobId}: iniciando whisper para {$fonte['nome']}");

    $result = Transcription::transcribe($audioPath, $transcriptDir, [
        'output_base_name' => pathinfo((string) $fonte['nome'], PATHINFO_FILENAME),
        'on_stage' => static function (string $stage, string $message) use ($jobId): void {
            TranscriptionJobStore::markProgress($jobId, $stage, $message);
        },
        'is_cancelled' => static function () use ($jobId): bool {
            return TranscriptionJobStore::isCancellationRequested($jobId);
        },
    ]);

    if (!($result['success'] ?? false)) {
        if (!empty($result['cancelled'])) {
            TranscriptionJobStore::markCancelled($jobId, 'Transcricao cancelada pelo usuario durante o processamento.');
            Logger::log('TRANSCRIPTION', "Job #{$jobId}: cancelado");
            exit(0);
        }

        $error = (string) ($result['error'] ?? 'erro desconhecido');
        TranscriptionJobStore::markFailed($jobId, $error);
        Logger::log('TRANSCRIPTION', "Job #{$jobId}: falha - {$error}");
        exit(1);
    }

    $txtContent = (string) ($result['txt_content'] ?? '');
    $mdContent = (string) ($result['md_content'] ?? '');
    $txtFileName = (string) ($result['txt_file_name'] ?? '');
    $mdFileName = (string) ($result['md_file_name'] ?? '');

    if ($txtFileName === '' || $mdFileName === '') {
        TranscriptionJobStore::markFailed($jobId, 'Arquivos de saida nao foram gerados corretamente.');
        exit(1);
    }

    TranscriptionJobStore::markProgress($jobId, 'saving', 'Salvando resultado no projeto...');

    $txtSize = (int) round(strlen($txtContent) / 1024);
    $mdSize = (int) round(strlen($mdContent) / 1024);

    $txtId = Arquivo::create([
        'nome' => $txtFileName,
        'caminho' => '/uploads/transcriptions/' . $txtFileName,
        'tipo' => 'transcricao',
        'tamanho_kb' => $txtSize,
        'projeto_id' => $projectId,
        'transcricao' => $txtContent,
    ]);

    $mdId = Arquivo::create([
        'nome' => $mdFileName,
        'caminho' => '/uploads/transcriptions/' . $mdFileName,
        'tipo' => 'transcricao',
        'tamanho_kb' => $mdSize,
        'projeto_id' => $projectId,
        'transcricao' => $mdContent,
    ]);

    TranscriptionJobStore::markCompleted($jobId, $txtId, $mdId, $txtFileName, $mdFileName);
    Logger::log('TRANSCRIPTION', "Job #{$jobId}: concluido. TXT ID {$txtId}, MD ID {$mdId}");
    exit(0);
} catch (\Throwable $e) {
    TranscriptionJobStore::markFailed($jobId, 'Excecao no worker: ' . $e->getMessage());
    Logger::log('TRANSCRIPTION', "Job #{$jobId}: excecao no worker - " . $e->getMessage());
    exit(1);
}
