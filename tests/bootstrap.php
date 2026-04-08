<?php
/**
 * PHPUnit Bootstrap
 * Configuração inicial do ambiente de testes
 */

// Define test mode
define('TESTING', true);

// Load Composer autoloader first
$composerAutoloader = __DIR__ . '/../vendor/autoload.php';
if (file_exists($composerAutoloader)) {
    require_once $composerAutoloader;
}

// Then load application autoloader
$autoloader = __DIR__ . '/../autoload.php';
if (file_exists($autoloader)) {
    require_once $autoloader;
}

// Use a test database instead of the production one
class TestDatabase {
    private static $instance = null;
    private $pdo;

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function __construct() {
        // Create in-memory SQLite database for testing
        $dsn = 'sqlite::memory:';
        $this->pdo = new PDO($dsn, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $this->pdo->exec('PRAGMA foreign_keys = ON');
        $this->initSchema();
    }

    public function getConnection() {
        return $this->pdo;
    }

    public function initSchema() {
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

            "CREATE INDEX IF NOT EXISTS idx_projetos_workspace ON projetos(workspace_id)",
            "CREATE INDEX IF NOT EXISTS idx_projetos_nome ON projetos(nome)",
            "CREATE INDEX IF NOT EXISTS idx_projetos_grupo ON projetos(grupo_id)",
            "CREATE INDEX IF NOT EXISTS idx_arquivos_projeto ON arquivos(projeto_id)",
            "CREATE INDEX IF NOT EXISTS idx_arquivos_tipo ON arquivos(tipo)",
        ];

        foreach ($sql as $s) {
            $this->pdo->exec($s);
        }
    }

    public function reset() {
        $tables = ['arquivos', 'projetos', 'grupos', 'workspaces'];
        foreach ($tables as $table) {
            $this->pdo->exec("DELETE FROM $table");
        }
    }
}

// Module override for testing - inject test database
if (!function_exists('getTestDatabase')) {
    function getTestDatabase() {
        return TestDatabase::getInstance();
    }
}
