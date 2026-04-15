<?php
namespace App\Models;

use App\Core\Model;
use App\Models\TipoArquivo;

class Arquivo extends Model {
    protected static string $table = 'arquivos';
    protected static array $fillable = ['nome', 'caminho', 'tipo', 'transcricao', 'tamanho_kb', 'projeto_id'];

    public static function projectArquivos(int $projetoId): array {
        $stmt = self::db()->prepare(
            "SELECT * FROM arquivos WHERE projeto_id = ? ORDER BY criado_em ASC"
        );
        $stmt->execute([$projetoId]);
        return $stmt->fetchAll();
    }

    // --- File type classification ---

    public static function classifyFileType(string $filename): string {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        return match ($ext) {
            'mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma' => TipoArquivo::AUDIO,
            'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv' => TipoArquivo::VIDEO,
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif' => TipoArquivo::IMAGEM,
            'txt', 'pdf', 'doc', 'docx', 'rtf', 'odt', 'md' => TipoArquivo::DOCUMENTO,
            'csv', 'xls', 'xlsx', 'ods' => TipoArquivo::TABELA,
            'srt', 'vtt' => TipoArquivo::TRANSCRICAO,
            default => TipoArquivo::DOCUMENTO,
        };
    }
}
