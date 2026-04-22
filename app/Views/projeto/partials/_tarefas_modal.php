<div class="modal-overlay hidden" id="modal-task">
    <div class="modal-box task-modal-box">
        <span class="modal-close" onclick="closeModal('modal-task')">&times;</span>
        <div class="modal-title" id="task-modal-title">Nova tarefa</div>
        <form id="form-task" onsubmit="saveTask(event)">
            <input type="hidden" id="task-id" value="">
            <div class="task-modal-grid">
                <label class="task-form-field">
                    <span>Titulo</span>
                    <input type="text" id="task-title" maxlength="255" required placeholder="Ex: revisar transcricao">
                </label>
                <label class="task-form-field task-form-field--full">
                    <span>Descricao</span>
                    <textarea id="task-description" rows="4" placeholder="Detalhe o que precisa ser feito"></textarea>
                </label>
                <label class="task-form-field">
                    <span>Status</span>
                    <select id="task-status"></select>
                </label>
                <label class="task-form-field">
                    <span>Prioridade</span>
                    <select id="task-priority">
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                        <option value="P3" selected>P3</option>
                        <option value="P4">P4</option>
                    </select>
                </label>
                <label class="task-form-field">
                    <span>Prazo</span>
                    <input type="date" id="task-due-date">
                </label>
            </div>

            <div class="task-modal-actions">
                <button type="button" class="btn btn-danger hidden" id="task-delete-btn" onclick="deleteTask()">
                    <i class="bi bi-trash"></i> Excluir
                </button>
                <button type="button" class="btn btn-secondary hidden" id="task-start-btn" onclick="startTask()">
                    <i class="bi bi-play-fill"></i> Iniciar
                </button>
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-check2"></i> Salvar
                </button>
            </div>
        </form>
    </div>
</div>
