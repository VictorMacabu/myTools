<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Models\Grupo;
use App\Models\Projeto;
use App\Models\Arquivo;

class ApiController extends Controller {

    // --- Workspaces ---

    public function workspaces(): void {
        $this->json(\App\Models\Workspace::all());
    }

    public function createWorkspace(): void {
        $nome = trim($_POST['nome'] ?? '');
        if ($nome === '') {
            $this->json(['error' => 'Nome obrigatório'], 400);
            return;
        }
        $id = \App\Models\Workspace::create([
            'nome'  => $nome,
            'icone' => $_POST['icone'] ?? '💼',
            'cor'   => '#0b0199',
        ]);
        $this->json(['id' => $id, 'nome' => $nome]);
    }

    public function deleteWorkspace(int $id): void {
        \App\Models\Workspace::delete($id);
        $this->json(['ok' => true]);
    }

    public function updateWorkspace(int $id): void {
        $data = [];
        if (isset($_POST['nome'])) $data['nome'] = trim($_POST['nome']);
        if (isset($_POST['icone'])) $data['icone'] = $_POST['icone'];
        if (isset($_POST['cor'])) $data['cor'] = $_POST['cor'];
        if (empty($data)) {
            $this->json(['error' => 'Nenhum dado enviado'], 400);
            return;
        }
        \App\Models\Workspace::update($id, $data);
        $this->json(['ok' => true]);
    }

    // --- Grupos ---

    public function createGrupo(): void {
        $nome = trim($_POST['nome'] ?? '');
        $ws = (int) ($_POST['workspace_id'] ?? 0);
        if ($nome === '' || $ws === 0) {
            $this->json(['error' => 'Nome e workspace obrigatórios'], 400);
            return;
        }
        $id = Grupo::create([
            'nome'         => $nome,
            'workspace_id' => $ws,
            'cor'          => $_POST['cor'] ?? '#e5e7eb',
        ]);
        $this->json(['id' => $id, 'nome' => $nome]);
    }

    public function deleteGrupo(int $id): void {
        Grupo::delete($id);
        $this->json(['ok' => true]);
    }

    public function updateGrupo(int $id): void {
        $data = [];
        if (isset($_POST['nome'])) $data['nome'] = trim($_POST['nome']);
        if (empty($data)) {
            $this->json(['error' => 'Nenhum dado enviado'], 400);
            return;
        }
        Grupo::update($id, $data);
        $this->json(['ok' => true]);
    }

    // --- Projetos ---

    public function createProjeto(): void {
        $nome = trim($_POST['nome'] ?? '');
        $ws = (int) ($_POST['workspace_id'] ?? 0);
        if ($nome === '' || $ws === 0) {
            $this->json(['error' => 'Nome e workspace obrigatórios'], 400);
            return;
        }
        $id = Projeto::create([
            'nome'         => $nome,
            'workspace_id' => $ws,
            'favorito'     => isset($_POST['favorito']) ? 1 : 0,
            'grupo_id'     => isset($_POST['grupo_id']) && $_POST['grupo_id'] ? (int) $_POST['grupo_id'] : null,
        ]);
        $this->json(['id' => $id, 'nome' => $nome]);
    }

    public function deleteProjeto(int $id): void {
        // Delete uploaded files first
        $fontes = Projeto::fontes($id);
        $root = dirname(__DIR__, 2);
        foreach ($fontes as $f) {
            $path = str_replace('/', DIRECTORY_SEPARATOR, $f['caminho']);
            $fullPath = $root . '/' . $path;
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }
        }
        Projeto::delete($id);
        $this->json(['ok' => true]);
    }

    public function toggleFavorite(int $id): void {
        $proj = Projeto::find($id);
        if (!$proj) {
            $this->json(['error' => 'Projeto não encontrado'], 404);
            return;
        }
        $newFav = $proj['favorito'] ? 0 : 1;
        Projeto::update($id, ['favorito' => $newFav]);
        $this->json(['ok' => true, 'favorito' => $newFav]);
    }

    public function updateProjeto(int $id): void {
        $data = [];
        if (isset($_POST['nome'])) $data['nome'] = trim($_POST['nome']);
        if (isset($_POST['grupo_id'])) $data['grupo_id'] = $_POST['grupo_id'] !== '' ? (int) $_POST['grupo_id'] : null;
        if (empty($data)) {
            $this->json(['error' => 'Nenhum dado enviado'], 400);
            return;
        }
        Projeto::update($id, $data);
        $this->json(['ok' => true]);
    }

    // --- Arquivos (Fontes) ---

    public function fontes(int $projetoId): void {
        $fontes = Projeto::fontes($projetoId);
        $this->json($fontes);
    }

    public function deleteFonte(int $id): void {
        $fonte = Arquivo::find($id);
        if (!$fonte) {
            $this->json(['error' => 'Fonte não encontrada'], 404);
            return;
        }
        $root = dirname(__DIR__, 2);
        $path = str_replace('/', DIRECTORY_SEPARATOR, $fonte['caminho']);
        $fullPath = $root . '/' . $path;
        if (file_exists($fullPath)) {
            unlink($fullPath);
        }
        Arquivo::delete($id);
        $this->json(['ok' => true]);
    }

    public function updateFonte(int $id): void {
        $data = [];
        if (isset($_POST['nome'])) $data['nome'] = trim($_POST['nome']);
        if (isset($_POST['transcricao'])) $data['transcricao'] = $_POST['transcricao'];
        if (empty($data)) {
            $this->json(['error' => 'Nenhum dado enviado'], 400);
            return;
        }
        Arquivo::update($id, $data);
        $this->json(['ok' => true]);
    }
}
