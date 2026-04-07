<?php
namespace App\Config;

/**
 * LM Studio / OpenAI-compatible LLM configuration
 * Set LMSTUDIO_API_KEY env var to override the default key.
 */
class LMStudio {
    public static string $baseUrl   = 'http://127.0.0.1:1205/v1/chat/completions';
    public static string $model     = 'qwen/qwen3.5-9b';
    public static float  $timeout   = 120.0;
    public static float  $temperature = 0.7;
    public static int    $maxTokens  = 16384;

    /**
     * API key for LM Studio. Default is "not-needed" — the server
     * accepts any non-empty string when running locally.
     */
    public static function apiKey(): string {
        $key = getenv('LMSTUDIO_API_KEY');
        return $key !== false ? $key : 'not-needed';
    }
}
