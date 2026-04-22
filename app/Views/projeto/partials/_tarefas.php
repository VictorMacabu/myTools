<div class="tasks-shell">
    <div class="tasks-toolbar">
        <div>
            <div class="tasks-kicker">Tarefas do projeto</div>
            <h2 class="tasks-title">Gestao isolada por projeto</h2>
            <p class="tasks-subtitle">Crie, filtre e acompanhe tarefas sem compartilhar dados entre projetos.</p>
        </div>
        <button type="button" class="btn btn-primary" onclick="openTaskModal()">
            <i class="bi bi-plus-lg"></i> Nova tarefa
        </button>
    </div>

    <div class="tasks-filters" aria-label="Filtros de tarefas">
        <label class="tasks-filter-field">
            <span>Prioridade</span>
            <select id="task-filter-priority" class="tasks-filter-select">
                <option value="all">Todas</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
            </select>
        </label>
        <label class="tasks-filter-field">
            <span>Status</span>
            <select id="task-filter-status" class="tasks-filter-select">
                <option value="all">Todos</option>
                <option value="CREATED">CREATED</option>
                <option value="PENDING">PENDING</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="OVERDUE">OVERDUE</option>
            </select>
        </label>
        <label class="tasks-filter-field">
            <span>Prazo</span>
            <select id="task-filter-due" class="tasks-filter-select">
                <option value="all">Todos</option>
                <option value="overdue">Atrasadas</option>
                <option value="today">Hoje</option>
                <option value="week">Proximos 7 dias</option>
                <option value="no_date">Sem prazo</option>
            </select>
        </label>
    </div>

    <div class="tasks-statusline" id="tasks-statusline">
        Selecione os filtros acima para carregar e refinar a lista.
    </div>

    <div class="task-list" id="task-list" aria-live="polite"></div>
</div>
