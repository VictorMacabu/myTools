// ============================================================
//  Modal helpers
// ============================================================
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

// Close modals on overlay click / Escape key
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden');
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
});

// ============================================================
//  Color hex display
// ============================================================
function updateColorHex(input) {
    const hexValue = input.value.toUpperCase();
    const inputId = input.id;
    let hexSpanId;
    
    if (inputId === 'ws-color-select') {
        hexSpanId = 'ws-color-hex';
    } else if (inputId === 'edit-ws-color-select') {
        hexSpanId = 'edit-ws-color-hex';
    }
    
    if (hexSpanId) {
        const hexSpan = document.getElementById(hexSpanId);
        if (hexSpan) {
            hexSpan.textContent = hexValue;
        }
    }
}

// ============================================================
//  Toast notifications
// ============================================================
function showToast(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3500);
}

// ============================================================
//  API helper
// ============================================================
async function api(url, options = {}) {
    // Build headers, but don't override Content-Type for FormData
    const headers = {};

    // Only add Accept header if not a FormData body (FormData sets its own headers)
    if (!(options.body instanceof FormData)) {
        headers['Accept'] = 'application/json';
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
        headers,
        ...options,
    });

    if (!res.ok && res.status >= 400) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await res.json();
            throw new Error(data.error || `Erro ${res.status}`);
        } else {
            const text = await res.text();
            throw new Error('Servidor retornou erro ' + res.status + ': ' + text.substring(0, 200));
        }
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
        const text = await res.text();
        throw new Error('Servidor retornou HTML (erro ' + res.status + '). Resposta: ' + text.substring(0, 200));
    }
    return res.json();
}

// ============================================================
//  CRUD: Workspace
// ============================================================
async function createWorkspace(e) {
    e.preventDefault();
    
    // Aplicar valores padrão se não selecionados
    const emojiSelect = document.getElementById('ws-emoji-select');
    const colorSelect = document.getElementById('ws-color-select');
    
    if (!emojiSelect.value) {
        emojiSelect.value = '💼';
    }
    if (!colorSelect.value) {
        colorSelect.value = '#F5F5F5';
    }
    
    const fd = new FormData(e.target);
    const data = await api('/api/workspaces', { method: 'POST', body: fd });
    if (data.error) { showToast(data.error, 'error'); return; }
    closeModal('modal-new-workspace');
    showToast('Área de trabalho criada!', 'success');
    window.location.href = '/?ws=' + data.id;
}

function toggleEmojiList(event) {
    event.preventDefault();
    const container = document.getElementById('ws-emoji-container');
    const button = document.getElementById('ws-emoji-toggle');
    
    const list = document.getElementById('ws-emoji-list');
    const isExpanded = container.style.maxHeight !== 'none' && container.style.maxHeight !== 'none' && parseInt(container.style.maxHeight) > 100;
    
    if (isExpanded) {
        container.style.maxHeight = '60px';
        button.textContent = 'Ver mais ícones';
    } else {
        container.style.maxHeight = (list.scrollHeight + 16) + 'px';
        button.textContent = 'Ver menos ícones';
    }
}

function toggleEditEmojiList(event) {
    event.preventDefault();
    const container = document.getElementById('edit-ws-emoji-container');
    const button = document.getElementById('edit-ws-emoji-toggle');
    
    const list = document.getElementById('edit-ws-emoji-list');
    const isExpanded = container.style.maxHeight !== 'none' && container.style.maxHeight !== 'none' && parseInt(container.style.maxHeight) > 100;
    
    if (isExpanded) {
        container.style.maxHeight = '60px';
        button.textContent = 'Ver mais ícones';
    } else {
        container.style.maxHeight = (list.scrollHeight + 16) + 'px';
        button.textContent = 'Ver menos ícones';
    }
}

function selectWorkspaceEmoji(emoji, event) {
    event.preventDefault();
    const sel = document.getElementById('ws-emoji-select');
    if (sel) sel.value = emoji;
    const buttons = document.querySelectorAll('#ws-emoji-list button');
    buttons.forEach(btn => {
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'var(--surface)';
    });
    event.target.style.borderColor = 'var(--primary)';
    event.target.style.background = 'var(--primary)';
}

function selectEditWorkspaceEmoji(emoji, event) {
    event.preventDefault();
    const sel = document.getElementById('edit-ws-emoji-select');
    if (sel) sel.value = emoji;
    const buttons = document.querySelectorAll('#edit-ws-emoji-list button');
    buttons.forEach(btn => {
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'var(--surface)';
        btn.style.color = 'inherit';
    });
    event.target.style.borderColor = 'var(--primary)';
    event.target.style.background = 'var(--primary)';
    event.target.style.color = 'white';
}

function openEditWorkspaceModal(id, nome, icone, cor) {
    document.getElementById('edit-ws-id').value = id;
    document.getElementById('edit-ws-nome').value = nome;
    document.getElementById('edit-ws-emoji-select').value = icone;
    document.getElementById('edit-ws-color-select').value = cor;
    document.getElementById('edit-ws-color-hex').textContent = cor.toUpperCase();
    
    const buttons = document.querySelectorAll('#edit-ws-emoji-list button');
    buttons.forEach(btn => {
        if (btn.textContent.trim() === icone) {
            btn.style.borderColor = 'var(--primary)';
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
        } else {
            btn.style.borderColor = 'var(--border)';
            btn.style.background = 'var(--surface)';
            btn.style.color = 'inherit';
        }
    });
    
    openModal('modal-edit-workspace');
}

async function updateWorkspace(e) {
    e.preventDefault();
    const id = document.getElementById('edit-ws-id').value;
    const fd = new FormData(e.target);
    const data = await api('/api/workspace/' + id + '/update', { method: 'POST', body: fd });
    if (data.error) { showToast(data.error, 'error'); return; }
    closeModal('modal-edit-workspace');
    showToast('Workspace atualizado!', 'success');
    setTimeout(() => window.location.reload(), 500);
}

async function deleteWorkspaceConfirm() {
    if (!confirm('Tem certeza que deseja excluir este workspace? Todos os projetos serão perdidos.')) return;
    if (!confirm('Isso não pode ser desfeito. Deseja realmente excluir?')) return;
    const id = document.getElementById('edit-ws-id').value;
    const data = await api('/api/workspace/' + id + '/delete', { method: 'POST' });
    if (data.error) { showToast(data.error, 'error'); return; }
    closeModal('modal-edit-workspace');
    showToast('Workspace excluído!', 'success');
    setTimeout(() => window.location.href = '/', 500);
}

// ============================================================
//  CRUD: Grupo
// ============================================================
async function createGrupo(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await api('/api/grupos', { method: 'POST', body: fd });
    if (data.error) { showToast(data.error, 'error'); return; }
    closeModal('modal-new-grupo');
    showToast('Grupo criado!', 'success');
    setTimeout(() => window.location.reload(), 500);
}

function selectGrupo(id) {
    document.getElementById('new-projeto-grupo-id').value = id === -1 ? '' : id;
    const buttons = document.querySelectorAll('#new-projeto-grupo-list button');
    buttons.forEach(btn => btn.style.background = 'var(--surface)');
    event.target.style.background = 'var(--primary)';
    event.target.style.color = 'white';
}

function editGrupoForm(id, nome) {
    document.getElementById('edit-grupo-id').value = id;
    document.getElementById('edit-grupo-nome').value = nome;
    openModal('modal-edit-grupo');
}

async function updateGrupo(e) {
    e.preventDefault();
    const id = document.getElementById('edit-grupo-id').value;
    const nome = document.getElementById('edit-grupo-nome').value;
    const fd = new FormData();
    fd.append('nome', nome);
    const data = await api('/api/grupo/' + id + '/update', { method: 'POST', body: fd });
    if (data.error) { showToast(data.error, 'error'); return; }
    closeModal('modal-edit-grupo');
    showToast('Grupo atualizado!', 'success');
    setTimeout(() => window.location.reload(), 500);
}

async function deleteGrupo() {
    if (!confirm('Tem certeza que deseja excluir este grupo? Todos os projetos associados serão desagrupados.')) return;
    if (!confirm('Isso não pode ser desfeito. Deseja realmente excluir?')) return;
    const id = document.getElementById('edit-grupo-id').value;
    const data = await api('/api/grupo/' + id + '/delete', { method: 'POST' });
    if (data.error) { showToast(data.error, 'error'); return; }
    closeModal('modal-edit-grupo');
    showToast('Grupo excluído!', 'success');
    setTimeout(() => window.location.reload(), 500);
}

// ============================================================
//  CRUD: Projeto
// ============================================================
async function createProjeto(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await api('/api/projetos', { method: 'POST', body: fd });
    if (data.error) { showToast(data.error, 'error'); return; }
    closeModal('modal-new-projeto');
    showToast('Projeto criado!', 'success');
    window.location.href = '/projeto/' + data.id;
}

function fillEditForm(id, nome) {
    document.getElementById('edit-projeto-id').value = id;
    document.getElementById('edit-projeto-nome').value = nome;
    document.getElementById('edit-projeto-grupo-id').value = '';
    const fav = document.getElementById('edit-projeto-favorito');
    if (fav) fav.checked = false;
    resetEditGrupoButtons();
}

function resetEditGrupoButtons() {
    const buttons = document.querySelectorAll('#edit-projeto-grupo-list button');
    if (buttons) buttons.forEach(btn => btn.style.background = 'var(--surface)');
}

function selectEditGrupo(id) {
    document.getElementById('edit-projeto-grupo-id').value = id === -1 ? '' : id;
    const buttons = document.querySelectorAll('#edit-projeto-grupo-list button');
    buttons.forEach(btn => btn.style.background = 'var(--surface)');
    event.target.style.background = 'var(--primary)';
    event.target.style.color = 'white';
}

async function updateProjetoSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-projeto-id').value;
    const nome = document.getElementById('edit-projeto-nome').value;
    const grupoId = document.getElementById('edit-projeto-grupo-id').value;
    const fd = new FormData();
    fd.append('nome', nome);
    if (grupoId !== '') fd.append('grupo_id', grupoId);
    const fav = document.getElementById('edit-projeto-favorito');
    if (fav) fd.append('favorito', fav.checked ? 1 : 0);
    const data = await api('/api/projeto/' + id + '/update', { method: 'POST', body: fd });
    if (data.error) { showToast(data.error, 'error'); return; }
    closeModal('modal-edit-projeto');
    showToast('Projeto atualizado!', 'success');
    setTimeout(() => window.location.reload(), 500);
}

async function deleteProjeto() {
    if (!confirm('Tem certeza que deseja excluir este projeto e todos os seus arquivos?')) return;
    const id = document.getElementById('edit-projeto-id').value;
    await api('/api/projeto/' + id + '/delete', { method: 'POST' });
    closeModal('modal-edit-projeto');
    showToast('Projeto excluido!', 'success');
    window.location.href = '/';
}

async function toggleFavorite(id) {
    event.stopPropagation();
    const data = await api('/api/projeto/' + id + '/toggle-fav', { method: 'POST' });
    showToast('Favorito atualizado', 'info');
    const card = document.querySelector(`.proj-card[data-id="${id}"]`);
    if (card) {
        const badge = card.querySelector('.fav-badge');
        const starBtn = card.querySelector('button[onclick*="toggleFavorite"] i');
        
        if (card.classList.contains('fav-card')) {
            // Remover de favoritos
            card.classList.remove('fav-card');
            if (badge) badge.remove();
            if (starBtn) {
                starBtn.classList.remove('bi-star-fill');
                starBtn.classList.add('bi-star');
                starBtn.style.color = 'inherit';
            }
        } else {
            // Adicionar aos favoritos
            card.classList.add('fav-card');
            if (!badge) {
                card.querySelector('.proj-cover').insertAdjacentHTML('beforeend', '<span class="fav-badge"><i class="bi bi-star-fill" style="color:#d97706"></i></span>');
            }
            if (starBtn) {
                starBtn.classList.remove('bi-star');
                starBtn.classList.add('bi-star-fill');
                starBtn.style.color = '#d97706';
            }
        }
    }
}

// ============================================================
//  Fontes (sources)
// ============================================================
const selectedFontes = new Set();

function toggleFonte(el, id) {
    if (selectedFontes.has(id)) {
        selectedFontes.delete(id);
        el.classList.remove('selected');
    } else {
        selectedFontes.add(id);
        el.classList.add('selected');
    }
    updateChatState();
}

function updateChatState() {
    const count = selectedFontes.size;
    const dot = document.getElementById('counter-dot');
    const text = document.getElementById('counter-text');
    const msg = document.getElementById('chat-disabled-msg');
    const form = document.getElementById('chat-form');

    if (!dot) return;

    if (count > 0) {
        dot.classList.remove('off');
        text.textContent = count + ' fonte(s) selecionada(s)';
        msg.classList.add('hidden');
        form.classList.remove('hidden');
    } else {
        dot.classList.add('off');
        text.textContent = '0 fontes selecionadas';
        msg.classList.remove('hidden');
        form.classList.add('hidden');
    }
}

function deleteFonte(id) {
    if (!confirm('Remover esta fonte?')) return;
    api('/api/fontes/' + id + '/delete', { method: 'POST' }).then(data => {
        if (data.ok) {
            const el = document.querySelector('.fonte-item[data-id="' + id + '"]');
            if (el) el.remove();
            selectedFontes.delete(id);
            const idx = Array.isArray(FONTES) ? FONTES.findIndex(f => Number(f.id) === Number(id)) : -1;
            if (idx >= 0) FONTES.splice(idx, 1);
            updateChatState();
            showToast('Fonte removida!', 'success');
        } else {
            showToast(data.error || 'Erro ao remover fonte', 'error');
        }
    }).catch(err => {
        showToast('Erro: ' + err.message, 'error');
    });
}

function downloadFonte(arg1, arg2, arg3) {
    let evt = null;
    let id;
    let nome;

    if (arg1 && typeof arg1 === 'object' && typeof arg1.stopPropagation === 'function') {
        evt = arg1;
        id = arg2;
        nome = arg3;
    } else {
        id = arg1;
        nome = arg2;
    }

    if (evt) evt.stopPropagation();
    const link = document.createElement('a');
    link.href = '/api/fontes/' + id + '/download';
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================
//  Upload
// ============================================================
let uploading = false; // Prevent concurrent uploads

// Allowed file types for validation
const ALLOWED_EXTENSIONS = [
    'mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma',  // audio
    'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv',         // video
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif', // image
    'txt', 'pdf', 'doc', 'docx', 'rtf', 'odt', 'md',        // documents
    'csv', 'xls', 'xlsx', 'ods',                        // spreadsheets
    'srt', 'vtt'                                        // subtitles
];

function getFileExtension(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ext;
}

function isFileTypeAllowed(filename) {
    const ext = getFileExtension(filename);
    return ALLOWED_EXTENSIONS.includes(ext);
}

function validateFiles(files) {
    const errors = [];
    const validFiles = [];

    for (const file of files) {
        if (!isFileTypeAllowed(file.name)) {
            errors.push(`${file.name}: tipo de arquivo não permitido (.${getFileExtension(file.name)})`);
            continue;
        }

        // Check file size (500MB max)
        const maxSize = 500 * 1024 * 1024; // 500MB in bytes
        if (file.size > maxSize) {
            errors.push(`${file.name}: arquivo muito grande (máximo 500MB)`);
            continue;
        }

        validFiles.push(file);
    }

    return { validFiles, errors };
}

function setUploadingState(isUploading) {
    uploading = isUploading;
    const fileInput = document.getElementById('file-select');
    const selectBtn = document.querySelector('#modal-add-fonte button[onclick*="file-select"]');
    const progressEl = document.getElementById('upload-progress');

    // Also update all project page add-fonte buttons
    document.querySelectorAll('.tool-btn[onclick*="modal-add-fonte"], .panel-header .add-btn[onclick*="modal-add-fonte"]').forEach(btn => {
        btn.disabled = isUploading;
        btn.style.opacity = isUploading ? '0.5' : '1';
        btn.style.pointerEvents = isUploading ? 'none' : 'auto';
    });

    if (fileInput) fileInput.disabled = isUploading;

    if (isUploading) {
        if (selectBtn) {
            selectBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Enviando...';
            selectBtn.style.opacity = '0.5';
        }
        progressEl.innerHTML =
            '<div style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);border:1px solid var(--border);display:flex;align-items:center;gap:12px;">' +
                '<i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite;color:var(--primary)"></i>' +
                '<span>Carregando arquivos...</span>' +
            '</div>';
    } else {
        if (selectBtn) {
            selectBtn.innerHTML = '<i class="bi bi-paperclip"></i> Selecionar arquivos';
            selectBtn.style.opacity = '1';
        }
        progressEl.innerHTML = '';
        fileInput.value = '';
    }
}

function showUploadMessage(message, type) {
    const progressEl = document.getElementById('upload-progress');
    const className = type === 'success' ? 'success' : type === 'error' ? 'error' : 'info';
    const icon = type === 'success' ? 'bi-check-circle' : type === 'error' ? 'bi-exclamation-circle' : 'bi-info-circle';

    const msgEl = document.createElement('div');
    msgEl.style.cssText = `
        padding:12px;
        margin-top:12px;
        border-radius:var(--radius-md);
        border:1px solid var(--border);
        display:flex;
        align-items:flex-start;
        gap:12px;
        background:var(--surface-2);
        color:var(--text-2);
    `;

    if (type === 'success') {
        msgEl.style.background = 'var(--color-success, rgba(34, 197, 94, 0.1))';
        msgEl.style.borderColor = 'var(--color-success, rgba(34, 197, 94, 0.3))';
        msgEl.style.color = 'var(--color-success-text, #15803d)';
    } else if (type === 'error') {
        msgEl.style.background = 'var(--color-error, rgba(239, 68, 68, 0.1))';
        msgEl.style.borderColor = 'var(--color-error, rgba(239, 68, 68, 0.3))';
        msgEl.style.color = 'var(--color-error-text, #991b1b)';
    }

    msgEl.innerHTML = `
        <i class="bi ${icon}" style="flex-shrink:0;margin-top:2px"></i>
        <span style="flex:1;white-space:pre-wrap;word-break:break-word;">${escapeHtml(message)}</span>
    `;

    if (progressEl.querySelector('div[style*="success"], div[style*="error"]')) {
        progressEl.querySelector('div[style*="success"], div[style*="error"]').remove();
    }
    progressEl.appendChild(msgEl);

    // Auto-hide success message after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            msgEl.style.opacity = '0';
            msgEl.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => msgEl.remove(), 300);
        }, 5000);
    }
}

async function doUpload(fileInput) {
    if (uploading) return;
    if (!fileInput.files.length) { showToast('Selecione ao menos um arquivo', 'error'); return; }

    // Validate files first
    const { validFiles, errors } = validateFiles(Array.from(fileInput.files));

    // Show validation errors
    if (errors.length > 0) {
        showToast('Verifique os tipos de arquivo antes de enviar', 'error');
        errors.forEach(error => showUploadMessage(error, 'error'));
        return;
    }

    if (validFiles.length === 0) {
        showToast('Nenhum arquivo válido para enviar', 'error');
        return;
    }

    const totalFiles = validFiles.length;
    setUploadingState(true);

    let uploadedCount = 0;
    const uploadErrors = [];

    for (const file of validFiles) {
        try {
            const fd = new FormData();
            fd.append('arquivo', file);

            const res = await fetch('/api/projeto/' + PROJETO_ID + '/upload', {
                method: 'POST',
                body: fd
            });

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                uploadErrors.push(`${file.name}: servidor retornou resposta inválida`);
                continue;
            }

            const data = await res.json();

            // Handle errors reported by controller
            if (data.errors && data.errors.length > 0) {
                data.errors.forEach(err => uploadErrors.push(err));
            }

            // Each upload sends one file, so success[0] is the uploaded file
            if (data.success && data.success.length > 0) {
                addFonteToList(data.success[0]);
                uploadedCount++;
            } else if (!data.errors || data.errors.length === 0) {
                uploadErrors.push(`${file.name}: erro desconhecido ao enviar`);
            }

            const progressEl = document.getElementById('upload-progress');
            if (progressEl) {
                const progressMsg = document.querySelector('.upload-progress-msg');
                if (progressMsg) {
                    progressMsg.textContent = `Arquivo ${uploadedCount + 1} de ${totalFiles}`;
                } else {
                    progressEl.innerHTML =
                        '<div class="upload-progress-msg" style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);border:1px solid var(--border);display:flex;align-items:center;gap:12px;">' +
                            '<i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite;color:var(--primary)"></i>' +
                            `<span>Arquivo ${uploadedCount + 1} de ${totalFiles}</span>` +
                        '</div>';
                }
            }
        } catch (err) {
            uploadErrors.push(`${file.name}: ${err.message}`);
        }
    }

    setUploadingState(false);

    // Show results
    if (uploadedCount > 0) {
        const msg = uploadedCount === 1
            ? '1 arquivo adicionado com sucesso!'
            : `${uploadedCount} arquivos adicionados com sucesso!`;
        showUploadMessage(msg, 'success');
        showToast(msg, 'success');
    }

    if (uploadErrors.length > 0) {
        const errorMsg = uploadErrors.join('\n');
        showUploadMessage(errorMsg, 'error');
        showToast(uploadErrors.length + ' arquivo(s) rejeitado(s)', 'error');
    }
}

async function uploadFonte(e) {
    e.preventDefault();
    const fileInput = document.getElementById('file-select');
    doUpload(fileInput);
}

handleFileSelect = doUpload; // Alias for the inline handler

function _legacyAddFonteToList(data) {
    const list = document.getElementById('fontes-list');
    const emptyEl = list.querySelector('i.bi-inbox');
    if (emptyEl && emptyEl.parentElement) emptyEl.parentElement.remove();

    const div = document.createElement('div');
    div.className = 'fonte-item';
    div.dataset.id = data.id;
    div.dataset.tipo = data.tipo;
    div.onclick = function() { toggleFonte(this, data.id); };

    let buttons = '<button class="fonte-del" onclick="event.stopPropagation();deleteFonte(' + data.id + ')" title="Remover"><i class="bi bi-x"></i></button>';

    // Adicionar botão de download para arquivos de transcrição
    if (data.tipo === 'transcricao' || data.tipo === 'documento') {
        buttons = '<button class="fonte-del" onclick="event.stopPropagation();downloadFonte(' + data.id + ', \'' + data.nome.replace(/'/g, "\\'") + '\')" title="Download"><i class="bi bi-download"></i></button>' + buttons;
    }

    div.innerHTML =
        '<div class="fonte-check"></div>' +
        '<i class="bi ' + getFileIcon(data.tipo) + ' fonte-icon"></i>' +
        '<div class="fonte-info">' +
            '<div class="fonte-nome">' + data.nome + '</div>' +
            '<div class="fonte-tipo">' + data.tipo + ' &middot; ' + data.tamanho_kb + ' KB</div>' +
        '</div>' +
        '<div style="display:flex;gap:4px">' + buttons + '</div>';
    list.appendChild(div);
}

function formatSizeInMB(sizeKb) {
    const kb = Number(sizeKb || 0);
    return (kb / 1024).toFixed(2);
}

function addFonteToList(data) {
    const list = document.getElementById('fontes-list');
    const emptyEl = list.querySelector('i.bi-inbox');
    if (emptyEl && emptyEl.parentElement) emptyEl.parentElement.remove();

    const div = document.createElement('div');
    div.className = 'fonte-item';
    div.dataset.id = data.id;
    div.dataset.tipo = data.tipo;
    div.onclick = function() { toggleFonte(div, data.id); };

    const check = document.createElement('div');
    check.className = 'fonte-check';

    const main = document.createElement('div');
    main.className = 'fonte-main';

    const icon = document.createElement('i');
    icon.className = 'bi ' + getFileIcon(data.tipo) + ' fonte-icon';

    const info = document.createElement('div');
    info.className = 'fonte-info';

    const nome = document.createElement('div');
    nome.className = 'fonte-nome';
    nome.title = data.nome;
    nome.textContent = data.nome;

    const meta = document.createElement('div');
    meta.className = 'fonte-meta';

    const tipo = document.createElement('span');
    tipo.className = 'fonte-tipo';
    tipo.textContent = data.tipo;

    const size = document.createElement('span');
    size.className = 'fonte-size';
    size.textContent = formatSizeInMB(data.tamanho_kb) + ' MB';

    const actions = document.createElement('div');
    actions.className = 'fonte-actions';

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'fonte-action';
    downloadBtn.title = 'Download';
    downloadBtn.innerHTML = '<i class="bi bi-download"></i>';
    downloadBtn.onclick = function(e) { downloadFonte(e, data.id, data.nome); };

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'fonte-action danger';
    deleteBtn.title = 'Remover';
    deleteBtn.innerHTML = '<i class="bi bi-x"></i>';
    deleteBtn.onclick = function(e) {
        e.stopPropagation();
        deleteFonte(data.id);
    };

    meta.appendChild(tipo);
    meta.appendChild(size);
    info.appendChild(nome);
    info.appendChild(meta);
    main.appendChild(icon);
    main.appendChild(info);
    actions.appendChild(downloadBtn);
    actions.appendChild(deleteBtn);
    div.appendChild(check);
    div.appendChild(main);
    div.appendChild(actions);

    list.appendChild(div);

    if (Array.isArray(FONTES) && !FONTES.some(f => Number(f.id) === Number(data.id))) {
        FONTES.push(data);
    }
}

function getFileIcon(tipo) {
    const icons = {
        audio: 'bi-music-note-beamed',
        video: 'bi-camera-video',
        imagem: 'bi-image',
        documento: 'bi-file-earmark-text',
        tabela: 'bi-table',
        transcricao: 'bi-file-earmark-richtext',
    };
    return icons[tipo] || 'bi-file-earmark';
}

// ============================================================
//  Chat
// ============================================================
let chatHistory = [];

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    const container = document.getElementById('chat-messages');
    const placeholder = document.getElementById('chat-placeholder');
    if (placeholder) placeholder.remove();

    container.innerHTML += '<div class="msg-user">' + escapeHtml(msg) + '</div>';
    input.value = '';

    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    container.innerHTML += '<div class="msg-assistant" id="' + typingId + '"><em><i class="bi bi-hourglass-split"></i> Pensando...</em></div>';
    container.scrollTop = container.scrollHeight;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: msg,
                fontes: Array.from(selectedFontes),
                history: chatHistory,
            })
        });

        const data = await res.json();

        const typing = document.getElementById(typingId);
        if (typing) typing.remove();

        if (data.error) {
            container.innerHTML += '<div class="msg-assistant"><em>Erro: ' + escapeHtml(data.error) + '</em></div>';
        } else {
            container.innerHTML += '<div class="msg-assistant">' + escapeHtml(data.reply) + '</div>';
            chatHistory.push({ role: 'user', message: msg });
            chatHistory.push({ role: 'assistant', message: data.reply });
        }
        container.scrollTop = container.scrollHeight;
    } catch (err) {
        const typing = document.getElementById(typingId);
        if (typing) typing.remove();
        container.innerHTML += '<div class="msg-assistant"><em>Erro de conexão: ' + escapeHtml(err.message) + '</em></div>';
        container.scrollTop = container.scrollHeight;
    }
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

const chatInput = document.getElementById('chat-input');
if (chatInput) {
    chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });
}

// ============================================================
//  Audio Cutter Modal
// ============================================================
async function openAudioCutter() {
    if (!FONTES) return;
    openModal('modal-cortar-audio');
    const select = document.getElementById('cortar-audio-select');
    const audios = FONTES.filter(f => f.tipo === 'audio' || f.tipo === 'video');
    select.innerHTML = '<option value="">Selecione um áudio...</option>';
    audios.forEach(a => {
        select.innerHTML += '<option value="' + a.id + '" data-caminho="' + a.caminho + '">' + a.nome + ' (' + a.tamanho_kb + ' KB)</option>';
    });
    document.getElementById('cortar-audio-controls').classList.add('hidden');

    select.onchange = function() {
        const id = this.value;
        if (!id) { document.getElementById('cortar-audio-controls').classList.add('hidden'); return; }
        document.getElementById('cortar-audio-controls').classList.remove('hidden');
        document.getElementById('cortar-start').value = 0;
        document.getElementById('cortar-end').value = 100;
        updateCutterLabels();
    };
}

function updateCutterLabels() {
    const s = document.getElementById('cortar-start');
    const e = document.getElementById('cortar-end');
    let sv = parseFloat(s.value) || 0;
    let ev = parseFloat(e.value) || 0;
    if (sv > ev) { if (e === document.activeElement) e.value = sv; else s.value = ev; }
    document.getElementById('start-label').textContent = formatTime(sv);
    document.getElementById('end-label').textContent = formatTime(ev);
}
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
}

async function cortarAudio() {
    const select = document.getElementById('cortar-audio-select');
    if (!select.value) return;
    showToast('Corte de áudio: funcionalidade em integração com pydub', 'info');
}

// ============================================================
//  Media Viewer
// ============================================================
async function openMediaViewer() {
    if (!FONTES) return;
    openModal('modal-media-viewer');
    const select = document.getElementById('media-select');
    const media = FONTES.filter(f => f.tipo === 'audio' || f.tipo === 'video');
    select.innerHTML = '<option value="">Selecionar arquivo...';
    media.forEach(a => {
        select.innerHTML += '<option value="' + a.caminho + '" data-tipo="' + a.tipo + '">' + a.nome + '</option>';
    });
    document.getElementById('media-container').innerHTML = '';

    select.onchange = function() {
        const container = document.getElementById('media-container');
        const path = this.value;
        if (!path) { container.innerHTML = ''; return; }
        const tipo = this.options[this.selectedIndex].dataset.tipo;
        if (tipo === 'audio') {
            container.innerHTML = '<audio controls src="' + path + '" style="width:100%;margin-top:12px"></audio>';
        } else if (tipo === 'video') {
            container.innerHTML = '<video controls src="' + path + '" style="width:100%;max-height:60vh;margin-top:12px"></video>';
        } else {
            container.innerHTML = '<p style="color:var(--text-3)">Arquivo selecionado não é compatível com player</p>';
        }
    };
}

// ============================================================
//  Image Viewer
// ============================================================
async function openImageViewer() {
    if (!FONTES) return;
    openModal('modal-image-viewer');
    const select = document.getElementById('image-select');
    const images = FONTES.filter(f => f.tipo === 'imagem');
    select.innerHTML = '<option value="">Selecionar imagem...';
    images.forEach(a => {
        select.innerHTML += '<option value="' + a.caminho + '">' + a.nome + '</option>';
    });
    document.getElementById('image-container').innerHTML = '';

    select.onchange = function() {
        const container = document.getElementById('image-container');
        if (!this.value) { container.innerHTML = ''; return; }
        container.innerHTML = '<img src="' + this.value + '" style="max-width:100%;max-height:70vh;object-fit:contain;border-radius:var(--radius-lg)">';
    };
}

// ============================================================
//  Text Editor
// ============================================================
const EDITABLE_TEXT_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'srt', 'vtt'];

function getFileExtFromName(name) {
    if (!name || typeof name !== 'string') return '';
    const idx = name.lastIndexOf('.');
    if (idx <= 0 || idx === name.length - 1) return '';
    return name.slice(idx + 1).toLowerCase();
}

function isEditableTextFonte(fonte) {
    if (!fonte) return false;
    const ext = getFileExtFromName(fonte.nome || '');
    return EDITABLE_TEXT_EXTENSIONS.includes(ext);
}

async function openTextEditor() {
    if (!FONTES) return;
    openModal('modal-text-editor');
    const select = document.getElementById('text-select');
    const docs = FONTES.filter(isEditableTextFonte);
    select.innerHTML = '<option value="">Selecionar documento de texto...</option>';
    docs.forEach(d => {
        select.innerHTML += '<option value="' + d.id + '" data-caminho="' + d.caminho + '">' + d.nome + '</option>';
    });
    const area = document.getElementById('text-editor-area');
    area.value = '';

    if (docs.length === 0) {
        showToast('Nenhum arquivo de texto disponivel para edicao', 'info');
    }

    select.onchange = async function() {
        const area = document.getElementById('text-editor-area');
        if (!this.value) { area.value = ''; return; }
        area.value = 'Carregando...';
        try {
            const selectedId = Number(this.value);
            const selectedFonte = FONTES.find(f => Number(f.id) === selectedId);
            if (!selectedFonte) {
                area.value = '';
                return;
            }

            if (typeof selectedFonte.transcricao === 'string' && selectedFonte.transcricao.length > 0) {
                area.value = selectedFonte.transcricao;
                return;
            }

            const caminho = this.options[this.selectedIndex].dataset.caminho || selectedFonte.caminho;
            const res = await fetch(caminho, { cache: 'no-store' });
            if (!res.ok) {
                throw new Error('Falha ao carregar arquivo (' + res.status + ')');
            }
            const text = await res.text();
            area.value = text;
        } catch (e) {
            area.value = 'Erro ao carregar arquivo: ' + e.message;
        }
    };
}

async function salvarTexto() {
    const select = document.getElementById('text-select');
    const id = Number(select.value || 0);
    const content = document.getElementById('text-editor-area').value;
    if (!id) { showToast('Selecione um documento primeiro', 'error'); return; }
    try {
        const fd = new FormData();
        fd.append('transcricao', content);
        const data = await api('/api/fontes/' + id + '/update', { method: 'POST', body: fd });

        const fonte = FONTES.find(f => Number(f.id) === id);
        if (fonte) {
            fonte.transcricao = content;
            if (typeof data.tamanho_kb === 'number') {
                fonte.tamanho_kb = data.tamanho_kb;
            }
        }

        const listItem = document.querySelector('.fonte-item[data-id="' + id + '"] .fonte-size');
        if (listItem && typeof data.tamanho_kb === 'number') {
            listItem.textContent = formatSizeInMB(data.tamanho_kb) + ' MB';
        }

        closeModal('modal-text-editor');
        showToast('Texto salvo com sucesso!', 'success');
    } catch (err) {
        showToast('Erro ao salvar texto: ' + err.message, 'error');
    }
}

// ============================================================
//  Transcription
// ============================================================
async function openTranscricaoLEGACY() {
    if (!FONTES) return;
    openModal('modal-transcrever');
    const select = document.getElementById('transcrever-select');
    const audios = FONTES.filter(f => f.tipo === 'audio' || f.tipo === 'video');
    select.innerHTML = '<option value="">Selecionar áudio...';
    audios.forEach(a => {
        select.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>';
    });
}

async function transcreverAudioLEGACY() {
    const select = document.getElementById('transcrever-select');
    if (!select.value) { showToast('Selecione um áudio para transcrever', 'error'); return; }

    const fontId = select.value;
    const option = select.options[select.selectedIndex];
    const audioName = option.textContent;

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;

    // Esconder seletor e mostrar animação
    const modalContent = document.querySelector('#modal-transcrever .modal-box');
    const selectContainer = document.querySelector('#modal-transcrever .modal-box > p, #modal-transcrever select');

    // Criar container da animação
    const animContainer = document.createElement('div');
    animContainer.id = 'transcription-anim-container';
    animContainer.style.cssText = `
        margin-top: 20px;
        padding: 20px;
        background: var(--surface-2);
        border-radius: var(--radius-lg);
        position: relative;
    `;

    // Bola do ping pong
    const ball = document.createElement('div');
    ball.style.cssText = `
        width: 16px;
        height: 16px;
        background: var(--primary);
        border-radius: 50%;
        position: relative;
        height: 60px;
        display: flex;
        align-items: center;
        animation: pingPong 1s infinite ease-in-out;
    `;
    const ballInner = document.createElement('div');
    ballInner.style.cssText = `
        width: 16px;
        height: 16px;
        background: var(--primary);
        border-radius: 50%;
        position: absolute;
        left: 8px;
    `;
    ball.appendChild(ballInner);

    // Contador
    const counter = document.createElement('div');
    counter.id = 'transcription-counter';
    counter.style.cssText = `
        text-align: center;
        margin-top: 16px;
        font-size: 14px;
        color: var(--text-2);
        font-weight: 600;
    `;
    counter.innerHTML = '<span style="font-size: 24px; color: var(--primary);">0</span>s';

    animContainer.appendChild(ball);
    animContainer.appendChild(counter);

    // Esconder elementos antigos
    const para = modalContent.querySelector('p');
    const selectEl = modalContent.querySelector('select');
    if (para) para.style.display = 'none';
    if (selectEl) selectEl.style.display = 'none';

    // Inserir animação
    modalContent.insertBefore(animContainer, btn);

    // Iniciar contador
    let seconds = 0;
    const ballBounceCount = 0;
    const counterInterval = setInterval(() => {
        seconds++;
        counter.innerHTML = `<span style="font-size: 24px; color: var(--primary);">${seconds}</span>s`;
        // Pequena animação no contador
        counter.style.animation = 'none';
        setTimeout(() => {
            counter.style.animation = 'pulse-counter 0.3s ease-in-out';
        }, 10);
    }, 1000);

    btn.innerHTML = '<i class="bi bi-hourglass-split" style="animation:spin 1s linear infinite"></i> Transcrevendo...';

    try {
        const fd = new FormData();
        fd.append('fonte_id', fontId);

        const res = await fetch('/api/projeto/' + PROJETO_ID + '/transcribe', {
            method: 'POST',
            body: fd
        });

        clearInterval(counterInterval);

        const data = await res.json();

        if (!res.ok || !data.success) {
            showToast('Erro na transcrição: ' + (data.error || 'erro desconhecido'), 'error');
            // Restaurar interface
            if (para) para.style.display = 'block';
            if (selectEl) selectEl.style.display = 'block';
            animContainer.remove();
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }

        // Mostrar sucesso
        animContainer.style.opacity = '0';
        animContainer.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => animContainer.remove(), 300);

        // Adicionar arquivos de transcrição à lista
        if (data.txt) addFonteToList(data.txt);
        if (data.md) addFonteToList(data.md);

        closeModal('modal-transcrever');
        showToast(`Transcrição concluída em ${seconds} segundos! 2 arquivos adicionados.`, 'success');

        // Recarregar a página para atualizar lista
        setTimeout(() => window.location.reload(), 500);
    } catch (err) {
        clearInterval(counterInterval);
        showToast('Erro ao transcrever: ' + err.message, 'error');
        // Restaurar interface
        if (para) para.style.display = 'block';
        if (selectEl) selectEl.style.display = 'block';
        animContainer.remove();
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function formatStopwatch(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
}

function resetTranscricaoModalLEGACY() {
    const modalContent = document.querySelector('#modal-transcrever .modal-box');
    if (!modalContent) return;

    const para = modalContent.querySelector('p');
    const selectEl = document.getElementById('transcrever-select');
    const animContainer = document.getElementById('transcription-anim-container');
    const fileNameEl = document.getElementById('transcrever-arquivo-atual');
    const btn = document.getElementById('transcrever-btn');

    if (para) para.style.display = 'block';
    if (selectEl) selectEl.style.display = 'block';
    if (animContainer) animContainer.remove();
    if (fileNameEl) {
        fileNameEl.textContent = '';
        fileNameEl.removeAttribute('title');
        fileNameEl.classList.add('hidden');
    }
    if (btn) {
        btn.disabled = false;
        if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
    }
}

async function openTranscricaoLEGACY2() {
    if (!FONTES) return;
    openModal('modal-transcrever');
    resetTranscricaoModal();

    const select = document.getElementById('transcrever-select');
    const audios = FONTES.filter(f => f.tipo === 'audio' || f.tipo === 'video');
    select.innerHTML = '<option value="">Selecionar &aacute;udio...</option>';
    audios.forEach(a => {
        select.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>';
    });
}

async function transcreverAudioLEGACY2(triggerEvent) {
    const select = document.getElementById('transcrever-select');
    if (!select.value) { showToast('Selecione um audio para transcrever', 'error'); return; }

    const fontId = select.value;
    const option = select.options[select.selectedIndex];
    const audioName = option.textContent;

    const btn = triggerEvent?.currentTarget || document.getElementById('transcrever-btn');
    if (!btn) return;

    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;

    const modalContent = document.querySelector('#modal-transcrever .modal-box');
    if (!modalContent) return;

    const para = modalContent.querySelector('p');
    const selectEl = modalContent.querySelector('select');
    const fileNameEl = document.getElementById('transcrever-arquivo-atual');
    const oldAnimContainer = document.getElementById('transcription-anim-container');

    if (oldAnimContainer) oldAnimContainer.remove();
    if (fileNameEl) {
        fileNameEl.textContent = audioName;
        fileNameEl.title = audioName;
        fileNameEl.classList.remove('hidden');
    }
    if (para) para.style.display = 'none';
    if (selectEl) selectEl.style.display = 'none';

    const animContainer = document.createElement('div');
    animContainer.id = 'transcription-anim-container';
    animContainer.className = 'transcription-anim-container';

    const pingPongArena = document.createElement('div');
    pingPongArena.className = 'transcription-pingpong-arena';

    const leftPaddle = document.createElement('div');
    leftPaddle.className = 'transcription-paddle left';
    const rightPaddle = document.createElement('div');
    rightPaddle.className = 'transcription-paddle right';
    const ball = document.createElement('div');
    ball.className = 'transcription-ball';

    pingPongArena.appendChild(leftPaddle);
    pingPongArena.appendChild(rightPaddle);
    pingPongArena.appendChild(ball);

    const counter = document.createElement('div');
    counter.id = 'transcription-counter';
    counter.className = 'transcription-counter';

    const counterTime = document.createElement('span');
    counterTime.className = 'transcription-counter-time';
    counterTime.textContent = formatStopwatch(0);

    counter.appendChild(counterTime);
    animContainer.appendChild(pingPongArena);
    animContainer.appendChild(counter);
    modalContent.insertBefore(animContainer, btn);

    let elapsedSeconds = 0;
    const counterInterval = setInterval(() => {
        elapsedSeconds += 1;
        counterTime.textContent = formatStopwatch(elapsedSeconds);
        counter.classList.remove('pulse-counter');
        void counter.offsetWidth;
        counter.classList.add('pulse-counter');
    }, 1000);

    btn.innerHTML = '<i class="bi bi-hourglass-split" style="animation:spin 1s linear infinite"></i> Transcrevendo...';

    try {
        const fd = new FormData();
        fd.append('fonte_id', fontId);

        const res = await fetch('/api/projeto/' + PROJETO_ID + '/transcribe', {
            method: 'POST',
            body: fd
        });

        clearInterval(counterInterval);
        const data = await res.json();

        if (!res.ok || !data.success) {
            showToast('Erro na transcricao: ' + (data.error || 'erro desconhecido'), 'error');
            resetTranscricaoModal();
            return;
        }

        animContainer.style.opacity = '0';
        animContainer.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => animContainer.remove(), 300);

        const addedFiles = [];
        if (data.txt) {
            addFonteToList(data.txt);
            addedFiles.push(data.txt);
        }
        if (data.md) {
            addFonteToList(data.md);
            addedFiles.push(data.md);
        }

        closeModal('modal-transcrever');
        showToast(`Transcricao concluida em ${formatStopwatch(elapsedSeconds)}! ${addedFiles.length} arquivo(s) adicionado(s).`, 'success');
        setTimeout(() => window.location.reload(), 500);
    } catch (err) {
        clearInterval(counterInterval);
        showToast('Erro ao transcrever: ' + err.message, 'error');
        resetTranscricaoModal();
    }
}

// Background transcription state
let activeTranscriptionJobId = null;
let activeTranscriptionSourceName = '';
let transcriptionPollTimer = null;
let transcriptionStopwatchTimer = null;
let transcriptionElapsedSeconds = 0;
const transcriptionAddedFileIds = new Set();

function stopTranscriptionTimers() {
    if (transcriptionPollTimer) {
        clearInterval(transcriptionPollTimer);
        transcriptionPollTimer = null;
    }
    if (transcriptionStopwatchTimer) {
        clearInterval(transcriptionStopwatchTimer);
        transcriptionStopwatchTimer = null;
    }
}

function getTranscricaoElements() {
    const modalContent = document.querySelector('#modal-transcrever .modal-box');
    if (!modalContent) return null;

    return {
        modalContent,
        para: modalContent.querySelector('p'),
        selectEl: document.getElementById('transcrever-select'),
        fileNameEl: document.getElementById('transcrever-arquivo-atual'),
        statusWrap: document.getElementById('transcrever-status'),
        statusMsg: document.getElementById('transcrever-status-msg'),
        animContainer: document.getElementById('transcription-anim-container'),
        btn: document.getElementById('transcrever-btn'),
        cancelBtn: document.getElementById('transcrever-cancel-btn')
    };
}

function ensureTranscriptionAnimation() {
    const els = getTranscricaoElements();
    if (!els) return null;
    if (els.animContainer) return els.animContainer;

    const animContainer = document.createElement('div');
    animContainer.id = 'transcription-anim-container';
    animContainer.className = 'transcription-anim-container';

    const pingPongArena = document.createElement('div');
    pingPongArena.className = 'transcription-pingpong-arena';

    const leftPaddle = document.createElement('div');
    leftPaddle.className = 'transcription-paddle left';
    const rightPaddle = document.createElement('div');
    rightPaddle.className = 'transcription-paddle right';
    const ball = document.createElement('div');
    ball.className = 'transcription-ball';

    pingPongArena.appendChild(leftPaddle);
    pingPongArena.appendChild(rightPaddle);
    pingPongArena.appendChild(ball);

    const counter = document.createElement('div');
    counter.id = 'transcription-counter';
    counter.className = 'transcription-counter';
    counter.innerHTML = '<span class="transcription-counter-time">00:00:00</span>';

    animContainer.appendChild(pingPongArena);
    animContainer.appendChild(counter);
    els.modalContent.insertBefore(animContainer, els.btn);
    return animContainer;
}

function setTranscricaoStatus(message, mode = 'info') {
    const els = getTranscricaoElements();
    if (!els || !els.statusWrap || !els.statusMsg) return;

    els.statusWrap.classList.remove('hidden');
    els.statusMsg.textContent = message || '';

    if (mode === 'error') {
        els.statusWrap.style.borderColor = 'var(--color-error, rgba(239, 68, 68, 0.35))';
        els.statusWrap.style.background = 'var(--color-error, rgba(239, 68, 68, 0.08))';
    } else if (mode === 'success') {
        els.statusWrap.style.borderColor = 'var(--color-success, rgba(34, 197, 94, 0.35))';
        els.statusWrap.style.background = 'var(--color-success, rgba(34, 197, 94, 0.08))';
    } else {
        els.statusWrap.style.borderColor = 'var(--border)';
        els.statusWrap.style.background = 'var(--surface-2)';
    }
}

function setTranscricaoProcessingUI(audioName) {
    const els = getTranscricaoElements();
    if (!els) return;

    ensureTranscriptionAnimation();
    if (els.para) els.para.style.display = 'none';
    if (els.selectEl) els.selectEl.style.display = 'none';

    if (els.fileNameEl) {
        els.fileNameEl.textContent = audioName || 'Arquivo em transcricao';
        els.fileNameEl.title = audioName || '';
        els.fileNameEl.classList.remove('hidden');
    }

    if (els.btn) {
        if (!els.btn.dataset.originalText) els.btn.dataset.originalText = els.btn.innerHTML;
        els.btn.disabled = true;
        els.btn.style.display = 'none';
    }

    if (els.cancelBtn) {
        els.cancelBtn.classList.remove('hidden');
        els.cancelBtn.disabled = false;
    }
}

function resetTranscricaoModal() {
    const els = getTranscricaoElements();
    if (!els) return;

    stopTranscriptionTimers();
    activeTranscriptionJobId = null;
    activeTranscriptionSourceName = '';
    transcriptionElapsedSeconds = 0;

    if (els.para) els.para.style.display = 'block';
    if (els.selectEl) els.selectEl.style.display = 'block';
    if (els.animContainer) els.animContainer.remove();

    if (els.fileNameEl) {
        els.fileNameEl.textContent = '';
        els.fileNameEl.removeAttribute('title');
        els.fileNameEl.classList.add('hidden');
    }

    if (els.statusWrap) {
        els.statusWrap.classList.add('hidden');
    }
    if (els.statusMsg) {
        els.statusMsg.textContent = '';
    }

    if (els.btn) {
        els.btn.disabled = false;
        els.btn.style.display = 'block';
        if (els.btn.dataset.originalText) els.btn.innerHTML = els.btn.dataset.originalText;
    }
    if (els.cancelBtn) {
        els.cancelBtn.classList.add('hidden');
        els.cancelBtn.disabled = false;
    }
}

function startTranscriptionStopwatch(initialSeconds = 0) {
    transcriptionElapsedSeconds = Math.max(0, Number(initialSeconds) || 0);
    const ref = document.querySelector('#transcription-counter .transcription-counter-time');
    if (ref) ref.textContent = formatStopwatch(transcriptionElapsedSeconds);

    if (transcriptionStopwatchTimer) clearInterval(transcriptionStopwatchTimer);
    transcriptionStopwatchTimer = setInterval(() => {
        transcriptionElapsedSeconds += 1;
        const timeEl = document.querySelector('#transcription-counter .transcription-counter-time');
        if (timeEl) timeEl.textContent = formatStopwatch(transcriptionElapsedSeconds);
    }, 1000);
}

function transcricaoStatusTexto(job) {
    const stage = job.stage || '';
    const base = job.status_message || '';

    if (stage === 'queued') return base || 'Transcricao enfileirada.';
    if (stage === 'starting') return base || 'Preparando transcricao...';
    if (stage === 'transcribing') return base || 'Transcrevendo audio...';
    if (stage === 'finalizing') return base || 'Finalizando texto transcrito...';
    if (stage === 'saving') return base || 'Salvando resultado no projeto...';
    if (stage === 'cancelling') return base || 'Cancelamento solicitado...';
    if (stage === 'completed') return base || 'Transcricao concluida.';
    if (stage === 'cancelled') return base || 'Transcricao cancelada.';
    if (stage === 'failed') return job.error_message || base || 'Transcricao finalizada com erro.';
    return base || 'Processando transcricao...';
}

function addFonteResultIfNeeded(fileData) {
    if (!fileData || !fileData.id) return;
    if (transcriptionAddedFileIds.has(fileData.id)) return;
    transcriptionAddedFileIds.add(fileData.id);
    addFonteToList(fileData);
}

function finalizeTranscricaoState() {
    stopTranscriptionTimers();
    activeTranscriptionJobId = null;
    activeTranscriptionSourceName = '';

    const els = getTranscricaoElements();
    if (!els) return;
    if (els.cancelBtn) {
        els.cancelBtn.classList.add('hidden');
        els.cancelBtn.disabled = false;
    }
    if (els.btn) {
        els.btn.disabled = false;
        els.btn.style.display = 'block';
        if (els.btn.dataset.originalText) els.btn.innerHTML = els.btn.dataset.originalText;
    }
    if (els.para) els.para.style.display = 'block';
    if (els.selectEl) els.selectEl.style.display = 'block';
    if (els.animContainer) els.animContainer.remove();
}

async function consultarStatusTranscricao(jobId) {
    try {
        const res = await fetch('/api/projeto/' + PROJETO_ID + '/transcribe/' + jobId + '/status');
        const data = await res.json();
        if (!res.ok || !data.success || !data.job) {
            throw new Error(data.error || 'Falha ao consultar status');
        }

        const job = data.job;
        activeTranscriptionJobId = job.id;
        if (job.source_nome) activeTranscriptionSourceName = job.source_nome;
        if (job.source_nome) setTranscricaoProcessingUI(job.source_nome);

        if (typeof job.elapsed_seconds === 'number' && job.elapsed_seconds > transcriptionElapsedSeconds) {
            transcriptionElapsedSeconds = job.elapsed_seconds;
            const ref = document.querySelector('#transcription-counter .transcription-counter-time');
            if (ref) ref.textContent = formatStopwatch(job.elapsed_seconds);
        }

        if (job.status === 'failed') {
            setTranscricaoStatus(transcricaoStatusTexto(job), 'error');
        } else if (job.status === 'completed') {
            setTranscricaoStatus(transcricaoStatusTexto(job), 'success');
        } else {
            setTranscricaoStatus(transcricaoStatusTexto(job), 'info');
        }

        if (job.status === 'completed') {
            addFonteResultIfNeeded(data.txt);
            addFonteResultIfNeeded(data.md);
            finalizeTranscricaoState();
            showToast('Transcricao concluida em ' + formatStopwatch(transcriptionElapsedSeconds) + '.', 'success');
            return;
        }

        if (job.status === 'failed') {
            finalizeTranscricaoState();
            showToast('Transcricao falhou: ' + (job.error_message || 'erro desconhecido'), 'error');
            return;
        }

        if (job.status === 'cancelled') {
            finalizeTranscricaoState();
            showToast('Transcricao cancelada.', 'info');
            return;
        }
    } catch (err) {
        setTranscricaoStatus('Erro ao consultar status: ' + err.message, 'error');
    }
}

function startTranscricaoPolling(jobId) {
    if (transcriptionPollTimer) clearInterval(transcriptionPollTimer);
    transcriptionPollTimer = setInterval(() => {
        consultarStatusTranscricao(jobId);
    }, 2000);
}

async function openTranscricao() {
    if (!FONTES) return;
    openModal('modal-transcrever');

    const select = document.getElementById('transcrever-select');
    const audios = FONTES.filter(f => f.tipo === 'audio' || f.tipo === 'video');
    select.innerHTML = '<option value="">Selecionar &aacute;udio...</option>';
    audios.forEach(a => {
        select.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>';
    });

    if (activeTranscriptionJobId) {
        setTranscricaoProcessingUI(activeTranscriptionSourceName || 'Transcricao em andamento');
        setTranscricaoStatus('Reconectando ao status da transcricao...', 'info');
        startTranscriptionStopwatch(transcriptionElapsedSeconds);
        consultarStatusTranscricao(activeTranscriptionJobId);
        startTranscricaoPolling(activeTranscriptionJobId);
        return;
    }

    resetTranscricaoModal();
}

async function transcreverAudio(triggerEvent) {
    const select = document.getElementById('transcrever-select');
    if (!select || !select.value) {
        showToast('Selecione um audio para transcrever', 'error');
        return;
    }

    const fontId = select.value;
    const option = select.options[select.selectedIndex];
    const audioName = option ? option.textContent : 'Arquivo';

    const btn = triggerEvent?.currentTarget || document.getElementById('transcrever-btn');
    if (btn && !btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;

    setTranscricaoProcessingUI(audioName);
    setTranscricaoStatus('Enfileirando transcricao...', 'info');
    startTranscriptionStopwatch(0);

    try {
        const fd = new FormData();
        fd.append('fonte_id', fontId);

        const res = await fetch('/api/projeto/' + PROJETO_ID + '/transcribe', {
            method: 'POST',
            body: fd
        });

        const data = await res.json();
        if (!res.ok) {
            if (res.status === 409 && data.job) {
                activeTranscriptionJobId = data.job.id;
                activeTranscriptionSourceName = data.job.source_nome || audioName;
                setTranscricaoStatus(transcricaoStatusTexto(data.job), 'info');
                consultarStatusTranscricao(activeTranscriptionJobId);
                startTranscricaoPolling(activeTranscriptionJobId);
                return;
            }
            throw new Error(data.error || 'Nao foi possivel iniciar a transcricao');
        }
        if (!data.job) {
            throw new Error('Resposta invalida ao iniciar transcricao');
        }

        activeTranscriptionJobId = data.job.id;
        activeTranscriptionSourceName = data.job.source_nome || audioName;
        setTranscricaoStatus(transcricaoStatusTexto(data.job), 'info');

        consultarStatusTranscricao(activeTranscriptionJobId);
        startTranscricaoPolling(activeTranscriptionJobId);
    } catch (err) {
        finalizeTranscricaoState();
        setTranscricaoStatus('Falha ao iniciar transcricao: ' + err.message, 'error');
        showToast('Erro ao iniciar transcricao: ' + err.message, 'error');
    }
}

async function cancelarTranscricao() {
    if (!activeTranscriptionJobId) {
        showToast('Nenhuma transcricao em andamento para cancelar.', 'info');
        return;
    }

    const els = getTranscricaoElements();
    if (els && els.cancelBtn) els.cancelBtn.disabled = true;
    setTranscricaoStatus('Solicitando cancelamento...', 'info');

    try {
        const res = await fetch('/api/projeto/' + PROJETO_ID + '/transcribe/' + activeTranscriptionJobId + '/cancel', {
            method: 'POST'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao cancelar');

        setTranscricaoStatus((data.job && transcricaoStatusTexto(data.job)) || 'Cancelamento solicitado.', 'info');
        if (els && els.cancelBtn) els.cancelBtn.disabled = false;
    } catch (err) {
        if (els && els.cancelBtn) els.cancelBtn.disabled = false;
        setTranscricaoStatus('Erro ao cancelar: ' + err.message, 'error');
        showToast('Erro ao cancelar transcricao: ' + err.message, 'error');
    }
}

// ============================================================
//  Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateChatState === 'function') updateChatState();
});
