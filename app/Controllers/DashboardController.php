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
        $showFav = !empty($_GET['fav']);

        $wsSelected = null;
        foreach ($workspaces as $ws) {
            if ($ws['id'] == $activeWs) {
                $wsSelected = $ws;
                break;
            }
        }
        if (!$wsSelected) $wsSelected = $workspaces[0];

        $grupos = Grupo::workspaceGrupos($activeWs);

        // If favoritos filter is active, only get favoritos
        if ($showFav) {
            $projetos = Projeto::favorites($activeWs);
            $favoritos = [];
        } else {
            // Otherwise, get all or filtered by group
            if ($activeGroup !== 'all') {
                $projetos = Projeto::workspaceProjects($activeWs, (int) $activeGroup);
            } else {
                $projetos = Projeto::workspaceProjects($activeWs);
            }
            $favoritos = Projeto::favorites($activeWs);
        }

        $this->view('dashboard.index', [
            'workspaces'  => $workspaces,
            'activeWs'    => $activeWs,
            'wsSelected'  => $wsSelected,
            'grupos'      => $grupos,
            'projetos'    => $projetos,
            'favoritos'   => $favoritos,
            'activeGroup' => $activeGroup,
            'showFav'     => $showFav,
        ]);
    }
}
