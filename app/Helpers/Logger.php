<?php
namespace App\Helpers;

class Logger {
    private static string $logDir = '';

    public static function init(string $logDir): void {
        self::$logDir = $logDir;
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
    }

    public static function log(string $type, string $message): void {
        if (!self::$logDir) {
            self::$logDir = dirname(__DIR__, 2) . '/logs';
        }

        if (!is_dir(self::$logDir)) {
            @mkdir(self::$logDir, 0755, true);
        }

        $logFile = self::$logDir . '/uploads.log';
        $timestamp = date('Y-m-d H:i:s');
        $line = "[$timestamp] [$type] $message" . PHP_EOL;

        @file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
    }

    public static function upload(string $filename, string $status, ?string $error = null): void {
        $message = "FILE: $filename | STATUS: $status";
        if ($error) {
            $message .= " | ERROR: $error";
        }
        self::log('UPLOAD', $message);
    }

    public static function fileValidation(string $filename, bool $isValid, ?string $reason = null): void {
        $message = "FILE: $filename | VALIDATION: " . ($isValid ? 'PASSED' : 'FAILED');
        if (!$isValid && $reason) {
            $message .= " | REASON: $reason";
        }
        self::log('VALIDATION', $message);
    }
}
