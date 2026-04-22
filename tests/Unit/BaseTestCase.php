<?php
namespace Tests\Unit;

use PDO;
use PHPUnit\Framework\TestCase;

/**
 * Caso base de teste com configuração do banco de dados de testes
 */
abstract class BaseTestCase extends TestCase {
    protected PDO $db;

    protected function setUp(): void {
        parent::setUp();
        $this->db = \TestDatabase::getInstance()->getConnection();
        // Reseta banco de dados antes de cada teste
        \TestDatabase::getInstance()->reset();
        // Reinicializa schema
        \TestDatabase::getInstance()->initSchema();
    }

    protected function tearDown(): void {
        parent::tearDown();
        \TestDatabase::getInstance()->reset();
    }

    /**
     * Auxiliador: criar um workspace para teste
     */
    protected function createWorkspace(string $nome = 'Teste WS', string $icone = '💼'): int {
        $stmt = $this->db->prepare(
            "INSERT INTO workspaces (nome, icone, cor) VALUES (?, ?, ?)"
        );
        $stmt->execute([$nome, $icone, '#0b0199']);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Auxiliador: criar um grupo para teste
     */
    protected function createGrupo(int $workspaceId, string $nome = 'Teste Grupo'): int {
        $stmt = $this->db->prepare(
            "INSERT INTO grupos (workspace_id, nome, cor) VALUES (?, ?, ?)"
        );
        $stmt->execute([$workspaceId, $nome, '#e5e7eb']);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Auxiliador: criar um projeto para teste
     */
    protected function createProjeto(int $workspaceId, string $nome = 'Teste Projeto', ?int $grupoId = null): int {
        $stmt = $this->db->prepare(
            "INSERT INTO projetos (workspace_id, nome, grupo_id, favorito, criado_em) 
             VALUES (?, ?, ?, 0, datetime('now'))"
        );
        $stmt->execute([$workspaceId, $nome, $grupoId]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Auxiliador: criar um arquivo para teste
     */
    protected function createArquivo(int $projetoId, string $nome = 'teste.mp3', string $tipo = 'audio'): int {
        $stmt = $this->db->prepare(
            "INSERT INTO arquivos (projeto_id, nome, caminho, tipo, tamanho_kb, criado_em) 
             VALUES (?, ?, ?, ?, 1024, datetime('now'))"
        );
        $stmt->execute([$projetoId, $nome, '/uploads/' . $nome, $tipo]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Auxiliador: criar uma tarefa para teste
     */
    protected function createTarefa(
        int $projetoId,
        string $title = 'Tarefa de teste',
        string $status = 'CREATED',
        string $priority = 'P3',
        ?string $dueDate = null,
        string $description = 'Descricao de teste'
    ): int {
        $stmt = $this->db->prepare(
            "INSERT INTO tarefas (title, description, status, priority, due_date, project_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        );
        $stmt->execute([$title, $description, $status, $priority, $dueDate, $projetoId]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Auxiliador: criar um fluxo para teste
     */
    protected function createFluxo(
        int $projetoId,
        string $name = 'Fluxo de teste',
        ?array $nodes = null,
        ?array $edges = null
    ): int {
        $nodes ??= [
            ['id' => 'start_1', 'label' => 'Inicio', 'type' => 'start', 'x' => 100, 'y' => 120],
            ['id' => 'end_1', 'label' => 'Fim', 'type' => 'end', 'x' => 360, 'y' => 120],
        ];
        $edges ??= [
            ['id' => 'edge_1', 'from' => 'start_1', 'to' => 'end_1'],
        ];

        $stmt = $this->db->prepare(
            "INSERT INTO fluxos (name, project_id, nodes, edges, created_at, updated_at)
             VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
        );
        $stmt->execute([
            $name,
            $projetoId,
            json_encode($nodes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            json_encode($edges, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);
        return (int) $this->db->lastInsertId();
    }
}
