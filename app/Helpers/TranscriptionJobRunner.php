<?php
namespace App\Helpers;

class TranscriptionJobRunner {
    public static function start(int $jobId): bool {
        $scriptPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR . 'Jobs' . DIRECTORY_SEPARATOR . 'transcription_worker.php';

        if (!file_exists($scriptPath)) {
            Logger::log('TRANSCRIPTION', 'Worker script não encontrado: ' . $scriptPath);
            return false;
        }

        $phpBinary = PHP_BINARY ?: 'php';
        $escapedPhp = escapeshellarg($phpBinary);
        $escapedScript = escapeshellarg($scriptPath);
        $jobArg = (string) $jobId;

        try {
            if (PHP_OS_FAMILY === 'Windows') {
                $command = 'cmd /c start /B "" ' . $escapedPhp . ' ' . $escapedScript . ' ' . $jobArg . ' > NUL 2>&1';
                $proc = @popen($command, 'r');
                if ($proc === false) {
                    Logger::log('TRANSCRIPTION', 'Falha ao iniciar worker em background (Windows).');
                    return false;
                }
                pclose($proc);
                return true;
            }

            $command = $escapedPhp . ' ' . $escapedScript . ' ' . $jobArg . ' > /dev/null 2>&1 &';
            exec($command, $output, $returnCode);
            if ($returnCode !== 0) {
                Logger::log('TRANSCRIPTION', 'Falha ao iniciar worker em background. RC=' . $returnCode);
                return false;
            }
            return true;
        } catch (\Throwable $e) {
            Logger::log('TRANSCRIPTION', 'Erro ao iniciar worker: ' . $e->getMessage());
            return false;
        }
    }
}
