<?php
namespace App\Helpers;

class Transcription {
    private static string $whisperPath = 'whisper';

    /**
     * Transcrever arquivo de áudio usando Whisper
     *
     * @param string $audioPath Caminho completo do arquivo de áudio
     * @param string $outputDir Diretório para salvar transcrições
     * @return array ['success' => bool, 'txt' => string, 'md' => string, 'error' => string|null]
     */
    public static function transcribe(string $audioPath, string $outputDir, array $options = []): array {
        return self::transcribeWithProcess($audioPath, $outputDir, $options);

        if (!file_exists($audioPath)) {
            return ['success' => false, 'error' => 'Arquivo de áudio não encontrado'];
        }

        if (!is_dir($outputDir)) {
            @mkdir($outputDir, 0755, true);
        }

        // Gerar nome base para os arquivos de transcrição
        $fileBaseName = pathinfo($audioPath, PATHINFO_FILENAME);
        $tempOutputDir = sys_get_temp_dir() . '/whisper_' . uniqid();

        if (!mkdir($tempOutputDir, 0755, true)) {
            return ['success' => false, 'error' => 'Falha ao criar diretório temporário'];
        }

        try {
            // Executar Whisper
            // Whisper cria automaticamente arquivos .txt e outros formatos
            $command = sprintf(
                'whisper %s --output_format txt --output_dir %s --language pt 2>&1',
                escapeshellarg($audioPath),
                escapeshellarg($tempOutputDir)
            );

            $output = [];
            $returnCode = 0;
            exec($command, $output, $returnCode);

            if ($returnCode !== 0) {
                $errorMsg = implode("\n", $output);
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Erro ao transcrever: ' . $errorMsg];
            }

            // Procurar arquivo .txt gerado
            $txtFile = $tempOutputDir . '/' . $fileBaseName . '.txt';
            if (!file_exists($txtFile)) {
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Transcrição falhou - arquivo não gerado'];
            }

            // Ler conteúdo da transcrição
            $txtContent = file_get_contents($txtFile);
            if ($txtContent === false) {
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Falha ao ler arquivo de transcrição'];
            }

            // Gerar versão markdown
            $mdContent = self::generateMarkdown($fileBaseName, $audioPath, $txtContent);

            // Salvar arquivos finais
            $finalTxtPath = $outputDir . '/' . $fileBaseName . '_transcrição.txt';
            $finalMdPath = $outputDir . '/' . $fileBaseName . '_transcrição.md';

            if (!file_put_contents($finalTxtPath, $txtContent)) {
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Falha ao salvar arquivo TXT'];
            }

            if (!file_put_contents($finalMdPath, $mdContent)) {
                @unlink($finalTxtPath);
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Falha ao salvar arquivo MD'];
            }

            self::cleanup($tempOutputDir);

            return [
                'success' => true,
                'txt_path' => $finalTxtPath,
                'md_path' => $finalMdPath,
                'txt_content' => $txtContent,
                'md_content' => $mdContent,
                'error' => null
            ];

        } catch (\Exception $e) {
            self::cleanup($tempOutputDir);
            return ['success' => false, 'error' => 'Exceção: ' . $e->getMessage()];
        }
    }

    /**
     * Gerar versão Markdown da transcrição
     */
    private static function generateMarkdown(string $filename, string $audioPath, string $content): string {
        $timestamp = date('Y-m-d H:i:s');
        $fileSize = filesize($audioPath);
        $fileSizeKB = round($fileSize / 1024, 2);

        return <<<MD
# Transcrição: $filename

**Data**: $timestamp
**Arquivo**: $filename
**Tamanho**: {$fileSizeKB} KB

---

## Conteúdo

$content

---

*Transcrição gerada automaticamente com Whisper*
MD;
    }

    /**
     * Limpar diretório temporário
     */
    /**
     * @param array{
     *   output_base_name?: string,
     *   on_stage?: callable(string,string):void,
     *   is_cancelled?: callable():bool
     * } $options
     */
    private static function transcribeWithProcess(string $audioPath, string $outputDir, array $options = []): array {
        $onStage = isset($options['on_stage']) && is_callable($options['on_stage']) ? $options['on_stage'] : null;
        $isCancelled = isset($options['is_cancelled']) && is_callable($options['is_cancelled'])
            ? $options['is_cancelled']
            : static fn(): bool => false;

        if ($isCancelled()) {
            return ['success' => false, 'cancelled' => true, 'error' => 'Transcricao cancelada antes do inicio'];
        }

        if (!file_exists($audioPath)) {
            return ['success' => false, 'error' => 'Arquivo de audio nao encontrado'];
        }

        if (!is_dir($outputDir) && !@mkdir($outputDir, 0755, true)) {
            return ['success' => false, 'error' => 'Falha ao criar diretorio de saida'];
        }

        $inputBaseName = pathinfo($audioPath, PATHINFO_FILENAME);
        $outputBaseName = self::sanitizeBaseName((string) ($options['output_base_name'] ?? $inputBaseName));
        $tempOutputDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'whisper_' . uniqid('', true);

        if (!@mkdir($tempOutputDir, 0755, true)) {
            return ['success' => false, 'error' => 'Falha ao criar diretorio temporario'];
        }

        try {
            self::emitStage($onStage, 'transcribing', 'Executando motor de transcricao...');

            $command = sprintf(
                '%s %s --output_format txt --output_dir %s --language pt',
                escapeshellcmd(self::$whisperPath),
                escapeshellarg($audioPath),
                escapeshellarg($tempOutputDir)
            );

            [$ok, $exitCode, $stdout, $stderr, $cancelled] = self::runWhisperCommand($command, $isCancelled, $onStage);
            if ($cancelled) {
                self::cleanup($tempOutputDir);
                return ['success' => false, 'cancelled' => true, 'error' => 'Transcricao cancelada pelo usuario'];
            }

            if (!$ok || $exitCode !== 0) {
                $errorDetails = trim(self::tailOutput($stderr !== '' ? $stderr : $stdout));
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Erro ao executar whisper: ' . $errorDetails];
            }

            self::emitStage($onStage, 'finalizing', 'Finalizando arquivos da transcricao...');

            $txtFile = $tempOutputDir . DIRECTORY_SEPARATOR . $inputBaseName . '.txt';
            if (!file_exists($txtFile)) {
                $generatedTxts = glob($tempOutputDir . DIRECTORY_SEPARATOR . '*.txt');
                if (is_array($generatedTxts) && isset($generatedTxts[0])) {
                    $txtFile = $generatedTxts[0];
                }
            }

            if (!file_exists($txtFile)) {
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Whisper finalizou, mas o arquivo .txt nao foi encontrado'];
            }

            $txtContent = file_get_contents($txtFile);
            if ($txtContent === false) {
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Falha ao ler arquivo de transcricao'];
            }

            $mdContent = self::generateMarkdown($outputBaseName, $audioPath, $txtContent);

            $txtPath = self::buildUniqueOutputPath($outputDir, $outputBaseName . '_transcricao', 'txt');
            $mdPath = self::buildUniqueOutputPath($outputDir, $outputBaseName . '_transcricao', 'md');

            if (@file_put_contents($txtPath, $txtContent) === false) {
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Falha ao salvar arquivo TXT final'];
            }

            if (@file_put_contents($mdPath, $mdContent) === false) {
                @unlink($txtPath);
                self::cleanup($tempOutputDir);
                return ['success' => false, 'error' => 'Falha ao salvar arquivo MD final'];
            }

            self::cleanup($tempOutputDir);

            return [
                'success' => true,
                'cancelled' => false,
                'txt_path' => $txtPath,
                'md_path' => $mdPath,
                'txt_file_name' => basename($txtPath),
                'md_file_name' => basename($mdPath),
                'txt_content' => $txtContent,
                'md_content' => $mdContent,
                'error' => null,
            ];
        } catch (\Throwable $e) {
            self::cleanup($tempOutputDir);
            return ['success' => false, 'error' => 'Excecao na transcricao: ' . $e->getMessage()];
        }
    }

    private static function emitStage(?callable $onStage, string $stage, string $message): void {
        if ($onStage !== null) {
            $onStage($stage, $message);
        }
    }

    /**
     * @return array{bool,int,string,string,bool}
     */
    private static function runWhisperCommand(string $command, callable $isCancelled, ?callable $onStage): array {
        $descriptorspec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = @proc_open($command, $descriptorspec, $pipes);
        if (!is_resource($process)) {
            return [false, 1, '', 'Nao foi possivel iniciar o processo do whisper', false];
        }

        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $stdout = '';
        $stderr = '';
        $cancelled = false;
        $startedAt = time();
        $lastProgressTick = $startedAt;

        while (true) {
            $stdout .= (string) stream_get_contents($pipes[1]);
            $stderr .= (string) stream_get_contents($pipes[2]);

            $status = proc_get_status($process);
            if (!$status['running']) {
                break;
            }

            if ($isCancelled()) {
                $cancelled = true;
                @proc_terminate($process);
                usleep(300000);
                $statusAfterTerminate = proc_get_status($process);
                if ($statusAfterTerminate['running']) {
                    @proc_terminate($process, 9);
                }
                break;
            }

            $now = time();
            if ($onStage !== null && ($now - $lastProgressTick) >= 5) {
                $onStage('transcribing', 'Processando audio com whisper... ' . ($now - $startedAt) . 's');
                $lastProgressTick = $now;
            }

            usleep(200000);
        }

        $stdout .= (string) stream_get_contents($pipes[1]);
        $stderr .= (string) stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);
        if ($cancelled) {
            return [false, $exitCode, $stdout, $stderr, true];
        }

        return [$exitCode === 0, $exitCode, $stdout, $stderr, false];
    }

    private static function sanitizeBaseName(string $name): string {
        $name = trim($name);
        if ($name === '') {
            return 'transcricao';
        }
        $name = preg_replace('/[^\w\-. ]+/u', '_', $name) ?? 'transcricao';
        $name = preg_replace('/\s+/', '_', $name) ?? 'transcricao';
        $name = trim($name, '._- ');
        return $name !== '' ? $name : 'transcricao';
    }

    private static function buildUniqueOutputPath(string $outputDir, string $baseName, string $extension): string {
        $candidate = $outputDir . DIRECTORY_SEPARATOR . $baseName . '.' . $extension;
        if (!file_exists($candidate)) {
            return $candidate;
        }

        $index = 2;
        while (true) {
            $candidate = $outputDir . DIRECTORY_SEPARATOR . $baseName . '_' . $index . '.' . $extension;
            if (!file_exists($candidate)) {
                return $candidate;
            }
            $index++;
        }
    }

    private static function tailOutput(string $text, int $maxLines = 14): string {
        $text = trim($text);
        if ($text === '') return 'sem detalhes de erro';
        $lines = preg_split('/\r\n|\r|\n/', $text) ?: [];
        $tail = array_slice($lines, -$maxLines);
        return implode(' | ', $tail);
    }

    private static function cleanup(string $dir): void {
        if (!is_dir($dir)) return;

        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            if (is_file($path)) {
                @unlink($path);
            } elseif (is_dir($path)) {
                self::cleanup($path);
            }
        }
        @rmdir($dir);
    }
}
