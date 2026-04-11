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

async function deleteFonte(id) {
    if (!confirm('Remover esta fonte?')) return;
    const data = await api('/api/fontes/' + id + '/delete', { method: 'POST' });
    if (data.ok) {
        const el = document.querySelector('.fonte-item[data-id="' + id + '"]');
        if (el) el.remove();
        selectedFontes.delete(id);
        updateChatState();
        showToast('Fonte removida!', 'success');
    } else {
        showToast(data.error || 'Erro ao remover fonte', 'error');
    }
}

// ============================================================
//  Upload
// ============================================================
let uploading = false; // Prevent concurrent uploads

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
            '<div style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);border:1px solid var(--border);">' +
                '<i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite"></i> Enviando arquivos...' +
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

async function doUpload(fileInput) {
    if (uploading) return;
    if (!fileInput.files.length) { showToast('Selecione ao menos um arquivo', 'error'); return; }

    const totalFiles = fileInput.files.length;
    setUploadingState(true);

    let uploadedCount = 0;

    for (const file of fileInput.files) {
        try {
            const fd = new FormData();
            fd.append('arquivo', file);

            const res = await fetch('/api/projeto/' + PROJETO_ID + '/upload', {
                method: 'POST',
                body: fd
            });

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                showToast('servidor retornou resposta inválida para ' + file.name, 'error');
                continue;
            }

            const data = await res.json();

            // Handle errors reported by controller
            if (data.errors && data.errors.length > 0) {
                showToast(data.errors.join(', '), 'error');
                continue;
            }

            // Each upload sends one file, so success[0] is the uploaded file
            if (data.success && data.success.length > 0) {
                addFonteToList(data.success[0]);
                uploadedCount++;
            } else {
                showToast(data.error || 'Erro desconhecido ao enviar ' + file.name, 'error');
            }

            const progressEl = document.getElementById('upload-progress');
            progressEl.innerHTML =
                '<div style="padding:12px;background:var(--surface-2);border-radius:var(--radius-md);border:1px solid var(--border);">' +
                    '<i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite"></i> ' +
                    (uploadedCount + 1) + ' de ' + totalFiles +
                '</div>';
        } catch (err) {
            showToast('Erro ao enviar ' + file.name + ': ' + err.message, 'error');
        }
    }

    setUploadingState(false);

    if (uploadedCount > 0) {
        showToast(uploadedCount + ' arquivo(s) adicionado(s)!', 'success');
    }
}

async function uploadFonte(e) {
    e.preventDefault();
    const fileInput = document.getElementById('file-select');
    doUpload(fileInput);
}

handleFileSelect = doUpload; // Alias for the inline handler

function addFonteToList(data) {
    const list = document.getElementById('fontes-list');
    const emptyEl = list.querySelector('i.bi-inbox');
    if (emptyEl && emptyEl.parentElement) emptyEl.parentElement.remove();

    const div = document.createElement('div');
    div.className = 'fonte-item';
    div.dataset.id = data.id;
    div.dataset.tipo = data.tipo;
    div.onclick = function() { toggleFonte(this, data.id); };
    div.innerHTML =
        '<div class="fonte-check"></div>' +
        '<i class="bi ' + getFileIcon(data.tipo) + ' fonte-icon"></i>' +
        '<div class="fonte-info">' +
            '<div class="fonte-nome">' + data.nome + '</div>' +
            '<div class="fonte-tipo">' + data.tipo + ' &middot; ' + data.tamanho_kb + ' KB</div>' +
        '</div>' +
        '<button class="fonte-del" onclick="event.stopPropagation();deleteFonte(' + data.id + ')" title="Remover"><i class="bi bi-x"></i></button>';
    list.appendChild(div);
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
async function openTextEditor() {
    if (!FONTES) return;
    openModal('modal-text-editor');
    const select = document.getElementById('text-select');
    const docs = FONTES.filter(f => ['documento', 'transcricao', 'audio'].includes(f.tipo));
    select.innerHTML = '<option value="">Selecionar documento...';
    docs.forEach(d => {
        select.innerHTML += '<option value="' + d.id + '" data-caminho="' + d.caminho + '">' + d.nome + '</option>';
    });
    document.getElementById('text-editor-area').value = '';

    select.onchange = async function() {
        const area = document.getElementById('text-editor-area');
        if (!this.value) { area.value = ''; return; }
        area.value = 'Carregando...';
        try {
            const caminho = this.options[this.selectedIndex].dataset.caminho;
            const res = await fetch(caminho);
            const text = await res.text();
            area.value = text;
        } catch (e) {
            area.value = 'Erro ao carregar arquivo: ' + e.message;
        }
    };
}

async function salvarTexto() {
    const select = document.getElementById('text-select');
    const id = select.value;
    const content = document.getElementById('text-editor-area').value;
    if (!id) { showToast('Selecione um documento primeiro', 'error'); return; }
    const fd = new FormData();
    fd.append('transcricao', content);
    await api('/api/fontes/' + id + '/update', { method: 'POST', body: fd });
    closeModal('modal-text-editor');
    showToast('Texto salvo!', 'success');
}

// ============================================================
//  Transcription
// ============================================================
async function openTranscricao() {
    if (!FONTES) return;
    openModal('modal-transcrever');
    const select = document.getElementById('transcrever-select');
    const audios = FONTES.filter(f => f.tipo === 'audio');
    select.innerHTML = '<option value="">Selecionar áudio...';
    audios.forEach(a => {
        select.innerHTML += '<option value="' + a.id + '">' + a.nome + '</option>';
    });
}

async function transcreverAudio() {
    const select = document.getElementById('transcrever-select');
    if (!select.value) { showToast('Selecione um áudio para transcrever', 'error'); return; }
    showToast('Transcrição será processada via Whisper - em integração', 'info');
}

// ============================================================
//  Init
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateChatState === 'function') updateChatState();
});
