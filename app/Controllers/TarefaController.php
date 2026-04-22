<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Models\Projeto;
use App\Models\Tarefa;

class TarefaController extends Controller {
    public function index(int $projectId): void {
        if (!$this->projectExists($projectId)) {
            $this->json(['error' => 'Projeto não encontrado'], 404);
            return;
        }

        $tasks = Tarefa::projectTasks($projectId, $_GET);
        $this->json([
            'ok' => true,
            'tasks' => $tasks,
        ]);
    }

    public function store(int $projectId): void {
        if (!$this->projectExists($projectId)) {
            $this->json(['error' => 'Projeto não encontrado'], 404);
            return;
        }

        $title = trim((string) ($_POST['title'] ?? ''));
        $description = trim((string) ($_POST['description'] ?? ''));
        $priority = Tarefa::normalizePriority($_POST['priority'] ?? Tarefa::PRIORITY_P3);
        $status = Tarefa::normalizeStatus($_POST['status'] ?? Tarefa::STATUS_CREATED);
        $dueDate = Tarefa::normalizeDueDate($_POST['due_date'] ?? null);

        if ($title === '') {
            $this->json(['error' => 'Titulo obrigatorio'], 400);
            return;
        }

        if (mb_strlen($title) > 255) {
            $this->json(['error' => 'Titulo muito longo'], 400);
            return;
        }

        if ($description !== '' && mb_strlen($description) > 5000) {
            $this->json(['error' => 'Descricao muito longa'], 400);
            return;
        }

        if (Tarefa::duplicateTitleExists($projectId, $title)) {
            $this->json(['error' => 'Já existe uma tarefa com este titulo neste projeto'], 409);
            return;
        }

        if (!in_array($status, Tarefa::allowedStatuses(Tarefa::STATUS_CREATED, $dueDate), true)) {
            $this->json(['error' => 'Estado invalido para nova tarefa'], 400);
            return;
        }

        $taskId = Tarefa::createTask($projectId, [
            'title' => $title,
            'description' => $description,
            'priority' => $priority,
            'status' => $status,
            'due_date' => $dueDate,
        ]);

        Tarefa::syncOverdue($projectId);
        $task = Tarefa::findForProject($projectId, $taskId);

        $this->json([
            'ok' => true,
            'task' => $task,
        ], 201);
    }

    public function update(int $projectId, int $taskId): void {
        $task = Tarefa::findForProject($projectId, $taskId);
        if (!$task) {
            $this->json(['error' => 'Tarefa não encontrada'], 404);
            return;
        }

        $title = array_key_exists('title', $_POST) ? trim((string) $_POST['title']) : (string) $task['title'];
        $description = array_key_exists('description', $_POST) ? trim((string) $_POST['description']) : (string) ($task['description'] ?? '');
        $priority = array_key_exists('priority', $_POST) ? Tarefa::normalizePriority($_POST['priority']) : (string) $task['priority'];
        $dueDate = array_key_exists('due_date', $_POST) ? Tarefa::normalizeDueDate($_POST['due_date']) : ($task['due_date'] ?? null);
        $status = array_key_exists('status', $_POST) ? Tarefa::normalizeStatus($_POST['status']) : (string) $task['status'];

        if ($title === '') {
            $this->json(['error' => 'Titulo obrigatorio'], 400);
            return;
        }

        if (mb_strlen($title) > 255) {
            $this->json(['error' => 'Titulo muito longo'], 400);
            return;
        }

        if ($description !== '' && mb_strlen($description) > 5000) {
            $this->json(['error' => 'Descricao muito longa'], 400);
            return;
        }

        if ($dueDate === null && array_key_exists('due_date', $_POST) && trim((string) $_POST['due_date']) !== '') {
            $this->json(['error' => 'Data de prazo invalida'], 400);
            return;
        }

        if (Tarefa::duplicateTitleExists($projectId, $title, $taskId)) {
            $this->json(['error' => 'Já existe uma tarefa com este titulo neste projeto'], 409);
            return;
        }

        if (!Tarefa::canTransition((string) $task['status'], $status, $dueDate)) {
            $this->json(['error' => 'Transicao de status invalida'], 409);
            return;
        }

        $updated = Tarefa::updateTask($projectId, $taskId, [
            'title' => $title,
            'description' => $description === '' ? null : $description,
            'priority' => $priority,
            'due_date' => $dueDate,
            'status' => $status,
        ]);

        if (!$updated) {
            $this->json(['error' => 'Não foi possivel atualizar a tarefa'], 500);
            return;
        }

        Tarefa::syncOverdue($projectId);
        $freshTask = Tarefa::findForProject($projectId, $taskId);

        $this->json([
            'ok' => true,
            'task' => $freshTask,
        ]);
    }

    public function start(int $projectId, int $taskId): void {
        $this->transitionTask($projectId, $taskId, Tarefa::STATUS_IN_PROGRESS);
    }

    public function complete(int $projectId, int $taskId): void {
        $this->transitionTask($projectId, $taskId, Tarefa::STATUS_COMPLETED);
    }

    public function delete(int $projectId, int $taskId): void {
        if (!$this->projectExists($projectId)) {
            $this->json(['error' => 'Projeto não encontrado'], 404);
            return;
        }

        $task = Tarefa::findForProject($projectId, $taskId);
        if (!$task) {
            $this->json(['error' => 'Tarefa não encontrada'], 404);
            return;
        }

        Tarefa::softDelete($projectId, $taskId);
        $this->json(['ok' => true]);
    }

    private function transitionTask(int $projectId, int $taskId, string $targetStatus): void {
        if (!$this->projectExists($projectId)) {
            $this->json(['error' => 'Projeto não encontrado'], 404);
            return;
        }

        $task = Tarefa::findForProject($projectId, $taskId);
        if (!$task) {
            $this->json(['error' => 'Tarefa não encontrada'], 404);
            return;
        }

        if (!Tarefa::canTransition((string) $task['status'], $targetStatus, $task['due_date'] ?? null)) {
            $this->json(['error' => 'Transicao de status invalida'], 409);
            return;
        }

        $updated = Tarefa::updateTask($projectId, $taskId, [
            'status' => $targetStatus,
        ]);

        if (!$updated) {
            $this->json(['error' => 'Não foi possivel atualizar a tarefa'], 500);
            return;
        }

        Tarefa::syncOverdue($projectId);
        $freshTask = Tarefa::findForProject($projectId, $taskId);

        $this->json([
            'ok' => true,
            'task' => $freshTask,
        ]);
    }

    private function projectExists(int $projectId): bool {
        return Projeto::find($projectId) !== null;
    }
}
