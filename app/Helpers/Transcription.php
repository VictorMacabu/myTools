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
    public static function transcribe(string $audioPath, string $outputDir): array {
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
