<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Models\Workspace;
use App\Models\Grupo;
use App\Models\Projeto;

class DashboardController extends Controller {

    public function index(): void {
        $workspaces = Workspace::all();

        // Default workspace if none exists
        if (empty($workspaces)) {
            Workspace::create(['nome' => 'Pessoal', 'icone' => '💼', 'cor' => '#0b0199']);
            $workspaces = Workspace::all();
        }

        $activeWs = (int) ($_GET['ws'] ?? $workspaces[0]['id']);
        $activeGroup = $_GET['grupo'] ?? 'all';

        $wsSelected = null;
        foreach ($workspaces as $ws) {
            if ($ws['id'] == $activeWs) {
                $wsSelected = $ws;
                break;
            }
        }
        if (!$wsSelected) $wsSelected = $workspaces[0];

        $grupos = Grupo::workspaceGrupos($activeWs);
        $projetos = Projeto::workspaceProjects($activeWs);

        if ($activeGroup !== 'all') {
            $projetos = Projeto::workspaceProjects($activeWs, (int) $activeGroup);
        }

        $favoritos = Projeto::favorites($activeWs);

        $this->view('dashboard.index', [
            'workspaces'    => $workspaces,
            'activeWs'      => $activeWs,
            'wsSelected'    => $wsSelected,
            'grupos'        => $grupos,
            'projetos'      => $projetos,
            'favoritos'     => $favoritos,
            'activeGroup'   => $activeGroup,
            'showFavorites' => $_GET['fav'] ?? false,
        ]);
    }
}
