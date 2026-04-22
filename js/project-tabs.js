/* global PROJETO_ID, api, showToast, openModal, closeModal, escapeHtml */

const PROJECT_TAB_KEY = typeof PROJETO_ID !== 'undefined' ? `project-tab:${PROJETO_ID}` : null;

const TASK_STATUS_LABELS = {
    CREATED: 'Criada',
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em andamento',
    COMPLETED: 'Concluida',
    OVERDUE: 'Atrasada',
};

const TASK_PRIORITY_LABELS = {
    P1: 'P1',
    P2: 'P2',
    P3: 'P3',
    P4: 'P4',
};

const taskState = {
    projectId: typeof PROJETO_ID !== 'undefined' ? Number(PROJETO_ID) : null,
    activeTab: 'tarefas',
    cacheKey: '',
    loading: false,
    tasks: [],
    editingTaskId: null,
    modalMode: 'create',
};

function initProjectTabs() {
    if (!taskState.projectId) {
        return;
    }

    const savedTab = PROJECT_TAB_KEY ? sessionStorage.getItem(PROJECT_TAB_KEY) : null;
    const initialTab = ['tarefas', 'chat', 'fluxos'].includes(savedTab || '') ? savedTab : 'tarefas';
    setProjectTab(initialTab, false);

    bindTaskFilterEvents();
}

function bindTaskFilterEvents() {
    ['task-filter-priority', 'task-filter-status', 'task-filter-due'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || el.dataset.bound === '1') {
            return;
        }
        el.dataset.bound = '1';
        el.addEventListener('change', () => {
            if (taskState.activeTab === 'tarefas') {
                loadTasks(true);
            }
        });
    });
}

function setProjectTab(tabName, persist = true) {
    if (!['tarefas', 'chat', 'fluxos'].includes(tabName)) {
        tabName = 'tarefas';
    }

    taskState.activeTab = tabName;

    if (persist && PROJECT_TAB_KEY) {
        sessionStorage.setItem(PROJECT_TAB_KEY, tabName);
    }

    const tabs = [
        { tab: 'tarefas', button: 'tab-btn-tarefas', panel: 'project-tab-tarefas' },
        { tab: 'chat', button: 'tab-btn-chat', panel: 'project-tab-chat' },
        { tab: 'fluxos', button: 'tab-btn-fluxos', panel: 'project-tab-fluxos' },
    ];

    tabs.forEach(({ tab, button, panel }) => {
        const btn = document.getElementById(button);
        const section = document.getElementById(panel);
        const isActive = tab === tabName;

        if (btn) {
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
        if (section) {
            section.hidden = !isActive;
        }
    });

    if (tabName === 'tarefas') {
        loadTasks(false);
    } else if (tabName === 'fluxos' && typeof window.loadFlowWorkspace === 'function') {
        window.loadFlowWorkspace(false);
    }
}

function getTaskFilters() {
    return {
        priority: document.getElementById('task-filter-priority')?.value || 'all',
        status: document.getElementById('task-filter-status')?.value || 'all',
        due: document.getElementById('task-filter-due')?.value || 'all',
    };
}

function taskFiltersKey(filters) {
    return JSON.stringify(filters);
}

async function loadTasks(force = false) {
    if (!taskState.projectId || taskState.activeTab !== 'tarefas') {
        return;
    }

    const filters = getTaskFilters();
    const key = taskFiltersKey(filters);
    if (!force && taskState.cacheKey === key && taskState.tasks.length > 0) {
        renderTasks(taskState.tasks);
        return;
    }

    if (taskState.loading) {
        return;
    }

    taskState.loading = true;
    setTasksStatus('Carregando tarefas...');

    try {
        const query = new URLSearchParams(filters);
        const data = await api(`/api/projeto/${taskState.projectId}/tarefas?${query.toString()}`, { method: 'GET' });
        taskState.tasks = Array.isArray(data.tasks) ? data.tasks : [];
        taskState.cacheKey = key;
        renderTasks(taskState.tasks);
        setTasksStatus(taskState.tasks.length > 0 ? `${taskState.tasks.length} tarefa(s) encontrada(s).` : 'Nenhuma tarefa encontrada.');
    } catch (err) {
        taskState.tasks = [];
        setTasksStatus(`Erro ao carregar tarefas: ${err.message}`, true);
        renderTasks([]);
    } finally {
        taskState.loading = false;
    }
}

function setTasksStatus(message, isError = false) {
    const el = document.getElementById('tasks-statusline');
    if (!el) {
        return;
    }
    el.textContent = message;
    el.classList.toggle('error', Boolean(isError));
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    if (!list) {
        return;
    }

    list.innerHTML = '';

    if (!tasks || tasks.length === 0) {
        list.innerHTML = `
            <div class="task-empty">
                <i class="bi bi-card-checklist"></i>
                <strong>Nenhuma tarefa para exibir</strong>
                <span>Use o botao "Nova tarefa" para criar o primeiro item deste projeto.</span>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    tasks.forEach(task => {
        fragment.appendChild(renderTaskCard(task));
    });

    list.appendChild(fragment);
}

function renderTaskCard(task) {
    const card = document.createElement('article');
    card.className = `task-card task-card--${task.status ? task.status.toLowerCase() : 'created'}`;
    card.dataset.id = String(task.id);

    const dueLabel = formatTaskDueLabel(task.due_date, task.status);
    const statusLabel = TASK_STATUS_LABELS[task.status] || task.status;
    const priorityLabel = TASK_PRIORITY_LABELS[task.priority] || task.priority;
    const description = task.description ? escapeHtml(task.description) : '<span class="task-desc-empty">Sem descricao</span>';

    card.innerHTML = `
        <label class="task-check-wrap" title="${task.status === 'IN_PROGRESS' ? 'Concluir tarefa' : 'Somente tarefas em andamento podem ser concluida'}">
            <input type="checkbox" class="task-check" ${task.status === 'COMPLETED' ? 'checked' : ''} ${task.status === 'IN_PROGRESS' ? '' : 'disabled'}>
            <span class="task-check-ui"></span>
        </label>
        <div class="task-card-body">
            <div class="task-card-main">
                <div class="task-card-head">
                    <div class="task-card-title">${escapeHtml(task.title || '')}</div>
                    <div class="task-card-actions">
                        ${task.status === 'PENDING' ? '<button type="button" class="btn btn-sm btn-secondary task-action-btn" data-action="start">Iniciar</button>' : ''}
                        <button type="button" class="btn btn-sm btn-outline task-action-btn" data-action="edit">Editar</button>
                    </div>
                </div>
                <div class="task-card-desc">${description}</div>
            </div>
            <div class="task-card-meta">
                <span class="task-pill task-pill--status task-pill--${task.status.toLowerCase()}">${statusLabel}</span>
                <span class="task-pill task-pill--priority">${priorityLabel}</span>
                <span class="task-pill task-pill--due">${dueLabel}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => openTaskModal(task.id));

    const checkbox = card.querySelector('.task-check');
    if (checkbox) {
        checkbox.addEventListener('click', event => {
            event.stopPropagation();
        });
        checkbox.addEventListener('change', async event => {
            event.stopPropagation();
            if (!event.target.checked || task.status !== 'IN_PROGRESS') {
                event.target.checked = task.status === 'COMPLETED';
                return;
            }
            await completeTask(task.id);
        });
    }

    card.querySelectorAll('.task-action-btn').forEach(btn => {
        btn.addEventListener('click', async event => {
            event.stopPropagation();
            const action = btn.dataset.action;
            if (action === 'edit') {
                openTaskModal(task.id);
            } else if (action === 'start') {
                await startTask(task.id);
            }
        });
    });

    return card;
}

function formatTaskDueLabel(dueDate, status) {
    if (!dueDate) {
        return 'Sem prazo';
    }

    const date = new Date(`${dueDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return dueDate;
    }

    const formatted = new Intl.DateTimeFormat('pt-BR').format(date);
    if (status === 'OVERDUE') {
        return `Atrasada: ${formatted}`;
    }
    return formatted;
}

function getTaskById(taskId) {
    return taskState.tasks.find(task => Number(task.id) === Number(taskId)) || null;
}

function buildTaskStatusOptions(task) {
    const select = document.getElementById('task-status');
    if (!select) {
        return;
    }

    const currentTask = task || {
        status: 'CREATED',
        due_date: null,
        allowed_statuses: ['CREATED', 'PENDING'],
    };

    const allowed = Array.isArray(currentTask.allowed_statuses) && currentTask.allowed_statuses.length > 0
        ? currentTask.allowed_statuses
        : ['CREATED', 'PENDING'];

    select.innerHTML = allowed.map(status => {
        return `<option value="${status}">${TASK_STATUS_LABELS[status] || status}</option>`;
    }).join('');

    select.value = currentTask.status || 'CREATED';
}

function toggleTaskModalActions(task) {
    const deleteBtn = document.getElementById('task-delete-btn');
    const startBtn = document.getElementById('task-start-btn');
    if (!deleteBtn || !startBtn) {
        return;
    }

    const isEditMode = Boolean(task);
    deleteBtn.classList.toggle('hidden', !isEditMode);
    startBtn.classList.toggle('hidden', !isEditMode || task.status !== 'PENDING');
}

function resetTaskModal() {
    const taskIdEl = document.getElementById('task-id');
    const titleEl = document.getElementById('task-title');
    const descriptionEl = document.getElementById('task-description');
    const priorityEl = document.getElementById('task-priority');
    const dueDateEl = document.getElementById('task-due-date');
    const modalTitleEl = document.getElementById('task-modal-title');

    if (taskIdEl) taskIdEl.value = '';
    if (titleEl) titleEl.value = '';
    if (descriptionEl) descriptionEl.value = '';
    if (priorityEl) priorityEl.value = 'P3';
    if (dueDateEl) dueDateEl.value = '';
    if (modalTitleEl) modalTitleEl.textContent = 'Nova tarefa';

    buildTaskStatusOptions(null);
    toggleTaskModalActions(null);
}

function openTaskModal(taskId = null) {
    const task = taskId ? getTaskById(taskId) : null;
    const modalTitleEl = document.getElementById('task-modal-title');
    const taskIdEl = document.getElementById('task-id');
    const titleEl = document.getElementById('task-title');
    const descriptionEl = document.getElementById('task-description');
    const priorityEl = document.getElementById('task-priority');
    const dueDateEl = document.getElementById('task-due-date');

    taskState.modalMode = task ? 'edit' : 'create';
    taskState.editingTaskId = task ? Number(task.id) : null;

    if (task) {
        if (modalTitleEl) modalTitleEl.textContent = 'Editar tarefa';
        if (taskIdEl) taskIdEl.value = String(task.id);
        if (titleEl) titleEl.value = task.title || '';
        if (descriptionEl) descriptionEl.value = task.description || '';
        if (priorityEl) priorityEl.value = task.priority || 'P3';
        if (dueDateEl) dueDateEl.value = task.due_date || '';
        buildTaskStatusOptions(task);
        toggleTaskModalActions(task);
    } else {
        resetTaskModal();
    }

    openModal('modal-task');
}

async function saveTask(event) {
    event.preventDefault();
    if (!taskState.projectId) {
        return;
    }

    const title = document.getElementById('task-title')?.value.trim() || '';
    const description = document.getElementById('task-description')?.value.trim() || '';
    const status = document.getElementById('task-status')?.value || 'CREATED';
    const priority = document.getElementById('task-priority')?.value || 'P3';
    const dueDate = document.getElementById('task-due-date')?.value || '';
    const taskId = document.getElementById('task-id')?.value || '';

    if (!title) {
        showToast('Titulo obrigatorio', 'error');
        return;
    }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('status', status);
    fd.append('priority', priority);
    fd.append('due_date', dueDate);

    const endpoint = taskId
        ? `/api/projeto/${taskState.projectId}/tarefas/${taskId}`
        : `/api/projeto/${taskState.projectId}/tarefas`;

    try {
        const data = await api(endpoint, { method: 'POST', body: fd });
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }

        closeModal('modal-task');
        invalidateTaskCache();
        await loadTasks(true);
        showToast(taskId ? 'Tarefa atualizada' : 'Tarefa criada', 'success');
    } catch (err) {
        showToast(err.message || 'Falha ao salvar tarefa', 'error');
    }
}

async function deleteTask() {
    if (!taskState.editingTaskId || !taskState.projectId) {
        return;
    }

    if (!confirm('Excluir esta tarefa? Ela sera removida de forma soft delete.')) {
        return;
    }

    try {
        const data = await api(`/api/projeto/${taskState.projectId}/tarefas/${taskState.editingTaskId}/delete`, { method: 'POST' });
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }
        closeModal('modal-task');
        invalidateTaskCache();
        await loadTasks(true);
        showToast('Tarefa excluida', 'success');
    } catch (err) {
        showToast(err.message || 'Falha ao excluir tarefa', 'error');
    }
}

async function startTask(taskId = null) {
    const id = taskId || taskState.editingTaskId;
    if (!id || !taskState.projectId) {
        return;
    }

    try {
        const data = await api(`/api/projeto/${taskState.projectId}/tarefas/${id}/start`, { method: 'POST' });
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }
        invalidateTaskCache();
        await loadTasks(true);
        const modal = document.getElementById('modal-task');
        if (modal && !modal.classList.contains('hidden') && taskState.modalMode === 'edit' && Number(taskState.editingTaskId) === Number(id)) {
            openTaskModal(id);
        }
        showToast('Tarefa iniciada', 'success');
    } catch (err) {
        showToast(err.message || 'Falha ao iniciar tarefa', 'error');
    }
}

async function completeTask(taskId = null) {
    const id = taskId || taskState.editingTaskId;
    if (!id || !taskState.projectId) {
        return;
    }

    try {
        const data = await api(`/api/projeto/${taskState.projectId}/tarefas/${id}/complete`, { method: 'POST' });
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }
        invalidateTaskCache();
        await loadTasks(true);
        showToast('Tarefa concluida', 'success');
    } catch (err) {
        showToast(err.message || 'Falha ao concluir tarefa', 'error');
    }
}

function invalidateTaskCache() {
    taskState.cacheKey = '';
}

document.addEventListener('DOMContentLoaded', initProjectTabs);

window.setProjectTab = setProjectTab;
window.openTaskModal = openTaskModal;
window.saveTask = saveTask;
window.deleteTask = deleteTask;
window.startTask = startTask;
window.completeTask = completeTask;
