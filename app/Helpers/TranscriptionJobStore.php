<?php
namespace App\Helpers;

use App\Config\Database;

class TranscriptionJobStore {
    private static function db(): \PDO {
        return Database::getInstance()->getConnection();
    }

    public static function find(int $jobId): ?array {
        $stmt = self::db()->prepare("SELECT * FROM transcription_jobs WHERE id = ? LIMIT 1");
        $stmt->execute([$jobId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function createQueued(int $projetoId, int $fonteId, string $sourceNome, string $sourcePath): int {
        $now = date('Y-m-d H:i:s');
        $stmt = self::db()->prepare(
            "INSERT INTO transcription_jobs (
                projeto_id, fonte_id, status, stage, status_message, error_message,
                cancel_requested, worker_pid, source_nome, source_caminho, attempts,
                criado_em, atualizado_em
             ) VALUES (?, ?, 'queued', 'queued', ?, NULL, 0, NULL, ?, ?, 0, ?, ?)"
        );
        $stmt->execute([
            $projetoId,
            $fonteId,
            'Transcricao enfileirada. Aguardando inicio do processamento.',
            $sourceNome,
            $sourcePath,
            $now,
            $now
        ]);
        return (int) self::db()->lastInsertId();
    }

    public static function findByProject(int $jobId, int $projectId): ?array {
        $stmt = self::db()->prepare("SELECT * FROM transcription_jobs WHERE id = ? AND projeto_id = ? LIMIT 1");
        $stmt->execute([$jobId, $projectId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findActiveBySource(int $projectId, int $sourceId): ?array {
        $stmt = self::db()->prepare(
            "SELECT * FROM transcription_jobs
             WHERE projeto_id = ? AND fonte_id = ? AND status IN ('queued', 'running', 'cancelling')
             ORDER BY id DESC
             LIMIT 1"
        );
        $stmt->execute([$projectId, $sourceId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function markRunning(int $jobId, ?int $workerPid = null, string $stage = 'starting', string $message = 'Iniciando transcricao...'): bool {
        $now = date('Y-m-d H:i:s');
        $stmt = self::db()->prepare(
            "UPDATE transcription_jobs
             SET status = 'running',
                 stage = ?,
                 status_message = ?,
                 worker_pid = ?,
                 attempts = attempts + 1,
                 iniciado_em = COALESCE(iniciado_em, ?),
                 atualizado_em = ?
             WHERE id = ? AND status IN ('queued', 'running', 'cancelling')"
        );
        return $stmt->execute([$stage, $message, $workerPid, $now, $now, $jobId]);
    }

    public static function markProgress(int $jobId, string $stage, string $message): bool {
        $now = date('Y-m-d H:i:s');
        $stmt = self::db()->prepare(
            "UPDATE transcription_jobs
             SET status = CASE WHEN status = 'cancelling' THEN 'cancelling' ELSE 'running' END,
                 stage = ?,
                 status_message = ?,
                 atualizado_em = ?
             WHERE id = ? AND status IN ('running', 'cancelling')"
        );
        return $stmt->execute([$stage, $message, $now, $jobId]);
    }

    public static function markCompleted(int $jobId, int $txtId, int $mdId, string $txtNome, string $mdNome): bool {
        $now = date('Y-m-d H:i:s');
        $stmt = self::db()->prepare(
            "UPDATE transcription_jobs
             SET status = 'completed',
                 stage = 'completed',
                 status_message = 'Transcricao finalizada com sucesso.',
                 error_message = NULL,
                 txt_arquivo_id = ?,
                 md_arquivo_id = ?,
                 txt_nome = ?,
                 md_nome = ?,
                 finalizado_em = ?,
                 atualizado_em = ?
             WHERE id = ?"
        );
        return $stmt->execute([$txtId, $mdId, $txtNome, $mdNome, $now, $now, $jobId]);
    }

    public static function markFailed(int $jobId, string $errorMessage): bool {
        $now = date('Y-m-d H:i:s');
        $stmt = self::db()->prepare(
            "UPDATE transcription_jobs
             SET status = 'failed',
                 stage = 'failed',
                 status_message = 'Transcricao encerrada com erro.',
                 error_message = ?,
                 finalizado_em = ?,
                 atualizado_em = ?
             WHERE id = ?"
        );
        return $stmt->execute([$errorMessage, $now, $now, $jobId]);
    }

    public static function requestCancel(int $jobId): bool {
        $now = date('Y-m-d H:i:s');
        $stmt = self::db()->prepare(
            "UPDATE transcription_jobs
             SET cancel_requested = 1,
                 status = CASE WHEN status = 'queued' THEN 'cancelled' ELSE 'cancelling' END,
                 stage = CASE WHEN status = 'queued' THEN 'cancelled' ELSE 'cancelling' END,
                 status_message = CASE
                     WHEN status = 'queued' THEN 'Transcricao cancelada antes de iniciar.'
                     ELSE 'Cancelamento solicitado. Encerrando processamento...'
                 END,
                 cancelado_em = CASE WHEN status = 'queued' THEN ? ELSE cancelado_em END,
                 finalizado_em = CASE WHEN status = 'queued' THEN ? ELSE finalizado_em END,
                 atualizado_em = ?
             WHERE id = ? AND status IN ('queued', 'running', 'cancelling')"
        );
        return $stmt->execute([$now, $now, $now, $jobId]);
    }

    public static function markCancelled(int $jobId, string $message = 'Transcricao cancelada pelo usuario.'): bool {
        $now = date('Y-m-d H:i:s');
        $stmt = self::db()->prepare(
            "UPDATE transcription_jobs
             SET status = 'cancelled',
                 stage = 'cancelled',
                 status_message = ?,
                 cancel_requested = 1,
                 cancelado_em = COALESCE(cancelado_em, ?),
                 finalizado_em = COALESCE(finalizado_em, ?),
                 atualizado_em = ?
             WHERE id = ? AND status IN ('queued', 'running', 'cancelling')"
        );
        return $stmt->execute([$message, $now, $now, $now, $jobId]);
    }

    public static function isCancellationRequested(int $jobId): bool {
        $stmt = self::db()->prepare("SELECT cancel_requested, status FROM transcription_jobs WHERE id = ? LIMIT 1");
        $stmt->execute([$jobId]);
        $row = $stmt->fetch();
        if (!$row) return true;
        return (int) ($row['cancel_requested'] ?? 0) === 1 || ($row['status'] ?? '') === 'cancelled';
    }
}
