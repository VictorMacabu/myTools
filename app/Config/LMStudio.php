<?php
namespace App\Config;

/**
 * Configuração LM Studio / LLM compatível com OpenAI
 * Defina a variável de ambiente LMSTUDIO_API_KEY para sobrescrever a chave padrão.
 */
class LMStudio {
    public static string $baseUrl   = 'http://127.0.0.1:1205/v1/chat/completions';
    public static string $model     = 'qwen/qwen3.5-9b';
    public static float  $timeout   = 120.0;
    public static float  $temperature = 0.7;
    public static int    $maxTokens  = 16384;

    /**
     * Chave de API para LM Studio. Padrão é "not-needed" — o servidor
     * aceita qualquer string não-vazia ao executar localmente.
     */
    public static function apiKey(): string {
        $key = getenv('LMSTUDIO_API_KEY');
        return $key !== false ? $key : 'not-needed';
    }
}
