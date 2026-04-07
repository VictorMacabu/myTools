<?php
namespace App\Config;

/**
 * LM Studio / OpenAI-compatible LLM configuration
 * Set LMSTUDIO_API_KEY env var to override the default key.
 */
class LMStudio {
    public static string $baseUrl   = 'http://localhost:1234/v1/chat/completions';
    public static string $model     = '';  // empty = use currently loaded model
    public static float  $timeout   = 120.0;
    public static float  $temperature = 0.7;
    public static int    $maxTokens  = 4096;

    /**
     * API key for LM Studio. Default is "not-needed" — the server
     * accepts any non-empty string when running locally.
     */
    public static function apiKey(): string {
        $key = getenv('LMSTUDIO_API_KEY');
        return $key !== false ? $key : 'not-needed';
    }
}
