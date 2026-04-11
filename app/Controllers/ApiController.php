<?php
namespace App\Controllers;

use App\Config\LMStudio;
use App\Core\Controller;
use App\Models\Arquivo;
use App\Models\Grupo;
use App\Models\Projeto;

class ApiController extends Controller {

    // --- Workspaces ---

    public function workspaces(): void {
        $this->json(\App\Models\Workspace::all());
    }

    public function createWorkspace(): void {
        $nome = trim($_POST['nome'] ?? '');
        if ($nome === '') {
            $this->json(['error' => 'Nome obrigatório'], 400);
            return;
        }
        $id = \App\Models\Workspace::create([
            'nome'  => $nome,
            'icone' => $_POST['icone'] ?? '💼',
            'cor'   => $_POST['cor'] ?? '#F5F5F5',
        ]);
        $this->json(['id' => $id, 'nome' => $nome]);
    }

    public function deleteWorkspace(int $id): void {
        \App\Models\Workspace::delete($id);
        $this->json(['ok' => true]);
    }

    public function updateWorkspace(int $id): void {
        $data = [];
        if (isset($_POST['nome'])) $data['nome'] = trim($_POST['nome']);
        if (isset($_POST['icone'])) $data['icone'] = $_POST['icone'];
        if (isset($_POST['cor'])) $data['cor'] = $_POST['cor'];
        if (empty($data)) {
            $this->json(['error' => 'Nenhum dado enviado'], 400);
            return;
        }
        \App\Models\Workspace::update($id, $data);
        $this->json(['ok' => true]);
    }

    // --- Grupos ---

    public function createGrupo(): void {
        $nome = trim($_POST['nome'] ?? '');
        $ws = (int) ($_POST['workspace_id'] ?? 0);
        if ($nome === '' || $ws === 0) {
            $this->json(['error' => 'Nome e workspace obrigatórios'], 400);
            return;
        }
        $id = Grupo::create([
            'nome'         => $nome,
            'workspace_id' => $ws,
            'cor'          => $_POST['cor'] ?? '#e5e7eb',
        ]);
        $this->json(['id' => $id, 'nome' => $nome]);
    }

    public function deleteGrupo(int $id): void {
        Grupo::delete($id);
        $this->json(['ok' => true]);
    }

    public function updateGrupo(int $id): void {
        $data = [];
        if (isset($_POST['nome'])) $data['nome'] = trim($_POST['nome']);
        if (empty($data)) {
            $this->json(['error' => 'Nenhum dado enviado'], 400);
            return;
        }
        Grupo::update($id, $data);
        $this->json(['ok' => true]);
    }

    // --- Projetos ---

    public function createProjeto(): void {
        $nome = trim($_POST['nome'] ?? '');
        $ws = (int) ($_POST['workspace_id'] ?? 0);
        if ($nome === '' || $ws === 0) {
            $this->json(['error' => 'Nome e workspace obrigatórios'], 400);
            return;
        }
        $id = Projeto::create([
            'nome'         => $nome,
            'workspace_id' => $ws,
            'favorito'     => isset($_POST['favorito']) ? 1 : 0,
            'grupo_id'     => isset($_POST['grupo_id']) && $_POST['grupo_id'] ? (int) $_POST['grupo_id'] : null,
            'criado_em'    => date('Y-m-d H:i:s'),
        ]);
        $this->json(['id' => $id, 'nome' => $nome]);
    }

    public function deleteProjeto(int $id): void {
        // Delete uploaded files first
        $fontes = Projeto::fontes($id);
        $root = dirname(__DIR__, 2);
        foreach ($fontes as $f) {
            $path = str_replace('/', DIRECTORY_SEPARATOR, $f['caminho']);
            $fullPath = $root . '/' . $path;
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
        }
        Projeto::delete($id);
        $this->json(['ok' => true]);
    }

    public function toggleFavorite(int $id): void {
        $proj = Projeto::find($id);
        if (!$proj) {
            $this->json(['error' => 'Projeto não encontrado'], 404);
            return;
        }
        $newFav = $proj['favorito'] ? 0 : 1;
        Projeto::update($id, ['favorito' => $newFav]);
        $this->json(['ok' => true, 'favorito' => $newFav]);
    }

    public function updateProjeto(int $id): void {
        $data = [];
        if (isset($_POST['nome'])) $data['nome'] = trim($_POST['nome']);
        if (isset($_POST['grupo_id'])) $data['grupo_id'] = $_POST['grupo_id'] !== '' ? (int) $_POST['grupo_id'] : null;
        if (isset($_POST['favorito'])) $data['favorito'] = (int) $_POST['favorito'];
        if (empty($data)) {
            $this->json(['error' => 'Nenhum dado enviado'], 400);
            return;
        }
        Projeto::update($id, $data);
        $this->json(['ok' => true]);
    }

    // --- Arquivos (Fontes) ---

    public function fontes(int $projetoId): void {
        $fontes = Projeto::fontes($projetoId);
        $this->json($fontes);
    }

    public function deleteFonte(int $id): void {
        $fonte = Arquivo::find($id);
        if (!$fonte) {
            $this->json(['error' => 'Fonte não encontrada'], 404);
            return;
        }
        $root = dirname(__DIR__, 2);
        $path = str_replace('/', DIRECTORY_SEPARATOR, $fonte['caminho']);
        $fullPath = $root . '/' . $path;
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
        Arquivo::delete($id);
        $this->json(['ok' => true]);
    }

    public function updateFonte(int $id): void {
        $data = [];
        if (isset($_POST['nome'])) $data['nome'] = trim($_POST['nome']);
        if (isset($_POST['transcricao'])) $data['transcricao'] = $_POST['transcricao'];
        if (empty($data)) {
            $this->json(['error' => 'Nenhum dado enviado'], 400);
            return;
        }
        Arquivo::update($id, $data);
        $this->json(['ok' => true]);
    }

    // --- Chat com LLM (LM Studio) ---

    /**
     * POST /api/chat
     *
     * Body (JSON):
     *   - message: string (obrigatório)
     *   - fontes: int[] (IDs das fontes selecionadas para contexto)
     *   - history: array[{role, content}] (histórico opcional da conversa)
     */
    public function chat(): void {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);

        $message = trim($body['message'] ?? '');
        if ($message === '') {
            $this->json(['error' => 'Mensagem obrigatória'], 400);
            return;
        }

        $fontesIds = is_array($body['fontes'] ?? null) ? $body['fontes'] : [];
        $history   = is_array($body['history'] ?? null) ? $body['history'] : [];

        // Ler conteúdo das fontes selecionadas para contexto
        $context = $this->buildContextFromFontes($fontesIds);

        // Montar system prompt com contexto das fontes
        $systemPrompt = 'Você é um assistente de análise documental.';
        if ($context !== '') {
            $systemPrompt .= "\n\nFontes selecionadas pelo usuário:\n" . $context;
        }
        $systemPrompt .= "\n\nResponda em português brasileiro. Seja conciso e direto.";

        // Montar mensagens para a API
        $messages = [];
        $messages[] = ['role' => 'system', 'content' => $systemPrompt];

        // Histórico anterior
        foreach ($history as $h) {
            $role = in_array($h['role'], ['user', 'assistant', 'system'], true) ? $h['role'] : 'user';
            $messages[] = ['role' => $role, 'content' => $h['message'] ?? $h['content'] ?? ''];
        }

        // Mensagem atual
        $messages[] = ['role' => 'user', 'content' => $message];

        // Chamar LM Studio
        $response = $this->callLMStudio($messages);
        if (is_array($response) && isset($response['error'])) {
            $this->json($response, 502);
            return;
        }

        $this->json(['reply' => $response]);
    }

    /**
     * Lê conteúdo dos arquivos-fonte e monta contexto em texto.
     */
    private function buildContextFromFontes(array $fontesIds): string {
        if (empty($fontesIds)) return '';

        $root = dirname(__DIR__, 2);
        $parts = [];

        foreach ($fontesIds as $id) {
            $fonte = Arquivo::find((int)$id);
            if (!$fonte) continue;

            $entry = '## ' . $fonte['nome'] . ' (tipo: ' . $fonte['tipo'] . ")\n";

            // Transcrição existente — usar como conteúdo
            if (!empty($fonte['transcricao'])) {
                $entry .= $fonte['transcricao'];
                $parts[] = $entry;
                continue;
            }

            // Ler conteúdo de documentos de texto
            $readableTypes = ['documento', 'transcricao'];
            if (in_array($fonte['tipo'], $readableTypes, true)) {
                $fullPath = $root . str_replace('/', DIRECTORY_SEPARATOR, $fonte['caminho']);
                if (file_exists($fullPath)) {
                    $ext = strtolower(pathinfo($fonte['nome'], PATHINFO_EXTENSION));
                    if (in_array($ext, ['txt', 'csv', 'srt', 'vtt', 'md', 'json'], true)) {
                        $content = file_get_contents($fullPath);
                        // Truncate very large files (first 30k chars)
                        $entry .= mb_substr($content, 0, 30000);
                        $parts[] = $entry;
                    } elseif (in_array($ext, ['xlsx', 'xls'], true)) {
                        $entry .= '(arquivo Excel — conteúdo binário, não legível como texto)';
                        $parts[] = $entry;
                    }
                }
                continue;
            }

            // Áudio/vídeo sem transcrição — indicar que não foi possível ler
            if (in_array($fonte['tipo'], ['audio', 'video'], true)) {
                $entry .= '(conteúdo multimídia — necessita transcrição para análise textual)';
                $parts[] = $entry;
            }

            // Imagens
            if ($fonte['tipo'] === 'imagem') {
                $entry .= '(conteúdo de imagem — não legível como texto)';
                $parts[] = $entry;
            }
        }

        return implode("\n\n---\n\n", $parts);
    }

    /**
     * Chama LM Studio (OpenAI-compatible) e retorna a resposta.
     * Retorna string com o conteúdo da mensagem ou array ['error' => ...].
     */
    private function callLMStudio(array $messages): string|array {
        $payload = [
            'model'      => LMStudio::$model ?: null,
            'messages'   => $messages,
            'temperature' => LMStudio::$temperature,
            'max_tokens'  => LMStudio::$maxTokens,
        ];
        // Remove null model to use currently loaded model
        if ($payload['model'] === null) unset($payload['model']);

        $ch = curl_init();
        if ($ch === false) {
            return ['error' => 'cURL não está habilitado no PHP'];
        }

        curl_setopt_array($ch, [
            CURLOPT_URL            => LMStudio::$baseUrl,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => LMStudio::$timeout,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json; charset=utf-8',
                'Authorization: Bearer ' . LMStudio::apiKey(),
            ],
        ]);

        $raw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        // curl_close() omitted — deprecated and no-op since PHP 8.0

        if ($err) {
            return [
                'error' => 'Não foi possível conectar ao LM Studio. Verifique se o servidor está rodando em ' . LMStudio::$baseUrl . '. (' . rtrim($err, '.') . ')',
            ];
        }

        $decoded = json_decode($raw, true);
        if ($decoded === null) {
            return ['error' => 'Resposta inválida do LM Studio'];
        }

        // Check for LM Studio error response
        if (isset($decoded['error'])) {
            $msg = $decoded['error']['message'] ?? 'Erro desconhecido do LM Studio';
            return ['error' => $msg];
        }

        // Extract assistant reply
        $content = $decoded['choices'][0]['message']['content'] ?? '';
        if ($content === '') {
            return '(sem resposta — o modelo pode ter gerado apenas tokens de vazio)';
        }

        return $content;
    }
}
