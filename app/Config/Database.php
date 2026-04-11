<?php
namespace App\Config;

use PDO;
use PDOException;

class Database {
    private static ?self $instance = null;
    private PDO $pdo;

    private string $dbPath;

    private function __construct() {
        // Define o fuso horário para Brasília (UTC-3)
        date_default_timezone_set('America/Sao_Paulo');

        $this->dbPath = dirname(__DIR__, 2) . '/sistema.db';
        $dsn = 'sqlite:' . $this->dbPath;

        try {
            $this->pdo = new PDO($dsn, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE  => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES    => false,
            ]);
            $this->pdo->exec('PRAGMA foreign_keys = ON');
            $this->logOperation('CONECTAR', 'BANCO_DE_DADOS', 'Conectado ao banco de dados: ' . $this->dbPath);
            $this->initSchema();
        } catch (PDOException $e) {
            $this->logOperation('ERRO', 'BANCO_DE_DADOS', 'Falha na conexão: ' . $e->getMessage());
            die('Erro de banco de dados: ' . $e->getMessage());
        }
    }

    public function logOperation(string $operacao, string $tabela, string $detalhes): void {
        $arquivoLog = dirname(__DIR__, 2) . '/logs/database.log';
        $timestamp = date('d-m-Y H:i:s');
        $linhaLog = "[$timestamp] $operacao $tabela $detalhes" . PHP_EOL;
        @file_put_contents($arquivoLog, $linhaLog, FILE_APPEND | LOCK_EX);
    }

    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO {
        return $this->pdo;
    }

    private function initSchema(): void {
        $sql = [
            "CREATE TABLE IF NOT EXISTS workspaces (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(100) NOT NULL UNIQUE,
                icone VARCHAR(10) DEFAULT '💼',
                cor VARCHAR(20) DEFAULT '#0b0199',
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )",

            "CREATE TABLE IF NOT EXISTS grupos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(100) NOT NULL,
                workspace_id INTEGER NOT NULL,
                cor VARCHAR(20) DEFAULT '#e5e7eb',
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
            )",

            "CREATE INDEX IF NOT EXISTS idx_grupos_workspace ON grupos(workspace_id)",
            "CREATE INDEX IF NOT EXISTS idx_grupos_nome ON grupos(nome)",

            "CREATE TABLE IF NOT EXISTS projetos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(255) NOT NULL,
                favorito INTEGER DEFAULT 0 NOT NULL,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                workspace_id INTEGER NOT NULL,
                grupo_id INTEGER,
                CHECK (LENGTH(TRIM(nome)) > 0),
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL
            )",

            "CREATE INDEX IF NOT EXISTS idx_projetos_workspace ON projetos(workspace_id)",
            "CREATE INDEX IF NOT EXISTS idx_projetos_nome ON projetos(nome)",
            "CREATE INDEX IF NOT EXISTS idx_projetos_grupo ON projetos(grupo_id)",

            "CREATE TABLE IF NOT EXISTS arquivos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(255) NOT NULL,
                caminho VARCHAR(500) NOT NULL,
                tipo VARCHAR(20) NOT NULL,
                transcricao TEXT,
                tamanho_kb INTEGER,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                projeto_id INTEGER NOT NULL,
                CHECK (LENGTH(TRIM(nome)) > 0),
                CHECK (LENGTH(TRIM(caminho)) > 0),
                CHECK (tipo IN ('audio','video','imagem','documento','tabela','transcricao')),
                FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
            )",

            "CREATE INDEX IF NOT EXISTS idx_arquivos_projeto ON arquivos(projeto_id)",
            "CREATE INDEX IF NOT EXISTS idx_arquivos_tipo ON arquivos(tipo)",
        ];

        foreach ($sql as $s) {
            $this->pdo->exec($s);
        }
    }
}
