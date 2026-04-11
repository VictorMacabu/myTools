<?php
namespace App\Core;

use PDO;
use App\Config\Database;

abstract class Model {
    protected static string $table = '';
    protected static array $fillable = [];

    protected static function db(): PDO {
        return Database::getInstance()->getConnection();
    }

    public static function find(int $id): ?array {
        $stmt = self::db()->prepare("SELECT * FROM " . static::$table . " WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        Database::getInstance()->logOperation('BUSCAR', static::$table, "ID: $id" . ($row ? " ENCONTRADO" : " NÃO ENCONTRADO"));
        return $row ?: null;
    }

    public static function all(): array {
        $stmt = self::db()->query("SELECT * FROM " . static::$table);
        $rows = $stmt->fetchAll();
        Database::getInstance()->logOperation('ALL', static::$table, "COUNT: " . count($rows));
        return $rows;
    }

    public static function create(array $data): int {
        $fields = array_intersect_key($data, array_flip(static::$fillable));
        $cols = implode(', ', array_keys($fields));
        $placeholders = implode(', ', array_fill(0, count($fields), '?'));
        $stmt = self::db()->prepare(
            "INSERT INTO " . static::$table . " ($cols) VALUES ($placeholders)"
        );
        $stmt->execute(array_values($fields));
        $id = (int) self::db()->lastInsertId();
        Database::getInstance()->logOperation('CREATE', static::$table, "ID: $id, DADOS: " . json_encode($fields));
        return $id;
    }

    public static function update(int $id, array $data): bool {
        $fields = array_intersect_key($data, array_flip(static::$fillable));
        $set = implode(' = ?, ', array_keys($fields)) . ' = ?';
        $stmt = self::db()->prepare(
            "UPDATE " . static::$table . " SET $set WHERE id = ?"
        );
        $vals = array_values($fields);
        $vals[] = $id;
        $result = $stmt->execute($vals);
        Database::getInstance()->logOperation('UPDATE', static::$table, "ID: $id, DADOS: " . json_encode($fields) . ", RESULTADO: " . ($result ? 'SUCESSO' : 'FALHA'));
        return $result;
    }

    public static function delete(int $id): bool {
        $stmt = self::db()->prepare("DELETE FROM " . static::$table . " WHERE id = ?");
        $result = $stmt->execute([$id]);
        Database::getInstance()->logOperation('DELETE', static::$table, "ID: $id, RESULTADO: " . ($result ? 'SUCESSO' : 'FALHA'));
        return $result;
    }
}
