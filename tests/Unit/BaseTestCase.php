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
}
