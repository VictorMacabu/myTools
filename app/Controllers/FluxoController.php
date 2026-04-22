<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Helpers\LMStudioClient;
use App\Models\Fluxo;
use App\Models\Projeto;
use InvalidArgumentException;

class FluxoController extends Controller {
    public function index(int $projectId): void {
        if (!$this->projectExists($projectId)) {
            $this->json(['error' => 'Projeto nao encontrado'], 404);
            return;
        }

        $this->json([
            'ok' => true,
            'flows' => Fluxo::projectFluxos($projectId),
        ]);
    }

    public function show(int $projectId, int $flowId): void {
        $flow = $this->ensureFlowBelongsToProject($projectId, $flowId);
        if (!$flow) {
            $this->json(['error' => 'Fluxo nao encontrado'], 404);
            return;
        }

        $this->json([
            'ok' => true,
            'flow' => $flow,
        ]);
    }

    public function store(int $projectId): void {
        if (!$this->projectExists($projectId)) {
            $this->json(['error' => 'Projeto nao encontrado'], 404);
            return;
        }

        $body = $this->readJsonBody();
        $name = trim((string) ($body['name'] ?? ''));
        $graph = [
            'name' => $name,
            'nodes' => $body['nodes'] ?? [],
            'edges' => $body['edges'] ?? [],
        ];

        try {
            $flow = Fluxo::createFromGraph($projectId, $graph, $name);
        } catch (InvalidArgumentException $e) {
            $this->json(['error' => $e->getMessage()], 400);
            return;
        }

        $this->json([
            'ok' => true,
            'flow' => $flow,
        ], 201);
    }

    public function update(int $projectId, int $flowId): void {
        $existing = $this->ensureFlowBelongsToProject($projectId, $flowId);
        if (!$existing) {
            $this->json(['error' => 'Fluxo nao encontrado'], 404);
            return;
        }

        $body = $this->readJsonBody();
        $name = array_key_exists('name', $body) ? trim((string) $body['name']) : (string) $existing['name'];
        $graph = [
            'name' => $name,
            'nodes' => $body['nodes'] ?? [],
            'edges' => $body['edges'] ?? [],
        ];

        try {
            $flow = Fluxo::updateFromGraph($projectId, $flowId, $graph, $name);
        } catch (InvalidArgumentException $e) {
            $this->json(['error' => $e->getMessage()], 400);
            return;
        }

        $this->json([
            'ok' => true,
            'flow' => $flow,
        ]);
    }

    public function delete(int $projectId, int $flowId): void {
        $existing = $this->ensureFlowBelongsToProject($projectId, $flowId);
        if (!$existing) {
            $this->json(['error' => 'Fluxo nao encontrado'], 404);
            return;
        }

        Fluxo::deleteForProject($projectId, $flowId);
        $this->json(['ok' => true]);
    }

    public function generate(int $projectId): void {
        if (!$this->projectExists($projectId)) {
            $this->json(['error' => 'Projeto nao encontrado'], 404);
            return;
        }

        $body = $this->readJsonBody();
        $prompt = trim((string) ($body['prompt'] ?? ''));
        if ($prompt === '') {
            $this->json(['error' => 'Descricao obrigatoria para gerar o fluxo'], 400);
            return;
        }

        $mode = strtolower(trim((string) ($body['mode'] ?? 'replace')));
        if (!in_array($mode, ['replace', 'merge'], true)) {
            $mode = 'replace';
        }

        $currentGraph = null;
        if (is_array($body['current_graph'] ?? null)) {
            $currentGraph = $body['current_graph'];
        }

        $systemPrompt = <<<TXT
Voce eh um gerador de fluxos em JSON puro.
Retorne somente um objeto JSON valido, sem markdown e sem explicacoes.
Formato esperado:
{
  "name": "Nome do fluxo",
  "nodes": [
    {"id": "n1", "label": "Inicio", "type": "start", "x": 120, "y": 120},
    {"id": "n2", "label": "Processo", "type": "process", "x": 360, "y": 120},
    {"id": "n3", "label": "Decisão", "type": "decision", "x": 600, "y": 120},
    {"id": "n4", "label": "Fim", "type": "end", "x": 840, "y": 120}
  ],
  "edges": [
    {"id": "e1", "from": "n1", "to": "n2"},
    {"id": "e2", "from": "n2", "to": "n3"},
    {"id": "e3", "from": "n3", "to": "n4", "label": "ok"}
  ]
}
Regras:
- Use apenas os tipos start, process, decision e end.
- Os ids devem ser unicos.
- Sempre inclua ao menos um node start e um node end.
- Se houver erro, use um node decision e crie caminhos claros.
- Mantenha os labels curtos.
TXT;

        $messages = [
            [
                'role' => 'system',
                'content' => $systemPrompt,
            ],
            [
                'role' => 'user',
                'content' => $this->buildFlowGenerationPrompt($prompt, $mode, $currentGraph),
            ],
        ];

        $response = LMStudioClient::chat($messages);
        if (is_array($response) && isset($response['error'])) {
            $this->json($response, 502);
            return;
        }

        try {
            $graph = Fluxo::parseAiResponse((string) $response);
        } catch (InvalidArgumentException $e) {
            $this->json([
                'error' => $e->getMessage(),
            ], 422);
            return;
        }

        if (($graph['name'] ?? '') === 'Fluxo sem titulo' && trim($prompt) !== '') {
            $graph['name'] = mb_substr($prompt, 0, 60);
        }

        $this->json([
            'ok' => true,
            'mode' => $mode,
            'graph' => $graph,
        ]);
    }

    private function buildFlowGenerationPrompt(string $prompt, string $mode, ?array $currentGraph): string {
        $text = "Descricao do usuario: " . $prompt . "\n";
        $text .= "Modo: " . $mode . "\n";

        if ($currentGraph) {
            try {
                $summary = Fluxo::summarizeGraph($currentGraph);
                $text .= "Fluxo atual: " . $summary . "\n";
            } catch (InvalidArgumentException) {
                $text .= "Fluxo atual: nao foi possivel resumir o grafico atual.\n";
            }
        }

        $text .= "Responda apenas com JSON valido seguindo o contrato definido.";
        return $text;
    }

    private function readJsonBody(): array {
        $raw = file_get_contents('php://input');
        if (!$raw) {
            return [];
        }

        $body = json_decode($raw, true);
        return is_array($body) ? $body : [];
    }

    private function projectExists(int $projectId): bool {
        return Projeto::find($projectId) !== null;
    }

    private function ensureFlowBelongsToProject(int $projectId, int $flowId): ?array {
        return Fluxo::findForProject($projectId, $flowId);
    }
}
