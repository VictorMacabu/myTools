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
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ============================================================
//  API helper
// ============================================================
async function api(url, options = {}) {
    const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        ...options,
    });
    return res.json();
}

// ============================================================
//  CRUD: Workspace
// ============================================================
async function createWorkspace(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await api('/api/workspaces', { method: 'POST', body: fd });
    if (data.error) { showToast(data.error, 'error'); return; }
    closeModal('modal-new-workspace');
    showToast('Área de trabalho criada!', 'success');
    window.location.href = '/?ws=' + data.id;
}

function selectWorkspaceEmoji(emoji, event) {
    event.preventDefault();
    document.getElementById('ws-emoji-select').value = emoji;
    const buttons = document.querySelectorAll('#ws-emoji-list button');
    buttons.forEach(btn => {
        btn.style.borderColor = 'var(--border)';
        btn.style.background = 'var(--surface)';
    });
    event.target.style.borderColor = 'var(--primary)';
    event.target.style.background = 'var(--primary)';
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
    // Fetch full projeto data to get grupo_id and favorito status
    fetch('/api/projeto/' + id)
        .catch(() => {
            // API endpoint doesn't exist, use basic info
            document.getElementById('edit-projeto-id').value = id;
            document.getElementById('edit-projeto-nome').value = nome;
            document.getElementById('edit-projeto-grupo-id').value = '';
            document.getElementById('edit-projeto-favorito').checked = false;
            resetEditGrupoButtons();
        });
    document.getElementById('edit-projeto-id').value = id;
    document.getElementById('edit-projeto-nome').value = nome;
    document.getElementById('edit-projeto-grupo-id').value = '';
    document.getElementById('edit-projeto-favorito').checked = false;
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
    const favorito = document.getElementById('edit-projeto-favorito').checked ? 1 : 0;
    const fd = new FormData();
    fd.append('nome', nome);
    fd.append('favorito', favorito);
    if (grupoId !== '') fd.append('grupo_id', grupoId);
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
    const data = await api('/api/projeto/' + id + '/toggle-fav', { method: 'POST' });
    if (data.ok || data.ok === undefined) {
        showToast('Favorito atualizado', 'info');
        // Update UI without reload
        const card = document.querySelector(`.proj-card[data-id="${id}"]`);
        if (card) {
            const isFavorite = data.favorito || !card.classList.contains('fav-card');
            const badge = card.querySelector('.fav-badge');
            const starBtn = card.querySelector('button[onclick*="toggleFavorite"]');
            const starIcon = starBtn?.querySelector('i');

            if (isFavorite) {
                card.classList.add('fav-card');
                if (!badge) {
                    card.querySelector('.proj-cover').insertAdjacentHTML('beforeend', '<span class="fav-badge"><i class="bi bi-star-fill" style="color:#d97706"></i></span>');
                }
                if (starIcon) {
                    starIcon.className = 'bi bi-star-fill';
                    starIcon.style.color = '#d97706';
                }
            } else {
                card.classList.remove('fav-card');
                if (badge) badge.remove();
                if (starIcon) {
                    starIcon.className = 'bi bi-star';
                    starIcon.style.color = 'inherit';
                }
            }
        }
    } else {
        showToast(data.error || 'Erro ao atualizar favorito', 'error');
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

    if (!dot) return; // not on project page

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
async function handleFileSelect(fileInput) {
    if (!fileInput.files.length) return;

    const progressEl = document.getElementById('upload-progress');
    progressEl.innerHTML = '<p style="color:var(--text-3);font-size:13px">Enviando ' + fileInput.files.length + ' arquivo(s)...</p>';

    for (const file of fileInput.files) {
        const fd = new FormData();
        fd.append('arquivo', file);
        try {
            const data = await api('/api/projeto/' + PROJETO_ID + '/upload', { method: 'POST', body: fd });
            if (data.error) {
                progressEl.innerHTML += '<p style="color:var(--danger)">' + data.error + '</p>';
                showToast(data.error, 'error');
            } else {
                addFonteToList(data);
                showToast(file.name + ' adicionado!', 'success');
            }
        } catch (err) {
            progressEl.innerHTML += '<p style="color:var(--danger)">Erro: ' + err.message + '</p>';
            showToast('Erro ao enviar ' + file.name, 'error');
        }
    }

    // Clear input but keep modal open so user can add more
    fileInput.value = '';
}

async function uploadFonte(e) {
    e.preventDefault();
    const fileInput = document.getElementById('file-select');
    if (!fileInput.files.length) { showToast('Selecione ao menos um arquivo', 'error'); return; }
    handleFileSelect(fileInput);
}

function addFonteToList(data) {
    const list = document.getElementById('fontes-list');
    const emptyEl = list.querySelector('i.bi-inbox');
    if (emptyEl) emptyEl.closest('div').remove();

    const div = document.createElement('div');
    div.className = 'fonte-item';
    div.dataset.id = data.id;
    div.dataset.tipo = data.tipo;
    div.onclick = function() { toggleFonte(this, data.id); };
    div.innerHTML = `
        <div class="fonte-check"></div>
        <i class="bi ${getFileIcon(data.tipo)} fonte-icon"></i>
        <div class="fonte-info">
            <div class="fonte-nome">${data.nome}</div>
            <div class="fonte-tipo">${data.tipo} &middot; ${data.tamanho_kb} KB</div>
        </div>
        <button class="fonte-del" onclick="event.stopPropagation();deleteFonte(${data.id})" title="Remover"><i class="bi bi-x"></i></button>
    `;
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
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    const container = document.getElementById('chat-messages');
    const placeholder = document.getElementById('chat-placeholder');
    if (placeholder) placeholder.remove();

    container.innerHTML += `<div class="msg-user">${escapeHtml(msg)}</div>`;
    input.value = '';

    const fontesList = Array.from(selectedFontes);
    container.innerHTML += `<div class="msg-assistant"><em>Resposta simulada — chat será integrado com LLM. Fontes: ${fontesList.join(', ')}</em></div>`;
    container.scrollTop = container.scrollHeight;
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
        select.innerHTML += `<option value="${a.id}" data-caminho="${a.caminho}">${a.nome} (${a.tamanho_kb} KB)</option>`;
    });
    document.getElementById('cortar-audio-controls').classList.add('hidden');

    select.onchange = function() {
        const id = this.value;
        if (!id) { document.getElementById('cortar-audio-controls').classList.add('hidden'); return; }
        document.getElementById('cortar-audio-controls').classList.remove('hidden');
        // Set duration from file (will need backend call for actual duration)
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
    return `${m}:${String(s).padStart(2, '0')}`;
}

async function cortarAudio() {
    const select = document.getElementById('cortar-audio-select');
    if (!select.value) return;
    const nome = document.getElementById('cortar-nome').value || 'trecho_cortado.mp3';
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
        select.innerHTML += `<option value="${a.caminho}" data-tipo="${a.tipo}">${a.nome}</option>`;
    });
    document.getElementById('media-container').innerHTML = '';

    select.onchange = function() {
        const container = document.getElementById('media-container');
        const path = this.value;
        if (!path) { container.innerHTML = ''; return; }
        const tipo = this.options[this.selectedIndex].dataset.tipo;
        if (tipo === 'audio') {
            container.innerHTML = `<audio controls src="${path}" style="width:100%;margin-top:12px"></audio>`;
        } else if (tipo === 'video') {
            container.innerHTML = `<video controls src="${path}" style="width:100%;max-height:60vh;margin-top:12px"></video>`;
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
        select.innerHTML += `<option value="${a.caminho}">${a.nome}</option>`;
    });
    document.getElementById('image-container').innerHTML = '';

    select.onchange = function() {
        const container = document.getElementById('image-container');
        if (!this.value) { container.innerHTML = ''; return; }
        container.innerHTML = `<img src="${this.value}" style="max-width:100%;max-height:70vh;object-fit:contain;border-radius:var(--radius-lg)">`;
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
        select.innerHTML += `<option value="${d.id}" data-caminho="${d.caminho}">${d.nome}</option>`;
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
        select.innerHTML += `<option value="${a.id}">${a.nome}</option>`;
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
