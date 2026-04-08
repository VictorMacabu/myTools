<?php
namespace Tests\Unit;

use PDO;
use PHPUnit\Framework\TestCase;

/**
 * Base test case with test database setup
 */
abstract class BaseTestCase extends TestCase {
    protected PDO $db;

    protected function setUp(): void {
        parent::setUp();
        $this->db = \TestDatabase::getInstance()->getConnection();
        // Reset database before each test
        \TestDatabase::getInstance()->reset();
        // Re-initialize schema
        \TestDatabase::getInstance()->initSchema();
    }

    protected function tearDown(): void {
        parent::tearDown();
        \TestDatabase::getInstance()->reset();
    }

    /**
     * Helper: create a workspace for testing
     */
    protected function createWorkspace(string $nome = 'Teste WS', string $icone = '💼'): int {
        $stmt = $this->db->prepare(
            "INSERT INTO workspaces (nome, icone, cor) VALUES (?, ?, ?)"
        );
        $stmt->execute([$nome, $icone, '#0b0199']);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Helper: create a grupo for testing
     */
    protected function createGrupo(int $workspaceId, string $nome = 'Teste Grupo'): int {
        $stmt = $this->db->prepare(
            "INSERT INTO grupos (workspace_id, nome, cor) VALUES (?, ?, ?)"
        );
        $stmt->execute([$workspaceId, $nome, '#e5e7eb']);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Helper: create a projeto for testing
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
     * Helper: create an arquivo for testing
     */
    protected function createArquivo(int $projetoId, string $nome = 'teste.mp3', string $tipo = 'audio'): int {
        $stmt = $this->db->prepare(
            "INSERT INTO arquivos (projeto_id, nome, caminho, tipo, tamanho_kb, criado_em) 
             VALUES (?, ?, ?, ?, 1024, datetime('now'))"
        );
        $stmt->execute([$projetoId, $nome, '/uploads/' . $nome, $tipo]);
        return (int) $this->db->lastInsertId();
    }
}
