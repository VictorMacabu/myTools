<?php
namespace App\Helpers;

use App\Config\LMStudio;

class LMStudioClient {
    /**
     * Envia mensagens para o LM Studio e retorna a resposta textual.
     * Em caso de erro, retorna ['error' => '...'].
     */
    public static function chat(array $messages, ?float $temperature = null, ?int $maxTokens = null): string|array {
        $payload = [
            'model'       => LMStudio::$model ?: null,
            'messages'    => $messages,
            'temperature' => $temperature ?? LMStudio::$temperature,
            'max_tokens'  => $maxTokens ?? LMStudio::$maxTokens,
        ];

        if ($payload['model'] === null) {
            unset($payload['model']);
        }

        $ch = curl_init();
        if ($ch === false) {
            return ['error' => 'cURL nao esta habilitado no PHP'];
        }

        curl_setopt_array($ch, [
            CURLOPT_URL            => LMStudio::$baseUrl,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => LMStudio::$timeout,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json; charset=utf-8',
                'Authorization: Bearer ' . LMStudio::apiKey(),
            ],
        ]);

        $raw = curl_exec($ch);
        $err = curl_error($ch);

        if ($err) {
            return [
                'error' => 'Nao foi possivel conectar ao LM Studio em ' . LMStudio::$baseUrl . '. (' . rtrim($err, '.') . ')',
            ];
        }

        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            return ['error' => 'Resposta invalida do LM Studio'];
        }

        if (isset($decoded['error'])) {
            $msg = $decoded['error']['message'] ?? 'Erro desconhecido do LM Studio';
            return ['error' => $msg];
        }

        $content = $decoded['choices'][0]['message']['content'] ?? '';
        if (!is_string($content) || trim($content) === '') {
            return ['error' => 'O modelo nao retornou conteudo util'];
        }

        return $content;
    }
}
