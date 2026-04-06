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
        return $row ?: null;
    }

    public static function all(): array {
        $stmt = self::db()->query("SELECT * FROM " . static::$table);
        return $stmt->fetchAll();
    }

    public static function create(array $data): int {
        $fields = array_intersect_key($data, array_flip(static::$fillable));
        $cols = implode(', ', array_keys($fields));
        $placeholders = implode(', ', array_fill(0, count($fields), '?'));
        $stmt = self::db()->prepare(
            "INSERT INTO " . static::$table . " ($cols) VALUES ($placeholders)"
        );
        $stmt->execute(array_values($fields));
        return (int) self::db()->lastInsertId();
    }

    public static function update(int $id, array $data): bool {
        $fields = array_intersect_key($data, array_flip(static::$fillable));
        $set = implode(' = ?, ', array_keys($fields)) . ' = ?';
        $stmt = self::db()->prepare(
            "UPDATE " . static::$table . " SET $set WHERE id = ?"
        );
        $vals = array_values($fields);
        $vals[] = $id;
        return $stmt->execute($vals);
    }

    public static function delete(int $id): bool {
        $stmt = self::db()->prepare("DELETE FROM " . static::$table . " WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
